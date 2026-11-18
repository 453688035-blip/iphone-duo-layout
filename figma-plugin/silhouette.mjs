// The generated frame is the target window itself, so its outer silhouette has
// to follow the target geometry instead of whatever the source mock was drawn
// as. A source authored as a split pane (rounded on the outer edge, square on
// the hinge edge) otherwise leaves the opposite edge square in a full-window
// target such as 内屏横向.

export const cornerKeys = ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius'];

const corners = [
  { key: 'topLeftRadius', edge: 'left' },
  { key: 'topRightRadius', edge: 'right' },
  { key: 'bottomRightRadius', edge: 'right' },
  { key: 'bottomLeftRadius', edge: 'left' },
];

// Only a split window has a square edge: the side that meets the other window.
// Book and tabletop keep the whole display, so every corner stays a device corner.
export function flatEdge(target) {
  const outer = target?.multitasking?.outerEdge;
  if (outer === 'left') return 'right';
  if (outer === 'right') return 'left';
  return null;
}

export function radiusOf(node) {
  if (!node) return 0;
  const values = cornerKeys.map(key => (Number.isFinite(node[key]) ? Math.max(0, node[key]) : 0));
  if (Number.isFinite(node.cornerRadius)) values.push(Math.max(0, node.cornerRadius));
  return Math.max(0, ...values);
}

// `nodes` is the frame plus the full-bleed backgrounds that draw its surface:
// the largest authored radius is the device corner the mock was drawn with.
// `hint` carries the radius of the screen itself, which a device render keeps
// on an inset screen instead of the frame. The screen wins: the body around it
// is a shell, and the writer repaints that shell with the app surface.
export function silhouettePlan(nodes, target, hint = 0) {
  const radius = hint > 0 ? hint : Math.max(0, ...nodes.filter(Boolean).map(radiusOf));
  if (radius <= 0) return null;
  const flat = flatEdge(target);
  return Object.fromEntries(corners.map(({ key, edge }) => [key, flat && edge === flat ? 0 : radius]));
}
