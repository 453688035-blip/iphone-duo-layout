import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { applePresetIds, getPreset, huaweiPresetIds, presetLabel } from '../../scripts/presets.mjs';
import { updatePreview } from './update-preview.mjs';

test('all flat and closed presets match the shared design dimensions and fit inside their artwork', () => {
  const poses = JSON.parse(readFileSync(new URL('../assets/preview/poses.json', import.meta.url)));
  assert.deepEqual(new Set(poses.filter(p => p.family !== 'huawei').map(p => p.id)), new Set([
    ...applePresetIds.filter(id => !id.startsWith('duo-split')), 'iphone-18-pro',
  ]));
  for (const pose of poses) {
    if (pose.family !== 'huawei') {
      const size = pose.id === 'iphone-18-pro' ? { width: 402, height: 874 } : getPreset(pose.id).window;
      assert.deepEqual({ width: pose.width, height: pose.height }, size);
    }
    const [width, height] = pose.art;
    const [x, y] = pose.screenOrigin;
    assert.ok(x > 0 && x + pose.width < width);
    assert.ok(y > 0 && y + pose.height < height);
    assert.ok(readFileSync(new URL('../assets/preview/' + pose.image, import.meta.url)).length > 0);
    if (pose.cameraCenter) assert.ok(Math.abs(pose.width - pose.railCenterFromRight - pose.cameraCenter[0]) < .5);
  }
});

test('Huawei preview choices match the Figma device and window catalog', () => {
  const poses = JSON.parse(readFileSync(new URL('../assets/preview/poses.json', import.meta.url)))
    .filter(pose => pose.family === 'huawei');
  assert.deepEqual(poses.map(pose => pose.id).sort(), [...huaweiPresetIds].sort());
  for (const { id, label, width, height, top, bottom, orientation } of poses) {
    const preset = getPreset(id);
    assert.equal(presetLabel(id), label);
    assert.deepEqual(preset.window, { width, height });
    assert.equal(preset.orientation, orientation);
    assert.deepEqual(preset.safeInsets, { top, bottom });
  }
});

test('the starter can be updated repeatedly without changing the page or requiring external images', () => {
  const starter = readFileSync(new URL('../assets/preview/starter.html', import.meta.url), 'utf8');
  const built = updatePreview(starter);
  assert.equal(updatePreview(built), built);
  const main = html => html.slice(html.indexOf('<main>'), html.indexOf('</main>') + 7);
  assert.equal(main(built), main(starter));
  const poses = JSON.parse(readFileSync(new URL('../assets/preview/poses.json', import.meta.url)));
  assert.equal((built.match(/data:image\/webp;base64,/g) ?? []).length, new Set(poses.map(p => p.image)).size);
  assert.ok(!built.includes('{{poses}}') && !built.includes('{{apple-buttons}}') && !built.includes('{{huawei-buttons}}'));
});
