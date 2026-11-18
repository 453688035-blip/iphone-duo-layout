// The generated frame stands for the device window, so it has to show the app's
// own surface. A source authored as a device render keeps the app inside a
// screen layer that sits on a body or a backdrop; the window then filled itself
// with the body colour, which shows through the reserved bars as a grey plate
// with square corners and no app background.

import { radiusOf } from './silhouette.mjs';
import { contentContainer, fullBleedLayers, shellScreen } from './dashboard.mjs';

const flush = 1;

function painted(fills) {
  return Array.isArray(fills) && fills.some(paint => paint.visible !== false);
}

// A transparent screen can carry its colour on a full-bleed child.
function surfacePaints(node) {
  if (painted(node.fills)) return node.fills;
  const inner = (node.children ?? []).find(child => child.visible && child.type === 'RECTANGLE' &&
    painted(child.fills) && Math.abs(child.x) <= flush && Math.abs(child.y) <= flush &&
    child.width >= node.width - flush && child.height >= node.height - flush);
  return inner?.fills ?? null;
}

// The screen holding the page. A device body can wrap the screen instead of
// sitting beside it, so step through a full-bleed frame when the root has no
// page container of its own. An inset screen on a body is the surface too: the
// body around it is a bezel, not the app.
export function screenLayer(root) {
  let current = root;
  for (let depth = 0; depth < 3; depth += 1) {
    const shell = shellScreen(current);
    if (shell) return shell;
    const next = contentContainer(current, current.width);
    if (next !== current) return next;
    const [body] = fullBleedLayers(current);
    if (!body || body.type !== 'FRAME') break;
    current = body;
  }
  return current;
}

// `container` is the layer the writer lays the page out inside, i.e. the screen
// holding the rows. Its fill is the app surface and its radius is the window
// corner, whatever the body or the backdrop behind it were drawn with.
export function surfaceSpec(root, container) {
  const node = container ?? root;
  const fills = surfacePaints(node);
  const radius = radiusOf(node);
  if (!fills && node === root) return null;
  if (!fills && radius <= 0) return null;
  return { id: node.id, name: node.name, radius, fills, isRoot: node === root };
}

// The backdrop and device body sit above the frame fill, so repainting only the
// root would stay hidden. Both take the screen colour; the radius then rounds
// the whole window instead of the inner rectangle.
export function applySurface(root, mapping, spec, backgrounds = []) {
  if (!spec || spec.isRoot || !spec.fills?.length) return false;
  const recolour = node => {
    if (!node || node.removed || !('fills' in node)) return;
    if (!['FRAME', 'RECTANGLE'].includes(node.type)) return;
    node.fills = spec.fills.map(paint => ({ ...paint }));
  };
  recolour(root);
  for (const original of backgrounds) recolour(mapping.get(original.id));
  return true;
}
