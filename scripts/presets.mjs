function windowPreset(width, height, display, posture, orientation, bars, division) {
  return {
    device: 'iphone-duo', display, posture, orientation,
    window: { width, height },
    geometrySource: 'project-template',
    safeInsets: {},
    contentInsets: bars,
    regions: division ? [{ id: 'fold', kind: 'division', ...division }] : [],
  };
}

const portraitBars = { top: 84, bottom: 95 };
const sideBars = { top: 84, right: 84 };
const innerLandscape = (posture, division) =>
  windowPreset(951, 669, 'inner', posture, 'landscape', sideBars, division);
const innerPortrait = (posture, division) =>
  windowPreset(669, 951, 'inner', posture, 'portrait', portraitBars, division);

function splitPane(side) {
  return {
    device: 'iphone-duo', display: 'inner', posture: 'flat', orientation: 'landscape',
    window: { width: 466, height: 669 },
    geometrySource: 'project-scenario',
    safeInsets: {},
    contentInsets: { [side]: 84 },
    regions: [],
    multitasking: { outerEdge: side },
  };
}

const presets = {
  'duo-outer-portrait': windowPreset(466, 678, 'outer', 'closed', 'portrait', sideBars),
  'duo-outer-landscape': windowPreset(678, 466, 'outer', 'closed', 'landscape', sideBars),
  'duo-inner-portrait': innerPortrait('flat'),
  'duo-inner-landscape': innerLandscape('flat'),
  'duo-book': innerLandscape('book', { axis: 'vertical', x: 455.5, y: 0, width: 40, height: 669 }),
  'duo-tabletop': {
    ...innerPortrait('tabletop', { axis: 'horizontal', x: 0, y: 455.5, width: 669, height: 40 }),
    geometrySource: 'project-scenario',
  },
  'duo-split-left': splitPane('left'),
  'duo-split-right': splitPane('right'),
};

const labels = {
  'duo-outer-portrait': '外屏竖向',
  'duo-outer-landscape': '外屏横向',
  'duo-inner-portrait': '内屏竖向',
  'duo-inner-landscape': '内屏横向',
  'duo-book': '书本姿态',
  'duo-tabletop': '桌面姿态',
  'duo-split-left': '分屏左窗',
  'duo-split-right': '分屏右窗',
};

// Keep these simulation windows in step with html-foldable-tablet's preview
// catalog. The workspace preview tests check both catalogs so each skill can
// still run on its own.
const huaweiWindows = {
  'huawei-mate-70-pro': ['Mate 70 Pro', 400, 861, 'outer', 'flat'],
  'huawei-mate-x6-open': ['Mate X6 · 展开', 760, 828, 'inner', 'flat'],
  'huawei-mate-x6-closed': ['Mate X6 · 折叠', 384, 868, 'outer', 'closed'],
  'huawei-mate-xt-open': ['Mate XT · 三折展开', 1000, 704, 'inner', 'flat'],
  'huawei-pura-x-open': ['Pura X · 展开', 480, 771, 'inner', 'flat'],
  'huawei-pura-x-closed': ['Pura X · 折叠', 320, 321, 'outer', 'closed'],
  'huawei-pura-70-pro': ['Pura 70 Pro', 400, 900, 'outer', 'flat'],
};

export const applePresetIds = Object.freeze(Object.keys(presets));
export const huaweiPresetIds = Object.freeze(Object.keys(huaweiWindows));
export const presetIds = Object.freeze([...applePresetIds, ...huaweiPresetIds]);

export function presetLabel(id) {
  return huaweiWindows[id]?.[0] ?? labels[id] ?? id;
}

export function getPreset(id) {
  if (!presetIds.includes(id)) throw new Error('Unknown preset: ' + id);
  if (huaweiPresetIds.includes(id)) {
    const [, width, height, display, posture] = huaweiWindows[id];
    return {
      device: 'harmonyos', display, posture,
      orientation: width > height ? 'landscape' : 'portrait',
      window: { width, height },
      geometrySource: 'project-scenario',
      // Full-window preview with simulated status and gesture areas. The
      // unfolded presets have no measured separating or occluding hinge.
      safeInsets: { top: 52, bottom: 24 },
      contentInsets: {},
      regions: [],
    };
  }
  return JSON.parse(JSON.stringify(presets[id]));
}
