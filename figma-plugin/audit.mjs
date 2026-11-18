const layoutFields = [
  'x', 'y', 'width', 'height', 'relativeTransform', 'layoutMode', 'layoutWrap',
  'layoutSizingHorizontal', 'layoutSizingVertical', 'layoutPositioning', 'layoutAlign',
  'layoutGrow', 'itemSpacing', 'counterAxisSpacing', 'primaryAxisAlignItems',
  'counterAxisAlignItems', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'minWidth', 'maxWidth', 'minHeight', 'maxHeight', 'constraints', 'clipsContent',
  'overflowDirection', 'numberOfFixedChildren',
];
const styleFields = ['fillStyleId', 'strokeStyleId', 'effectStyleId', 'gridStyleId', 'textStyleId'];
const textFields = [
  'fontName', 'fontSize', 'textStyleId', 'fillStyleId', 'fills', 'lineHeight',
  'letterSpacing', 'textCase', 'textDecoration', 'boundVariables', 'hyperlink',
];
const touchTriggers = new Set(['ON_CLICK', 'ON_PRESS', 'MOUSE_DOWN', 'MOUSE_UP']);
const tolerance = 1e-5;

// Library instances that carry authoring errors (missing variants, broken
// component sets) throw from Figma when their properties are read. The audit
// only compares what it can actually read, so a broken instance is skipped
// instead of aborting the whole batch.
const readable = (node, key) => {
  try {
    return normalized(node[key]);
  } catch {
    return undefined;
  }
};

const children = node => {
  try {
    return node.children ?? [];
  } catch {
    return [];
  }
};
const right = rect => rect.x + rect.width;
const bottom = rect => rect.y + rect.height;
const report = (code, severity, nodeId, sourceNodeId, detail) => ({
  code, severity, nodeId,
  ...(sourceNodeId ? { sourceNodeId } : {}),
  ...(detail ? { detail } : {}),
});

function* walk(root) {
  const pending = [[root, false]];
  while (pending.length) {
    const [node, insideInstance] = pending.pop();
    yield { node, insideInstance };
    const nested = children(node);
    const nestedInsideInstance = insideInstance || node.type === 'INSTANCE';
    for (let index = nested.length - 1; index >= 0; index -= 1) {
      pending.push([nested[index], nestedInsideInstance]);
    }
  }
}

// Figma materializes instance children and resolves variable modes lazily while
// the viewport moves. Those reads are not authoring edits, so the source check
// only compares the fields a designer would actually change.
function authoringRecord(record) {
  return JSON.stringify([
    record.type, record.name, record.parentId, record.visible,
    record.layout.x, record.layout.y, record.layout.width, record.layout.height,
    record.layout.layoutMode, record.text?.characters ?? null,
  ]);
}

function normalized(value) {
  if (typeof value === 'symbol') return String(value);
  if (Array.isArray(value)) return value.map(normalized);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, normalized(value[key])]));
  }
  return value;
}

const same = (first, second) => JSON.stringify(first) === JSON.stringify(second);

function fields(node, keys) {
  return Object.fromEntries(keys.map(key => [key, readable(node, key)]));
}

async function componentIdentity(node) {
  if (node.type !== 'INSTANCE') return undefined;
  try {
    const main = typeof node.getMainComponentAsync === 'function'
      ? await node.getMainComponentAsync()
      : node.mainComponent;
    return main?.id ?? null;
  } catch {
    return null;
  }
}

function textEvidence(node) {
  if (node.type !== 'TEXT') return undefined;
  const characters = readable(node, 'characters');
  if (characters === undefined) return undefined;
  return {
    characters,
    ranges: typeof node.getStyledTextSegments === 'function'
      ? normalized(node.getStyledTextSegments(textFields))
      : undefined,
  };
}

export async function snapshotTree(root) {
  const result = new Map();
  const instances = [];
  for (const { node, insideInstance } of walk(root)) {
    const record = {
      type: node.type,
      name: node.name,
      parentId: node.parent?.id,
      insideInstance,
      childIds: children(node).map(child => child.id),
      visible: node.visible,
      locked: node.locked,
      layout: fields(node, layoutFields),
      styles: fields(node, styleFields),
      appearance: fields(node, ['opacity', 'fills', 'strokes', 'effects', 'cornerRadius', 'isMask']),
      boundVariables: readable(node, 'boundVariables') ?? {},
      explicitModes: readable(node, 'explicitVariableModes') ?? {},
      resolvedModes: readable(node, 'resolvedVariableModes') ?? {},
      componentProperties: readable(node, 'componentProperties'),
      componentPropertyReferences: readable(node, 'componentPropertyReferences'),
      overrides: readable(node, 'overrides'),
      reactions: readable(node, 'reactions') ?? [],
      text: textEvidence(node),
    };
    result.set(node.id, record);
    if (node.type === 'INSTANCE') instances.push([node, record]);
  }
  // Resolve library references in batches to keep large selections from issuing every read at once.
  for (let index = 0; index < instances.length; index += 32) {
    await Promise.all(instances.slice(index, index + 32).map(async ([node, record]) => {
      record.mainComponentId = await componentIdentity(node);
    }));
  }
  return result;
}

export function mapClone(source, clone) {
  const mapping = new Map();
  const pending = [[source, clone]];
  while (pending.length) {
    const [original, duplicate] = pending.pop();
    const sourceChildren = children(original);
    const targetChildren = children(duplicate);
    const componentToInstance = original.type === 'COMPONENT' && duplicate.type === 'INSTANCE';
    if ((!componentToInstance && original.type !== duplicate.type) ||
        original.name !== duplicate.name || sourceChildren.length !== targetChildren.length) {
      throw new Error('Cannot map the clone tree at layer ' + original.name + ' (' + original.id + ').');
    }
    mapping.set(original.id, duplicate);
    // clone() preserves child order. Pair before the writer changes either tree.
    for (let index = sourceChildren.length - 1; index >= 0; index -= 1) {
      pending.push([sourceChildren[index], targetChildren[index]]);
    }
  }
  return mapping;
}

function remapDestinations(value, mapping) {
  if (Array.isArray(value)) return value.map(entry => remapDestinations(entry, mapping));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => {
    if (key === 'destinationId' || (value.type === 'NODE' && key === 'value')) {
      return [key, mapping.get(entry)?.id ?? entry];
    }
    return [key, remapDestinations(entry, mapping)];
  }));
}

function preservedOverrides(original, target, mapping) {
  if (!original?.length) return true;
  const targetFields = new Map((target ?? []).map(entry => [entry.id, new Set(entry.overriddenFields)]));
  return original.every(entry => {
    const id = mapping.get(entry.id)?.id ?? entry.id;
    return entry.overriddenFields.every(field => layoutFields.includes(field) || targetFields.get(id)?.has(field));
  });
}

export async function auditClone({ source, before, clone, mapping }) {
  const [sourceAfter, targetAfter] = await Promise.all([snapshotTree(source), snapshotTree(clone)]);
  const issues = [];
  for (const [sourceId, original] of before) {
    const current = sourceAfter.get(sourceId);
    if (!current || authoringRecord(current) !== authoringRecord(original)) {
      issues.push(report('source-changed', 'warning', sourceId, sourceId));
    }
    const targetId = mapping.get(sourceId)?.id;
    const target = targetAfter.get(targetId);
    if (!target) {
      issues.push(report('missing-layer', 'error', targetId ?? clone.id, sourceId));
      continue;
    }
    const compare = (code, severity, originalValue, targetValue) => {
      // Values the host refuses to read (broken library instances) are unknown,
      // not different.
      if (originalValue === undefined || targetValue === undefined) return;
      if (!same(originalValue, targetValue)) issues.push(report(code, severity, targetId, sourceId));
    };
    compare('layer-type-changed', 'error', original.type, target.type);
    compare('variable-binding-changed', 'error', original.boundVariables, target.boundVariables);
    compare('variable-mode-changed', 'error', original.explicitModes, target.explicitModes);
    compare('resolved-variable-mode-changed', 'warning', original.resolvedModes, target.resolvedModes);
    compare('style-link-changed', 'error', original.styles, target.styles);
    compare('component-property-reference-changed', 'error', original.componentPropertyReferences, target.componentPropertyReferences);
    compare('text-or-range-style-changed', 'error', remapDestinations(original.text, mapping), target.text);
    compare('prototype-link-needs-review', 'warning', remapDestinations(original.reactions, mapping), target.reactions);
    if (original.type !== 'INSTANCE') continue;
    if (!original.mainComponentId || !target.mainComponentId) {
      issues.push(report('main-component-unavailable', 'warning', targetId, sourceId));
    }
    compare('main-component-changed', 'error', original.mainComponentId, target.mainComponentId);
    compare('instance-property-changed', 'error', original.componentProperties, target.componentProperties);
    if (!preservedOverrides(original.overrides, target.overrides, mapping)) {
      issues.push(report('instance-override-lost', 'error', targetId, sourceId));
    }
  }
  // Layers that appear inside an instance come from Figma loading nested
  // content on demand, so only new top-level layers count as an authoring edit.
  const added = [...sourceAfter.entries()]
    .filter(([id, record]) => !before.has(id) && !record.insideInstance)
    .map(([, record]) => record.name);
  if (added.length) issues.push(report('source-layers-added', 'warning', source.id, source.id, added.join('、')));
  return issues;
}

function inverse(transform) {
  const [[a, b, x], [c, d, y]] = transform;
  const determinant = a * d - b * c;
  if (!Number.isFinite(determinant) || Math.abs(determinant) < Number.EPSILON) return null;
  return [
    [d / determinant, -b / determinant, (b * y - d * x) / determinant],
    [-c / determinant, a / determinant, (c * x - a * y) / determinant],
  ];
}

const apply = ([[a, b, x], [c, d, y]], u, v) => [a * u + b * v + x, c * u + d * v + y];

function localBounds(node, pageToRoot) {
  if (!node.absoluteTransform || !Number.isFinite(node.width) || !Number.isFinite(node.height)) return null;
  const corners = [[0, 0], [node.width, 0], [0, node.height], [node.width, node.height]];
  const local = corners.map(point => apply(pageToRoot, ...apply(node.absoluteTransform, ...point)));
  const xs = local.map(point => point[0]);
  const ys = local.map(point => point[1]);
  if (![...xs, ...ys].every(Number.isFinite)) return null;
  const round = value => Math.round(value * 1e7) / 1e7;
  const x = round(Math.min(...xs));
  const y = round(Math.min(...ys));
  return { x, y, width: round(Math.max(...xs) - x), height: round(Math.max(...ys) - y) };
}

function geometryRole(node, explicit) {
  if (explicit) return explicit;
  if (node.reactions?.some(reaction => touchTriggers.has(reaction.trigger?.type))) return 'control';
  if (node.type === 'TEXT' && node.characters?.trim()) return 'content';
  return undefined;
}

function scrollAxes(node) {
  const mode = node.overflowDirection;
  return { x: mode === 'HORIZONTAL' || mode === 'BOTH', y: mode === 'VERTICAL' || mode === 'BOTH' };
}

function clipping(bounds, ancestors) {
  let visible = bounds;
  let hardClip = null;
  let scrollClip = null;
  for (const { box, axes, id } of ancestors) {
    const spillX = bounds.x < box.x - tolerance || right(bounds) > right(box) + tolerance;
    const spillY = bounds.y < box.y - tolerance || bottom(bounds) > bottom(box) + tolerance;
    if ((spillX && !axes.x) || (spillY && !axes.y)) hardClip = id;
    if ((spillX && axes.x) || (spillY && axes.y)) scrollClip = id;
    const x = Math.max(visible.x, box.x);
    const y = Math.max(visible.y, box.y);
    visible = { x, y, width: Math.min(right(visible), right(box)) - x, height: Math.min(bottom(visible), bottom(box)) - y };
  }
  return { visible, hardClip, scrollClip };
}

export function collectGeometry(root, semanticRoles = new Map()) {
  const nodes = [];
  const issues = [];
  const pageToRoot = root.absoluteTransform && inverse(root.absoluteTransform);
  if (!pageToRoot) return { nodes, issues: [report('target-transform-unavailable', 'error', root.id)] };
  let hasScrollableViewport = false;
  let hasTruncation = false;
  let hasMask = false;

  function visit(node, ancestors, withinControl) {
    if (node.visible === false) return;
    if (node.isMask) {
      hasMask = true;
      return;
    }
    // System chrome inserted by the writer lives in the reserved strips, which
    // are outside the content area by design, so it is not geometry-checked.
    if (typeof node.name === 'string' && node.name.startsWith('[af:chrome]')) return;
    const explicit = semanticRoles.get(node.id);
    if (explicit === 'decoration') return;
    const role = node === root ? undefined : geometryRole(node, explicit);
    const isControl = role === 'control' || role === 'navigation-control';
    const coveredByControl = withinControl && !explicit && role === 'content';
    if (node.opacity === 0 && !isControl) return;
    const bounds = localBounds(node, pageToRoot);
    if (node.type === 'TEXT' && node.hasMissingFont) issues.push(report('missing-font', 'warning', node.id));
    if (node.type === 'TEXT' && node.textTruncation === 'ENDING') hasTruncation = true;
    if (role && !bounds) {
      issues.push(report('layer-bounds-unavailable', 'warning', node.id));
    } else if (role) {
      const { visible, hardClip, scrollClip } = clipping(bounds, ancestors);
      if (hardClip) issues.push(report('clipped-foreground', 'warning', node.id, null, hardClip));
      if (!scrollClip) {
        if (!coveredByControl) nodes.push({ id: node.id, role, bounds });
      } else if (visible.width > tolerance && visible.height > tolerance) {
        // Validate the visible piece for collisions without treating its clipped size as a tap target.
        const visibleRole = role === 'control' || role === 'navigation-control' ? 'critical-content' : role;
        if (!coveredByControl) nodes.push({ id: node.id, role: visibleRole, bounds: visible });
        issues.push(report('partial-scroll-item-needs-review', 'warning', node.id, null, scrollClip));
      }
    }

    const axes = scrollAxes(node);
    const scrollable = axes.x || axes.y;
    if (scrollable) hasScrollableViewport = true;
    // The non-scrolling root goes to validateLayout for out-of-window checks.
    const clips = bounds && (scrollable || (node !== root && node.clipsContent));
    const next = clips ? [...ancestors, { box: bounds, axes, id: node.id }] : ancestors;
    for (const child of children(node)) visit(child, next, withinControl || isControl);
  }

  visit(root, [], false);
  if (hasScrollableViewport) issues.push(report('scroll-end-needs-review', 'warning', root.id));
  if (hasTruncation) issues.push(report('text-truncation-needs-review', 'warning', root.id));
  if (hasMask) issues.push(report('mask-clipping-needs-review', 'warning', root.id));
  if (!nodes.length) issues.push(report('no-visible-semantic-bounds', 'warning', root.id));
  return { nodes, issues };
}
