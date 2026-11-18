import { radiusOf } from './silhouette.mjs';

const graphics = new Set(['VECTOR', 'LINE', 'ELLIPSE', 'POLYGON', 'STAR', 'BOOLEAN_OPERATION']);
const shellMinimumShare = 0.55;
const shellMinimumRadius = 8;
const shellDecorationShare = 0.08;
const backgroundName = /^(?:\[af:background\](?:\s|$)|bg$|background(?:\s|$)|(?:画板)?背景(?:\s|$))/i;
const composerGap = 12;
const minimumThreadHeight = 84;
// A single leftover measure for long-form text. Only used when the caller asks
// for a reading column; the default fills the usable area instead.
const readingWidth = 580;
const chatWindowWidth = 680;

function canResize(node) {
  return Math.abs(node.rotation ?? 0) < 0.01 && !node.targetAspectRatio &&
    !node.boundVariables?.width && !node.boundVariables?.height;
}

function backgroundHasContent(node) {
  if (node.reactions?.length || (node.type === 'TEXT' && node.characters?.trim())) return true;
  return (node.children ?? []).some(child => child.visible && backgroundHasContent(child));
}

export function fullBleedLayers(container) {
  const backgrounds = [];
  for (const node of container.children) {
    if (!node.visible) continue;
    const named = backgroundName.test(node.name.trim());
    const allowedType = named ? ['RECTANGLE', 'FRAME', 'GROUP', 'VECTOR', 'INSTANCE'].includes(node.type) :
      node.type === 'RECTANGLE';
    const relaxed = named || backgroundName.test(container.name.trim());
    const tolerance = relaxed ? 8 : 2;
    const minCoverage = relaxed ? 0.9 : 1;
    if (!allowedType || node.isMask || !canResize(node) || Math.abs(node.x) > tolerance ||
        Math.abs(node.y) > tolerance || node.width + tolerance < container.width * minCoverage ||
        node.height + tolerance < container.height * minCoverage || backgroundHasContent(node)) break;
    backgrounds.push(node);
  }
  return backgrounds;
}

export function fitFullBleed(node, width, height) {
  const locked = node.locked;
  try {
    if (locked) node.locked = false;
    const inner = node.type === 'FRAME' ? fullBleedLayers(node) : [];
    if (node.type === 'FRAME' && ['HORIZONTAL', 'VERTICAL'].includes(node.layoutMode)) {
      node.primaryAxisSizingMode = 'FIXED';
      node.counterAxisSizingMode = 'FIXED';
    }
    if (node.children?.length && !inner.length) node.resize(width, height);
    else node.resizeWithoutConstraints(width, height);
    node.x = 0;
    node.y = 0;
    for (const child of inner) {
      if (node.layoutMode === 'NONE' || child.layoutPositioning === 'ABSOLUTE') fitFullBleed(child, width, height);
    }
  } finally {
    if (locked) node.locked = true;
  }
}

function solidPaint(fills) {
  const paint = Array.isArray(fills) ? fills.find(entry => entry.visible !== false) : null;
  if (!paint || paint.type !== 'SOLID' || !paint.color) return null;
  const { r, g, b } = paint.color;
  return [r, g, b, paint.opacity ?? 1].map(value => Math.round((value ?? 0) * 255)).join(',');
}

// A device render wraps the app screen in a body plate, so the screen is inset
// instead of filling the frame: a bezel, a status strip or a fold edge eats part
// of the body. The generated frame stands for the window, not for the mock, so
// the screen has to be treated as the page surface — otherwise the leftover
// body stays a grey plate with the mock's corners and the usable area looks
// empty next to the content.
export function shellScreen(root) {
  if (!('children' in root) || root.type !== 'FRAME') return null;
  const backgrounds = fullBleedLayers(root);
  const rows = root.children.filter(node => node.visible && !backgrounds.includes(node));
  // A bezel carries its own decorations — home indicator, camera dot, speaker —
  // as leaf shapes; the page itself always lives inside the screen.
  const screens = rows.filter(node => ['FRAME', 'INSTANCE'].includes(node.type) && !node.isMask &&
    !node.locked && Math.abs(node.rotation ?? 0) < 0.01 &&
    node.width >= root.width * shellMinimumShare && node.height >= root.height * shellMinimumShare);
  if (screens.length !== 1) return null;
  const [screen] = screens;
  // A bezel is thin: a card floating on a page covers far less of it.
  if (screen.width * screen.height < root.width * root.height * shellMinimumShare) return null;
  const decorations = rows.filter(node => node !== screen);
  const budget = root.width * root.height * shellDecorationShare;
  if (decorations.some(node => (node.children ?? []).length > 0 ||
    node.width * node.height > budget)) return null;
  // A flush screen is the page wrapper, which `contentContainer` already covers.
  if (screen.width >= root.width - 2 && screen.height >= root.height - 2) return null;
  const bodyRadius = Math.max(radiusOf(root), ...backgrounds.map(radiusOf));
  if (bodyRadius < shellMinimumRadius) return null;
  const bodyPaint = solidPaint(root.fills) ?? backgrounds.map(node => solidPaint(node.fills)).find(Boolean) ?? null;
  if (!bodyPaint) return null;
  // A page whose only child is a card painted like the page is a card, not a
  // screen on a body.
  const facePaint = solidPaint(screen.fills);
  if (facePaint === bodyPaint) return null;
  return screen;
}

// Everything a device body draws beside the screen — home indicator, camera
// dot, speaker — is mock chrome. The window replaces it with its own system
// chrome, and stretching the screen would leave it floating on the app surface,
// so it is dropped.
export function bezelDecorations(root, screen) {
  if (!screen) return [];
  const backgrounds = fullBleedLayers(root);
  return root.children.filter(node => node.visible && node !== screen && !backgrounds.includes(node));
}


// The window holds the app, not the mock's bezel: the screen is stretched over
// the usable area so the body cannot show through as an empty plate.
export function fitScreen(screen, area, notes = []) {
  if (!canResize(screen)) return false;
  const flow = screen.type === 'FRAME' && ['HORIZONTAL', 'VERTICAL'].includes(screen.layoutMode);
  if (screen.type === 'INSTANCE') {
    screen.resize(area.width, area.height);
  } else if (flow) {
    screen.primaryAxisSizingMode = 'FIXED';
    screen.counterAxisSizingMode = 'FIXED';
    resizeSection(screen, area.width, 0, notes);
    screen.resize(area.width, area.height);
  } else {
    resizeSection(screen, area.width, 0, notes);
    screen.resizeWithoutConstraints(area.width, area.height);
  }
  screen.x = area.x;
  screen.y = area.y;
  const contentBottom = Math.max(0, ...(screen.children ?? [])
    .filter(child => child.visible).map(child => child.y + child.height));
  if (screen.overflowDirection === 'NONE' && contentBottom > area.height + 1) {
    screen.overflowDirection = 'VERTICAL';
  }
  return true;
}

function layers(container) {
  const visible = container.children.filter(node => node.visible);
  const backgrounds = fullBleedLayers(container);
  return { rows: visible.filter(node => !backgrounds.includes(node)), backgrounds };
}

// Bezel decorations are not page rows: a home indicator under the screen would
// otherwise hide the screen from the layout pass.
function layoutLayers(container) {
  const current = layers(container);
  const screen = shellScreen(container);
  if (!screen) return current;
  return { rows: [screen], backgrounds: current.backgrounds };
}

function hasComposer(node) {
  if (!node.visible) return false;
  if (/^\[af:composer\](?:\s|$)/i.test(node.name)) return true;
  if (/^(?:输入框[-－— ]?(?:pc|web|桌面|移动|平板)端?|(?:聊天|消息)输入[框栏]|bottom input container)$/i.test(node.name.trim())) return true;
  if (node.type === 'TEXT' && /^(发消息|发送消息|输入消息|输入(?:您|你)的(?:问题|消息)|描述客户情况和待办事项|按住说话|type a message|write a message)/i.test(node.characters?.trim() ?? '')) return true;
  return (node.children ?? []).some(hasComposer);
}

export function hasTopBar(node) {
  return node.visible && (/^(?:顶部栏|custom header|top bar|toolbar|navbar)$/i.test(node.name.trim()) ||
    (node.children ?? []).some(hasTopBar));
}

// Some exported chat screens are tall snapshots of a scrolling conversation.
// Their phone chrome and wallpaper are separate layers at the original phone size.
export function identifyChatSnapshot(root) {
  if (root.layoutMode !== 'NONE') return null;
  const layers = root.children.filter(node => node.visible);
  const fullWidth = node => Math.abs(node.x) <= 2 && Math.abs(node.width - root.width) <= 2;
  const header = layers.find(node => node.type === 'INSTANCE' && canResize(node) && !node.locked &&
    fullWidth(node) && node.y === 0 && node.children?.length === 2 &&
    node.children[0].type === 'INSTANCE' && /导航栏.NavBar|status ?bar/i.test(node.children[0].name) &&
    node.children[1].y === node.children[0].height &&
    node.children[1].y + node.children[1].height === node.height);
  if (!header) return null;
  const backgrounds = layers.filter(node => backgroundName.test(node.name.trim()) &&
    fullWidth(node) && node.y === 0 && node.height >= root.width && canResize(node) && !backgroundHasContent(node));
  const home = layers.find(node => node.type === 'FRAME' && fullWidth(node) &&
    node.height <= 44 && node.y + node.height >= root.height - 2 &&
    node.children?.length === 1 && /^tabbar$/i.test(node.children[0].name) &&
    !backgroundHasContent(node));
  const docks = layers.filter(node => node.type === 'FRAME' && !node.locked && canResize(node) &&
    node.y >= root.height - 240 && fullWidth(node) && hasComposer(node));
  const thread = layers.find(node => node.type === 'FRAME' && !node.locked && canResize(node) &&
    node.y === header.height && node.width >= root.width * 0.85 && !hasComposer(node));
  if (!thread || !home || !backgrounds.length || !docks.length) return null;
  const dock = docks.at(-1);
  const labels = node => !node.visible ? [] : node.type === 'TEXT' ? [node.characters] :
    (node.children ?? []).flatMap(labels);
  const interactions = node => !node.visible ? [] :
    [...(node.reactions ?? []), ...(node.children ?? []).flatMap(interactions)];
  const dockKey = JSON.stringify([labels(dock), interactions(dock)]);
  const duplicates = docks.slice(0, -1).filter(node =>
    node.y === dock.y && node.height === dock.height &&
    JSON.stringify([labels(node), interactions(node)]) === dockKey);
  if (duplicates.length !== docks.length - 1) return null;
  const decoration = layers.filter(node => node.type === 'VECTOR' && fullWidth(node) &&
    backgrounds.some(bg => node.y + node.height === bg.height) && !backgroundHasContent(node));
  if (layers.some(node => ![header, thread, home, ...docks, ...backgrounds, ...decoration].includes(node))) return null;
  return { header, thread, dock, duplicates, home, backgrounds, decoration };
}

function chatViewport(figma, root, name, rect) {
  const frame = figma.createFrame();
  root.appendChild(frame);
  frame.name = name;
  frame.fills = [];
  frame.clipsContent = true;
  frame.resizeWithoutConstraints(rect.width, rect.height);
  frame.x = rect.x;
  frame.y = rect.y;
  return frame;
}

// The visible reply can be taller than several of its authored wrappers.
// Give the scroll frame the real content height without touching image masks.
function growChatThread(node) {
  if (node.type !== 'FRAME' || node.clipsContent || !canResize(node) || node.locked) return node.height;
  const bottom = Math.max(0, ...node.children.filter(child => child.visible)
    .map(child => child.y + growChatThread(child)));
  if (bottom > node.height + 0.5) {
    node.resizeWithoutConstraints(node.width, bottom + (node.paddingBottom ?? 0));
  }
  return node.height;
}

function fitChatDock(original, mapping, width, notes) {
  const dock = mapping.get(original.id);
  const rows = [];
  let input = null;
  // Keep shortcut capsules on one independently scrollable row. Fitting the
  // dock must not stack them or shrink their touch areas.
  const visit = (source, parents = []) => {
    if (source.type !== 'FRAME' || source.locked) return;
    const node = mapping.get(source.id);
    const children = flowChildren(source);
    if (source.layoutMode === 'HORIZONTAL' && children.length >= 3 && uniformCards(children) &&
        children.every(child => child.height <= 44)) {
      node.clipsContent = true;
      node.overflowDirection = 'HORIZONTAL';
      rows.push([...parents, source]);
      return;
    }
    for (const child of children) {
      if (child.type === 'INSTANCE' && canResize(child) && child.width >= source.width - 2) {
        mapping.get(child.id).resize(width, child.height);
        if (/^输入框$|^\[af:composer-input\]/i.test(child.name.trim()) && hasComposer(child)) {
          input = mapping.get(child.id);
        }
      } else {
        visit(child, [...parents, source]);
      }
    }
  };
  visit(original);
  resizeSection(dock, width, 0, notes);
  for (const path of rows) {
    let available = width;
    for (let index = 1; index < path.length; index += 1) {
      const source = path[index];
      const parent = path[index - 1];
      available -= Math.max(0, parent.width - source.width);
      const node = mapping.get(source.id);
      if (available > 0 && canResize(node) && node.layoutSizingHorizontal !== 'FILL') {
        node.resize(available, node.height);
      }
    }
  }
  return { dock, input };
}

export function fitChatSnapshot(figma, root, mapping, source, plan, widthMode) {
  const issues = [];
  root.resizeWithoutConstraints(plan.target.width, plan.target.height);
  root.clipsContent = true;
  root.overflowDirection = 'NONE';
  for (const original of source.backgrounds) {
    const bg = mapping.get(original.id);
    if (bg.type === 'INSTANCE' && typeof bg.rescale === 'function') {
      bg.rescale(Math.max(root.width / bg.width, root.height / bg.height));
      bg.x = 0;
      bg.y = 0;
    } else {
      fitFullBleed(bg, root.width, root.height);
    }
  }
  for (const original of [source.home, ...source.duplicates, ...source.decoration]) {
    mapping.get(original.id).visible = false;
  }

  const [upper, lower] = plan.contentRegions;
  const tabletop = plan.target.posture === 'tabletop' && plan.contentRegions.length === 2 &&
    upper.y + upper.height <= lower.y && upper.height >= 44 + minimumThreadHeight;
  const area = tabletop ? upper : plan.content.region;
  const dockArea = tabletop && lower.height >= source.dock.height ? lower : area;
  const header = mapping.get(source.header.id);
  const statusHeight = source.header.children[0].height;
  const headerHeight = source.header.height - statusHeight;
  if (area.height <= headerHeight) throw new Error('目标窗口放不下应用标题和对话，请检查窗口及安全区高度。');
  const top = chatViewport(figma, root, '应用标题栏', { ...area, height: headerHeight });
  top.appendChild(header);
  header.resize(area.width, source.header.height);
  header.x = 0;
  header.y = -statusHeight;

  const columnWidth = widthMode === 'reading' ? readingWidth : chatWindowWidth;
  const dockWidth = Math.min(dockArea.width, columnWidth);
  const { dock, input } = fitChatDock(source.dock, mapping, dockWidth, issues);
  const threadY = area.y + headerHeight;
  const dockY = dockArea === area ? area.y + area.height - dock.height :
    dockArea.y + Math.min(16, Math.max(0, dockArea.height - dock.height));
  const fixed = dockY >= dockArea.y && (dockArea !== area || dockY - composerGap - threadY >= minimumThreadHeight);
  const compactY = area.y + area.height - (input?.height ?? 0);
  const compact = !fixed && input && compactY - composerGap - threadY >= minimumThreadHeight;
  const threadBottom = fixed && dockArea === area ? dockY - composerGap :
    compact ? compactY - composerGap : area.y + area.height;
  const threadWidth = Math.min(area.width, columnWidth);
  const thread = chatViewport(figma, root, '对话内容', {
    x: area.x + (area.width - threadWidth) / 2, y: threadY,
    width: threadWidth, height: threadBottom - threadY,
  });
  const body = mapping.get(source.thread.id);
  thread.appendChild(body);
  const margin = Math.min(12, (threadWidth - 1) / 2);
  resizeSection(body, threadWidth - 2 * margin, 0, issues);
  body.x = margin;
  body.y = 0;
  const bodyHeight = growChatThread(body);
  if (fixed) {
    const composer = chatViewport(figma, root, '对话输入栏', {
      x: dockArea.x + (dockArea.width - dockWidth) / 2, y: dockY, width: dockWidth, height: dock.height,
    });
    composer.appendChild(dock);
    dock.x = 0;
    dock.y = 0;
  } else {
    thread.appendChild(dock);
    dock.x = (threadWidth - dockWidth) / 2;
    dock.y = bodyHeight + composerGap;
    issues.push({ nodeId: dock.id, severity: 'warning', code: 'chat-composer-scroll-fallback',
      detail: compact ? '短窗口固定输入框，快捷操作与说明位于正文末尾。' :
        '短窗口保留标题，输入区随正文滚动到末尾。' });
  }
  if (compact) {
    const composer = chatViewport(figma, root, '对话输入框', {
      x: thread.x, y: compactY, width: threadWidth, height: input.height,
    });
    composer.appendChild(input);
    input.x = 0;
    input.y = 0;
  }
  if (bodyHeight > thread.height || !fixed) thread.overflowDirection = 'VERTICAL';
  const viewports = fixed ? [top, thread, dock.parent] : compact ? [top, thread, input.parent] : [top, thread];
  const layoutRegions = viewports
    .map(node => ({ nodeId: node.id, name: node.name, x: node.x, y: node.y, width: node.width, height: node.height,
      fixed: node !== thread, scrolls: node.overflowDirection === 'VERTICAL' }));
  return { strategy: 'chat-flow', issues, layoutRegions };
}

function hasResult(node) {
  if (!node.visible) return false;
  if (/^\[af:result\](?:\s|$)/i.test(node.name)) return true;
  const heading = /^(?:(?:(?:营业执照|企业证件|证件|文档|文件|OCR)\s*)?(?:识别|解析|提取)结果|(?:document )?(?:extraction|recognition) results?)(?:\s*[（(:：]|$)/i;
  if (heading.test(node.name.trim()) ||
      (node.type === 'TEXT' && heading.test(node.characters?.trim() ?? ''))) return true;
  return (node.children ?? []).some(hasResult);
}

function collectResultLayers(container) {
  const candidates = [];
  function visit(parent, path) {
    const siblings = parent.children.filter(node => node.visible);
    if (siblings.some(node => node.isMask)) return;
    for (const node of siblings) {
      if (node.locked || !['FRAME', 'INSTANCE'].includes(node.type) ||
          Math.abs(node.rotation ?? 0) >= 0.01) continue;
      const nested = parent !== container;
      const overlaps = nested && siblings.some(sibling => sibling !== node &&
        sibling.y < node.y + node.height - 2 && sibling.y + sibling.height > node.y + 2);
      const nodePath = [...path, node.name];
      if (!overlaps && node.height >= 44 && node.width >= container.width * 0.55 && !hasComposer(node)) {
        candidates.push({ node, label: nodePath.join(' / ') });
      }
      if (node.type === 'FRAME') visit(node, nodePath);
    }
  }
  visit(container, []);
  return candidates;
}

function resultListHeading(node) {
  if (node.type !== 'FRAME' || node.layoutMode !== 'VERTICAL') return null;
  const cards = node.children.filter(child => child.visible);
  if (cards.length < 2 || cards.some(card => !['FRAME', 'INSTANCE'].includes(card.type) ||
      card.width < node.width * 0.8 || card.height < 56) ||
      cards.some((card, index) => index > 0 && card.y < cards[index - 1].y + cards[index - 1].height - 2)) return null;
  const siblings = node.parent.children.filter(child => child.visible && child !== node &&
    child.y + child.height <= node.y + 2);
  const heading = siblings.sort((a, b) => b.y + b.height - a.y - a.height)[0];
  if (!heading || heading.locked || heading.height > 64 || node.y - heading.y - heading.height > 24) return null;
  const label = heading.type === 'TEXT' ? heading : heading.type === 'FRAME' && heading.children.length === 1
    ? heading.children[0] : null;
  if (label?.type !== 'TEXT' || !label.visible || label.characters.length > 32 ||
      !/(排查|结果|建议|明细|清单|报告|处理方案|步骤|诊断|分析|results?|findings|resolution)/i.test(label.characters)) return null;
  return heading;
}

export function identifyDashboard(root, resultId = null) {
  const empty = !resultId && /空状态|暂无对话|^\[af:empty\](?:\s|$)|\bempty state\b/i.test(root.name);
  const chat = !empty && (Boolean(resultId) || /^\[af:chat\](?:\s|$)/i.test(root.name) || hasComposer(root));
  const namedReport = /报表|dashboard|analytics|report/i.test(root.name);
  if (!['NONE', 'VERTICAL'].includes(root.layoutMode) && !namedReport && !chat && !empty) return null;
  const wrappers = [];
  const backgrounds = [];
  let container = root;
  let current = layoutLayers(container);
  while (current.rows.length === 1) {
    const [wrapper] = current.rows;
    // The screen inside a device shell is inset by the bezel, so it only counts
    // as a wrapper when the shell detector recognises it.
    const bezel = shellScreen(container)?.id === wrapper.id;
    if (wrapper.type !== 'FRAME' || !canResize(wrapper) || wrapper.locked || wrapper.isMask ||
        !['NONE', 'VERTICAL'].includes(wrapper.layoutMode) ||
        (!bezel && (Math.abs(wrapper.x) > 8 || Math.abs(wrapper.y) > 8 ||
          wrapper.width < container.width * 0.9))) break;
    backgrounds.push(...current.backgrounds);
    wrappers.push(wrapper);
    container = wrapper;
    current = layoutLayers(container);
  }
  backgrounds.push(...current.backgrounds);
  const { rows } = current;
  // A mask at this level can affect sibling layers. Keep that whole sequence together.
  if (!rows.length || rows.some(node => node.locked || !('x' in node) || !('y' in node))) return null;
  const bands = [];
  for (const node of [...rows].sort((a, b) => a.y - b.y)) {
    const previous = bands[bands.length - 1];
    const bottom = node.y + node.height;
    if (previous && node.y < previous.y + previous.height - 2) {
      previous.nodes.push(node);
      previous.height = Math.max(previous.height, bottom - previous.y);
    } else {
      bands.push({ y: node.y, height: node.height, nodes: [node] });
    }
  }
  const broad = bands.filter(band => band.nodes.some(node => node.width >= container.width * 0.62));
  if (broad.length < 3 && !namedReport && !chat && !empty) return null;
  const order = new Map(rows.map((node, index) => [node.id, index]));
  const modules = rows.some(node => node.isMask)
    ? [{ y: bands[0].y, height: Math.max(...bands.map(band => band.y + band.height)) - bands[0].y, nodes: rows }]
    : bands.map(band => ({ ...band, nodes: band.nodes.sort((a, b) => order.get(a.id) - order.get(b.id)) }));
  const last = modules[modules.length - 1];
  const explicitComposer = last.nodes.length === 1 && /^\[af:composer\](?:\s|$)/i.test(last.nodes[0].name);
  const inferredComposer = last.height <= 176 && last.y + last.height >= container.height - 48 &&
    last.nodes.some(hasComposer);
  const composer = chat && modules.length > 1 && (explicitComposer || inferredComposer) ? last : null;
  const candidates = collectResultLayers(container);
  const eligible = candidates.filter(({ node }) => node.parent !== container ||
    modules.some(row => row !== composer && row.nodes.length === 1 && row.nodes[0] === node));
  const automatic = chat && (eligible.find(({ node }) => /^\[af:result\](?:\s|$)/i.test(node.name)) ||
    eligible.find(({ node }) => node.parent !== container && resultListHeading(node)) ||
    [...eligible].reverse().find(({ node }) => node.height >= 80 && hasResult(node)));
  const picked = resultId ? eligible.find(({ node }) => node.id === resultId) : automatic;
  if (resultId && !picked) throw new Error('选定的结果图层已变更，或与相邻图层重叠。请重新选择独立结果卡。');
  const resultNode = picked?.node;
  const direct = resultNode && modules.find(row => row.nodes.length === 1 && row.nodes[0] === resultNode);
  const heading = resultNode && !direct ? resultListHeading(resultNode) : null;
  const result = resultNode && (direct || {
    y: heading?.y ?? resultNode.y,
    height: resultNode.y + resultNode.height - (heading?.y ?? resultNode.y),
    nodes: heading ? [heading, resultNode] : [resultNode],
  });
  return {
    container, wrappers, rows: modules, backgrounds, chat, composer, result, candidates: eligible, empty,
    authoredTopBar: chat && modules[0].nodes.some(hasTopBar),
  };
}

export function resultLayerChoices(root) {
  const layout = identifyDashboard(root);
  const choices = layout?.candidates ?? collectResultLayers(root);
  return choices.map(({ node, label }) => ({ id: node.id, label }));
}

function flowChildren(node) {
  return node.children.filter(child => child.visible && child.layoutPositioning !== 'ABSOLUTE');
}

// Columns of a checkbox group, card grids, and similar equal-weight siblings can
// reflow as a group: they stack when the window is too narrow and share the
// extra width when it is wide. Mixed rows (a title plus its actions) are left
// alone so their spacing is not rewritten.
function uniformCards(children) {
  if (children.length < 2) return false;
  const widths = children.map(child => child.width);
  const widest = Math.max(...widths);
  return widest > 0 && widest - Math.min(...widths) <= widest * 0.3 &&
    children.every(child => ['FRAME', 'INSTANCE'].includes(child.type) &&
      canResize(child) && child.height >= 16);
}

function rowDemand(node, children) {
  return children.reduce((sum, child) => sum + child.width, 0) +
    node.itemSpacing * Math.max(0, children.length - 1);
}

function stackUniformRow(node, notes) {
  if (node.layoutMode !== 'HORIZONTAL' || node.overflowDirection === 'HORIZONTAL') return false;
  const children = flowChildren(node);
  if (!uniformCards(children)) return false;
  const inner = node.width - node.paddingLeft - node.paddingRight;
  if (rowDemand(node, children) <= inner + 0.5) return false;
  node.layoutMode = 'VERTICAL';
  node.primaryAxisSizingMode = 'AUTO';
  node.counterAxisSizingMode = 'FIXED';
  for (const child of children) {
    if (child.type === 'FRAME') child.layoutSizingHorizontal = 'FILL';
  }
  notes.push({
    nodeId: node.id, code: 'stacked-single-column', severity: 'warning',
    detail: '多列内容在窄窗口放不下，已改为单列堆叠；如需保持多列请换用紧凑变体。',
  });
  return true;
}

function spreadUniformRow(node, children, originalWidth) {
  if (node.layoutMode !== 'HORIZONTAL' || !uniformCards(children)) return false;
  const inner = node.width - node.paddingLeft - node.paddingRight;
  const before = originalWidth - node.paddingLeft - node.paddingRight;
  const demand = rowDemand(node, children);
  // Only rows that used to fill their container are spread; a pair of small
  // buttons keeps its size and alignment.
  if (before <= 0 || demand < before * 0.7 || demand > inner - 8) return false;
  for (const child of children) {
    if (child.type === 'FRAME') child.layoutSizingHorizontal = 'FILL';
  }
  return true;
}

// Fixed-width text inside a narrower auto-layout container re-wraps instead of
// spilling out of the usable area; rows that used to be full width follow the
// container when it grows. Instances keep their size.
function fitFlowChildren(node, notes, depth, beforeWidth) {
  const inner = node.width - node.paddingLeft - node.paddingRight;
  const beforeInner = beforeWidth - node.paddingLeft - node.paddingRight;
  if (inner <= 0) return;
  for (const child of flowChildren(node)) {
    if (!canResize(child)) continue;
    if (child.width > inner + 0.5) {
      if (child.type === 'TEXT') {
        child.layoutSizingHorizontal = 'FILL';
        continue;
      }
      if (child.type === 'FRAME') {
        resizeSection(child, inner, depth + 1, notes);
        continue;
      }
      notes.push({
        nodeId: child.id, code: 'content-wider-than-area', severity: 'warning',
        detail: '图层比可用宽度宽 ' + Math.round(child.width - inner) + ' pt，已保留原尺寸，请换用紧凑变体。',
      });
      continue;
    }
    const wasFullWidth = beforeInner > 0 && child.width >= beforeInner * 0.8;
    if (!wasFullWidth || child.width >= inner - 0.5) continue;
    if (child.type === 'TEXT') child.layoutSizingHorizontal = 'FILL';
    else if (child.type === 'FRAME') resizeSection(child, inner, depth + 1, notes);
  }
}

function resizeSection(node, width, depth = 0, notes = []) {
  if (node.type !== 'FRAME' || !canResize(node) || depth > 8) return;
  const originalWidth = node.width;
  if (Math.abs(originalWidth - width) < 0.1) return;
  const children = node.children.filter(child => child.visible);
  // Preserve the coordinate system of plot marks and other vector compositions.
  if (depth > 0 && children.filter(child => graphics.has(child.type)).length >= 2) return;
  if (node.layoutMode !== 'NONE') {
    const flow = flowChildren(node);
    const horizontal = node.layoutMode === 'HORIZONTAL';
    const hugHeight = !horizontal && node.primaryAxisSizingMode === 'AUTO';
    if (!horizontal) node.counterAxisSizingMode = 'FIXED';
    if (horizontal) node.primaryAxisSizingMode = 'FIXED';
    node.resize(width, node.height);
    if (hugHeight) node.primaryAxisSizingMode = 'AUTO';
    if (horizontal) {
      if (node.overflowDirection === 'HORIZONTAL') return;
      if (!stackUniformRow(node, notes)) spreadUniformRow(node, flow, originalWidth);
      return;
    }
    fitFlowChildren(node, notes, depth, originalWidth);
    return;
  }

  node.resizeWithoutConstraints(width, node.height);
  reflowChildren(children, originalWidth, width, depth, 0, 0, notes);
}

function reflowChildren(children, originalWidth, width, depth, offsetX = 0, offsetY = 0, notes = []) {
  for (const child of children) {
    if (child.locked || child.isMask || Math.abs(child.rotation ?? 0) >= 0.01) {
      child.x += offsetX;
      child.y += offsetY;
      continue;
    }
    const left = child.x;
    const right = originalWidth - left - child.width;
    const broad = left >= -1 && right >= -1 && child.width >= originalWidth * 0.55;
    const available = width - left - right;
    if (broad && available >= 1) {
      if (child.type === 'RECTANGLE' && canResize(child) && !child.fills?.some(paint => paint.type === 'IMAGE')) {
        child.resizeWithoutConstraints(available, child.height);
      } else {
        resizeSection(child, available, depth + 1, notes);
      }
    }
    if (!graphics.has(child.type)) {
      const alignment = child.constraints?.horizontal;
      // A layer that already hugs the right edge keeps hugging it, even when
      // the file left its constraint on the default.
      const trailing = right <= 24 && right < left - 8;
      if (alignment === 'MAX' || alignment === 'RIGHT' || (trailing && alignment !== 'FIXED')) {
        child.x = Math.max(0, width - right - child.width);
      } else if (alignment === 'CENTER' || (broad && Math.abs(left - right) <= 4)) {
        child.x = Math.max(0, (width - child.width + left - right) / 2);
      } else {
        child.x = Math.max(0, Math.min(left, width - child.width));
      }
    }
    child.x += offsetX;
    child.y += offsetY;
  }
}

// Reflow an absolute-layout (layoutMode NONE) page into the target content area:
// full-width rows follow the usable width, other layers keep their size and are
// repositioned by their Figma constraints, and instances or text are never
// stretched. `oldWidth` is the source width before the root was resized.
export function fitAbsoluteContent(root, container, oldWidth, area, notes = []) {
  if (container !== root) {
    container.x = area.x;
    container.y = area.y;
    resizeSection(container, area.width, 0, notes);
    return;
  }
  const children = root.children.filter(child => child.visible);
  reflowChildren(children, oldWidth, area.width, 0, area.x, area.y, notes);
}

// A single visible frame that fills the source acts as the page container. When
// the page sits on a device body the screen is inset by the bezel, so it is the
// container even though it does not fill the frame.
export function contentContainer(root, oldWidth, backgrounds = fullBleedLayers(root)) {
  const rows = root.children.filter(node => node.visible && !backgrounds.includes(node));
  const [wrapper] = rows;
  if (rows.length === 1 && wrapper.type === 'FRAME' && canResize(wrapper) && !wrapper.locked &&
      !wrapper.isMask && wrapper.width >= oldWidth * 0.9 &&
      Math.abs(wrapper.x) <= 8 && Math.abs(wrapper.y) <= 8) return wrapper;
  return shellScreen(root) ?? root;
}

function sideBySide(plan, direction, minWidth) {
  const whole = plan.content.region;
  if (plan.target.display !== 'inner' || plan.target.multitasking) return null;
  let [left, right] = plan.contentRegions;
  if (plan.target.posture === 'flat' && plan.contentRegions.length === 1 && whole.width >= 680) {
    const width = (whole.width - 16) / 2;
    left = { ...whole, width };
    right = { ...left, x: left.x + width + 16 };
  } else if (plan.target.posture !== 'book' || plan.contentRegions.length !== 2 ||
      left.y !== right.y || left.x >= right.x) {
    return null;
  }
  if (Math.min(left.width, right.width) < minWidth) return null;
  return direction === 'rtl' ? [right, left] : [left, right];
}

function paneGroups(rows, plan, direction) {
  const panes = rows.length >= 4 && sideBySide(plan, direction, 280);
  if (!panes) return [{ rect: plan.content.region, rows }];
  const height = group => {
    const last = group[group.length - 1];
    return last.y + last.height - group[0].y;
  };
  let best = null;
  for (let i = 2; i <= rows.length - 2; i++) {
    const groups = [rows.slice(0, i), rows.slice(i)];
    const score = Math.max(...groups.map((group, index) => height(group) / panes[index].height));
    if (!best || score < best.score) best = { groups, score };
  }
  return best.groups.map((group, index) => ({ rect: panes[index], rows: group }));
}

function chatGroups(dashboard, plan, direction, widthMode = 'fill') {
  const panes = dashboard.result && sideBySide(plan, direction, 320);
  const thread = dashboard.rows.filter(row => row !== dashboard.composer && row !== dashboard.result);
  const split = panes && thread.length > 0;
  const region = split ? panes[0] : plan.content.region;
  // `fill` widens the thread to the usable area so a wide window is not left
  // with unexplained gutters; `reading` keeps a measured column and centres it.
  const width = widthMode === 'reading' ? Math.min(region.width, readingWidth) : region.width;
  const rect = { ...region, x: region.x + (region.width - width) / 2, width };
  const composer = dashboard.composer;
  const maxComposerHeight = rect.height - composerGap - minimumThreadHeight;
  const fixed = composer && maxComposerHeight > 0;
  const composerHeight = fixed ? Math.min(composer.height + 8, maxComposerHeight) : 0;
  const groups = [{
    rect: fixed ? { ...rect, height: rect.height - composerHeight - composerGap } : rect,
    rows: dashboard.rows.filter(row => !(fixed && row === composer) && !(split && row === dashboard.result)),
  }];
  if (fixed) groups.push({
    rect: { ...rect, y: rect.y + rect.height - composerHeight, height: composerHeight },
    rows: [composer], fixed: true,
  });
  if (split) groups.push({ rect: panes[1], rows: [dashboard.result], result: true });
  return { groups, gutter: Math.max(0, region.width - width), region };
}

function compactParent(mapping, originals) {
  const originalParent = originals[0].parent;
  const parent = mapping.get(originalParent.id);
  if (parent.layoutMode !== 'NONE' || !canResize(parent)) return;
  const top = Math.min(...originals.map(node => node.y));
  const bottom = Math.max(...originals.map(node => node.y + node.height));
  const span = bottom - top;
  for (const sibling of originalParent.children) {
    if (sibling.visible && sibling.y >= bottom - 2) {
      const copy = mapping.get(sibling.id);
      if (!copy.locked) copy.y = Math.max(top, sibling.y - span);
    }
  }
  parent.resizeWithoutConstraints(parent.width, Math.max(1, parent.height - span));
}

export function fitDashboard(figma, root, mapping, dashboard, plan, direction, options = {}) {
  const widthMode = options.widthMode === 'reading' ? 'reading' : 'fill';
  const notes = [];
  const container = mapping.get(dashboard.container.id);
  if (root.layoutMode !== 'NONE') root.layoutMode = 'NONE';
  root.resizeWithoutConstraints(plan.target.width, plan.target.height);
  root.clipsContent = true;
  for (const original of dashboard.wrappers) {
    const wrapper = mapping.get(original.id);
    if (wrapper.layoutMode !== 'NONE') wrapper.layoutMode = 'NONE';
    wrapper.resizeWithoutConstraints(root.width, root.height);
    wrapper.x = 0;
    wrapper.y = 0;
  }
  for (const original of dashboard.backgrounds) {
    fitFullBleed(mapping.get(original.id), root.width, root.height);
  }

  const layout = dashboard.empty
    ? { groups: [{ rect: plan.content.region, rows: dashboard.rows }], gutter: 0 }
    : dashboard.chat ? chatGroups(dashboard, plan, direction, widthMode)
      : { groups: paneGroups(dashboard.rows, plan, direction), gutter: 0 };
  const groups = layout.groups;
  const issues = [];
  const splitChat = groups.some(group => group.result);
  if (layout.gutter > 0.5) {
    issues.push({ nodeId: root.id, severity: 'warning', code: 'reading-width-gutter',
      detail: '内容按 ' + Math.round(groups[0].rect.width) + ' pt 阅读宽度居中，左右各留 ' +
        Math.round(layout.gutter / 2) + ' pt 空白。面板把「宽窗填充」改为「撑满可用区」即可消除。' });
  }
  if (dashboard.chat && !groups.some(group => group.fixed)) {
    const layer = dashboard.composer?.nodes[0];
    issues.push({ nodeId: root.id, severity: 'warning', code: 'chat-composer-review',
      detail: layer ? '窗口高度不足以单独固定输入栏，输入栏随正文滚动。' :
        '未识别出独立输入栏。可将输入栏整理为底部独立 Frame，名称以 [af:composer] 开头。' });
  }
  if (dashboard.chat && !splitChat && sideBySide(plan, direction, 320)) {
    issues.push({ nodeId: root.id, severity: 'warning', code: 'chat-result-review',
      detail: '未识别出可分栏的对话与结果。在面板展开「指定对话结果卡」，选择独立结果图层。' });
  }
  const views = groups.map(group => {
    const { rect, fixed, result } = group;
    const viewport = figma.createFrame();
    try {
      container.appendChild(viewport);
    } catch (error) {
      viewport.remove();
      throw error;
    }
    viewport.name = dashboard.empty ? '空状态内容' : dashboard.chat ? (fixed ? '对话输入栏' : result ? '对话结果' : '对话内容') :
      (groups.length === 2 ? '报表栏' : '报表内容');
    viewport.fills = [];
    viewport.clipsContent = true;
    viewport.resizeWithoutConstraints(rect.width, rect.height);
    viewport.x = rect.x;
    viewport.y = rect.y;
    return { ...group, viewport };
  });
  const resultView = views.find(view => view.result);
  const extracted = resultView?.rows[0].nodes;
  if (extracted && extracted[0].parent !== dashboard.container) {
    for (const node of extracted) resultView.viewport.appendChild(mapping.get(node.id));
    compactParent(mapping, extracted);
  }
  // Measure the composer at the target width before laying out the thread.
  const composerView = views.find(view => view.fixed);
  const layoutOrder = composerView ? [composerView, ...views.filter(view => view !== composerView)] : views;
  for (const { rect, rows, fixed, result, viewport } of layoutOrder) {
    const firstBody = dashboard.empty
      ? rows.findIndex(row => row.y + row.height > Math.min(130, dashboard.container.height * 0.22)) : -1;
    const bodyHeight = firstBody >= 0 ? rows.slice(firstBody).reduce((sum, row, index) =>
      sum + row.height + (index ? 12 : 0), 0) : 0;
    let y = 0;
    for (let index = 0; index < rows.length; index++) {
      if (index === firstBody) y = Math.max(y, (rect.height - bodyHeight) / 2);
      const row = rows[index];
      const [original] = row.nodes;
      const independent = row.nodes.length === 1 && !original.isMask &&
        Math.abs(original.rotation ?? 0) < 0.01 && original.width >= dashboard.container.width * 0.62;
      const left = Math.min(...row.nodes.map(layer => layer.x));
      const right = Math.max(...row.nodes.map(layer => layer.x + layer.width));
      const rowWidth = right - left;
      const originalFree = dashboard.container.width - rowWidth;
      const alignment = dashboard.chat && originalFree > 0 ? Math.max(0, Math.min(1, left / originalFree)) : 0.5;
      const offset = Math.max(0, (rect.width - rowWidth) * alignment) - left;
      const stretch = independent && (!dashboard.chat || fixed || result || rowWidth > rect.width ||
        Math.abs(left - (dashboard.container.width - right)) <= 24);
      let height = 0;
      for (const layer of row.nodes) {
        const node = mapping.get(layer.id);
        if (node.parent !== viewport) viewport.appendChild(node);
        if (stretch || (result && layer.type === 'FRAME')) {
          resizeSection(node, rect.width, 0, notes);
        }
        if (dashboard.chat && !fixed && !result && layer.layoutSizingVertical === 'FILL' &&
            node.type === 'FRAME' && node.layoutMode === 'VERTICAL' &&
            node.children.every(child => !child.visible || child.layoutSizingVertical !== 'FILL')) {
          node.primaryAxisSizingMode = 'AUTO';
        }
        if (dashboard.chat && independent && node.type === 'INSTANCE' && canResize(node) &&
            (fixed || result || node.width > rect.width)) node.resize(rect.width, node.height);
        // Rows that hug the page edge in the source stay pinned to the same
        // edge; centred or floating rows keep their proportional position.
        const sourceRight = dashboard.container.width - right;
        const pinned = dashboard.chat && !result && !stretch;
        let x;
        if (result) x = 0;
        else if (!independent) x = layer.x + offset;
        else if (pinned && sourceRight <= 24) x = Math.max(0, rect.width - sourceRight - node.width);
        else if (pinned && left <= 24) x = Math.max(0, left);
        else x = Math.max(0, (rect.width - node.width) * alignment);
        node.x = x;
        node.y = y + layer.y - row.y;
        height = Math.max(height, node.y + node.height - y);
        if (node.x < -0.1 || node.x + node.width > rect.width + 0.1) {
          issues.push({ nodeId: node.id, severity: 'error', code: 'dashboard-section-too-wide',
            detail: '模块超出可用栏宽，请检查固定尺寸、蒙版或紧凑变体。' });
        }
      }
      const next = rows[index + 1];
      y += height + (next ? Math.max(8, Math.min(24, next.y - row.y - row.height)) : 0);
    }
    if (!fixed && y > rect.height + 0.1) viewport.overflowDirection = 'VERTICAL';    if (fixed) {
      const thread = views[0];
      const bottom = rect.y + rect.height;
      const measuredHeight = y + 8;
      const threadHeight = bottom - measuredHeight - composerGap - thread.rect.y;
      if (threadHeight >= minimumThreadHeight) {
        viewport.resizeWithoutConstraints(rect.width, measuredHeight);
        viewport.y = bottom - measuredHeight;
        thread.rect.height = threadHeight;
      } else {
        for (const child of [...viewport.children]) thread.viewport.appendChild(child);
        thread.rows.push(...rows);
        thread.rect.height = bottom - thread.rect.y;
        viewport.remove();
        issues.push({ nodeId: mapping.get(rows[0].nodes[0].id).id, severity: 'warning',
          code: 'chat-composer-scroll-fallback', detail: '输入栏在目标宽度下占用空间较大，已放到对话滚动区末尾。请复核紧凑输入组件。' });
      }
      thread.viewport.resizeWithoutConstraints(thread.rect.width, thread.rect.height);
    }
  }
  const strategy = dashboard.empty ? 'empty-state' : dashboard.chat ? (splitChat ? 'chat-result-columns' : 'chat-flow') :
    (groups.length === 2 ? 'dashboard-columns' : 'dashboard-stack');
  const layoutRegions = views.filter(view => !view.viewport.removed).map(({ viewport, fixed, result }) => ({
    nodeId: viewport.id, name: viewport.name, fixed: Boolean(fixed), result: Boolean(result),
    x: viewport.x, y: viewport.y, width: viewport.width, height: viewport.height,
    scrolls: viewport.overflowDirection === 'VERTICAL',
  }));
  return { issues: [...issues, ...notes], strategy, layoutRegions };
}
