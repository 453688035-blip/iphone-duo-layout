import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = name => fs.readFileSync(fileURLToPath(new URL(name, import.meta.url)), 'utf8');
const html = read('./ui.html');
const main = read('./main.mjs');

const versionOf = (source, pattern) => source.match(pattern)?.[1] ?? null;

// The pose art lives in ui.html as an object literal, so it is read back the
// same way the panel builds it.
function poseArt() {
  const start = html.indexOf('const poseArt = {');
  const end = html.indexOf('\n  };', start);
  assert.ok(start > 0 && end > start, 'ui.html should still define poseArt');
  return eval('(' + html.slice(start + 'const poseArt = '.length, end + 4).replace(/;\s*$/, '') + ')');
}

test('the panel and the plugin code agree on the version', () => {
  const ui = versionOf(html, /const UI_VERSION = '([^']+)'/);
  const code = versionOf(main, /const PLUGIN_VERSION = '([^']+)'/);
  assert.ok(ui, 'ui.html should declare UI_VERSION');
  assert.equal(ui, code, 'UI_VERSION and PLUGIN_VERSION must match');
  // A version the panel never receives cannot be compared, so the init message
  // has to carry it.
  assert.match(main, /type: 'init',[^}]*version: PLUGIN_VERSION/s);
});

test('the panel can warn about a stale ui.html', () => {
  assert.match(html, /id="stale-ui"/);
  assert.match(html, /id="ui-version"/);
  assert.match(html, /reportVersion\(message\.version\)/);
});

test('every pose keeps its home indicator on the bottom edge, centred', () => {
  const art = poseArt();
  const ids = ['duo-outer-portrait', 'duo-outer-landscape', 'duo-inner-portrait', 'duo-inner-landscape'];
  for (const id of ids) {
    const rect = art[id].match(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/);
    assert.ok(rect, `${id} should be drawn from a rect`);
    const [x, y, width, height] = rect.slice(1).map(Number);
    const line = art[id].match(/<path d="M([\d.]+) ([\d.]+)h([\d.]+)"\/>/);
    assert.ok(line, `${id} should have a home indicator`);
    const [startX, startY, length] = line.slice(1).map(Number);
    const bottom = y + height;
    const centre = startX + length / 2;
    assert.ok(bottom - startY > 1 && bottom - startY < 4,
      `${id}: home indicator should sit ${'(1–4)'} units above the bottom edge, got ${(bottom - startY).toFixed(1)}`);
    assert.ok(Math.abs(centre - (x + width / 2)) <= 1,
      `${id}: home indicator should be centred, got ${centre} in ${x}..${x + width}`);
  }
});
