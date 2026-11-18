import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

await build({
  entryPoints: [fileURLToPath(new URL('./main.mjs', import.meta.url))],
  outfile: fileURLToPath(new URL('./dist/code.js', import.meta.url)),
  bundle: true,
  format: 'iife',
  target: 'es2020',
  logLevel: 'info',
});
