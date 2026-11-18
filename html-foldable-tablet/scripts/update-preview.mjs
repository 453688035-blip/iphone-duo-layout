import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const assets = new URL('../assets/preview/', import.meta.url);
const read = name => readFileSync(new URL(name, assets), 'utf8');
const data = name => 'data:image/' + (name.endsWith('.svg') ? 'svg+xml' : 'webp') +
  ';base64,' + readFileSync(new URL(name, assets)).toString('base64');

export function previewParts({ report = false } = {}) {
  const poses = JSON.parse(read('poses.json'));
  const buttonIcon = p => read('icons/' + p.icon)
    .replace('<svg ', '<svg class="dp-pose-icon' + (p.rotateIcon ? ' dp-pose-icon-rotated' : '') +
      '" aria-hidden="true" focusable="false" ')
    .replaceAll('fill="black"', 'fill="currentColor"').trim();
  const imageNames = [...new Set(poses.map(p => p.image))];
  const settings = Object.fromEntries(poses.map(p => {
    const { width, height, image, art, screenOrigin, radii } = p;
    return [p.id, {
      label: p.label, width, height, orientation: p.orientation, edge: p.edge ?? 'right',
      art, rotation: p.artRotation ?? 0, image, status: p.status, fold: p.fold ?? 'none',
      family: p.family ?? 'apple',
      vars: {
        w: width + 'px', h: height + 'px', x: screenOrigin[0] + 'px', y: screenOrigin[1] + 'px',
        radius: radii.map(x => x + 'px').join(' '), rail: p.rail + 'px', top: p.top + 'px',
        bottom: p.bottom + 'px', 'rail-center': (p.railCenterFromRight ?? p.rail / 2) + 'px', 'status-y': (p.statusY ?? 10) + 'px', 'menu-y': (p.menuY ?? 13) + 'px',
        'sheet-side': p.orientation === 'landscape' ? '40px' : '24px',
      },
    }];
  }));
  const images = Object.fromEntries(imageNames.map(name => [name, data(name)]));
  const css = read('preview.css') + (report ? '\n' + read('report.css') : '');
  const button = p =>
    `<button type="button" data-dp-pose="${p.id}" aria-label="${p.label}" title="${p.label}">${buttonIcon(p)}</button>`;
  const html = read('preview.html')
    .replace(/{{([\w-]+\.svg)}}/g, (_, filename) => data(filename))
    .replace('{{apple-buttons}}', poses.filter(p => p.family !== 'huawei').map(button).join('\n    '))
    .replace('{{huawei-buttons}}', poses.filter(p => p.family === 'huawei').map(button).join('\n    '));
  const js = read('preview.js')
    .replace('const poses = {{poses}};', `const poses = ${JSON.stringify(settings)};\n  const images = ${JSON.stringify(images)};`)
    .replace('frame.src = p.image;', 'frame.src = images[p.image];');
  return { css, html, js };
}

export function updatePreview(source, { report = false } = {}) {
  const { css, html, js } = previewParts({ report });
  const generated = {
    style: `<style id="device-layer">\n${css}</style>`,
    markup: html.trimEnd(),
    script: `<script id="device-runtime">\n${js}</script>`,
  };
  for (const [key, content] of Object.entries(generated)) {
    const begin = `<!-- duo-preview:${key}:start -->`;
    const end = `<!-- duo-preview:${key}:end -->`;
    const start = source.indexOf(begin);
    const stop = source.indexOf(end, start + begin.length);
    if (start < 0 || stop < 0 || source.indexOf(begin, start + begin.length) >= 0 ||
        source.indexOf(end, stop + end.length) >= 0) throw new Error('Expected one marker pair: ' + key);
    source = source.slice(0, start + begin.length) + '\n' + content + '\n' + source.slice(stop);
  }
  return source;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const files = process.argv.slice(2).filter(arg => arg !== '--report');
  if (!files.length) throw new Error('Usage: node scripts/update-preview.mjs [--report] FILE.html [...]');
  const report = process.argv.includes('--report');
  const updates = files.map(path => [path, updatePreview(readFileSync(path, 'utf8'), { report })]);
  for (const [path, updated] of updates) writeFileSync(path, updated);
}
