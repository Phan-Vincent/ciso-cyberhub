// QR generator: sizes, finder patterns and determinism for the live room join link.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const f = join(mkdtempSync(join(tmpdir(), 'qr-')), 'qr.mjs');
writeFileSync(f, stripTypeScriptTypes(readFileSync(new URL('../web/qr.ts', import.meta.url), 'utf8'), { mode: 'strip' }));
const Q = await import(pathToFileURL(f).href);

test('QR matrices have the right size, finders and timing', () => {
  const url = 'https://phan-vincent.github.io/ciso-cyberhub/duel/live/#K7QPX';
  const m = Q.qrMatrix(url); assert.equal(m.length, 33); assert.ok(m.every(r => r.length === 33));
  const finder = (x0, y0) => { for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) { const d = Math.max(Math.abs(x - 3), Math.abs(y - 3)); assert.equal(m[y0 + y][x0 + x], d !== 2, `${x0 + x},${y0 + y}`); } };
  finder(0, 0); finder(26, 0); finder(0, 26);
  for (let i = 8; i < 25; i++) { assert.equal(m[6][i], i % 2 === 0); assert.equal(m[i][6], i % 2 === 0); }
  assert.equal(m[25][8], true, 'dark module');
  assert.deepEqual(Q.qrMatrix(url), m);
  assert.equal(Q.qrMatrix('A').length, 21); assert.equal(Q.qrMatrix('x'.repeat(150)).length, 4 * 8 + 17); assert.equal(Q.qrMatrix('x'.repeat(160)).length, 4 * 9 + 17);
  assert.throws(() => Q.qrMatrix('x'.repeat(400)));
  assert.match(Q.qrPath(m), /^M\d+ \d+h1v1h-1z/);
});
