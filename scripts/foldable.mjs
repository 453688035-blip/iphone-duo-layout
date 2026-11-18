import { getPreset } from './presets.mjs';

const edges = ['top', 'right', 'bottom', 'left'];
const states = ['route', 'selection', 'scrollAnchor', 'draft', 'focus', 'mediaPosition'];
const defaults = {
  margin: 16, gap: 16, listMinWidth: 240, detailMinWidth: 320,
  gridMinWidth: 160, gridMaxColumns: 4,
  mediaMinHeight: 180, controlsMinHeight: 120,
  verticalBarMinLength: 540, horizontalBarMinLength: 400,
};
const nodeRoles = ['control', 'navigation-control', 'critical-content', 'content', 'continuous', 'decoration'];

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function number(value, name, min = 0) {
  requireValue(Number.isFinite(value) && value >= min, 'Invalid ' + name);
  return value;
}

function insets(value = {}) {
  requireValue(value && typeof value === 'object' && !Array.isArray(value), 'Invalid insets');
  for (const key of Object.keys(value)) requireValue(edges.includes(key), 'Unknown inset: ' + key);
  return Object.fromEntries(edges.map(edge => [edge, number(value[edge] ?? 0, edge + ' inset')]));
}

const right = rect => rect.x + rect.width;
const bottom = rect => rect.y + rect.height;
const contains = (area, rect) =>
  rect.x >= area.x && rect.y >= area.y && right(rect) <= right(area) && bottom(rect) <= bottom(area);
const intersects = (a, b) =>
  Math.min(right(a), right(b)) > Math.max(a.x, b.x) &&
  Math.min(bottom(a), bottom(b)) > Math.max(a.y, b.y);
const inset = (rect, { top, right: end, bottom: foot, left }) => ({
  x: rect.x + left, y: rect.y + top,
  width: rect.width - left - end, height: rect.height - top - foot,
});
const hasArea = rect => rect.width > 0 && rect.height > 0;

function validateRect(rect, name) {
  requireValue(rect && Number.isFinite(rect.x) && Number.isFinite(rect.y), 'Invalid ' + name + ' position');
  number(rect.width, name + ' width');
  number(rect.height, name + ' height');
}

function partition(rect, region) {
  const vertical = region.axis === 'vertical';
  const origin = vertical ? 'x' : 'y';
  const size = vertical ? 'width' : 'height';
  const crossOrigin = vertical ? 'y' : 'x';
  const crossSize = vertical ? 'height' : 'width';
  const start = region[origin];
  const end = start + region[size];
  const rectEnd = rect[origin] + rect[size];
  if (end <= rect[origin] || start >= rectEnd ||
      region[crossOrigin] > rect[crossOrigin] ||
      region[crossOrigin] + region[crossSize] < rect[crossOrigin] + rect[crossSize]) return [rect];
  return [
    { ...rect, [size]: start - rect[origin] },
    { ...rect, [origin]: end, [size]: rectEnd - end },
  ].filter(hasArea);
}

function crossesDivision(rect, region) {
  if (hasArea(region)) return intersects(rect, region);
  if (region.axis === 'vertical') {
    return rect.x < region.x && right(rect) > region.x &&
      Math.min(bottom(rect), bottom(region)) > Math.max(rect.y, region.y);
  }
  return rect.y < region.y && bottom(rect) > region.y &&
    Math.min(right(rect), right(region)) > Math.max(rect.x, region.x);
}

function resolveTarget(input) {
  const target = typeof input === 'string' ? { ...getPreset(input), preset: input } : input;
  requireValue(target?.window && ['iphone-duo', 'harmonyos', 'android', 'generic'].includes(target.device), 'Invalid target device or window');
  requireValue(['outer', 'inner'].includes(target.display), 'Invalid display');
  requireValue(['closed', 'flat', 'book', 'tabletop', 'unknown'].includes(target.posture), 'Invalid posture');
  requireValue(['portrait', 'landscape'].includes(target.orientation), 'Provide the display orientation');
  requireValue(['project-template', 'project-scenario', 'simulator', 'device', 'unknown'].includes(target.geometrySource), 'Provide geometrySource');
  if (target.multitasking != null) {
    requireValue(['left', 'right'].includes(target.multitasking.outerEdge), 'Provide the app window physical outerEdge');
  }
  requireValue(target.navigationEdge == null || ['left', 'right', 'bottom'].includes(target.navigationEdge), 'Invalid navigationEdge');

  const window = {
    x: 0, y: 0, width: number(target.window.width, 'window width', 1),
    height: number(target.window.height, 'window height', 1),
  };
  const safe = insets(target.safeInsets);
  const bars = insets(target.contentInsets);
  const safeArea = inset(window, safe);
  const contentArea = inset(safeArea, bars);
  requireValue(hasArea(safeArea) && hasArea(contentArea), 'Insets leave no content area');

  const regions = target.regions ?? [];
  requireValue(Array.isArray(regions), 'Invalid reserved regions');
  const ids = new Set();
  for (const region of regions) {
    requireValue(typeof region?.id === 'string' && region.id && !ids.has(region.id), 'Invalid or duplicate region ID');
    ids.add(region.id);
    validateRect(region, region.id);
    requireValue(contains(window, region), 'Reserved region must use window-local bounds: ' + region.id);
    requireValue(region.active == null || typeof region.active === 'boolean', 'Invalid active flag: ' + region.id);
    requireValue(region.occludes == null || typeof region.occludes === 'boolean', 'Invalid occludes flag: ' + region.id);
    requireValue(region.kind === 'occlusion' || region.kind === 'division', 'Invalid region kind: ' + region.id);
    if (region.kind === 'division') {
      requireValue(['vertical', 'horizontal'].includes(region.axis), 'Division needs an axis: ' + region.id);
      requireValue((region.axis === 'vertical' ? region.height : region.width) > 0, 'Division needs a nonzero span: ' + region.id);
      requireValue(!region.occludes || hasArea(region), 'Occluding division needs a positive area: ' + region.id);
    } else {
      requireValue(hasArea(region), 'Occlusion needs a positive area: ' + region.id);
    }
  }
  return { target, window, safeArea, contentArea, regions: regions.filter(region => region.active !== false) };
}

function navigation(target, safeArea, page, config) {
  const duo = target.device === 'iphone-duo';
  const vertical = duo && (target.display === 'outer' || target.orientation === 'landscape');
  const splitEdge = duo ? target.multitasking?.outerEdge : undefined;
  const edge = splitEdge ?? target.navigationEdge ?? (vertical ? 'right' : 'bottom');
  const side = edge !== 'bottom';
  const short = side ? safeArea.height < config.verticalBarMinLength : safeArea.width < config.horizontalBarMinLength;
  return {
    placement: edge, axis: side ? 'vertical' : 'horizontal',
    toolbarPlacement: side ? edge : 'top',
    compression: short ? (page.taskFocused ? 'minimize-tab-bar' : 'toolbar-overflow') : 'standard',
  };
}

function planContent(page, areas, whole, config, options) {
  const byWidth = (a, b) => b.width - a.width || b.height - a.height;
  const largest = [...areas].sort(byWidth)[0];
  const compact = options.target.display === 'outer';
  const ordered = options.direction === 'rtl' ? [...areas].reverse() : areas;

  if (page.type === 'continuous' && !options.hardDivision) {
    return { type: 'continuous', region: whole };
  }

  if (page.type === 'media' && options.target.posture === 'tabletop' &&
      options.horizontalDivision && areas.length === 2 &&
      areas[0].y < areas[1].y &&
      areas[0].height >= config.mediaMinHeight && areas[1].height >= config.controlsMinHeight) {
    return { type: 'tabletop', media: areas[0], controls: areas[1] };
  }

  if (page.type === 'list-detail' && !compact) {
    const listRole = page.sidebar ? 'sidebar' : 'list';
    if (areas.length === 1 && largest.width >= config.listMinWidth + config.gap + config.detailMinWidth) {
      const listWidth = config.listMinWidth;
      const detailWidth = largest.width - listWidth - config.gap;
      const rtl = options.direction === 'rtl';
      return {
        type: 'list-detail', listRole,
        list: { ...largest, x: rtl ? largest.x + detailWidth + config.gap : largest.x, width: listWidth },
        detail: { ...largest, x: rtl ? largest.x : largest.x + listWidth + config.gap, width: detailWidth },
      };
    }
    if (options.verticalDivision && areas.length === 2 && areas[0].x < areas[1].x &&
        ordered[0].width >= config.listMinWidth && ordered[1].width >= config.detailMinWidth) {
      return { type: 'list-detail', listRole, list: ordered[0], detail: ordered[1] };
    }
  }

  if (page.type === 'grid' && !compact) {
    const count = area => Math.min(config.gridMaxColumns, Math.floor(
      (area.width + config.gap) / (config.gridMinWidth + config.gap),
    ));
    if (options.verticalDivision && areas.length === 2 && areas[0].x < areas[1].x) {
      const balanced = Math.min(count(areas[0]), count(areas[1]), Math.floor(config.gridMaxColumns / 2));
      if (balanced > 0) return {
        type: 'grid', groups: ordered.map(region => ({ region, columns: balanced })),
      };
    }
    if (count(largest) > 1) return { type: 'grid', groups: [{ region: largest, columns: count(largest) }] };
  }

  return {
    type: 'single', region: largest,
    ...(page.type === 'list-detail' && { navigation: 'drill-in' }),
  };
}

export function planFoldable({ sourceNodeId, target: input, page = {}, policy = {}, direction = 'ltr' }) {
  requireValue(['ltr', 'rtl'].includes(direction), 'Invalid direction');
  requireValue(page && ['list-detail', 'grid', 'media', 'continuous', 'generic', undefined].includes(page.type), 'Invalid page type');
  for (const flag of ['sidebar', 'taskFocused']) {
    requireValue(page[flag] == null || typeof page[flag] === 'boolean', 'Invalid page flag: ' + flag);
  }
  if (sourceNodeId != null) requireValue(typeof sourceNodeId === 'string' && sourceNodeId, 'Invalid sourceNodeId');
  const config = { ...defaults, ...policy };
  for (const key of Object.keys(config)) {
    requireValue(Object.prototype.hasOwnProperty.call(defaults, key), 'Unknown policy: ' + key);
    number(config[key], key, ['margin', 'gap'].includes(key) ? 0 : 1);
  }
  requireValue(Number.isInteger(config.gridMaxColumns), 'gridMaxColumns must be an integer');

  const { target, window, safeArea, contentArea, regions } = resolveTarget(input);
  const divisions = regions.filter(region => region.kind === 'division');
  const whole = inset(contentArea, Object.fromEntries(edges.map(edge => [edge, config.margin])));
  requireValue(hasArea(whole), 'Margins leave no content area');
  const areas = divisions.reduce((rects, region) => rects.flatMap(rect => partition(rect, region)), [whole]);
  const warnings = [];
  if (!['device', 'simulator'].includes(target.geometrySource)) warnings.push({ code: 'unverified-geometry' });
  if (!target.safeInsets || !Array.isArray(target.regions)) warnings.push({ code: 'missing-safe-area-or-regions' });
  const bars = navigation(target, safeArea, page, config);
  if (target.device === 'iphone-duo' && !target.preset && bars.axis === 'vertical' &&
      !target.navigationEdge && !target.multitasking) warnings.push({ code: 'assumed-navigation-edge' });
  if (['book', 'tabletop'].includes(target.posture) && !target.multitasking && !divisions.length) {
    warnings.push({ code: 'missing-active-division' });
  }
  if (regions.some(region => region.kind === 'occlusion' && intersects(region, whole))) {
    warnings.push({ code: 'review-occlusion-in-content' });
  }
  if (divisions.some(region => crossesDivision(whole, region) && partition(whole, region)[0] === whole)) {
    warnings.push({ code: 'review-partial-division' });
  }
  if (!areas.length) warnings.push({ code: 'no-usable-content-area', severity: 'error' });
  const content = areas.length ? planContent(page, areas, whole, config, {
    target, direction, hardDivision: divisions.some(region => region.occludes),
    verticalDivision: divisions.some(region => region.axis === 'vertical'),
    horizontalDivision: divisions.some(region => region.axis === 'horizontal'),
  }) : { type: 'unavailable' };
  return {
    version: 1, sourceNodeId: sourceNodeId ?? null,
    target: { ...target, width: window.width, height: window.height },
    safeArea, contentArea, regions, contentRegions: areas,
    navigation: bars, content,
    preserveState: [...states], warnings,
  };
}

export function validateLayout(plan, nodes) {
  requireValue(Array.isArray(nodes), 'Provide an array of nodes to validate');
  const issues = [];
  const ids = new Set();
  // Project review thresholds in the target's logical units.
  const minTouch = ['android', 'harmonyos'].includes(plan.target.device) ? 48 : 44;
  for (const node of nodes) {
    requireValue(typeof node?.id === 'string' && node.id && !ids.has(node.id), 'Invalid or duplicate node ID');
    ids.add(node.id);
    requireValue(nodeRoles.includes(node.role), 'Invalid node role: ' + node.id);
    validateRect(node.bounds, node.id);
    if (node.role === 'decoration') continue;
    const allowed = node.role === 'navigation-control' ? plan.safeArea : plan.contentArea;
    const report = (code, severity, regionId) =>
      issues.push({ nodeId: node.id, code, severity, ...(regionId && { regionId }) });
    if (!hasArea(node.bounds)) report('empty-bounds', 'error');
    if (!contains(allowed, node.bounds)) report('outside-usable-area', 'error');
    if (['control', 'navigation-control'].includes(node.role) &&
        Math.min(node.bounds.width, node.bounds.height) < minTouch) {
      report('small-touch-target', 'warning');
    }
    for (const region of plan.regions) {
      if (region.kind === 'occlusion' && intersects(node.bounds, region)) report('occlusion', 'error', region.id);
      if (region.kind === 'division' && (node.role !== 'continuous' || region.occludes) &&
          crossesDivision(node.bounds, region)) report('crosses-division', 'error', region.id);
    }
  }
  return issues;
}
