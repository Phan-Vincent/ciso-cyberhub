import { stripTypeScriptTypes } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
mkdirSync('dist/assets', { recursive: true });
for (const file of readdirSync('web').filter(f => f.endsWith('.ts'))) {
  const code = stripTypeScriptTypes(readFileSync(`web/${file}`, 'utf8'), { mode: 'strip' });
  // Node's parser checks emitted ESM using --check in CI; stripping is NOT type checking.
  if (!process.argv.includes('--check')) writeFileSync(`dist/assets/${file.replace('.ts','.js')}`, code);
}
