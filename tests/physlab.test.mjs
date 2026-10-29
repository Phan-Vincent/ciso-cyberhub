// Lockdown Lab: every tier is lost with no defenses, winnable within budget, and the physics behave:
// walls block cameras, a mantrap stops tailgating, IT controls stop the steps they claim to stop.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = mkdtempSync(join(tmpdir(), 'phys-'));
writeFileSync(join(dir, 'physlab.js'), stripTypeScriptTypes(readFileSync(new URL('../web/physlab.ts', import.meta.url), 'utf8'), { mode: 'strip' }));
const L = await import(pathToFileURL(join(dir, 'physlab.js')).href);
const tier = id => L.TIERS.find(t => t.id === id);

test('three tiers with the agreed names', () => {
  assert.deepEqual(L.TIERS.map(t => t.name), ['Ground Floor', 'Secure Wing', 'Black Site']);
  for (const T of L.TIERS) { assert.equal(T.grid.length, T.h); for (const r of T.grid) assert.equal(r.length, T.w); }
});

test('with no defenses every attacker gets what they came for', () => {
  for (const T of L.TIERS) { const g = L.grade(T, [], []); assert.equal(g.stars, 0, T.name); for (const r of g.results) assert.equal(r.outcome, 'breached', `${T.name}: ${r.attack.id}`); }
});

test('each reference solution is valid, within budget and earns three stars', () => {
  for (const T of L.TIERS) {
    const P = [];
    for (const p of T.model) { assert.equal(L.canPlace(T, P, p.item, p.x, p.y), null, `${T.name}: ${p.item} at ${p.x},${p.y}`); P.push(p); }
    assert.ok(L.spent(T.model) <= T.budget, `${T.name} costs ${L.spent(T.model)}`); assert.ok(L.itSpent(T.modelIt) <= T.it, `${T.name} IT`);
    const g = L.grade(T, T.model, T.modelIt); assert.equal(g.stars, 3, `${T.name}: ${g.results.map(r => r.attack.id + ' ' + r.outcome).join(', ')}`);
  }
});

test('past the first tier, the reference layout without its IT hardening still loses something', () => {
  for (const T of L.TIERS.slice(1)) assert.ok(L.grade(T, T.model, []).breached > 0, T.name);
});

test('a camera on its own is not enough', () => {
  const T = tier('ground'); const g = L.grade(T, [{ item: 'cam', x: 13, y: 8, dir: 0 }], []);
  assert.ok(g.stars < 2);
});

test('walls and closed doors block camera sight', () => {
  const T = tier('ground'); const cells = L.cameraCells(T, [], { item: 'cam', x: 13, y: 8, dir: 0 });
  assert.ok(cells.some(c => c.x === 18 && c.y === 8), 'sees the rack across the closet');
  assert.ok(!cells.some(c => c.y <= 5), 'cannot see through the wall into the office');
  assert.equal(L.los(T, { x: 5, y: 4 }, { x: 15, y: 4 }), false, 'interior door blocks sight');
  assert.equal(L.los(T, { x: 3, y: 3 }, { x: 10, y: 8 }), true);
});

test('night cameras need light outside; IR cameras do not', () => {
  const T = tier('black'); const A = T.attacks.find(a => a.id === 'crew');
  const cam = { item: 'cam', x: 10, y: 18, dir: 0 }, ir = { ...cam, item: 'ircam' };
  assert.deepEqual(L.watchers(T, [cam], A, 13, 18), []);
  assert.deepEqual(L.watchers(T, [cam, { item: 'light', x: 12, y: 18 }], A, 13, 18), ['Camera']);
  assert.deepEqual(L.watchers(T, [ir], A, 13, 18), ['Night camera']);
});

test('a badge reader makes a tailgater wait; a mantrap stops them at the entrance', () => {
  const T = tier('wing'); const A = T.attacks.find(a => a.id === 'tailgate');
  assert.equal(L.passage(T, [], A, 2, 4).t, 2);
  assert.equal(L.passage(T, [{ item: 'reader', x: 2, y: 4 }], A, 2, 4).t, 20);
  assert.equal(L.passage(T, [{ item: 'mantrap', x: 2, y: 4 }], A, 2, 4).t, Infinity);
  const r = L.simulate(T, [{ item: 'mantrap', x: 2, y: 4 }], [], A);
  assert.ok(!r.path.some(p => p.x === 2 && p.y === 4), 'the tailgater has to find another way in');
});

test('IT controls block exactly the steps they name', () => {
  const T = tier('ground'); const A = T.attacks[0];
  const none = L.simulate(T, [], [], A); assert.deepEqual(none.executed, ['rogue', 'usbboot', 'drive']);
  const some = L.simulate(T, [], ['secboot', 'fde'], A); assert.deepEqual(some.executed, ['rogue']); assert.deepEqual(some.blocked, ['usbboot', 'drive']);
});

test('an insider can switch the cameras off unless the camera network is locked down', () => {
  const T = tier('black'); const A = T.attacks.find(a => a.id === 'insider'); const P = [{ item: 'ircam', x: 28, y: 5, dir: 2 }, { item: 'ircam', x: 7, y: 5, dir: 0 }];
  assert.equal(L.simulate(T, P, [], A).detectAt, null);
  assert.notEqual(L.simulate(T, P, ['camnet'], A).detectAt, null);
  assert.equal(L.simulate(T, P.slice(0, 1), ['camnet'], A).detectAt, null, 'with only the NOC watched, they go for the racks instead');
});

test('placement rules', () => {
  const T = tier('ground');
  assert.equal(L.canPlace(T, [], 'glass', 7, 1), null); assert.match(L.canPlace(T, [], 'glass', 5, 5), /window/);
  assert.match(L.canPlace(T, [], 'cam', 12, 3), /open floor/); assert.match(L.canPlace(T, [], 'motion', 0, 0), /inside/);
  assert.match(L.canPlace(T, [{ item: 'cam', x: 5, y: 5 }], 'motion', 5, 5), /taken/);
  assert.equal(L.canPlace(T, [], 'cage', 18, 8), null);
});

test('the page price list matches the engine', () => {
  const py = readFileSync(new URL('../hub/physlab.py', import.meta.url), 'utf8');
  const listed = [...py.matchAll(/\('([a-z]+)', '([^']+)', (\d{2,}), '[^']*'\)/g)].map(m => [m[1], m[2], Number(m[3])]);
  assert.equal(listed.length, Object.keys(L.ITEMS).length);
  for (const [id, , cost] of listed) assert.equal(L.ITEMS[id]?.cost, cost, id);
  const ctl = [...py.matchAll(/\('([a-z]+)', '([^']+)', (\d), '[^']*'\)/g)].map(m => [m[1], Number(m[3])]);
  for (const [id, pts] of ctl) assert.equal(L.CONTROLS[id]?.pts, pts, id);
  assert.equal(ctl.length, Object.keys(L.CONTROLS).length);
});
