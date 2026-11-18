import { applePresetIds, getPreset, presetIds, presetLabel } from '../scripts/presets.mjs';
import { getSources, writeFoldableBatch } from './writer.mjs';
import { resultLayerChoices } from './dashboard.mjs';
import { findNativeComponents } from './native-chrome.mjs';
import { createSample } from './samples.mjs';

figma.skipInvisibleInstanceChildren = false;
// Must match UI_VERSION in ui.html: the panel shows a warning when Figma served
// it an older ui.html than this bundle.
const PLUGIN_VERSION = '0.6.2';
const send = message => figma.ui.postMessage(message);
// Figma's host errors arrive as terse English strings; known ones get a Chinese
// explanation with the original text kept for support.
const hints = [
  [/get_componentProperties|Component set for node has existing errors/i,
    '原稿里的组件实例来自有错误的组件集，Figma 拒绝读取它的属性。请在 Figma 中修复或替换该实例，或关闭「填充官方系统组件」后重试。'],
  [/Cannot map the clone tree/i,
    '生成稿与原稿的图层结构对不上，通常是生成过程中原稿被改动。请重新选择原稿后再生成。'],
  [/Cannot read properties of null|not a function/i,
    '读取到了已删除的图层，请重新选择原稿后重试。'],
];
const errorMessage = error => {
  const raw = error instanceof Error ? error.message : String(error);
  const hint = hints.find(([pattern]) => pattern.test(raw));
  return hint ? hint[1] + '（原始信息：' + raw + '）' : raw;
};
const presetItems = presetIds.map(id => {
  const { device, display, window } = getPreset(id);
  return {
    id, label: presetLabel(id), size: window.width + ' × ' + window.height,
    brand: device === 'harmonyos' ? 'huawei' : 'apple', display,
  };
});

function selectionMessage() {
  const sources = getSources(figma.currentPage);
  const source = sources.length === 1 ? sources[0] : null;
  return {
    type: 'selection',
    selection: source?.name ?? (sources.length ? sources.length + ' 个原稿 Frame' : null),
    sourceId: source?.id ?? null,
    sourceSize: source ? Math.round(source.width) + ' × ' + Math.round(source.height) : null,
    inSection: source?.parent?.type === 'SECTION',
    resultLayers: source ? resultLayerChoices(source) : [],
  };
}

const updateSelection = () => {
  try {
    send(selectionMessage());
  } catch (error) {
    send({ type: 'selection', selection: null, error: errorMessage(error) });
  }
};

let busy = false;
let reportPageId = null;
let reportNodes = new Set();
let nativeComponents;

// The panel opens with every Apple pose selected so a first run needs no manual
// picking; after that it restores whatever the last run generated.
const presetsKey = 'adaptflow:preset-selection';

async function readPresetSelection() {
  try {
    const stored = await figma.clientStorage.getAsync(presetsKey);
    const valid = Array.isArray(stored) ? stored.filter(id => presetIds.includes(id)) : [];
    if (valid.length) return valid;
  } catch { /* clientStorage is optional. */ }
  return [...applePresetIds];
}

function rememberPresetSelection(ids) {
  if (!Array.isArray(ids) || !ids.length) return;
  try {
    Promise.resolve(figma.clientStorage.setAsync(presetsKey, ids)).catch(() => {});
  } catch { /* ignore */ }
}

// Detected once at startup: the Apple "iOS and iPadOS 27" kit must be enabled
// in the file for its Status Bar / Home Indicator to be importable.
async function detectNativeComponents() {
  if (nativeComponents !== undefined) return nativeComponents;
  try {
    nativeComponents = await findNativeComponents(figma);
  } catch {
    nativeComponents = null;
  }
  return nativeComponents;
}

async function focusReportNode(nodeId) {
  if (busy || !reportNodes.has(nodeId)) return;
  try {
    const node = await figma.getNodeByIdAsync(nodeId);
    if (busy || !reportNodes.has(nodeId)) return;
    const page = figma.currentPage;
    let owner = node;
    while (owner && owner.type !== 'PAGE') owner = owner.parent;
    if (page.id !== reportPageId || owner?.id !== page.id) {
      throw new Error('定位失败。请返回生成稿所在页面并确认该图层仍存在。');
    }
    figma.viewport.scrollAndZoomIntoView([node]);
  } catch (error) {
    send({ type: 'focus-error', message: errorMessage(error) });
  }
}

const selectionKey = () => figma.currentPage.selection.map(node => node.id).sort().join('|');

figma.showUI(__html__, { width: 460, height: 720, themeColors: true });
figma.ui.onmessage = async message => {
  if (message?.type === 'ready') {
    const components = await detectNativeComponents();
    send({
      type: 'init', presets: presetItems, defaultSelection: await readPresetSelection(),
      version: PLUGIN_VERSION,
      chrome: {
        slots: Object.fromEntries(Object.entries(components ?? {})
          .map(([slot, entry]) => [slot, slot === 'sideStatusBar'
            ? Object.values(entry).map(variant => variant.name).join(' / ') : entry.name])),
        available: Boolean(components),
      },
    });
    updateSelection();
    return;
  }
  if (message?.type === 'refresh-selection') {
    updateSelection();
    return;
  }
  if (message?.type === 'focus-node') {
    await focusReportNode(message.nodeId);
    return;
  }
  if (busy || !['generate', 'sample'].includes(message?.type)) return;
  busy = true;
  send({ type: 'busy', busy: true });
  const pageId = figma.currentPage.id;
  const startedSelection = selectionKey();
  try {
    if (message.type === 'sample') {
      send({ type: 'progress', percent: 12, label: '正在创建样例 Frame' });
      const sample = await createSample(figma, message.kind);
      send({ type: 'progress', percent: 90, label: '正在整理画布' });
      figma.currentPage.selection = [sample];
      figma.viewport.scrollAndZoomIntoView([sample]);
    } else {
      const requested = Array.isArray(message.presets) ? [...new Set(message.presets)] : [];
      if (requested.some(id => !presetIds.includes(id))) throw new Error('选择了未知的目标预设。');
      rememberPresetSelection(requested);
      const targets = message.customTarget == null ? requested : [message.customTarget];
      // The panel can render an older source while the canvas has moved on, so
      // always trust the live selection and tell the panel when it changed.
      const live = getSources(figma.currentPage);
      if (!live.length) {
        throw new Error('当前选择不是页面顶层的 Frame，或选中的是已生成稿。请重新选择一个原稿 Frame。');
      }
      if (message.sourceId && !live.some(node => node.id === message.sourceId)) updateSelection();
      const { frames, report } = await writeFoldableBatch(
        figma, {
          targets, direction: message.direction, resultLayerId: message.resultLayerId,
          widthMode: message.widthMode === 'reading' ? 'reading' : 'fill',
          chrome: message.chrome === false
            ? null
            : { enabled: true, components: await detectNativeComponents() },
        },
        note => send({ type: 'progress', ...note }),
      );
      reportPageId = pageId;
      reportNodes = new Set(report.targets.flatMap(target => [
        target.id,
        ...(target.layoutRegions ?? []).map(region => region.nodeId),
        ...target.issues.map(issue => issue.nodeId).filter(Boolean),
      ]));
      // Only move the viewport when the user kept the source selected;
      // otherwise they have already navigated somewhere else.
      if (frames.length && figma.currentPage.id === pageId && selectionKey() === startedSelection) {
        figma.viewport.scrollAndZoomIntoView(frames);
      }
      send({ type: 'result', report });
    }
  } catch (error) {
    send({ type: 'error', message: errorMessage(error) });
  } finally {
    busy = false;
    send({ type: 'busy', busy: false });
    updateSelection();
  }
};
figma.on('selectionchange', updateSelection);
figma.on('currentpagechange', updateSelection);
