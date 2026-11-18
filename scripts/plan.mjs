import { readFile } from 'node:fs/promises';
import { planFoldable, validateLayout } from './foldable.mjs';
import { presetIds } from './presets.mjs';

try {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--list') {
    console.log(presetIds.join('\n'));
  } else {
    if (args.length !== 1) throw new Error('Usage: node scripts/plan.mjs <input.json|-> or --list');
    const raw = args[0] === '-' ? await readStdin() : await readFile(args[0], 'utf8');
    const input = JSON.parse(raw);
    const plan = planFoldable(input);
    const issues = input.nodes == null ? [] : validateLayout(plan, input.nodes);
    console.log(JSON.stringify({ ...plan, issues }, null, 2));
    if ([...plan.warnings, ...issues].some(issue => issue.severity === 'error')) process.exitCode = 2;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

async function readStdin() {
  process.stdin.setEncoding('utf8');
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data;
}
