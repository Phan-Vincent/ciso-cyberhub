import { stripTypeScriptTypes } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
// Version local module imports by content hash so a cached core.js is never paired with a new app.js.
const ver = name => createHash('sha256').update(readFileSync(`web/${name}.ts`)).digest('hex').slice(0, 10);
mkdirSync('dist/assets', { recursive: true });
for (const file of readdirSync('web').filter(f => /^[a-z0-9_-]+\.ts$/i.test(f))) {
  const code = stripTypeScriptTypes(readFileSync(`web/${file}`, 'utf8'), { mode: 'strip' }).replace(/(from |import\()'\.\/([\w-]+)\.js'/g, (_, p, n) => `${p}'./${n}.js?v=${ver(n)}'`);
  // Node's parser checks emitted ESM using --check in CI; stripping is NOT type checking.
  if (!process.argv.includes('--check')) writeFileSync(`dist/assets/${file.replace('.ts','.js')}`, code);
}
