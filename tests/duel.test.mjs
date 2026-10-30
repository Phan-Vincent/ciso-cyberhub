// Cyber Duel: seeded rounds, scoring and challenge links.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const f = join(mkdtempSync(join(tmpdir(), 'duel-')), 'duel.mjs');
writeFileSync(f, stripTypeScriptTypes(readFileSync(new URL('../web/duel.ts', import.meta.url), 'utf8'), { mode: 'strip' }));
const D = await import(pathToFileURL(f).href);
const bank = JSON.parse(readFileSync(new URL('../data/duel.json', import.meta.url), 'utf8'));

test('question bank is well formed', () => {
  const ids = new Set();
  for (const q of bank.questions) {
    assert.ok(!ids.has(q.id), 'duplicate ' + q.id); ids.add(q.id);
    assert.equal(q.choices.length, 4, q.id); assert.ok(q.answer >= 0 && q.answer < 4, q.id);
    assert.equal(new Set(q.choices).size, 4, 'repeated choice in ' + q.id);
    assert.ok(q.cat in bank.categories, q.id); assert.ok([1, 2, 3].includes(q.level), q.id); assert.ok(q.why.length > 10, q.id);
  }
  assert.ok(bank.questions.length >= 100);
});

test('the same seed gives the same round and choice order', () => {
  const a = D.makeRound(bank, 12345, 'all', 'mix', 10), b = D.makeRound(bank, 12345, 'all', 'mix', 10);
  assert.deepEqual(a.map(r => [r.q.id, r.order]), b.map(r => [r.q.id, r.order]));
  assert.equal(new Set(a.map(r => r.q.id)).size, 10);
  const c = D.makeRound(bank, 999, 'all', 'mix', 10); assert.notDeepEqual(a.map(r => r.q.id), c.map(r => r.q.id));
  for (const cat of Object.keys(bank.categories)) assert.ok(D.makeRound(bank, 1, cat, 'mix', 5).every(r => r.q.cat === cat));
});

test('scoring rewards speed and correctness', () => {
  assert.equal(D.points(true, 0), 200); assert.equal(D.points(true, D.ROUND_MS), 100); assert.equal(D.points(false, 0), 0);
  assert.ok(D.points(true, 2000) > D.points(true, 9000));
});

test('challenge links round-trip and reject tampering', () => {
  const rounds = D.makeRound(bank, 42, 'net', '2', 5);
  const run = rounds.map((r, i) => ({ pick: i % 2 ? r.q.answer : -1, ms: 1000 * (i + 1) }));
  const code = D.encodeChallenge({ v: 1, s: 42, c: 'net', d: '2', n: 'Alex <script>', r: 5, a: run });
  const back = D.decodeChallenge(code, bank);
  assert.equal(back.s, 42); assert.equal(back.n, 'Alex script'); assert.deepEqual(back.a, run);
  assert.equal(D.scoreRun(rounds, back.a), D.scoreRun(rounds, run));
  assert.equal(D.decodeChallenge('not-base64!!', bank), null);
  assert.equal(D.decodeChallenge(D.encodeChallenge({ v: 1, s: 42, c: 'nope', d: '2', n: '', r: 5, a: run }), bank), null);
  assert.equal(D.decodeChallenge(D.encodeChallenge({ v: 1, s: 42, c: 'net', d: '2', n: '', r: 5, a: run.slice(1) }), bank), null);
});

test('bots are deterministic and roughly as accurate as advertised', () => {
  const rounds = D.makeRound(bank, 7, 'all', 'mix', 20);
  assert.deepEqual(D.botRun(rounds, 'elite', 7), D.botRun(rounds, 'elite', 7));
  let rookie = 0, elite = 0;
  for (let s = 0; s < 40; s++) { const r = D.makeRound(bank, s, 'all', 'mix', 10); rookie += D.botRun(r, 'rookie', s).filter((a, i) => a.pick === r[i].q.answer).length; elite += D.botRun(r, 'elite', s).filter((a, i) => a.pick === r[i].q.answer).length; }
  assert.ok(elite > rookie);
});

test('tournament brackets seed, give byes and crown one champion', () => {
  let s = 1; const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (const n of [2, 3, 5, 8, 11, 16]) {
    const names = Array.from({ length: n }, (_, i) => 'P' + i); const t = D.bracket(names, rand);
    const size = t[0].length * 2; assert.ok(size >= n && size < 2 * n || n === 2);
    assert.ok(t[0].every(m => m.a || m.b), 'no bye-vs-bye match');
    let guard = 0, nx;
    while ((nx = D.nextMatch(t)) && guard++ < 40) { const m = t[nx[0]][nx[1]]; m.w = m.a; D.settle(t); }
    assert.ok(names.includes(D.champion(t)), `champion for ${n}`);
  }
  assert.deepEqual(D.bracket(['solo']), []);
  assert.equal(D.bracket(['a', 'b', 'a<script>']).flat().filter(m => (m.a || '').includes('<')).length, 0);
});
