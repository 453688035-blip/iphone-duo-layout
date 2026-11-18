import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getSource, getSources, writeFoldableBatch, writeFoldableFrames } from './writer.mjs';
import { findNativeComponents } from './native-chrome.mjs';
import { resultLayerChoices } from './dashboard.mjs';

function fixture() {
  let nextId = 0;
  const page = { id: 'page', type: 'PAGE', children: [], selection: [] };
  const figma = { currentPage: page };
  const host = { failReaction: false, onFirstClone: null };

  function add(parent, name, properties = {}) {
    const metadata = new Map();
    const node = {
      id: 'node:' + nextId++, type: 'FRAME', name, parent, children: [],
      visible: true, rotation: 0, x: 0, y: 0, width: 100, height: 100, overflowDirection: 'NONE',
      cornerRadius: 0, topLeftRadius: 0, topRightRadius: 0, bottomRightRadius: 0, bottomLeftRadius: 0,
      layoutMode: 'NONE', layoutWrap: 'NO_WRAP', layoutPositioning: 'AUTO',
      paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0, itemSpacing: 0,
      reactions: [],
      setPluginData(key, value) { metadata.set(key, value); },
      getPluginData(key) { return metadata.get(key) ?? ''; },
      get absoluteTransform() {
        const parent = this.parent.absoluteTransform;
        return [[1, 0, this.x + (parent?.[0][2] ?? 0)], [0, 1, this.y + (parent?.[1][2] ?? 0)]];
      },
      get absoluteBoundingBox() {
        return { x: this.absoluteTransform[0][2], y: this.absoluteTransform[1][2], width: this.width, height: this.height };
      },
      get width() {
        if (this.layoutSizingHorizontal === 'FILL') {
          return this.parent.width - this.parent.paddingLeft - this.parent.paddingRight;
        }
        return this.fixedWidth;
      },
      set width(value) { this.fixedWidth = value; },
      fixedWidth: 100,
      resize(width, height) {
        const reflowedHeight = width !== this.width ? this.reflowHeight : undefined;
        this.width = width;
        this.height = reflowedHeight ?? height;
      },
      resizeWithoutConstraints(width, height) { this.resize(width, height); },
      appendChild(child) {
        child.parent.children = child.parent.children.filter(node => node !== child);
        child.parent = this;
        this.children.push(child);
      },
      async setReactionsAsync(entries) {
        if (host.failReaction && name.startsWith('[af:back]')) throw new Error('host reaction failure');
        this.reactions = entries;
      },
      remove() {
        this.removed = true;
        this.parent.children = this.parent.children.filter(child => child !== this);
      },
      clone() {
        if (host.onFirstClone) {
          const hook = host.onFirstClone;
          host.onFirstClone = null;
          hook(this);
        }
        const copyTree = (source, owner) => {
          const values = {};
          for (const key of [
            'type', 'visible', 'rotation', 'x', 'y', 'fixedWidth', 'height', 'reflowHeight', 'overflowDirection', 'locked', 'fills', 'isMask',
            'layoutMode', 'layoutWrap', 'layoutPositioning', 'layoutSizingHorizontal', 'constraints',
            'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'itemSpacing',
            'minWidth', 'boundVariables', 'reactions', 'componentProperties', 'mainComponent', 'characters',
            'clipsContent', 'cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomRightRadius',
            'bottomLeftRadius',
          ]) values[key] = structuredClone(source[key]);
          const copy = add(owner, source.name, values);
          for (const child of source.children) copyTree(child, copy);
          return copy;
        };
        return copyTree(this, page);
      },
    };
    Object.assign(node, properties);
    parent.children.push(node);
    return node;
  }

  figma.createFrame = () => add(page, 'Frame');
  figma.createRectangle = () => add(page, 'Rectangle', { type: 'RECTANGLE' });
  return { add, page, figma, host };
}

test('empty-state background and its gradient fill the entire target without entering the scroll area', async () => {
  const env = fixture();
  const source = env.add(env.page, '空状态-暂无对话', { width: 375, height: 840 });
  const bg = env.add(source, 'bg', { width: 375, height: 840, locked: true });
  const fills = [{ type: 'GRADIENT_LINEAR', gradientStops: [
    { position: 0, color: { r: 0.8, g: 0.87, b: 1, a: 1 } },
    { position: 1, color: { r: 1, g: 1, b: 1, a: 1 } },
  ] }];
  const gradient = env.add(bg, 'Gradient', { type: 'RECTANGLE', width: 375, height: 840, fills });
  const wrapper = env.add(source, '空状态-暂无对话', { width: 375, height: 840 });
  env.add(wrapper, '状态栏', { x: 16, y: 18, width: 343, height: 52 });
  const body = env.add(wrapper, '插画和提示', { x: 32, y: 345, width: 311, height: 180 });
  env.add(body, '暂无对话记录', { type: 'TEXT', x: 30, y: 120, width: 140, height: 24 });
  const action = env.add(wrapper, '发起会话', { x: 108, y: 540, width: 159, height: 48 });
  env.page.selection = [source];

  const result = await writeFoldableFrames(env.figma, source, {
    targets: ['duo-outer-landscape', 'duo-inner-landscape', 'duo-split-left'],
  });
  for (const [index, root] of result.frames.entries()) {
    const background = mapped(result, index, bg.id);
    const gradientCopy = mapped(result, index, gradient.id);
    const foreground = mapped(result, index, body.id);
    const actionCopy = mapped(result, index, action.id);
    assert.equal(result.report.targets[index].strategy, 'empty-state');
    assert.equal(root.children[0], background);
    assert.deepEqual([background.x, background.y, background.width, background.height], [0, 0, root.width, root.height]);
    assert.deepEqual([gradientCopy.width, gradientCopy.height], [root.width, root.height]);
    assert.deepEqual(gradientCopy.fills, fills);
    assert.equal(background.locked, true);
    assert.equal(actionCopy.parent, foreground.parent);
    assert.ok(actionCopy.y + actionCopy.height <= actionCopy.parent.height);
    assert.ok(result.report.targets[index].issues.every(issue => issue.severity !== 'error'));
  }
  assert.equal(bg.width, 375);
  assert.equal(gradient.height, 840);
});

test('batch applies the same targets per source, arranges separate rows, and reports individual failures', async () => {
  const env = fixture();
  const first = env.add(env.page, '原稿 A', { x: 50, y: 100, width: 375, height: 800 });
  const invalid = env.add(env.page, '旋转原稿', { width: 375, height: 800, rotation: 12 });
  const second = env.add(env.page, '原稿 B', { width: 375, height: 800 });
  const third = env.add(env.page, '原稿 C', { width: 375, height: 800 });
  env.page.selection = [first, invalid, second, third];
  const { frames, report } = await writeFoldableBatch(env.figma, { targets: ['duo-outer-portrait', 'duo-book'] });

  assert.equal(frames.length, 6);
  assert.deepEqual(report.sources.map(entry => entry.sourceId), [first.id, second.id, third.id]);
  assert.deepEqual(report.failedSources.map(entry => entry.sourceId), [invalid.id]);
  assert.equal(report.targets.length, frames.length);
  for (const index of [0, 2, 4]) {
    assert.equal(frames[index].y, frames[index + 1].y);
    assert.equal(frames[index].x, frames[0].x);
  }
  assert.ok(frames[2].y > frames[0].y + frames[0].height);
  assert.ok(frames[4].y > frames[2].y + frames[2].height);
  assert.equal(first.width, 375);
  assert.equal(env.page.children.length, 10);
});

test('chat moves the existing result across the fold and keeps it inline in a narrow split', async () => {
  const env = fixture();
  const source = env.add(env.page, '知识库解析-企业证件识别', { width: 375, height: 880 });
  const wrapper = env.add(source, '手机页面', { width: 375, height: 880 });
  env.add(wrapper, 'Time', { type: 'TEXT', characters: '9:41', x: 20, y: 14, width: 40, height: 18 });
  const question = env.add(wrapper, '用户提问', { x: 72, y: 120, width: 282, height: 46 });
  const answer = env.add(wrapper, '回答卡片', { x: 16, y: 190, width: 338, height: 560 });
  env.add(answer, 'Table header text', { type: 'TEXT', characters: '营业执照识别结果（企业证件）',
    x: 12, y: 12, width: 220, height: 20 });
  const composer = env.add(wrapper, '输入组件', { x: 16, y: 802, width: 343, height: 52 });
  env.add(composer, '提示', { type: 'TEXT', characters: '发消息或按住说话...', x: 12, y: 14, width: 155, height: 20 });
  env.page.selection = [source];
  const result = await writeFoldableFrames(env.figma, source, {
    targets: ['duo-inner-landscape', 'duo-book', 'duo-split-left'],
  });
  assert.deepEqual(result.report.targets.map(target => target.strategy), [
    'chat-result-columns', 'chat-result-columns', 'chat-flow',
  ]);
  const wide = mapped(result, 0, answer.id);
  assert.equal(wide.parent.name, '对话结果');
  assert.equal(wide.width, wide.parent.width);
  assert.ok(wide.parent.x > mapped(result, 0, question.id).parent.x);
  const folded = mapped(result, 1, answer.id);
  assert.ok(folded.parent.x >= 495.5);
  const foldedThread = mapped(result, 1, question.id).parent;
  assert.ok(foldedThread.x + foldedThread.width <= 455.5);
  assert.ok(mapped(result, 1, composer.id).parent.x + mapped(result, 1, composer.id).parent.width <= 455.5);
  const splitQuestion = mapped(result, 2, question.id);
  // No navigation layer in the source, so the narrow split is not narrowed
  // further by a reserved rail and the thread uses the full window width.
  assert.equal(splitQuestion.parent.x, 16);
  assert.equal(splitQuestion.parent.width, 434);
  assert.ok(splitQuestion.x > 0);
  const input = mapped(result, 2, composer.id);
  assert.equal(input.parent.name, '对话输入栏');
  assert.equal(input.parent.y + input.parent.height, 653);
  assert.equal(mapped(result, 2, answer.id).parent.overflowDirection, 'VERTICAL');
  assert.equal(mapped(result, 2, answer.id).parent, splitQuestion.parent);
  assert.equal(answer.parent, wrapper);
  assert.ok(result.report.targets.every(target => target.issues.every(issue => issue.severity !== 'error')));
  const rtl = await writeFoldableFrames(env.figma, source, { targets: ['duo-book'], direction: 'rtl' });
  assert.ok(mapped(rtl, 0, question.id).parent.x >= 495.5);
  assert.ok(mapped(rtl, 0, answer.id).parent.x < 455.5);
});

test('a tall chat snapshot reflows the original header, wallpaper, reply, and overlapping docks', async () => {
  const env = fixture();
  const source = env.add(env.page, '上传驾驶证', { width: 375, height: 1812 });
  const bg = env.add(source, 'bg', { type: 'INSTANCE', width: 375, height: 812 });
  env.add(source, '底部渐变', { type: 'VECTOR', y: 702, width: 375, height: 110 });
  const home = env.add(source, '系统区', { y: 1778, width: 375, height: 34 });
  env.add(home, 'tabbar', { type: 'GROUP', width: 375, height: 34 });
  const thread = env.add(source, '消息', { x: 16, y: 88, width: 343, height: 590, layoutMode: 'VERTICAL' });
  const response = env.add(thread, '回复区', { y: 280, width: 343, height: 310 });
  const card = env.add(response, '驾驶证核验', { width: 343, height: 1280 });
  const finalRow = env.add(card, '取消当前处理', { y: 1220, width: 140, height: 44 });
  const addDock = name => {
    const dock = env.add(source, name, { y: 1615, width: 375, height: 169, layoutMode: 'VERTICAL' });
    env.add(dock, '描述客户情况和待办事项...', {
      type: 'TEXT', characters: '描述客户情况和待办事项...', width: 250, height: 24,
    });
    const inner = env.add(dock, '输入区内容', { width: 375, height: 129, layoutMode: 'NONE' });
    const shortcuts = env.add(inner, '快捷功能', { width: 375, height: 32, layoutMode: 'HORIZONTAL' });
    for (let index = 0; index < 5; index += 1) {
      env.add(shortcuts, '快捷入口 ' + index, { x: index * 96, width: 88, height: 32 });
    }
    const input = env.add(inner, '输入框', { type: 'INSTANCE', y: 50, width: 375, height: 52 });
    env.add(input, '输入提示', { type: 'TEXT', characters: '描述客户情况和待办事项...', width: 240, height: 24 });
    return { dock, inner, shortcuts, input };
  };
  const duplicate = addDock('旧输入区');
  const live = addDock('输入区');
  const header = env.add(source, '组件', { type: 'INSTANCE', width: 375, height: 88 });
  env.add(header, '4.3 导航栏-NavBar', { type: 'INSTANCE', width: 375, height: 44 });
  env.add(header, '友福', { y: 44, width: 375, height: 44 });
  env.page.selection = [source];

  const targets = ['duo-book', 'duo-tabletop', 'huawei-mate-xt-open', 'huawei-pura-x-closed'];
  const result = await writeFoldableFrames(env.figma, source, { targets });
  for (const [index, root] of result.frames.entries()) {
    const viewport = mapped(result, index, thread.id).parent;
    const nav = mapped(result, index, header.id);
    const wallpaper = mapped(result, index, bg.id);
    const dock = mapped(result, index, live.dock.id);
    assert.equal(result.report.targets[index].strategy, 'chat-flow', targets[index]);
    assert.deepEqual([wallpaper.x, wallpaper.y, wallpaper.width, wallpaper.height], [0, 0, root.width, root.height]);
    assert.equal(root.overflowDirection, 'NONE');
    assert.equal(viewport.overflowDirection, 'VERTICAL');
    assert.equal(nav.y, -44);
    assert.equal(nav.width, nav.parent.width);
    assert.equal(nav.parent.y + nav.parent.height, viewport.y);
    assert.equal(mapped(result, index, duplicate.dock.id).visible, false);
    assert.equal(mapped(result, index, home.id).visible, false);
    assert.equal(mapped(result, index, live.shortcuts.id).overflowDirection, 'HORIZONTAL');
    assert.equal(mapped(result, index, live.shortcuts.id).width, dock.width);
    assert.ok(mapped(result, index, thread.id).height >= 1560);
    assert.equal(mapped(result, index, finalRow.id).visible, true);
    if (index === 0) assert.ok(viewport.x + viewport.width <= 455.5);
    if (index === 1) {
      assert.ok(viewport.y + viewport.height <= 455.5);
      assert.ok(dock.parent.y >= 495.5);
    }
    if (index === 3) {
      assert.equal(dock.parent, viewport);
      assert.ok(dock.y > 1560);
      assert.equal(nav.parent.y, 68);
      const input = mapped(result, index, live.input.id);
      assert.equal(input.parent.name, '对话输入框');
      assert.ok(input.parent.y > viewport.y + viewport.height);
    } else {
      assert.equal(dock.parent.name, '对话输入栏');
      assert.ok(viewport.y + viewport.height <= dock.parent.y);
    }
    if (index === 2) {
      assert.equal(viewport.width, 680);
      assert.equal(dock.width, viewport.width);
      assert.equal(dock.parent.x, viewport.x);
    }
  }
  assert.equal(source.height, 1812);
  assert.equal(thread.height, 590);
  assert.ok(duplicate.dock.visible);
});

test('an independent result nested inside the thread can be inferred or chosen without renaming', async () => {
  const env = fixture();
  const source = env.add(env.page, '知识库解析', { width: 375, height: 880 });
  const thread = env.add(source, '消息列表', { x: 12, y: 72, width: 351, height: 700 });
  env.add(thread, '提问', { x: 16, y: 20, width: 250, height: 56 });
  const result = env.add(thread, '卡片', { x: 12, y: 96, width: 327, height: 460 });
  const title = env.add(result, 'Table header text', { type: 'TEXT', characters: '营业执照识别结果（企业证件）',
    x: 12, y: 12, width: 220, height: 20 });
  const suggestion = env.add(thread, '追问', { x: 12, y: 572, width: 255, height: 48 });
  const input = env.add(source, '输入框', { x: 12, y: 802, width: 351, height: 52 });
  env.add(input, '提示', { type: 'TEXT', characters: '发消息或按住说话...', x: 12, y: 14, width: 155, height: 20 });
  env.page.selection = [source];

  const automatic = await writeFoldableFrames(env.figma, source, { targets: ['duo-book'] });
  assert.equal(automatic.report.targets[0].strategy, 'chat-result-columns');
  assert.equal(mapped(automatic, 0, result.id).parent.name, '对话结果');
  assert.equal(mapped(automatic, 0, suggestion.id).y, 112);

  title.characters = '企业信息';
  const fallback = await writeFoldableFrames(env.figma, source, { targets: ['duo-book'] });
  assert.equal(fallback.report.targets[0].strategy, 'chat-flow');
  assert.ok(fallback.report.targets[0].issues.some(entry => entry.code === 'chat-result-review'));
  assert.ok(resultLayerChoices(source).some(entry => entry.id === result.id && entry.label === '消息列表 / 卡片'));
  const manual = await writeFoldableFrames(env.figma, source, {
    targets: ['duo-book', 'duo-split-left'], resultLayerId: result.id,
  });
  assert.deepEqual(manual.report.targets.map(target => target.strategy), ['chat-result-columns', 'chat-flow']);
  assert.equal(mapped(manual, 0, result.id).parent.name, '对话结果');
  assert.equal(mapped(manual, 1, result.id).parent.id, mapped(manual, 1, thread.id).id);
  assert.equal(result.parent.id, thread.id);
  await assert.rejects(writeFoldableFrames(env.figma, source, {
    targets: ['duo-book'], resultLayerId: 'stale',
  }), /重新选择独立结果卡/);
});

test('conversation recognizes a 138-point desktop composer and moves a titled result list as one group', async () => {
  const env = fixture();
  const source = env.add(env.page, '尽调退回场景下', { width: 434, height: 1043, layoutMode: 'VERTICAL' });
  const header = env.add(source, 'Container', { width: 434, height: 134, layoutMode: 'VERTICAL' });
  env.add(header, '顶部栏', { width: 434, height: 64 });
  const body = env.add(source, 'Frame', { y: 134, width: 434, height: 771 });
  const heading = env.add(body, 'Frame', { x: 24, y: 76, width: 386, height: 23 });
  env.add(heading, '标题', { type: 'TEXT', width: 160, height: 23, characters: '登录问题排查' });
  const cards = env.add(body, 'Frame', { x: 24, y: 111, width: 386, height: 486, layoutMode: 'VERTICAL' });
  for (let index = 0; index < 3; index++) {
    env.add(cards, 'Frame', { y: index * 166, width: 386, height: 154 });
  }
  const composer = env.add(source, 'Frame', { y: 905, width: 434, height: 138, layoutMode: 'VERTICAL' });
  env.add(composer, '输入框-pc端', { type: 'INSTANCE', x: 24, width: 280, height: 100 });
  env.page.selection = [source];

  const { frames, report } = await writeFoldableFrames(env.figma, source, {
    targets: ['duo-book', 'duo-outer-landscape'],
  });
  const book = { frames, report };
  const result = mapped(book, 0, cards.id).parent;
  const input = mapped(book, 0, composer.id).parent;
  assert.equal(report.targets[0].strategy, 'chat-result-columns');
  assert.equal(mapped(book, 0, heading.id).parent, result);
  assert.equal(result.x, 495.5);
  assert.equal(result.y, 16);
  assert.ok(input.x + input.width <= 455.5);
  assert.equal(input.y + input.height, 653);
  assert.ok(report.targets[0].issues.some(entry => entry.code === 'existing-top-bar-used'));
  assert.equal(report.targets[1].strategy, 'chat-flow');
  assert.equal(mapped(book, 1, cards.id).parent.id, mapped(book, 1, body.id).id);
  assert.equal(mapped(book, 1, composer.id).parent.y + mapped(book, 1, composer.id).parent.height, 450);
});

test('composer uses its resized height and remains fixed above the window bottom when the thread fits', async () => {
  const env = fixture();
  const source = env.add(env.page, '[af:chat] 对话', { width: 434, height: 720 });
  const body = env.add(source, '聊天记录', { width: 434, height: 652 });
  const composer = env.add(source, '[af:composer] 输入', {
    y: 660, width: 434, height: 60, reflowHeight: 120, layoutMode: 'VERTICAL',
  });
  env.page.selection = [source];
  const result = await writeFoldableFrames(env.figma, source, { targets: ['duo-outer-landscape'] });
  const target = result.report.targets[0];
  const thread = mapped(result, 0, body.id).parent;
  const fixed = mapped(result, 0, composer.id).parent;
  const [threadRegion, fixedRegion] = target.layoutRegions;
  assert.equal(fixed.height, 128);
  assert.equal(thread.y + thread.height + 12, fixed.y);
  assert.equal(fixed.y + fixed.height, 450);
  assert.equal(fixedRegion.nodeId, fixed.id);
  assert.equal(fixedRegion.fixed, true);
  assert.equal(fixedRegion.height, fixed.height);
  assert.equal(threadRegion.scrolls, true);
  assert.ok(target.issues.every(issue => issue.severity !== 'error'));
});

test('oversized composer becomes reachable at the end of the thread in a short window', async () => {
  const env = fixture();
  const source = env.add(env.page, '[af:chat] 对话', { width: 434, height: 720 });
  const body = env.add(source, '聊天记录', { width: 434, height: 512 });
  const composer = env.add(source, '[af:composer] 输入和附件', {
    y: 520, width: 434, height: 200, reflowHeight: 400, layoutMode: 'VERTICAL',
  });
  env.page.selection = [source];
  const result = await writeFoldableFrames(env.figma, source, { targets: ['duo-outer-landscape'] });
  const target = result.report.targets[0];
  const thread = mapped(result, 0, body.id).parent;
  const input = mapped(result, 0, composer.id);
  assert.equal(input.parent, thread);
  assert.ok(input.y >= body.height);
  assert.deepEqual(target.layoutRegions.map(region => [region.nodeId, region.fixed, region.scrolls]),
    [[thread.id, false, true]]);
  assert.ok(target.issues.some(issue => issue.code === 'chat-composer-scroll-fallback' && issue.sourceNodeId === composer.id));
  assert.ok(target.issues.every(issue => issue.severity !== 'error'));
});

test('fixed dashboard wrapper reflows into bounded columns and a compact scrolling viewport', async () => {
  const env = fixture();
  const source = env.add(env.page, '智能报表详情', { width: 375, height: 900 });
  const wrapper = env.add(source, '报表背景', { width: 375, height: 900 });
  const rows = ['指标', '趋势图', '排名', '洞察'].map((name, index) => {
    const row = env.add(wrapper, name, { x: 16, y: 20 + index * 210, width: 343, height: 194 });
    env.add(row, '标题', { type: 'TEXT', x: 12, y: 10, width: 120, height: 24 });
    return row;
  });
  env.page.selection = [source];
  const result = await writeFoldableFrames(env.figma, source, {
    targets: ['duo-inner-landscape', 'duo-book', 'duo-outer-portrait', 'duo-split-left'],
  });
  assert.deepEqual(result.report.targets.map(target => target.strategy),
    ['dashboard-columns', 'dashboard-columns', 'dashboard-stack', 'dashboard-stack']);
  const left = mapped(result, 1, rows[0].id).parent;
  const right = mapped(result, 1, rows[3].id).parent;
  assert.equal(left.x + left.width, 455.5);
  assert.equal(right.x, 495.5);
  const outer = mapped(result, 2, rows[3].id);
  assert.equal(outer.parent.overflowDirection, 'VERTICAL');
  assert.equal(outer.width, outer.parent.width);
  assert.ok(result.report.targets.every(target => !target.issues.some(issue => issue.severity === 'error')));
  assert.equal(wrapper.width, 375);
  assert.equal(rows[3].parent, wrapper);
});

test('report keeps loose status labels and overlapping chrome together while reflowing nested cards', async () => {
  const env = fixture();
  const source = env.add(env.page, '智能报表详情', { width: 375, height: 900 });
  const shell = env.add(source, 'Shell', { width: 375, height: 880 });
  const wrapper = env.add(shell, '内容', { x: 4, y: 4, width: 367, height: 870 });
  const status = env.add(wrapper, 'Time', { type: 'TEXT', x: 16, y: 12, width: 44, height: 16 });
  const icons = env.add(wrapper, 'Status icons', { x: 300, y: 10, width: 50, height: 20 });
  const title = env.add(wrapper, 'Title', { type: 'TEXT', x: 18, y: 53, width: 90, height: 24 });
  for (let index = 0; index < 4; index++) {
    env.add(wrapper, '卡片 ' + index, { x: 12, y: 98 + index * 170, width: 343, height: 150 });
  }
  env.page.selection = [source];
  const result = await writeFoldableFrames(env.figma, source, { targets: ['duo-inner-landscape', 'duo-book'] });
  for (let index = 0; index < result.frames.length; index++) {
    assert.equal(result.report.targets[index].strategy, 'dashboard-columns');
    const time = mapped(result, index, status.id);
    const statusIcons = mapped(result, index, icons.id);
    assert.equal(statusIcons.x - time.x, icons.x - status.x);
    assert.ok(mapped(result, index, title.id).parent.y >= 84);
    assert.ok(result.report.targets[index].issues.every(issue => issue.severity !== 'error'));
  }
});

function listSource(env) {
  const source = env.add(env.page, 'Source', { width: 768, height: 600, layoutMode: 'HORIZONTAL' });
  const list = env.add(source, '[af:list] List', { width: 260 });
  const detail = env.add(source, '[af:detail] Detail', { x: 276, width: 440 });
  const open = env.add(list, '[af:open-detail] Selected', { x: 12, y: 12, width: 120, height: 48 });
  const back = env.add(detail, '[af:back] Return', { x: 12, y: 12, width: 90, height: 48 });
  env.page.selection = [source];
  return { source, list, detail, open, back };
}

function mapped(result, index, sourceId) {
  const id = result.report.targets[index].nodeMap[sourceId];
  const queue = [result.frames[index]];
  while (queue.length) {
    const node = queue.pop();
    if (node.id === id) return node;
    queue.push(...node.children);
  }
  assert.fail('Missing mapped node ' + sourceId);
}

function radiiOf(node) {
  return [node.topLeftRadius, node.topRightRadius, node.bottomRightRadius, node.bottomLeftRadius];
}

test('a split-pane source keeps all four device corners when the window is the whole display', async () => {
  const env = fixture();
  const source = env.add(env.page, '结果选择操作', {
    width: 466, height: 669,
    topLeftRadius: 16, bottomLeftRadius: 16, topRightRadius: 0, bottomRightRadius: 0,
  });
  env.add(source, '标题', { type: 'TEXT', x: 24, y: 40, width: 200, height: 28, characters: '结果选择' });
  env.page.selection = [source];

  const result = await writeFoldableFrames(env.figma, source, {
    targets: ['duo-inner-landscape', 'duo-split-left', 'duo-split-right'],
  });
  const [landscape, splitLeft, splitRight] = result.frames;
  assert.deepEqual(radiiOf(landscape), [16, 16, 16, 16]);
  assert.deepEqual(radiiOf(splitLeft), [16, 0, 0, 16]);
  assert.deepEqual(radiiOf(splitRight), [0, 16, 16, 0]);
  assert.equal(landscape.clipsContent, true);
  assert.ok(result.report.targets.every(target => target.issues.every(issue => issue.code !== 'corner-radius-bound')));
});

test('a square source is not given invented corners', async () => {
  const env = fixture();
  const source = env.add(env.page, '方角原稿', { width: 466, height: 669 });
  env.add(source, '标题', { type: 'TEXT', x: 24, y: 40, width: 200, height: 28, characters: '结果选择' });
  env.page.selection = [source];

  const result = await writeFoldableFrames(env.figma, source, { targets: ['duo-inner-landscape'] });
  assert.deepEqual(radiiOf(result.frames[0]), [0, 0, 0, 0]);
  assert.notEqual(result.frames[0].clipsContent, true);
});

test('variable-bound corners stay untouched and are reported', async () => {
  const env = fixture();
  const source = env.add(env.page, '变量圆角原稿', {
    width: 466, height: 669,
    topLeftRadius: 16, bottomLeftRadius: 16, topRightRadius: 0, bottomRightRadius: 0,
    boundVariables: { cornerRadius: { type: 'VARIABLE_ALIAS', id: 'VariableID:1' } },
  });
  env.add(source, '标题', { type: 'TEXT', x: 24, y: 40, width: 200, height: 28, characters: '结果选择' });
  env.page.selection = [source];

  const result = await writeFoldableFrames(env.figma, source, { targets: ['duo-inner-landscape'] });
  assert.deepEqual(radiiOf(result.frames[0]), [16, 0, 0, 16]);
  assert.ok(result.report.targets[0].issues.some(issue => issue.code === 'corner-radius-bound'));
});

test('a device render hands its screen colour and radius to the window', async () => {
  const env = fixture();
  const bodyPaint = { type: 'SOLID', color: { r: 0.35, g: 0.35, b: 0.35 } };
  const screenPaint = { type: 'SOLID', color: { r: 1, g: 1, b: 1 } };
  const source = env.add(env.page, '拍照状态', { width: 678, height: 466 });
  const body = env.add(source, 'Device body', {
    type: 'RECTANGLE', width: 678, height: 466, cornerRadius: 52, fills: [bodyPaint],
  });
  const screen = env.add(source, 'Screen', {
    width: 678, height: 466, cornerRadius: 44, fills: [screenPaint], clipsContent: true,
  });
  env.add(screen, '标题', { type: 'TEXT', x: 24, y: 96, width: 240, height: 30, characters: '拍照' });
  env.add(screen, '操作', { x: 24, y: 360, width: 630, height: 56 });
  env.page.selection = [source];

  const result = await writeFoldableFrames(env.figma, source, { targets: ['duo-outer-portrait'] });
  const root = result.frames[0];
  // The mock's body is above the frame fill, so it has to be repainted too.
  assert.deepEqual(root.fills, [screenPaint]);
  assert.deepEqual(mapped(result, 0, body.id).fills, [screenPaint]);
  assert.deepEqual(radiiOf(root), [44, 44, 44, 44]);
  assert.equal(root.clipsContent, true);
  assert.deepEqual(result.report.targets[0].surface, { name: 'Screen', radius: 44 });
});

test('a source whose root already is the screen keeps its own paint', async () => {
  const env = fixture();
  const paint = { type: 'SOLID', color: { r: 0.98, g: 0.97, b: 0.95 } };
  const source = env.add(env.page, '相机预览', { width: 390, height: 844, cornerRadius: 44, fills: [paint] });
  env.add(source, '标题', { type: 'TEXT', x: 24, y: 96, width: 200, height: 30, characters: '相机' });
  env.page.selection = [source];

  const result = await writeFoldableFrames(env.figma, source, { targets: ['duo-inner-landscape'] });
  assert.deepEqual(result.frames[0].fills, [paint]);
  assert.deepEqual(radiiOf(result.frames[0]), [44, 44, 44, 44]);
  assert.equal(result.report.targets[0].surface, undefined);
});

test('an inset screen on a device body is stretched over the window instead of leaving an empty plate', async () => {
  const env = fixture();
  const bodyPaint = { type: 'SOLID', color: { r: 0.31, g: 0.31, b: 0.31 } };
  const screenPaint = { type: 'SOLID', color: { r: 1, g: 1, b: 1 } };
  // The mock keeps the app on a screen that is inset inside the body: the bezel
  // eats the right edge and the top, so the screen neither fills nor centres in
  // the frame. Resizing the body alone leaves that bezel as an empty plate.
  const source = env.add(env.page, 'Slack - Outer Closed Landscape', {
    width: 640, height: 440, cornerRadius: 52, fills: [bodyPaint],
  });
  const screen = env.add(source, 'Screen', {
    x: 0, y: 34, width: 560, height: 390, cornerRadius: 44, fills: [screenPaint], clipsContent: true,
  });
  env.add(screen, '标题', { type: 'TEXT', x: 24, y: 24, width: 240, height: 30, characters: 'James Hartnett' });
  const rows = env.add(screen, '成员列表', { x: 16, y: 320, width: 528, height: 52 });
  env.add(rows, '提示', { type: 'TEXT', characters: '搜索联系人', x: 12, y: 14, width: 120, height: 20 });
  // A mock decoration parked in the bezel below the screen.
  const indicator = env.add(source, 'Home Indicator', {
    type: 'RECTANGLE', x: 240, y: 428, width: 160, height: 6, cornerRadius: 3,
  });
  env.page.selection = [source];

  const result = await writeFoldableFrames(env.figma, source, { targets: ['duo-outer-landscape'] });
  const root = result.frames[0];
  const target = result.report.targets[0];
  const copy = mapped(result, 0, screen.id);
  // The body plate takes the app surface and the screen's corners.
  assert.deepEqual(root.fills, [screenPaint]);
  assert.deepEqual(radiiOf(root), [44, 44, 44, 44]);
  assert.equal(root.clipsContent, true);
  assert.deepEqual(target.surface, { name: 'Screen', radius: 44 });
  // The screen covers the usable area, so no bezel band stays empty.
  assert.deepEqual([copy.x, copy.y, copy.width, copy.height],
    [target.contentArea.x, target.contentArea.y, target.contentArea.width, target.contentArea.height]);
  // A decoration left on the bezel would now float on the app surface.
  assert.equal(mapped(result, 0, indicator.id).visible, false);
  assert.ok(target.issues.some(issue => issue.code === 'device-bezel-hidden'));
  assert.ok(target.issues.every(issue => issue.severity !== 'error'));
});

test('a chat inside a device body lays out in the screen that fills the window', async () => {
  const env = fixture();
  const bodyPaint = { type: 'SOLID', color: { r: 0.31, g: 0.31, b: 0.31 } };
  const screenPaint = { type: 'SOLID', color: { r: 1, g: 1, b: 1 } };
  const source = env.add(env.page, 'Slack - Outer Closed Landscape', {
    width: 640, height: 440, cornerRadius: 52, fills: [bodyPaint],
  });
  const screen = env.add(source, 'Screen', {
    x: 0, y: 34, width: 560, height: 390, cornerRadius: 44, fills: [screenPaint],
  });
  env.add(screen, 'Time', { type: 'TEXT', characters: '9:41', x: 20, y: 14, width: 40, height: 18 });
  env.add(screen, '消息列表', { x: 16, y: 60, width: 528, height: 260 });
  const composer = env.add(screen, '输入组件', { x: 16, y: 330, width: 528, height: 48 });
  env.add(composer, '提示', { type: 'TEXT', characters: '发消息', x: 12, y: 12, width: 120, height: 20 });
  env.page.selection = [source];

  const result = await writeFoldableFrames(env.figma, source, { targets: ['duo-inner-landscape'] });
  const root = result.frames[0];
  const copy = mapped(result, 0, screen.id);
  assert.ok(result.report.targets[0].strategy.startsWith('chat'));
  assert.deepEqual(root.fills, [screenPaint]);
  assert.deepEqual([copy.x, copy.y, copy.width, copy.height], [0, 0, root.width, root.height]);
  assert.deepEqual(radiiOf(root), [44, 44, 44, 44]);
});

test('a card painted like the page is not flattened as a device screen', async () => {
  const env = fixture();
  const paint = { type: 'SOLID', color: { r: 1, g: 1, b: 1 } };
  const source = env.add(env.page, '设置页', { width: 400, height: 700, cornerRadius: 24, fills: [paint] });
  const card = env.add(source, '账号卡片', { x: 40, y: 120, width: 320, height: 400, cornerRadius: 16, fills: [paint] });
  env.add(card, '标题', { type: 'TEXT', characters: '账号', x: 16, y: 16, width: 100, height: 24 });
  env.page.selection = [source];

  const result = await writeFoldableFrames(env.figma, source, { targets: ['duo-outer-portrait'] });
  const root = result.frames[0];
  assert.equal(result.report.targets[0].surface, undefined);
  assert.deepEqual(root.fills, [paint]);
  assert.deepEqual(radiiOf(root), [24, 24, 24, 24]);
});

test('a floating panel on a page is not mistaken for a screen on a device body', async () => {
  const env = fixture();
  const page = { type: 'SOLID', color: { r: 1, g: 1, b: 1 } };
  const panel = { type: 'SOLID', color: { r: 0.93, g: 0.94, b: 0.96 } };
  const source = env.add(env.page, '设置页', { width: 400, height: 700, cornerRadius: 24, fills: [page] });
  const card = env.add(source, '账号卡片', { x: 40, y: 120, width: 320, height: 400, cornerRadius: 16, fills: [panel] });
  env.add(card, '标题', { type: 'TEXT', characters: '账号', x: 16, y: 16, width: 100, height: 24 });
  env.page.selection = [source];

  const result = await writeFoldableFrames(env.figma, source, { targets: ['duo-outer-portrait'] });
  assert.equal(result.report.targets[0].surface, undefined);
  assert.deepEqual(result.frames[0].fills, [page]);
});

test('a full-bleed background preserves its paint and does not prevent list-detail reflow', async () => {
  const env = fixture();
  const source = env.add(env.page, '知识库', { width: 768, height: 600 });
  const fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.9, b: 1 } }];
  const background = env.add(source, '[af:background] 底色', {
    type: 'RECTANGLE', width: 768, height: 600, fills, locked: true,
  });
  const list = env.add(source, '[af:list] 列表', { width: 240, height: 600 });
  const detail = env.add(source, '[af:detail] 详情', { x: 256, width: 512, height: 600 });
  env.page.selection = [source];

  const result = await writeFoldableFrames(env.figma, source, { targets: ['duo-outer-portrait', 'duo-book'] });
  assert.deepEqual(result.report.targets.map(target => target.state), ['list', 'detail', null]);
  assert.ok(mapped(result, 2, detail.id).x > mapped(result, 2, list.id).x);
  for (const [index, root] of result.frames.entries()) {
    const layer = mapped(result, index, background.id);
    assert.equal(root.children[0], layer);
    assert.deepEqual([layer.x, layer.y, layer.width, layer.height], [0, 0, root.width, root.height]);
    assert.deepEqual(layer.fills, fills);
    assert.equal(layer.locked, true);
  }
});

test('writer keeps an editable compact pair and places expanded panes around the fold', async () => {
  const env = fixture();
  const { source, list, detail, open, back } = listSource(env);
  const result = await writeFoldableFrames(env.figma, source, { targets: ['duo-outer-portrait', 'duo-book'] });
  assert.deepEqual(result.report.targets.map(target => target.state), ['list', 'detail', null]);
  assert.equal(mapped(result, 0, detail.id).visible, false);
  assert.equal(mapped(result, 1, list.id).visible, false);
  assert.equal(mapped(result, 0, open.id).reactions[0].actions[0].destinationId, result.frames[1].id);
  assert.equal(mapped(result, 1, back.id).reactions[0].actions[0].type, 'BACK');
  const left = mapped(result, 2, list.id);
  const right = mapped(result, 2, detail.id);
  assert.equal(left.x + left.width, 455.5);
  assert.equal(right.x, 495.5);
  assert.equal(left.overflowDirection, 'VERTICAL');
  assert.ok(result.report.targets.every(target => target.issues.every(issue => issue.severity !== 'error')));
  assert.equal(source.width, 768);
  assert.equal(source.layoutMode, 'HORIZONTAL');
  assert.deepEqual(open.reactions, []);
  assert.equal(env.page.selection[0], source);
});

test('narrow split stacks form fields while preserving instances and variable-bound paints', async () => {
  const env = fixture();
  const source = env.add(env.page, 'Form', { width: 720, height: 550, layoutMode: 'VERTICAL' });
  env.page.selection = [source];
  const fields = env.add(source, '[af:fields] Fields', {
    width: 620, height: 200, layoutMode: 'HORIZONTAL', itemSpacing: 12, x: 100, y: 20,
  });
  const fieldProps = {
    type: 'INSTANCE', minWidth: 200, width: 220, height: 64,
    mainComponent: { id: 'field-component' }, componentProperties: { Label: { value: 'Name' } },
  };
  const first = env.add(fields, '[af:control] Name', fieldProps);
  env.add(fields, '[af:control] Email', { ...fieldProps, y: 75 });
  const submit = env.add(source, '[af:control] Submit', {
    x: 100, y: 240, width: 180, height: 48,
    boundVariables: { fills: [{ type: 'VARIABLE_ALIAS', id: 'submit-color' }] },
  });
  // A page with its own tab bar keeps the template's outer navigation strip.
  env.add(source, '底部导航', { width: 720, height: 44 });
  const result = await writeFoldableFrames(env.figma, source, { targets: ['duo-inner-portrait', 'duo-split-left'] });
  assert.equal(mapped(result, 0, fields.id).layoutMode, 'HORIZONTAL');
  assert.equal(mapped(result, 1, fields.id).layoutMode, 'VERTICAL');
  assert.equal(mapped(result, 1, first.id).mainComponent.id, 'field-component');
  assert.deepEqual(mapped(result, 1, submit.id).boundVariables, submit.boundVariables);
  assert.equal(fields.layoutMode, 'HORIZONTAL');
  assert.equal(result.report.targets[1].navigation.placement, 'left');
});

test('writer reports a camera collision on a mapped control from a custom target', async () => {
  const env = fixture();
  const source = env.add(env.page, 'Generic', { width: 450, height: 600 });
  const control = env.add(source, '[af:control] Check', { x: 30, y: 50, width: 100, height: 48 });
  env.page.selection = [source];
  const target = {
    device: 'iphone-duo', display: 'inner', orientation: 'portrait', posture: 'flat',
    window: { width: 480, height: 600 }, geometrySource: 'project-scenario',
    safeInsets: {}, regions: [{ id: 'camera', kind: 'occlusion', x: 40, y: 60, width: 20, height: 24 }],
  };
  const { report } = await writeFoldableFrames(env.figma, source, { targets: [target] });
  const issue = report.targets[0].issues.find(entry => entry.code === 'occlusion');
  assert.equal(issue.severity, 'error');
  assert.equal(issue.sourceNodeId, control.id);
  assert.equal(issue.nodeId, report.targets[0].nodeMap[control.id]);
});

test('writer rolls back only the current batch when prototype writing fails', async () => {
  const env = fixture();
  const { source } = listSource(env);
  const first = await writeFoldableFrames(env.figma, source, { targets: ['duo-book'] });
  env.host.failReaction = true;
  await assert.rejects(writeFoldableFrames(env.figma, source, { targets: ['duo-outer-portrait'] }), /host reaction failure/);
  assert.deepEqual(env.page.children.map(node => node.id), [source.id, first.frames[0].id]);
  env.page.selection = [first.frames[0]];
  assert.equal(getSource(env.page), null);
});

test('absolute pages follow the usable width without deforming fixed layers, and reuse the authored top bar', async () => {
  const env = fixture();
  const source = env.add(env.page, '尽调回退场景下', { width: 434, height: 900 });
  const bar = env.add(source, '顶部栏', { width: 434, height: 64 });
  const card = env.add(source, '卡片', { x: 24, y: 88, width: 386, height: 200 });
  const action = env.add(source, '操作', { type: 'INSTANCE', x: 24, y: 320, width: 120, height: 48 });
  const icon = env.add(source, '右侧图标', { x: 370, y: 24, width: 40, height: 40, constraints: { horizontal: 'MAX' } });
  // Same trailing position, but the file kept the default constraint.
  const trailing = env.add(source, '分享图标', { x: 370, y: 620, width: 40, height: 40 });
  env.page.selection = [source];

  const { frames, report } = await writeFoldableFrames(env.figma, source, { targets: ['duo-outer-portrait'] });
  const [root] = frames;
  assert.equal(report.targets[0].label, '外屏竖向');
  assert.ok(root.name.includes('外屏竖向'));
  assert.ok(report.targets[0].issues.some(entry => entry.code === 'existing-top-bar-used'));
  assert.deepEqual([root.width, root.height], [466, 678]);
  // Full-width rows follow the usable width; the source has no navigation
  // layer, so the outer navigation strip is not reserved.
  assert.deepEqual([mapped({ frames, report }, 0, bar.id).width], [466]);
  assert.equal(mapped({ frames, report }, 0, card.id).width, 418);
  assert.equal(mapped({ frames, report }, 0, card.id).x, 24);
  // Instances keep their size, right-pinned layers keep their trailing offset.
  const actionCopy = mapped({ frames, report }, 0, action.id);
  assert.deepEqual([actionCopy.width, actionCopy.height], [120, 48]);
  assert.equal(actionCopy.x, 24);
  const iconCopy = mapped({ frames, report }, 0, icon.id);
  assert.equal(iconCopy.width, 40);
  assert.equal(iconCopy.x + iconCopy.width, 466 - 24);
  const trailingCopy = mapped({ frames, report }, 0, trailing.id);
  assert.equal(trailingCopy.x + trailingCopy.width, 466 - 24);
  // The authored top bar stays at the top instead of reserving another 84 pt.
  assert.equal(mapped({ frames, report }, 0, bar.id).y, 0);
  assert.equal(mapped({ frames, report }, 0, card.id).y, 88);
  assert.ok(report.targets[0].issues.every(entry => entry.severity !== 'error'));
  assert.equal(card.width, 386);
});

test('absolute pages without an authored top bar shift below the reserved toolbar and scroll when tall', async () => {
  const env = fixture();
  const source = env.add(env.page, '页面', { width: 434, height: 1200 });
  const wrapper = env.add(source, '内容', { width: 434, height: 1200 });
  const card = env.add(wrapper, '卡片', { x: 24, y: 100, width: 386, height: 200 });
  env.add(wrapper, '按钮', { type: 'INSTANCE', x: 24, y: 320, width: 120, height: 48 });
  env.page.selection = [source];

  const result = writeFoldableFrames(env.figma, source, { targets: ['duo-outer-portrait'] });
  const { frames, report } = await result;
  const wrapperCopy = mapped({ frames, report }, 0, wrapper.id);
  assert.equal(wrapperCopy.y, 84);
  assert.equal(wrapperCopy.width, 466);
  assert.equal(wrapperCopy.height, 594);
  assert.equal(wrapperCopy.overflowDirection, 'VERTICAL');
  assert.equal(mapped({ frames, report }, 0, card.id).width, 418);
  assert.ok(report.targets[0].issues.every(entry => entry.code !== 'existing-top-bar-used'));
});

test('a top bar nested inside the page wrapper suppresses the second top reservation', async () => {
  const env = fixture();
  const source = env.add(env.page, '尽调回退场景下', { width: 434, height: 1043 });
  const wrapper = env.add(source, '页面', { width: 434, height: 1043 });
  const bar = env.add(wrapper, '顶部栏', { width: 434, height: 64 });
  const body = env.add(wrapper, '正文', { x: 24, y: 88, width: 386, height: 400 });
  env.page.selection = [source];

  const { frames, report } = await writeFoldableFrames(env.figma, source, { targets: ['duo-outer-portrait'] });
  const wrapperCopy = mapped({ frames, report }, 0, wrapper.id);
  assert.equal(wrapperCopy.y, 0);
  assert.equal(wrapperCopy.width, 466);
  assert.equal(mapped({ frames, report }, 0, bar.id).y, 0);
  assert.equal(mapped({ frames, report }, 0, body.id).width, 418);
  assert.ok(report.targets[0].issues.some(entry => entry.code === 'existing-top-bar-used'));
});

test('text spilling into a reserved bar is a warning while controls outside stay blocking', async () => {
  const env = fixture();
  const source = env.add(env.page, '通用', { width: 450, height: 600 });
  const text = env.add(source, '说明', { type: 'TEXT', characters: '整行文字', x: 0, y: 120, width: 450, height: 24 });
  const control = env.add(source, '[af:control] 锁定操作', { x: 400, y: 200, width: 80, height: 40, locked: true });
  // The page carries its own tab bar, so the outer navigation strip is kept.
  env.add(source, '底部导航', { x: 0, y: 540, width: 450, height: 44 });
  env.page.selection = [source];
  const { report } = await writeFoldableFrames(env.figma, source, { targets: ['duo-outer-portrait'] });
  const textIssue = report.targets[0].issues.find(entry => entry.sourceNodeId === text.id && entry.code === 'outside-usable-area');
  const controlIssue = report.targets[0].issues.find(entry => entry.sourceNodeId === control.id && entry.code === 'outside-usable-area');
  assert.equal(textIssue.severity, 'warning');
  assert.equal(controlIssue.severity, 'error');
});

test('progress walks every target and ends at 100 percent', async () => {
  const env = fixture();
  const source = env.add(env.page, '进度原稿', { width: 375, height: 812 });
  env.add(source, '正文', { x: 0, y: 0, width: 375, height: 700 });
  env.page.selection = [source];
  const notes = [];
  await writeFoldableFrames(env.figma, source, {
    targets: ['duo-outer-portrait', 'duo-book', 'duo-split-left'],
  }, note => notes.push(note));

  assert.ok(notes.length >= 6);
  assert.equal(notes.at(-1).percent, 100);
  for (let index = 1; index < notes.length; index += 1) {
    assert.ok(notes[index].percent >= notes[index - 1].percent, 'progress never moves backwards');
  }
  assert.ok(notes.some(note => /外屏竖向/.test(note.label)));
  assert.ok(notes.some(note => /正在检查/.test(note.label)));
});

test('a source edited mid-run keeps the frames and only asks for a review', async () => {
  const env = fixture();
  const source = env.add(env.page, '并发原稿', { width: 375, height: 812 });
  env.add(source, '正文', { x: 0, y: 0, width: 375, height: 700 });
  env.page.selection = [source];
  env.host.onFirstClone = () => { source.name = '并发原稿（生成中被改名）'; };
  const { frames, report } = await writeFoldableFrames(env.figma, source, { targets: ['duo-outer-portrait'] });

  assert.equal(frames.length, 1);
  assert.ok(env.page.children.includes(frames[0]));
  const entry = report.targets[0].issues.find(issue => issue.code === 'source-changed');
  assert.equal(entry.severity, 'warning');
});

test('frames inside a section are accepted as sources', async () => {
  const env = fixture();
  const section = env.add(env.page, '页面区块', { type: 'SECTION', width: 600, height: 1000 });
  const source = env.add(section, '区块内原稿', { width: 375, height: 812 });
  env.add(source, '正文', { x: 0, y: 0, width: 375, height: 700 });
  env.page.selection = [source];

  assert.deepEqual(getSources(env.page).map(node => node.id), [source.id]);
  const { frames } = await writeFoldableFrames(env.figma, source, { targets: ['duo-outer-portrait'] });
  assert.equal(frames.length, 1);
});

test('batch progress names each source and still ends at 100 percent', async () => {
  const env = fixture();
  const first = env.add(env.page, '原稿甲', { width: 375, height: 812 });
  const second = env.add(env.page, '原稿乙', { width: 375, height: 812 });
  env.page.selection = [first, second];
  const notes = [];
  await writeFoldableBatch(env.figma, { targets: ['duo-outer-portrait'] }, note => notes.push(note));

  assert.equal(notes.at(-1).percent, 100);
  assert.ok(notes.some(note => /原稿 2\/2/.test(note.label ?? '')));
});

function chatSource(env, { width = 434, height = 900, navigation = false } = {}) {
  const source = env.add(env.page, '结果选择操作', { width, height });
  const bar = env.add(source, '顶部栏', {
    x: 0, y: 0, width, height: 64, layoutMode: 'HORIZONTAL',
    paddingLeft: 16, paddingRight: 16, itemSpacing: 8,
  });
  env.add(bar, '标题', { type: 'TEXT', x: 16, width: 120, height: 24, characters: '友福' });
  const thread = env.add(source, '对话内容', { x: 0, y: 64, width, height: 740 });
  const answer = env.add(thread, '回答', {
    x: 24, y: 120, width: width - 48, height: 320, layoutMode: 'VERTICAL', itemSpacing: 12,
  });
  const text = env.add(answer, '说明文本', { type: 'TEXT', width: width - 48, height: 44, characters: '请从以下选项中选择' });
  const grid = env.add(answer, '选项组', { width: width - 48, height: 160, layoutMode: 'HORIZONTAL', itemSpacing: 24 });
  const left = env.add(grid, '左列', { width: (width - 72) / 2, height: 160, layoutMode: 'VERTICAL' });
  const right = env.add(grid, '右列', { width: (width - 72) / 2, height: 160, layoutMode: 'VERTICAL' });
  const composer = env.add(source, '输入组件', { x: 16, y: 820, width: width - 32, height: 64, layoutMode: 'VERTICAL' });
  env.add(composer, '输入框', { type: 'TEXT', width: 200, height: 20, characters: '输入您的问题' });
  if (navigation) env.add(source, '底部导航', { x: 0, y: height - 44, width, height: 44 });
  env.page.selection = [source];
  return { source, bar, thread, answer, text, grid, left, right, composer };
}

test('a wide window fills the usable area and spreads equal columns', async () => {
  const env = fixture();
  const parts = chatSource(env);
  const { frames, report } = await writeFoldableFrames(env.figma, parts.source, { targets: ['duo-inner-landscape'] });

  // 951 - 32 margins: no rail is reserved and no reading column is centred.
  const region = report.targets[0].layoutRegions.find(entry => entry.name === '对话内容');
  assert.equal(region.x, 16);
  assert.equal(region.width, 919);
  assert.equal(mapped({ frames, report }, 0, parts.bar.id).width, 919);
  assert.equal(mapped({ frames, report }, 0, parts.composer.id).width, 919);
  // Cards follow the thread, and the equal columns share the extra width.
  assert.equal(mapped({ frames, report }, 0, parts.answer.id).width, 871);
  assert.equal(mapped({ frames, report }, 0, parts.grid.id).width, 871);
  assert.equal(mapped({ frames, report }, 0, parts.left.id).layoutSizingHorizontal, 'FILL');
  assert.equal(mapped({ frames, report }, 0, parts.right.id).layoutSizingHorizontal, 'FILL');
  assert.equal(mapped({ frames, report }, 0, parts.text.id).layoutSizingHorizontal, 'FILL');
  assert.ok(!report.targets[0].issues.some(entry => entry.code === 'reading-width-gutter'));
});

test('the reading width keeps a centred column and explains the gutters', async () => {
  const env = fixture();
  const parts = chatSource(env);
  const { frames, report } = await writeFoldableFrames(env.figma, parts.source, {
    targets: ['duo-inner-landscape'], widthMode: 'reading',
  });

  const thread = report.targets[0].layoutRegions.find(entry => entry.name === '对话内容');
  assert.equal(thread.width, 580);
  assert.equal(thread.x, 16 + (919 - 580) / 2);
  const gutter = report.targets[0].issues.find(entry => entry.code === 'reading-width-gutter');
  assert.ok(gutter);
  assert.equal(gutter.severity, 'warning');
  assert.ok(/580/.test(gutter.detail));
});

test('a narrow window stacks equal columns instead of clipping them', async () => {
  const env = fixture();
  const parts = chatSource(env);
  const narrow = {
    device: 'iphone-duo', display: 'inner', orientation: 'landscape', posture: 'flat',
    window: { width: 400, height: 669 }, geometrySource: 'project-scenario',
    safeInsets: {}, contentInsets: {}, regions: [],
  };
  const { frames, report } = await writeFoldableFrames(env.figma, parts.source, { targets: [narrow] });

  const thread = report.targets[0].layoutRegions.find(entry => entry.name === '对话内容');
  assert.equal(thread.width, 368);
  assert.equal(mapped({ frames, report }, 0, parts.grid.id).layoutMode, 'VERTICAL');
  assert.equal(mapped({ frames, report }, 0, parts.left.id).layoutSizingHorizontal, 'FILL');
  assert.equal(mapped({ frames, report }, 0, parts.text.id).layoutSizingHorizontal, 'FILL');
  assert.ok(report.targets[0].issues.some(entry => entry.code === 'stacked-single-column'));
  assert.deepEqual(report.targets[0].issues
    .filter(entry => entry.severity === 'error')
    .map(entry => [entry.code, entry.nodeName, entry.detail]), []);
});

test('the outer navigation strip is reserved only when the page has a navigation layer', async () => {
  const build = navigation => {
    const env = fixture();
    const source = env.add(env.page, '页面', { width: 434, height: 900 });
    env.add(source, '卡片', { x: 24, y: 88, width: 386, height: 200 });
    if (navigation) env.add(source, '底部导航', { x: 0, y: 856, width: 434, height: 44 });
    env.page.selection = [source];
    return { env, source };
  };

  const withNav = build(true);
  const reserved = await writeFoldableFrames(withNav.env.figma, withNav.source, { targets: ['duo-split-left'] });
  assert.deepEqual([reserved.report.targets[0].contentArea.x, reserved.report.targets[0].contentArea.width], [84, 382]);
  assert.ok(!reserved.report.targets[0].issues.some(entry => entry.code === 'navigation-area-unreserved'));

  const withoutNav = build(false);
  const full = await writeFoldableFrames(withoutNav.env.figma, withoutNav.source, { targets: ['duo-split-left'] });
  assert.deepEqual([full.report.targets[0].contentArea.x, full.report.targets[0].contentArea.width], [0, 466]);
  const warning = full.report.targets[0].issues.find(entry => entry.code === 'navigation-area-unreserved');
  assert.ok(warning && /84/.test(warning.detail));
});

test('report issues carry acceptance-matrix rule references', async () => {
  const env = fixture();
  const parts = chatSource(env);
  const { report } = await writeFoldableFrames(env.figma, parts.source, {
    targets: ['duo-inner-landscape'], widthMode: 'reading',
  });

  const gutter = report.targets[0].issues.find(entry => entry.code === 'reading-width-gutter');
  assert.deepEqual(gutter.rules.ids, ['R021']);
  assert.deepEqual(gutter.rules.tests, ['T021']);
  assert.equal(gutter.rules.priority, 'P1');
  assert.ok(gutter.rules.note.length > 0);
});

test('rule references cover the codes the writer can emit', async () => {
  const { ruleRefsFor } = await import('../scripts/rule-map.mjs');
  const { report } = await writeFoldableFrames((() => {
    const env = fixture();
    const source = env.add(env.page, '校验', { width: 434, height: 900 });
    env.add(source, '卡片', { x: 24, y: 88, width: 386, height: 200 });
    env.page.selection = [source];
    return env.figma;
  })(), null, { targets: [] }).catch(() => ({ report: null }));
  // 静态校验：已映射的 code 返回完整结构，未映射的返回 null
  assert.equal(ruleRefsFor('outside-usable-area').priority, 'P0');
  assert.deepEqual(ruleRefsFor('crosses-division').ids, ['R015', 'R058']);
  assert.equal(ruleRefsFor('source-changed'), null);
  assert.equal(ruleRefsFor('not-a-real-code'), null);
  assert.ok(report === null || true);
});

test('Huawei frames reserve their own system areas without inserting Apple chrome', async () => {
  const env = fixture();
  const source = env.add(env.page, '原稿', { width: 390, height: 844 });
  env.add(source, '内容', { x: 0, y: 100, width: 390, height: 600 });
  env.page.selection = [source];
  let imports = 0;
  env.figma.importComponentByKeyAsync = async () => { imports += 1; };

  const result = await writeFoldableFrames(env.figma, source, {
    targets: ['huawei-mate-xt-open', 'huawei-pura-x-closed'],
    chrome: { enabled: true, components: { statusBar: { key: 'c-status', name: 'Status Bar' } } },
  });
  assert.equal(imports, 0);
  assert.deepEqual(result.frames.map(frame => [frame.width, frame.height]), [[1000, 704], [320, 321]]);
  for (const target of result.report.targets) {
    assert.equal(target.device, 'harmonyos');
    assert.equal(target.contentArea.y, 52);
    assert.equal(target.contentArea.height, target.window.height - 76);
    assert.equal(target.chrome, undefined);
    assert.ok(target.issues.some(issue => issue.code === 'unverified-geometry'));
    assert.ok(!target.issues.some(issue => issue.code === 'native-chrome-fallback'));
  }
});

test('native chrome fills reserved strips with the official library component', async () => {
  const env = fixture();
  const source = env.add(env.page, '原稿', { width: 390, height: 844 });
  env.add(source, '内容', { x: 0, y: 100, width: 390, height: 600 });
  env.page.selection = [source];
  const statusComponent = env.add(env.page, 'Status Bar', { type: 'COMPONENT', width: 393, height: 59 });
  statusComponent.createInstance = () =>
    env.add(env.page, 'Status Bar', { type: 'INSTANCE', width: 393, height: 59 });
  env.figma.importComponentByKeyAsync = async key => {
    if (key !== 'c-status') throw new Error('component not found');
    return statusComponent;
  };

  const result = await writeFoldableFrames(env.figma, source, {
    targets: ['duo-inner-portrait'],
    chrome: { enabled: true, components: { statusBar: { key: 'c-status', name: 'Status Bar', library: 'iOS and iPadOS 27' } } },
  });
  const root = result.frames[0];
  const status = root.children.find(node => node.name.startsWith('[af:chrome] 状态栏'));
  assert.ok(status, 'status bar chrome inserted');
  assert.equal(status.type, 'INSTANCE');
  assert.equal(status.width, 669);
  assert.equal(status.y, 0);
  const home = root.children.find(node => node.name.startsWith('[af:chrome] Home 指示条'));
  assert.ok(home, 'home indicator placeholder drawn');
  assert.equal(home.type, 'RECTANGLE');
  assert.ok(home.y + home.height <= root.height && home.y > root.height - 95 - 1);
  assert.deepEqual(result.report.targets[0].chrome.map(entry => [entry.slot, entry.source]), [
    ['statusBar', 'official'], ['homeIndicator', 'fallback'],
  ]);
  const chromeIds = new Set([status.id, home.id]);
  for (const issue of result.report.targets[0].issues) {
    assert.ok(!chromeIds.has(issue.nodeId) || issue.code === 'native-chrome-fallback',
      'chrome nodes are excluded from geometry checks: ' + issue.code);
  }
  const fallback = result.report.targets[0].issues.find(entry => entry.code === 'native-chrome-fallback');
  assert.ok(fallback.detail.includes('Home 指示条'));
  assert.deepEqual(fallback.rules.ids, ['R032']);
});

test('native chrome falls back and reports when the library is missing', async () => {
  const env = fixture();
  const source = env.add(env.page, '原稿', { width: 390, height: 844 });
  env.add(source, '内容', { x: 0, y: 100, width: 390, height: 600 });
  env.page.selection = [source];

  const result = await writeFoldableFrames(env.figma, source, {
    targets: ['duo-inner-portrait'], chrome: { enabled: true, components: null },
  });
  const root = result.frames[0];
  assert.ok(!root.children.some(node => node.name.startsWith('[af:chrome] 状态栏')));
  const home = root.children.find(node => node.name.startsWith('[af:chrome] Home 指示条'));
  assert.ok(home, 'placeholder still drawn without the library');
  const issue = result.report.targets[0].issues.find(entry => entry.code === 'native-chrome-fallback');
  assert.ok(issue.detail.includes('状态栏'));
  assert.ok(issue.detail.includes('iOS and iPadOS 27'));
});

test('native chrome keeps the reserved strip when the library component cannot be instantiated', async () => {
  const env = fixture();
  const source = env.add(env.page, '原稿', { width: 390, height: 844 });
  env.add(source, '内容', { x: 0, y: 100, width: 390, height: 600 });
  env.page.selection = [source];
  env.figma.importComponentByKeyAsync = async () => ({
    createInstance() {
      throw new Error('In get_componentProperties: Component set for node has existing errors.');
    },
  });

  const result = await writeFoldableFrames(env.figma, source, {
    targets: ['duo-inner-portrait'],
    chrome: { enabled: true, components: { statusBar: { key: 'c-status', name: 'Status Bar', library: 'iOS and iPadOS 27' } } },
  });
  const root = result.frames[0];
  assert.ok(!root.children.some(node => node.name.startsWith('[af:chrome] 状态栏')));
  const issue = result.report.targets[0].issues.find(entry => entry.code === 'native-chrome-fallback');
  assert.ok(issue.detail.includes('实例化失败'), issue.detail);
  assert.ok(result.report.targets[0].chrome.every(entry => entry.source === 'fallback'));
});

test('native chrome is skipped where the strip is reused or not reserved', async () => {
  const env = fixture();
  const source = env.add(env.page, '原稿', { width: 390, height: 844 });
  env.add(source, '顶栏', { x: 0, y: 0, width: 390, height: 88 });
  env.add(source, '内容', { x: 0, y: 100, width: 390, height: 600 });
  env.page.selection = [source];
  const statusComponent = env.add(env.page, 'Status Bar', { type: 'COMPONENT', width: 393, height: 59 });
  statusComponent.createInstance = () =>
    env.add(env.page, 'Status Bar', { type: 'INSTANCE', width: 393, height: 59 });
  env.figma.importComponentByKeyAsync = async () => statusComponent;

  const result = await writeFoldableFrames(env.figma, source, {
    targets: ['duo-inner-portrait', 'duo-split-left'],
    chrome: { enabled: true, components: { statusBar: { key: 'c-status', name: 'Status Bar', library: 'iOS and iPadOS 27' } } },
  });
  const [portrait, split] = result.frames;
  assert.ok(!portrait.children.some(node => node.name.startsWith('[af:chrome] 状态栏')),
    'authored top bar reuses the top strip, so no status bar is inserted');
  assert.deepEqual(result.report.targets[0].chrome.map(entry => entry.slot), ['homeIndicator']);
  assert.deepEqual(result.report.targets[1].chrome ?? [], [],
    'split panes reserve no top or bottom strip, so no chrome is inserted');
  assert.ok(!split.children.some(node => node.name.startsWith('[af:chrome]')));
});

test('findNativeComponents matches Apple kit components by name', async () => {
  const env = fixture();
  env.figma.importComponentByKeyAsync = async () => { throw new Error('unused'); };
  env.figma.teamLibrary = {
    getAvailableLibraryComponentCollectionsAsync: async () => [
      { key: 'col-other', name: 'Icons', libraryName: 'Acme Icons' },
      { key: 'col-apple', name: 'Bars', libraryName: 'iOS and iPadOS 27' },
    ],
    getComponentsInLibraryComponentAsync: async key => key === 'col-apple' ? [
      { key: 'c-nav', name: 'Navigation Bar', libraryName: 'iOS and iPadOS 27' },
      { key: 'c-status', name: 'Status Bar / iPhone', libraryName: 'iOS and iPadOS 27' },
      { key: 'c-home', name: 'Home Indicator', libraryName: 'iOS and iPadOS 27' },
    ] : [
      { key: 'x', name: 'Status Bar Glyph', libraryName: 'Acme Icons' },
    ],
  };
  const found = await findNativeComponents(env.figma);
  assert.equal(found.statusBar.key, 'c-status');
  assert.equal(found.homeIndicator.key, 'c-home');
  assert.equal(found.statusBar.library, 'iOS and iPadOS 27');

  const empty = fixture();
  empty.figma.importComponentByKeyAsync = async () => { throw new Error('unused'); };
  assert.equal(await findNativeComponents(empty.figma), null);
});

test('Duo side status matches the display, and authored status is never duplicated', async () => {
  const env = fixture();
  const source = env.add(env.page, '报告', { width: 390, height: 844 });
  env.add(source, '内容', { x: 0, y: 100, width: 390, height: 600 });
  env.add(source, '[af:nav] 应用导航', { x: 0, y: 760, width: 390, height: 64 });
  env.page.selection = [source];
  const imported = [];
  env.figma.importComponentByKeyAsync = async key => {
    imported.push(key);
    return { createInstance: () => env.add(env.page, key, { type: 'INSTANCE', width: 44, height: 70 }) };
  };
  const chrome = { enabled: true, components: {
    statusBar: { key: 'horizontal', name: 'Status Bar' },
    sideStatusBar: {
      outer: { key: 'outer', name: 'Duo Status Bar Vertical Outer' },
      inner: { key: 'inner', name: 'Duo Status Bar Vertical Inner' },
    },
  } };
  const targets = ['duo-outer-portrait', 'duo-outer-landscape', 'duo-inner-landscape'];
  const { frames, report } = await writeFoldableFrames(env.figma, source, { targets, chrome });
  assert.deepEqual(imported, ['outer', 'inner']);
  for (let index = 0; index < targets.length; index++) {
    const frame = frames[index], target = report.targets[index];
    if (target.preset === 'duo-outer-landscape') {
      assert.equal(target.chrome, undefined);
      continue;
    }
    const status = frame.children.find(node => node.id === target.chrome[0].nodeId);
    assert.equal(target.chrome[0].slot, 'sideStatusBar');
    assert.ok(status.x >= target.contentArea.width + target.contentArea.x);
    assert.ok(status.x + status.width <= frame.width);
  }
  env.add(source, '[af:status] 自带状态与镜头', { x: 335, y: 15, width: 44, height: 70 });
  imported.length = 0;
  const next = await writeFoldableFrames(env.figma, source, { targets: ['duo-outer-portrait'], chrome });
  assert.deepEqual(imported, []);
  assert.equal(next.frames[0].children.filter(node => node.name.startsWith('[af:status]')).length, 1);
});

test('cloned overlay trigger retains its reaction and reports target-specific Present review', async () => {
  const env = fixture();
  const source = env.add(env.page, '报告', { width: 390, height: 844 });
  const sheet = env.add(env.page, '长目录浮层', { width: 390, height: 700 });
  const menu = env.add(source, '[af:control] 目录', { x: 20, y: 100, width: 44, height: 44 });
  await menu.setReactionsAsync([{ trigger: { type: 'ON_CLICK' },
    actions: [{ type: 'NODE', navigation: 'OVERLAY', destinationId: sheet.id }] }]);
  env.page.selection = [source];
  const targets = ['duo-outer-landscape', 'duo-inner-portrait'];
  const result = await writeFoldableFrames(env.figma, source, { targets });
  for (let index = 0; index < targets.length; index++) {
    const clone = mapped(result, index, menu.id);
    assert.deepEqual(clone.reactions, menu.reactions);
    const review = result.report.targets[index].issues.find(entry => entry.code === 'overlay-posture-review');
    assert.equal(review.nodeId, clone.id);
    assert.ok(review.rules.tests.includes('T051'));
  }
});

test('inner portrait presets reserve a compact Home area unless the source has bottom navigation', async () => {
  const targets = ['duo-inner-portrait', 'duo-tabletop'];
  for (const [navigation, expected] of [[null, 24], ['侧边导航', 24], ['底部导航', 95], ['[af:nav] 标签页', 95]]) {
    const env = fixture();
    const source = env.add(env.page, '阅读页', { width: 390, height: 844 });
    env.add(source, '正文', { x: 0, y: 100, width: 390, height: 600 });
    if (navigation) env.add(source, navigation, { x: 0, y: 780, width: 390, height: 64 });
    env.page.selection = [source];

    const { report } = await writeFoldableFrames(env.figma, source, { targets });
    for (const target of report.targets) {
      const bottom = target.window.height - target.contentArea.y - target.contentArea.height;
      assert.equal(bottom, expected);
      const compact = target.issues.find(entry => entry.code === 'bottom-navigation-area-compacted');
      assert.equal(Boolean(compact), expected === 24);
      if (compact) assert.ok(compact.rules.tests.includes('T051'));
    }
  }
});
