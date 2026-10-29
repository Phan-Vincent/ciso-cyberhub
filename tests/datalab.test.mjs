// Data Lab: statistics helpers are right and every level's answer comes from the shipped data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = mkdtempSync(join(tmpdir(), 'data-'));
writeFileSync(join(dir, 'datalab.js'), stripTypeScriptTypes(readFileSync(new URL('../web/datalab.ts', import.meta.url), 'utf8'), { mode: 'strip' }));
const D = await import(pathToFileURL(join(dir, 'datalab.js')).href);
const intel = JSON.parse(readFileSync(new URL('../data/intelligence.json', import.meta.url), 'utf8'));
const kev = intel.vulnerabilities.filter(v => v.kev && v.date_added).map(v => ({ id: v.id, vendor: v.vendor || '(unknown)', product: v.product || '(unknown)', added: v.date_added,
  cvss: typeof v.cvss?.score === 'number' ? v.cvss.score : null, epss: typeof v.epss === 'number' ? v.epss : null }));
const jobs = JSON.parse(readFileSync(new URL('../data/internships.json', import.meta.url), 'utf8')).items.map(i => ({ ...i, miles: Number(i.miles), security: i.security === true || String(i.security) === 'True' }));

test('statistics helpers', () => {
  assert.equal(D.median([3, 1, 2]), 2); assert.equal(D.median([1, 2, 3, 4]), 2.5); assert.ok(Number.isNaN(D.median([])));
  assert.equal(D.mean([1, 2, 3]), 2); assert.ok(Math.abs(D.pearson([1, 2, 3], [2, 4, 6]) - 1) < 1e-12); assert.ok(Math.abs(D.pearson([1, 2, 3], [3, 2, 1]) + 1) < 1e-12);
  assert.deepEqual(D.countBy(['a', 'b', 'a'], x => x), [['a', 2], ['b', 1]]);
  assert.equal(D.daysBefore('2026-03-01', 1), '2026-02-28'); assert.deepEqual(D.lastMonths('2026-02-10', 3), ['2025-12', '2026-01', '2026-02']);
  assert.equal(D.niceStep(78), 100); assert.equal(D.niceStep(8.6), 10); assert.equal(D.niceStep(3.1), 5);
});

test('every level has a defined answer on the real snapshot and checks it', () => {
  assert.equal(D.DLEVELS.length, 10);
  for (const L of D.DLEVELS) {
    const a = L.answer(kev, jobs); assert.ok(a !== undefined && a !== '' && !Number.isNaN(a), L.id + ' -> ' + a);
    assert.ok(L.check(String(typeof a === 'number' ? +a.toFixed(1) : a), a), 'accepts ' + L.id);
    assert.ok(!L.check('zzz-not-it', a), 'rejects ' + L.id); assert.ok(L.q(kev, jobs).length > 20 && L.lesson.length > 80);
  }
  assert.equal(D.DLEVELS.find(l => l.id === 'count').answer(kev, jobs), kev.length);
  assert.equal(D.DLEVELS.find(l => l.id === 'axis').answer(kev, jobs), 'b');
});
