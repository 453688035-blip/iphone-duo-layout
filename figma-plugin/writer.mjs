import { planFoldable, validateLayout } from '../scripts/foldable.mjs';
import { getPreset, presetLabel } from '../scripts/presets.mjs';
import { withRuleRefs } from '../scripts/rule-map.mjs';
import { auditClone, collectGeometry, mapClone, snapshotTree } from './audit.mjs';
import {
  bezelDecorations, contentContainer, fitAbsoluteContent, fitChatSnapshot, fitDashboard, fitFullBleed, fitScreen,
  fullBleedLayers, hasTopBar, identifyChatSnapshot, identifyDashboard, shellScreen,
} from './dashboard.mjs';
import { insertNativeChrome } from './native-chrome.mjs';
import { cornerKeys, silhouettePlan } from './silhouette.mjs';
import { applySurface, screenLayer, surfaceSpec } from './surface.mjs';

const generatedKey = 'adaptflow-source-id';
const gap = 64;
const noop = () => {};
const semanticRoles = new Map([
  ['control', 'control'], ['open-detail', 'control'], ['back', 'control'],
  ['navigation-control', 'navigation-control'], ['critical', 'critical-content'],
  ['content', 'content'], ['continuous', 'continuous'], ['decoration', 'decoration'],
]);

function tag(node) {
  return /^\[af:([a-z-]+)\](?:\s|$)/i.exec(node.name)?.[1].toLowerCase();
}

function hasAutoLayout(node) {
  return node.layoutMode === 'VERTICAL' || node.layoutMode === 'HORIZONTAL';
}

function isUnrotatedFrame(node) {
  return node.type === 'FRAME' && Math.abs(node.rotation) < 0.01;
}

function hasDimensionBinding(node) {
  return Boolean(node.boundVariables?.width || node.boundVariables?.height);
}

function issue(node, code, detail, severity = 'warning') {
  return { nodeId: node.id, code, severity, detail };
}

// Artboards often live inside a section, so both page-level frames and frames
// directly inside a section are valid sources.
function isSourceFrame(node) {
  return node.type === 'FRAME' && (node.parent?.type === 'PAGE' || node.parent?.type === 'SECTION');
}

export function getSources(page) {
  return page.selection.every(node => isSourceFrame(node) && !node.getPluginData(generatedKey))
    ? [...page.selection] : [];
}

export function getSource(page) {
  const sources = getSources(page);
  return sources.length === 1 ? sources[0] : null;
}

function identify(source, resultLayerId) {
  if (resultLayerId) {
    const dashboard = identifyDashboard(source, resultLayerId);
    if (!dashboard) throw new Error('这个原稿无法提取独立结果卡。请检查结果卡及其父层的锁定或蒙版设置。');
    return { type: 'dashboard', dashboard };
  }
  const chatSnapshot = identifyChatSnapshot(source);
  if (chatSnapshot) return { type: 'chat-snapshot', chatSnapshot };
  const backgrounds = new Set(fullBleedLayers(source));
  // A home indicator or camera dot parked on the bezel is mock chrome, not a
  // list or a detail pane.
  const chrome = new Set(bezelDecorations(source, shellScreen(source)));
  const visible = source.children.filter(node => node.visible && !backgrounds.has(node) && !chrome.has(node));
  const lists = visible.filter(node => ['list', 'sidebar'].includes(tag(node)) ||
    /^(列表|侧栏|sidebar|list)$/i.test(node.name.trim()));
  const details = visible.filter(node => tag(node) === 'detail' || /^(详情|detail|details)$/i.test(node.name.trim()));
  const fields = visible.filter(node => tag(node) === 'fields');
  if (visible.length === 2 && lists.length === 1 && details.length === 1 &&
      [...lists, ...details].every(node => isUnrotatedFrame(node) && !hasDimensionBinding(node))) {
    const [list] = lists;
    const [detail] = details;
    return { type: 'list-detail', sidebar: tag(list) === 'sidebar' || /^(侧栏|sidebar)$/i.test(list.name.trim()), list, detail };
  }
  if (fields.length === 1 && source.layoutMode === 'VERTICAL' &&
      isUnrotatedFrame(fields[0]) && hasAutoLayout(fields[0]) &&
      fields[0].layoutPositioning !== 'ABSOLUTE') {
    return { type: 'form', fields: fields[0] };
  }
  if (tag(source) === 'continuous') return { type: 'continuous' };
  const dashboard = identifyDashboard(source);
  if (dashboard) return { type: 'dashboard', dashboard };
  return { type: 'generic' };
}

function isTopBarStrip(node, parent, maxHeight) {
  if (!('width' in node) || !('y' in node)) return false;
  if (node.width < parent.width * 0.8) return false;
  if (node.height < 32 || node.height > maxHeight) return false;
  return parent.layoutMode !== 'NONE' || Math.abs(node.y) <= 8;
}

// Explicit [af:nav] tags and generic tab names can serve either posture.
const navigationTag = /^\[af:nav\](?:\s|$)/i;
const bottomNavigationName = /^(?:底部导航|标签栏|tab ?bar|bottom bar)$/i;
const sideNavigationName = /^(?:侧边导航|侧导航|nav rail|navigation rail)$/i;
const compactHomeInset = 24;

function authoredNavigation(node, { bottomOnly = false } = {}) {
  if (!node.visible) return false;
  const name = node.name.trim();
  return navigationTag.test(name) || bottomNavigationName.test(name) ||
    (!bottomOnly && sideNavigationName.test(name)) ||
    (node.children ?? []).some(child => authoredNavigation(child, { bottomOnly }));
}

// A full-width strip at the top of the source (or just inside a page wrapper)
// is treated as its authored top bar, so the target reuses it instead of
// reserving a second top inset above it.
function hasAuthoredTopBar(source, profile) {
  if (profile.dashboard?.authoredTopBar) return true;
  const backgrounds = new Set(fullBleedLayers(source));
  const first = source.children.find(node => node.visible && !backgrounds.has(node));
  if (!first) return false;
  if (hasTopBar(first) || isTopBarStrip(first, source, Math.min(180, Math.max(120, source.height * 0.18)))) {
    return true;
  }
  if (first.type !== 'FRAME' || first.width < source.width * 0.9) return false;
  const innerBackgrounds = new Set(fullBleedLayers(first));
  const nested = first.children.find(node => node.visible && !innerBackgrounds.has(node));
  return Boolean(nested) && (hasTopBar(nested) || isTopBarStrip(nested, first, 96));
}

function planTargets(source, targets, profile, direction) {
  const policy = profile.type === 'list-detail' ? {
    listMinWidth: Math.max(240, profile.list.minWidth ?? 0),
    detailMinWidth: Math.max(320, profile.detail.minWidth ?? 0),
  } : {};
  const authoredTopBar = hasAuthoredTopBar(source, profile);
  const hasNavigation = authoredNavigation(source);
  const hasBottomNavigation = authoredNavigation(source, { bottomOnly: true });
  return targets.map(target => {
    const page = ['form', 'dashboard', 'chat-snapshot'].includes(profile.type)
      ? { type: 'generic', taskFocused: profile.type === 'form' } :
      { type: profile.type, sidebar: profile.sidebar };
    let effectiveTarget = target;
    let reusedTopBar = false;
    let droppedNavigation = 0;
    let compactBottom = false;
    if (typeof target === 'string') {
      const preset = getPreset(target);
      const insets = { ...preset.contentInsets };
      if (authoredTopBar && insets.top && profile.type !== 'chat-snapshot') {
        insets.top = 0;
        reusedTopBar = true;
      }
      // The template reserves a strip along the fold or the window edge for a
      // navigation rail. Without a navigation layer in the source that strip
      // would only be blank, so the content takes the full usable width.
      if (!hasNavigation) {
        for (const edge of ['left', 'right']) {
          if (!insets[edge]) continue;
          droppedNavigation += insets[edge];
          delete insets[edge];
        }
      }
      if (preset.display === 'inner' && preset.orientation === 'portrait' &&
          insets.bottom > compactHomeInset && !hasBottomNavigation) {
        insets.bottom = compactHomeInset;
        compactBottom = true;
      }
      if (preset.device === 'iphone-duo' && profile.type === 'chat-snapshot') {
        // The original iPhone status artwork is cropped off the reusable app
        // header. Keep the pose's own safe zones for the system components.
        Object.assign(insets, preset.contentInsets);
        if (insets.bottom > compactHomeInset && !hasBottomNavigation) insets.bottom = compactHomeInset;
        if (preset.orientation === 'landscape' || preset.display === 'outer') insets.top = 0;
        insets.bottom = Math.max(insets.bottom ?? 0, compactHomeInset);
        droppedNavigation = 0;
        effectiveTarget = { ...preset, preset: target, contentInsets: insets };
      }
      if (reusedTopBar || droppedNavigation || compactBottom) {
        effectiveTarget = { ...preset, preset: target, contentInsets: insets };
      }
    }
    const plan = planFoldable({ sourceNodeId: source.id, target: effectiveTarget, page, policy, direction });
    if (reusedTopBar) {
      plan.warnings.push({ code: 'existing-top-bar-used', detail: '此预览沿用原稿顶部栏，已去掉模板的重复顶部占位。' });
    }
    if (droppedNavigation) {
      plan.warnings.push({ code: 'navigation-area-unreserved',
        detail: '原稿未识别到导航栏，外侧 ' + droppedNavigation + ' pt 导航区未预留，内容按满宽排版；如需 Duo 导航栏请在生成稿中补充。' });
    }
    if (compactBottom) {
      plan.warnings.push({ code: 'bottom-navigation-area-compacted',
        detail: '原稿无底部导航，底部仅保留 ' + compactHomeInset + ' pt 的项目 Home 指示条占位。真机交付使用实测安全区。' });
    }
    if (plan.content.type === 'unavailable') throw new Error('目标窗口没有可用内容区域。');
    return plan;
  });
}

function reserveInsets(root, region, issues) {
  const edges = {
    paddingLeft: region.x,
    paddingRight: root.width - region.x - region.width,
    paddingTop: region.y,
    paddingBottom: root.height - region.y - region.height,
  };
  for (const [property, required] of Object.entries(edges)) {
    if (root[property] >= required) continue;
    if (root.boundVariables?.[property]) {
      issues.push(issue(root, 'bound-padding-review', property + ' 已绑定变量，请在设计系统中调整相应模式。'));
      continue;
    }
    root[property] = required;
  }
}

function fitForm(root, fields, issues) {
  const flow = fields.children.filter(node => node.visible && node.layoutPositioning !== 'ABSOLUTE');
  if (flow.length === 0) return;
  const available = root.width - root.paddingLeft - root.paddingRight;
  if (available <= 0 || fields.boundVariables?.width) {
    issues.push(issue(fields, 'form-width-review', '字段组的可用宽度或尺寸绑定需要复核。'));
    return;
  }
  fields.layoutSizingHorizontal = 'FILL';
  const minimumWidth = flow.reduce((total, child) => total + (child.minWidth ?? child.width), 0);
  const required = minimumWidth + fields.itemSpacing * (flow.length - 1) + fields.paddingLeft + fields.paddingRight;
  if (fields.layoutMode === 'HORIZONTAL' && required > fields.width + 0.1) {
    const fill = flow.filter(child => child.layoutSizingHorizontal === 'FILL' ||
      (child.type === 'FRAME' && hasAutoLayout(child) && !hasDimensionBinding(child)));
    if (fields.layoutWrap === 'WRAP') fields.layoutWrap = 'NO_WRAP';
    fields.layoutMode = 'VERTICAL';
    fields.layoutSizingVertical = 'HUG';
    for (const child of fill) child.layoutSizingHorizontal = 'FILL';
  }
  if (flow.some(child => child.width > fields.width - fields.paddingLeft - fields.paddingRight + 0.1)) {
    issues.push(issue(fields, 'form-field-width-review', '至少一个字段仍宽于容器，请检查固定尺寸或紧凑变体。'));
  }
}

function fitPane(pane, rect) {
  if (hasAutoLayout(pane)) {
    pane.primaryAxisSizingMode = 'FIXED';
    pane.counterAxisSizingMode = 'FIXED';
  }
  pane.resize(rect.width, rect.height);
  pane.x = rect.x;
  pane.y = rect.y;
  pane.clipsContent = true;
  if (pane.overflowDirection === 'NONE') pane.overflowDirection = 'VERTICAL';
}

function fitLayout(source, root, mapping, plan, profile, state, issues) {
  if (profile.type === 'list-detail' && root.layoutMode !== 'NONE') root.layoutMode = 'NONE';
  if (hasAutoLayout(root)) {
    root.primaryAxisSizingMode = 'FIXED';
    root.counterAxisSizingMode = 'FIXED';
  }
  const sourceWidth = source.width;
  if (hasAutoLayout(root) || profile.type === 'list-detail') root.resize(plan.target.width, plan.target.height);
  else root.resizeWithoutConstraints(plan.target.width, plan.target.height);
  for (const background of fullBleedLayers(source)) {
    if (root.layoutMode === 'NONE' || background.layoutPositioning === 'ABSOLUTE') {
      fitFullBleed(mapping.get(background.id), root.width, root.height);
    }
  }
  // The window holds the app, not the mock: an inset screen is stretched over
  // the usable area so the device body cannot stay an empty plate around it.
  const shell = shellScreen(source);
  const screen = shell ? mapping.get(shell.id) ?? null : null;

  if (profile.type === 'list-detail') {
    if (screen) fitScreen(screen, { x: 0, y: 0, width: root.width, height: root.height }, issues);
    const list = mapping.get(profile.list.id);
    const detail = mapping.get(profile.detail.id);
    list.visible = state !== 'detail';
    detail.visible = state !== 'list';
    if (list.visible) fitPane(list, plan.content.list ?? plan.content.region);
    if (detail.visible) fitPane(detail, plan.content.detail ?? plan.content.region);
    return;
  }
  const area = plan.target.device === 'harmonyos' && plan.regions.some(region => region.kind === 'division')
    ? plan.content.region : plan.contentArea;
  if (hasAutoLayout(root)) {
    reserveInsets(root, area, issues);
    // A screen in an auto-layout body is a flow child, so it follows the window
    // by filling instead of being resized.
    if (screen && root.layoutMode !== 'NONE' && screen.layoutPositioning !== 'ABSOLUTE') {
      screen.layoutSizingHorizontal = 'FILL';
      screen.layoutSizingVertical = 'FILL';
    }
    if (profile.type === 'form') fitForm(root, mapping.get(profile.fields.id), issues);
  } else {
    // Absolute-layout page: follow the usable area instead of leaving the
    // original phone width in place.
    const original = contentContainer(source, sourceWidth);
    const container = mapping.get(original.id);
    if (screen && container === screen) fitScreen(container, area, issues);
    else fitAbsoluteContent(root, container, sourceWidth, area, issues);
    const backgrounds = new Set(fullBleedLayers(root));
    // The container's children are in its own coordinate space, so the right
    // edge is its width when the window is drawn by an inner screen.
    const right = container === root ? area.x + area.width : container.width;
    let contentBottom = 0;
    for (const child of container.children) {
      if (!child.visible || backgrounds.has(child)) continue;
      contentBottom = Math.max(contentBottom, child.y + child.height);
      if (child.x + child.width > right + 1) {
        issues.push(issue(child, 'content-wider-than-area',
          '图层超出可用宽度，请检查固定尺寸、蒙版或紧凑变体。'));
      }
    }
    // Content taller than the window scrolls instead of being hard-clipped.
    if (container !== root) {
      if (container.height > area.height + 1 && container.overflowDirection === 'NONE') {
        container.resizeWithoutConstraints(container.width, area.height);
        container.overflowDirection = 'VERTICAL';
      } else if (container.height < area.height - 1) {
        container.resizeWithoutConstraints(container.width, area.height);
      }
    } else if (contentBottom > root.height + 1 && root.overflowDirection === 'NONE') {
      root.overflowDirection = 'VERTICAL';
    }
  }
  if (profile.type === 'generic') {
    issues.push(issue(root, 'semantic-review',
      '已按整宽与约束重排内容，但页面结构尚未识别。请确认是否需要分栏；对话页可在面板指定对话结果卡。'));
  }
}

// A background that fills the frame can paint square corners over a rounded
// frame, so the surface layers are part of the silhouette radius search.
function bleedChain(root) {
  const chain = [root];
  let current = root;
  for (let depth = 0; depth < 3; depth += 1) {
    const next = current.type === 'FRAME' ? fullBleedLayers(current)[0] : null;
    if (!next) break;
    chain.push(next);
    current = next;
  }
  return chain;
}

function fitSilhouette(root, plan, issues, hint = 0) {
  if (!('cornerRadius' in root)) return;
  const radiusPlan = silhouettePlan(bleedChain(root), plan.target, hint);
  if (!radiusPlan) return;
  const bound = root.boundVariables ?? {};
  if (bound.cornerRadius || cornerKeys.some(key => bound[key])) {
    issues.push(issue(root, 'corner-radius-bound',
      '窗口圆角已绑定变量，未按目标窗口轮廓调整，请在设计系统中复核。'));
    return;
  }
  // Clip so children cannot square off the corners the frame rounds.
  root.clipsContent = true;
  for (const [key, value] of Object.entries(radiusPlan)) {
    if (Math.abs((root[key] ?? 0) - value) < 0.01) continue;
    root[key] = value;
  }
}

function controlFor(mapping, pane, role) {
  const candidates = [];
  const pending = [...pane.children];
  while (pending.length) {
    const node = pending.pop();
    if (!node.visible || node.type === 'INSTANCE') continue;
    if (tag(node) === role) candidates.push(node);
    if ('children' in node) pending.push(...node.children);
  }
  return candidates.length === 1 ? mapping.get(candidates[0].id) : null;
}

function reaction(action) {
  return [{ trigger: { type: 'ON_CLICK' }, actions: [action] }];
}

function actionsOf(node) {
  return (node.reactions ?? []).flatMap(entry => entry.actions ?? [entry.action]);
}

async function linkCompactFrames(list, detail, profile) {
  const open = controlFor(list.mapping, profile.list, 'open-detail');
  const back = controlFor(detail.mapping, profile.detail, 'back');
  if (!open?.setReactionsAsync || !back?.setReactionsAsync ||
      open.reactions?.length || back.reactions?.length) {
    const message = '使用唯一的 [af:open-detail] 和 [af:back] 可连接这两个紧凑状态。已有交互需人工核对。';
    list.issues.push(issue(list.root, 'compact-prototype-review', message));
    detail.issues.push(issue(detail.root, 'compact-prototype-review', message));
    return;
  }
  await open.setReactionsAsync(reaction({
    type: 'NODE', navigation: 'NAVIGATE', destinationId: detail.root.id, transition: null,
  }));
  await back.setReactionsAsync(reaction({ type: 'BACK' }));
  if (!actionsOf(open).some(action => action?.destinationId === detail.root.id) ||
      !actionsOf(back).some(action => action?.type === 'BACK')) {
    throw new Error('紧凑状态的原型连线回读失败。');
  }
}

function overflowDetail(bounds, area) {
  const edges = [
    ['左', area.x - bounds.x], ['上', area.y - bounds.y],
    ['右', bounds.x + bounds.width - area.x - area.width],
    ['下', bounds.y + bounds.height - area.y - area.height],
  ];
  return edges.filter(([, distance]) => distance > 0)
    .map(([edge, distance]) => edge + '侧超出 ' + Number(distance.toFixed(1)) + ' pt').join('，');
}

function containsRect(area, rect) {
  return rect.x >= area.x && rect.y >= area.y &&
    rect.x + rect.width <= area.x + area.width && rect.y + rect.height <= area.y + area.height;
}

// Cloning preserves overlay reactions, but an external destination does not
// get resized with the source frame. Surface the trigger and leave the link intact.
function overlayReviews(mapping) {
  const issues = [];
  for (const node of mapping.values()) {
    if (node.visible === false || !actionsOf(node).some(action =>
      action?.type === 'NODE' && ['OVERLAY', 'SWAP'].includes(action.navigation))) continue;
    issues.push(issue(node, 'overlay-posture-review',
      '请在此目标窗口的 Present 模式打开浮层：确认浮层尺寸、位置、关闭按钮和末项都在可用区，关闭后恢复原阅读位置。'));
  }
  return issues;
}

function reportTarget(job) {
  const { root, mapping, plan, state, issues, strategy, layoutRegions, chrome, surface, decoration } = job;
  const roles = new Map();
  for (const node of mapping.values()) {
    const role = semanticRoles.get(tag(node));
    if (role) roles.set(node.id, role);
  }
  for (const sourceNode of decoration ?? []) roles.set(mapping.get(sourceNode.id).id, 'decoration');
  const geometry = collectGeometry(root, roles);
  const sourceIds = new Map([...mapping].map(([sourceId, node]) => [node.id, sourceId]));
  const names = new Map([...mapping.values()].map(node => [node.id, node.name]));
  const geometryById = new Map(geometry.nodes.map(node => [node.id, node]));
  const layoutIssues = validateLayout(plan, geometry.nodes).map(entry => {
    if (entry.code !== 'outside-usable-area') return entry;
    const node = geometryById.get(entry.nodeId);
    const area = node.role === 'navigation-control' ? plan.safeArea : plan.contentArea;
    // Text or visuals that only spill into a reserved bar area are review
    // items; controls and anything leaving the safe area stay blocking.
    const insideWindow = containsRect(plan.safeArea, node.bounds);
    const severity = node.role === 'content' && insideWindow ? 'warning' : entry.severity;
    return { ...entry, severity, detail: overflowDetail(node.bounds, area) };
  });
  const combined = [
    ...plan.warnings.map(warning => ({ severity: 'warning', ...warning, nodeId: root.id })),
    ...issues, ...geometry.issues, ...layoutIssues, ...overlayReviews(mapping),
  ];
  return {
    id: root.id, name: root.name, preset: plan.target.preset ?? null,
    label: plan.target.preset ? presetLabel(plan.target.preset) : null, state,
    strategy: strategy ?? plan.content.type, geometrySource: plan.target.geometrySource,
    device: plan.target.device,
    layoutRegions, contentArea: plan.contentArea, reservedRegions: plan.regions,
    window: plan.target.window, navigation: plan.navigation,
    ...(chrome?.length ? { chrome } : {}),
    ...(surface && !surface.isRoot ? { surface: { name: surface.name, radius: surface.radius } } : {}),
    nodeMap: Object.fromEntries([...mapping].map(([sourceId, node]) => [sourceId, node.id])),
    issues: combined.map(entry => withRuleRefs(
      { sourceNodeId: sourceIds.get(entry.nodeId), nodeName: names.get(entry.nodeId), ...entry })),
  };
}

function pagePlacement(page, source) {
  const original = source.absoluteBoundingBox ?? { x: source.x, y: source.y, width: source.width };
  let x = original.x + original.width + gap;
  for (const node of page.children) {
    const bounds = node.absoluteBoundingBox;
    if (bounds && node.visible) x = Math.max(x, bounds.x + bounds.width + gap);
  }
  return { x, y: original.y };
}

function ensureSourceIsCurrent(figma, page, source) {
  if (source.removed || !isSourceFrame(source)) {
    throw new Error('原稿已从画布移除。请重新选择一个 Frame 再生成。');
  }
}

// Progress is 0-100 inside one source, so a batch can map it onto its own slice.
function progressReporter(onProgress) {
  let last = '';
  return (percent, label, detail) => {
    const value = Math.max(0, Math.min(100, Math.round(percent)));
    const key = value + '|' + (label ?? '') + '|' + (detail ?? '');
    if (key === last) return;
    last = key;
    onProgress({ percent: value, label, detail });
  };
}

function sliceProgress(onProgress, from, to) {
  return note => onProgress({
    ...note, percent: Math.round(from + (to - from) * note.percent / 100),
  });
}

export async function writeFoldableFrames(figma, source, options, onProgress = noop) {
  const page = figma.currentPage;
  if (!source || source.id !== getSource(page)?.id) throw new Error('请选择当前页面上一个顶层原稿 Frame。');
  return writeSelectedSource(figma, page, source, options, undefined, onProgress);
}

export async function writeFoldableBatch(figma, options, onProgress = noop) {
  const page = figma.currentPage;
  const sources = getSources(page);
  if (!sources.length) throw new Error('请选择一个或多个当前页顶层原稿 Frame。');
  if (sources.length === 1) return writeFoldableFrames(figma, sources[0], options, onProgress);
  if (options.resultLayerId) throw new Error('请单独选中一个原稿，再指定它的对话结果卡。');

  const origin = pagePlacement(page, sources[0]);
  const frames = [];
  const reports = [];
  const failedSources = [];
  let y = Math.min(...sources.map(source => source.absoluteBoundingBox?.y ?? origin.y));
  const entries = sources.map(source => ({ source, sourceId: source.id, sourceName: source.name }));
  for (const [index, { source, sourceId, sourceName }] of entries.entries()) {
    const progress = sliceProgress(onProgress, index * 100 / entries.length, (index + 1) * 100 / entries.length);
    progress({ percent: 0, label: '原稿 ' + (index + 1) + '/' + entries.length + ' · ' + sourceName });
    try {
      const result = await writeSelectedSource(figma, page, source, options, { x: origin.x, y }, progress);
      frames.push(...result.frames);
      reports.push(result.report);
      y += Math.max(...result.frames.map(frame => frame.height)) + gap;
    } catch (error) {
      failedSources.push({
        sourceId, sourceName,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return {
    frames,
    report: {
      version: 1, sources: reports, failedSources,
      targets: reports.flatMap(report => report.targets),
    },
  };
}

async function writeSelectedSource(figma, page, source, { targets, direction = 'ltr', resultLayerId = null, widthMode = 'fill', chrome = null }, position, onProgress = noop) {
  const progress = progressReporter(onProgress);
  progress(1, '读取原稿结构');
  ensureSourceIsCurrent(figma, page, source);
  if (!source.visible || !isUnrotatedFrame(source) || source.targetAspectRatio || hasDimensionBinding(source)) {
    throw new Error('原稿根 Frame 需可见且无旋转、锁定比例或宽高变量绑定。');
  }
  if (!Array.isArray(targets) || targets.length === 0) throw new Error('请至少选择一个目标窗口。');

  const profile = identify(source, resultLayerId);
  const plans = planTargets(source, targets, profile, direction);
  // A device render keeps the app inside a screen layer; the window has to
  // borrow that colour and radius, otherwise the mock's body shows through the
  // reserved bars as a grey plate with square corners.
  const screen = profile.type === 'dashboard' ? profile.dashboard.container : screenLayer(source);
  const surface = surfaceSpec(source, screen);
  const backdrops = surface && !surface.isRoot ? fullBleedLayers(source) : [];
  // The body's home indicator, camera dot and speaker are mock detail. The
  // window is the app itself, so they go instead of floating on the surface.
  const bezel = surface && !surface.isRoot ? bezelDecorations(source, shellScreen(source)) : [];
  const before = await snapshotTree(source);
  progress(8, '已读取原稿 · ' + plans.length + ' 个目标窗口');
  const placement = position ?? pagePlacement(page, source);
  const created = [];
  const jobs = [];
  const units = plans.reduce((total, plan) => total +
    (profile.type === 'list-detail' && plan.content.type === 'single' ? 2 : 1), 0);
  let done = 0;
  const step = fraction => 8 + 84 * ((done + fraction) / units);

  try {
    for (const plan of plans) {
      const compact = profile.type === 'list-detail' && plan.content.type === 'single';
      const states = compact ? ['list', 'detail'] : [null];
      const pair = [];
      for (const state of states) {
        const targetLabel = [plan.target.preset ? presetLabel(plan.target.preset) : '自定义窗口',
          state === 'list' ? '列表' : state === 'detail' ? '详情' : null].filter(Boolean).join(' · ');
        ensureSourceIsCurrent(figma, page, source);
        progress(step(0), '正在生成 · ' + targetLabel);
        const root = source.clone();
        created.push(root);
        const mapping = mapClone(source, root);
        const issues = [];
        for (const node of bezel) {
          const copy = mapping.get(node.id);
          if (copy && !copy.removed) copy.visible = false;
        }
        if (bezel.length) {
          issues.push(issue(root, 'device-bezel-hidden',
            '原稿机身装饰（Home 指示条、摄像头等）已隐藏，窗口按应用本体输出。'));
        }
        const label = plan.target.preset ? presetLabel(plan.target.preset) : '自定义窗口';
        root.name = ['[AdaptFlow] ' + source.name, label, state && (state === 'list' ? '列表' : '详情')]
          .filter(Boolean).join(' · ');
        root.setPluginData(generatedKey, source.id);
        let strategy = profile.type === 'generic' ? 'structure-review' : undefined;
        let layoutRegions;
        if (profile.type === 'dashboard' || profile.type === 'chat-snapshot') {
          const adapted = profile.type === 'chat-snapshot'
            ? fitChatSnapshot(figma, root, mapping, profile.chatSnapshot, plan, widthMode)
            : fitDashboard(figma, root, mapping, profile.dashboard, plan, direction, { widthMode });
          issues.push(...adapted.issues);
          strategy = adapted.strategy;
          layoutRegions = adapted.layoutRegions;
        } else {
          fitLayout(source, root, mapping, plan, profile, state, issues);
        }
        applySurface(root, mapping, surface, backdrops);
        fitSilhouette(root, plan, issues, surface?.radius ?? 0);
        root.x = placement.x;
        root.y = placement.y;
        placement.x += root.width + gap;
        if (Math.abs(root.width - plan.target.width) > 0.1 || Math.abs(root.height - plan.target.height) > 0.1) {
          issues.push(issue(root, 'target-size-mismatch', '生成稿尺寸与目标窗口不同，请检查根 Frame 的布局约束。', 'error'));
        }
        progress(step(0.55), '正在检查 · ' + targetLabel);
        const audit = await auditClone({ source, before, clone: root, mapping });
        // A source that changes mid-run (an edit, or a viewport move that makes
        // Figma materialize instance content) keeps the frames produced so far;
        // the report asks for a review instead of discarding the whole batch.
        const audited = audit.map(entry =>
          entry.code === 'source-changed' || entry.code === 'source-layers-added'
            ? { ...entry, detail: '生成期间原稿有变化，本稿按开始生成时的版本产出，请核对后使用。' }
            : entry);
        const snapshot = profile.chatSnapshot;
        const decoration = snapshot ? [...snapshot.backgrounds, snapshot.header.children[0]] : [];
        const job = { root, mapping, issues: [...issues, ...audited], plan, state, strategy, layoutRegions, surface, decoration };
        if (chrome?.enabled && !['android', 'harmonyos'].includes(plan.target.device)) {
          progress(step(0.8), '正在填充系统组件 · ' + targetLabel);
          // Chrome lands after the audit snapshot: its layers are new to the
          // clone, not edits of mapped source layers.
          try {
            job.chrome = await insertNativeChrome(figma, root, plan, chrome.components ?? null, issues);
          } catch {
            // A library component can fail to instantiate (Figma throws when the
            // component set itself has errors). Keep the frame, keep the strip.
            issues.push(issue(root, 'native-chrome-fallback',
              '官方系统组件无法实例化，系统区已保留留白。关闭「填充官方系统组件」或修复组件库后可重新生成。'));
          }
          job.issues = [...issues, ...audited];
        }
        pair.push(job);
        jobs.push(job);
        done += 1;
        progress(step(0), '已完成 · ' + targetLabel);
      }
      ensureSourceIsCurrent(figma, page, source);
      if (compact) await linkCompactFrames(pair[0], pair[1], profile);
    }
    ensureSourceIsCurrent(figma, page, source);
    progress(97, '汇总检查报告');
    const report = { version: 1, sourceId: source.id, sourceName: source.name, targets: jobs.map(reportTarget) };
    progress(100, '适配稿已生成');
    return { frames: created, report };
  } catch (error) {
    for (const root of created.reverse()) if (!root.removed) root.remove();
    throw error;
  }
}
