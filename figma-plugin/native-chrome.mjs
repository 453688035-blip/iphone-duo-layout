// Fills the template's reserved system strips (status bar on top, Home
// indicator at the bottom) with components from Apple's official
// "iOS and iPadOS 27" Figma library
// (https://www.figma.com/community/file/1651309003795292092/ios-and-ipados-27).
// Components are located through the Team Library API and imported by key, so
// the kit only needs to be enabled in the current file. When the library is
// unavailable the writer falls back to a drawn placeholder and reports
// `native-chrome-fallback`, so generated frames still read as native windows.

export const chromeTag = '[af:chrome]';

export const chromeSlots = {
  statusBar: {
    label: '状态栏',
    edge: 'top',
    minStrip: 40,
    match: name => /^status ?bar/i.test((name ?? '').trim()) && !/vertical|side|rail/i.test(name),
  },
  sideStatusBar: {
    label: '侧边状态栏',
    edge: 'side',
    minStrip: 44,
    // A regular horizontal status bar cannot be stretched into a Duo rail.
    match: name => /status ?bar/i.test(name ?? '') &&
      /duo/i.test(name) && /vertical|side|rail/i.test(name),
  },
  homeIndicator: {
    label: 'Home 指示条',
    edge: 'bottom',
    minStrip: 24,
    match: name => /home ?indicator/i.test((name ?? '').trim()),
  },
};

const kitName = /ios|ipados|apple/i;

function issue(nodeId, code, detail, severity = 'warning') {
  return { nodeId, code, severity, detail };
}

// Prefers iPhone variants and tersely named components, which in Apple's kit
// are the base components rather than contextual examples.
function rank(candidate) {
  let score = 0;
  if (/iphone/i.test(candidate.name)) score += 2;
  if (/duo/i.test(candidate.name)) score += 1;
  score -= (candidate.name.match(/\//g) ?? []).length * 0.1;
  return score;
}

// Returns { statusBar: {key,name,library}, homeIndicator: {...} } with only
// the slots found, or null when no Apple kit is enabled in the file.
export async function findNativeComponents(figma) {
  const library = figma.teamLibrary;
  if (typeof figma.importComponentByKeyAsync !== 'function' ||
      typeof library?.getAvailableLibraryComponentCollectionsAsync !== 'function' ||
      typeof library?.getComponentsInLibraryComponentAsync !== 'function') return null;
  let collections;
  try {
    collections = await library.getAvailableLibraryComponentCollectionsAsync();
  } catch {
    return null;
  }
  const found = {};
  for (const collection of collections ?? []) {
    const title = (collection.libraryName ?? '') + ' ' + (collection.name ?? '');
    if (!kitName.test(title)) continue;
    let components;
    try {
      components = await library.getComponentsInLibraryComponentAsync(collection.key);
    } catch {
      continue;
    }
    for (const [slot, spec] of Object.entries(chromeSlots)) {
      if (slot === 'sideStatusBar') {
        found.sideStatusBar ??= {};
        for (const [display, pattern] of [
          ['outer', /\bouter\b|\bisland\s*[=:]\s*on\b/i],
          ['inner', /\binner\b|\bisland\s*[=:]\s*off\b/i],
        ]) {
          const hit = (components ?? []).filter(component => spec.match(component.name) && pattern.test(component.name))
            .sort((a, b) => rank(b) - rank(a))[0];
          if (hit && !found.sideStatusBar[display]) found.sideStatusBar[display] = {
            key: hit.key, name: hit.name, library: hit.libraryName ?? collection.libraryName ?? '',
          };
        }
        if (!Object.keys(found.sideStatusBar).length) delete found.sideStatusBar;
        continue;
      }
      if (found[slot]) continue;
      const hit = (components ?? [])
        .filter(component => spec.match(component.name))
        .sort((a, b) => rank(b) - rank(a))[0];
      if (hit) {
        found[slot] = {
          key: hit.key, name: hit.name,
          library: hit.libraryName ?? collection.libraryName ?? '',
        };
      }
    }
  }
  return Object.keys(found).length ? found : null;
}

function attach(root, node) {
  root.appendChild(node);
  if (root.layoutMode && root.layoutMode !== 'NONE') node.layoutPositioning = 'ABSOLUTE';
}

function stripRect(plan, edge) {
  const { width, height } = plan.target.window;
  const area = plan.contentArea;
  if (edge === 'side') return { x: area.x + area.width, y: area.y,
    width: width - area.x - area.width, height: area.height };
  if (edge === 'top') return { x: 0, y: 0, width, height: area.y };
  return { x: 0, y: area.y + area.height, width, height: height - area.y - area.height };
}

function placeInstance(root, instance, slot, strip) {
  if (slot.edge === 'side') {
    if (instance.width > strip.width || instance.height > strip.height || instance.height <= instance.width) {
      throw new Error('Status component does not fit the Duo rail');
    }
    attach(root, instance);
    instance.x = strip.x + (strip.width - instance.width) / 2;
    instance.y = strip.y;
    return;
  }
  attach(root, instance);
  const targetHeight = Math.min(instance.height, strip.height);
  try {
    instance.resize(strip.width, targetHeight);
  } catch {
    // Some library components resist resizing; place them at native size.
  }
  instance.x = strip.x + (strip.width - instance.width) / 2;
  instance.y = slot.edge === 'top'
    ? strip.y
    : strip.y + strip.height - instance.height;
}

// Drawn stand-in for the Home indicator when the official component is not
// available: a centered 5pt bar near the window's bottom edge.
function drawHomeIndicator(figma, root, slot, strip) {
  const bar = figma.createRectangle();
  bar.name = chromeTag + ' ' + slot.label + '（占位）';
  const width = Math.min(180, strip.width * 0.35);
  bar.resize(width, 5);
  bar.cornerRadius = 2.5;
  bar.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.12 } }];
  attach(root, bar);
  bar.x = strip.x + (strip.width - width) / 2;
  bar.y = strip.y + strip.height - 5 - 9;
  return bar;
}

// Inserts system chrome into the reserved strips of one generated frame.
// `components` is the map returned by findNativeComponents (possibly null).
// Returns the placed chrome descriptors for the report; issues are appended
// in place.
export async function insertNativeChrome(figma, root, plan, components, issues) {
  const placed = [];
  const target = plan.target;
  const duoSide = target.device === 'iphone-duo' && !target.multitasking &&
    plan.navigation.axis === 'vertical';
  // Authored status artwork (including its camera) takes precedence over
  // library instances. Look for explicit tags or system-layer names.
  function hasAuthoredStatus(node) {
    if (node.visible === false) return false;
    if (/^(?:\[af:status\](?:\s|$)|(?:duo )?(?:status ?bar|状态栏)(?:\s*[/·(（]|$))/i.test(node.name ?? '')) return true;
    return node.type !== 'INSTANCE' && (node.children ?? []).some(hasAuthoredStatus);
  }
  const authoredStatus = (root.children ?? []).some(hasAuthoredStatus);
  const missing = [];
  const broken = new Set();
  for (const [slotId, slot] of Object.entries(chromeSlots)) {
    if (slotId === 'statusBar' && duoSide) continue;
    if (slotId === 'sideStatusBar' &&
        (!duoSide || plan.navigation.placement !== 'right' || target.preset === 'duo-outer-landscape')) continue;
    if (slotId !== 'homeIndicator' && authoredStatus) continue;
    const strip = stripRect(plan, slot.edge);
    if (slot.edge === 'side' ? strip.width < slot.minStrip : strip.height < slot.minStrip) continue;
    const entry = slotId === 'sideStatusBar' ? components?.sideStatusBar?.[target.display] : components?.[slotId];
    let node = null;
    let source = 'fallback';
    if (entry && typeof figma.importComponentByKeyAsync === 'function') {
      try {
        const component = await figma.importComponentByKeyAsync(entry.key);
        node = component.createInstance();
        node.name = chromeTag + ' ' + slot.label + ' · ' + entry.name;
        placeInstance(root, node, slot, strip);
        source = 'official';
      } catch {
        // Remove the temporary instance if the library variant did not fit.
        node?.remove();
        node = null;
        broken.add(slot.label);
      }
    }
    if (!node && slotId === 'homeIndicator' && typeof figma.createRectangle === 'function') {
      node = drawHomeIndicator(figma, root, slot, strip);
    }
    if (node) {
      placed.push({ slot: slotId, source, nodeId: node.id });
      if (source !== 'official') missing.push(slot.label);
    } else {
      missing.push(slot.label);
    }
  }
  if (missing.length) {
    const failed = missing.filter(label => broken.has(label));
    const absent = missing.filter(label => !broken.has(label));
    const detail = [
      failed.length ? failed.join('、') + ' 在组件库中实例化失败或尺寸不适用，已保留系统区留白' : null,
      absent.length ? absent.join('、') + '未使用 Apple 官方组件，已保留系统区留白或绘制占位图形。' +
        '在 Figma Community 启用「iOS and iPadOS 27」组件库后重新生成即可替换为官方组件' : null,
    ].filter(Boolean).join('；');
    issues.push(issue(root.id, 'native-chrome-fallback', detail + '。'));
  }
  return placed;
}
