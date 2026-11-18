import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { planFoldable, validateLayout } from './foldable.mjs';
import { getPreset, presetIds } from './presets.mjs';

const list = { type: 'list-detail' };
const box = (x, y, width, height) => ({ x, y, width, height });
const node = (id, role, bounds) => ({ id, role, bounds });

test('all named presets have usable content and disclose their geometry source', () => {
  for (const target of presetIds) {
    const plan = planFoldable({ target });
    assert.equal(plan.content.type, 'single', target);
    assert.ok(plan.warnings.some(item => item.code === 'unverified-geometry'), target);
    assert.ok(plan.contentRegions.every(rect => rect.width > 0 && rect.height > 0), target);
  }
});

test('outer displays use one pane and retain destinations or task actions on short bars', () => {
  const portrait = planFoldable({ target: 'duo-outer-portrait', page: list });
  assert.equal(portrait.content.navigation, 'drill-in');
  assert.equal(portrait.navigation.placement, 'right');
  assert.equal(portrait.navigation.compression, 'standard');
  const landscape = planFoldable({ target: 'duo-outer-landscape', page: list });
  assert.equal(landscape.content.type, 'single');
  assert.equal(landscape.navigation.compression, 'toolbar-overflow');
  const task = planFoldable({ target: 'duo-outer-landscape', page: { ...list, taskFocused: true } });
  assert.equal(task.navigation.compression, 'minimize-tab-bar');
});

test('inner display expands the sidebar and detail only when both fit', () => {
  const portrait = planFoldable({ target: 'duo-inner-portrait', page: { ...list, sidebar: true } });
  assert.equal(portrait.navigation.placement, 'bottom');
  assert.equal(portrait.navigation.toolbarPlacement, 'top');
  assert.equal(portrait.content.type, 'list-detail');
  assert.equal(portrait.content.listRole, 'sidebar');
  assert.ok(portrait.content.detail.width >= 320);
  const constrained = planFoldable({
    target: 'duo-inner-portrait', page: list, policy: { detailMinWidth: 400 },
  });
  assert.equal(constrained.content.navigation, 'drill-in');
});

test('book layout keeps semantic groups and balanced grid on separate sides', () => {
  const ltr = planFoldable({ target: 'duo-book', page: list });
  const rtl = planFoldable({ target: 'duo-book', page: list, direction: 'rtl' });
  assert.equal(ltr.content.type, 'list-detail');
  assert.equal(ltr.content.list.x + ltr.content.list.width, 455.5);
  assert.equal(ltr.content.detail.x, 495.5);
  assert.equal(rtl.content.list.x, ltr.content.detail.x);
  assert.equal(rtl.navigation.placement, ltr.navigation.placement);
  const grid = planFoldable({ target: 'duo-book', page: { type: 'grid' } });
  assert.deepEqual(grid.content.groups.map(group => group.columns), [2, 2]);
  const tooNarrow = planFoldable({ target: 'duo-book', page: list, policy: { detailMinWidth: 360 } });
  assert.equal(tooNarrow.content.type, 'single');
});

test('tabletop reserves upper media and lower controls when height permits', () => {
  const page = { type: 'media' };
  const plan = planFoldable({ target: 'duo-tabletop', page });
  assert.equal(plan.content.type, 'tabletop');
  assert.equal(plan.content.media.y + plan.content.media.height, 455.5);
  assert.equal(plan.content.controls.y, 495.5);
  assert.equal(planFoldable({
    target: 'duo-tabletop', page, policy: { controlsMinHeight: 400 },
  }).content.type, 'single');
});

test('resizing a multitasking window reruns layout and preserves physical bar side', () => {
  const left = planFoldable({ target: 'duo-split-left', page: list, direction: 'rtl' });
  const right = planFoldable({ target: 'duo-split-right', page: list, direction: 'rtl' });
  assert.equal(left.content.type, 'single');
  assert.equal(left.navigation.placement, 'left');
  assert.equal(right.navigation.placement, 'right');
  const window = { ...getPreset('duo-split-left'), window: { width: 760, height: 620 }, navigationEdge: 'right' };
  const widened = planFoldable({ target: window, page: list });
  assert.equal(widened.content.type, 'list-detail');
  assert.equal(widened.navigation.toolbarPlacement, 'left');
  assert.deepEqual(widened.preserveState, left.preserveState);
});

test('validator checks whole touch bounds and allows a continuous container over a soft fold', () => {
  const plan = planFoldable({ target: 'duo-book', page: { type: 'continuous' } });
  assert.equal(plan.content.type, 'continuous');
  const issues = validateLayout(plan, [
    node('touch-crosses', 'control', box(410, 300, 52, 48)),
    node('touch-edge', 'control', box(411.5, 300, 44, 44)),
    node('touch-small', 'control', box(520, 120, 40, 40)),
    node('article', 'continuous', box(200, 200, 600, 90)),
    node('article-action', 'control', box(470, 210, 44, 44)),
    node('outside-content', 'critical-content', box(880, 100, 60, 50)),
    node('side-bar', 'navigation-control', box(880, 100, 60, 50)),
  ]);
  assert.deepEqual(issues.map(({ nodeId, code }) => [nodeId, code]), [
    ['touch-crosses', 'crosses-division'],
    ['touch-small', 'small-touch-target'],
    ['article-action', 'crosses-division'],
    ['outside-content', 'outside-usable-area'],
  ]);
});

test('local camera occlusion is reported and inactive geometry is ignored', () => {
  const target = getPreset('duo-inner-landscape');
  target.regions = [
    { id: 'camera', kind: 'occlusion', ...box(120, 90, 50, 60) },
    { id: 'fold', kind: 'division', axis: 'vertical', active: false, ...box(475.5, 0, 0, 669) },
  ];
  const plan = planFoldable({ target, page: list });
  assert.equal(plan.contentRegions.length, 1);
  assert.ok(plan.warnings.some(warning => warning.code === 'review-occlusion-in-content'));
  assert.deepEqual(validateLayout(plan, [
    node('image', 'critical-content', box(130, 100, 180, 90)),
    node('background', 'decoration', box(0, 0, 951, 669)),
    node('fold-button', 'control', box(460, 300, 44, 44)),
  ]).map(issue => issue.regionId), ['camera']);
});

test('Android separates zero-width folds and keeps continuous content clear of an opaque hinge', () => {
  const target = {
    device: 'android', display: 'inner', orientation: 'landscape', posture: 'flat',
    window: { width: 800, height: 640 }, safeInsets: { top: 20, left: 12, right: 24 },
    geometrySource: 'device',
    regions: [{ id: 'hinge', kind: 'division', axis: 'vertical', ...box(385, 0, 0, 640) }],
  };
  const plan = planFoldable({ target, page: list });
  assert.equal(plan.content.type, 'list-detail');
  assert.equal(plan.content.list.x, 28);
  assert.equal(plan.content.detail.x, 385);
  assert.equal(plan.navigation.placement, 'bottom');
  assert.deepEqual(validateLayout(plan, [
    node('crosses', 'control', box(365, 60, 44, 44)),
  ]).map(issue => issue.code), ['small-touch-target', 'crosses-division']);
  target.regions = [{ ...target.regions[0], width: 20, occludes: true }];
  const solid = planFoldable({ target, page: { type: 'continuous' } });
  assert.equal(solid.content.type, 'single');
  assert.equal(validateLayout(solid, [
    node('article', 'continuous', box(200, 60, 400, 100)),
  ])[0].code, 'crosses-division');
});

test('Mate XT simulates an uninterrupted window and accepts two measured fold regions', () => {
  const preview = planFoldable({ target: 'huawei-mate-xt-open', page: list });
  assert.equal(preview.target.device, 'harmonyos');
  assert.equal(preview.navigation.placement, 'bottom');
  assert.equal(preview.content.type, 'list-detail');
  assert.equal(preview.regions.length, 0);

  const measured = planFoldable({
    target: {
      ...getPreset('huawei-mate-xt-open'),
      geometrySource: 'device',
      safeInsets: { top: 32, bottom: 28 },
      regions: [330, 670].map((x, index) => ({
        id: 'crease-' + (index + 1), kind: 'division', axis: 'vertical',
        ...box(x, 0, 10, 704),
      })),
    },
  });
  assert.equal(measured.contentRegions.length, 3);
  assert.ok(!measured.warnings.some(warning => warning.code === 'unverified-geometry'));
  const issues = validateLayout(measured, [
    node('left-fold', 'control', box(310, 60, 48, 48)),
    node('right-fold', 'control', box(650, 60, 48, 48)),
    node('small', 'control', box(40, 60, 44, 44)),
  ]);
  assert.deepEqual(issues.map(issue => issue.code), ['crosses-division', 'crosses-division', 'small-touch-target']);
  assert.deepEqual(issues.filter(issue => issue.regionId).map(issue => issue.regionId), ['crease-1', 'crease-2']);
});

test('reports unavailable geometry and rejects invalid inputs', () => {
  const target = getPreset('duo-book');
  target.regions = [{ ...target.regions[0], ...box(0, 0, 951, 669) }];
  const plan = planFoldable({ target });
  assert.equal(plan.content.type, 'unavailable');
  assert.ok(plan.warnings.some(issue => issue.severity === 'error'));
  assert.throws(() => planFoldable({ target: 'unknown' }), /Unknown preset/);
  assert.throws(() => planFoldable({ target: 'duo-book', policy: { gridMaxColumns: 2.5 } }), /integer/);
  target.regions[0].width = 952;
  assert.throws(() => planFoldable({ target }), /window-local/);
});

test('partial division stays local and is checked against actual node bounds', () => {
  const target = getPreset('duo-book');
  target.regions = [{ ...target.regions[0], ...box(450, 180, 40, 240) }];
  const plan = planFoldable({ target, page: list });
  assert.equal(plan.contentRegions.length, 1);
  assert.ok(plan.warnings.some(issue => issue.code === 'review-partial-division'));
  assert.deepEqual(validateLayout(plan, [
    node('upper', 'control', box(455, 100, 44, 44)),
    node('middle', 'control', box(455, 300, 44, 44)),
  ]).map(issue => issue.nodeId), ['middle']);
});

test('CLI emits valid JSON and distinct exit codes for bad input and blockers', () => {
  const cli = fileURLToPath(new URL('./plan.mjs', import.meta.url));
  const run = input => spawnSync(process.execPath, [cli, '-'], { input, encoding: 'utf8' });
  const ok = run(JSON.stringify({ target: 'duo-book' }));
  assert.equal(ok.status, 0);
  assert.deepEqual(JSON.parse(ok.stdout).issues, []);
  assert.equal(run('{').status, 1);
  const error = run(JSON.stringify({
    target: 'duo-book', nodes: [node('bad', 'control', box(430, 200, 44, 44))],
  }));
  assert.equal(error.status, 2);
  assert.equal(JSON.parse(error.stdout).issues[0].code, 'crosses-division');
});
