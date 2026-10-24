// Accounts: progress merging never loses work; sync talks to Supabase correctly (mocked).
import test from 'node:test';
import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const f = join(mkdtempSync(join(tmpdir(), 'acct-')), 'account.mjs');
writeFileSync(f, stripTypeScriptTypes(readFileSync(new URL('../web/account.ts', import.meta.url), 'utf8'), { mode: 'strip' }));
const A = await import(pathToFileURL(f).href);
class Mem { constructor() { this.m = new Map(); } getItem(k) { return this.m.has(k) ? this.m.get(k) : null; } setItem(k, v) { this.m.set(k, String(v)); } removeItem(k) { this.m.delete(k); } }

test('merge keeps everything completed on either device', () => {
  const laptop = { linux: ['echo', 'head'], defend: { read: ['networks'], shifts: { networks: 6 }, perfect: [] }, duel: { played: 3, wins: 1, best: 900 }, readiness: 70,
    academy: { version: 1, lessons: ['academy/1.1'], attempts: [{ at: '2026-10-01T00:00:00Z', score: 5, total: 10, domains: { 1: { correct: 1, total: 2 } } }] } };
  const phone = { linux: ['head', 'tail'], netlab: ['net-my-ip'], defend: { read: ['hardware'], shifts: { networks: 8, hardware: 4 }, perfect: ['networks'] }, duel: { played: 5, wins: 0, best: 700 }, readiness: 85,
    academy: { version: 1, lessons: ['academy/1.2'], attempts: [{ at: '2026-10-02T00:00:00Z', score: 7, total: 10, domains: { 1: { correct: 2, total: 2 } } }, { at: '2026-10-01T00:00:00Z', score: 5, total: 10, domains: { 1: { correct: 1, total: 2 } } }] } };
  const m = A.mergeProgress(laptop, phone);
  assert.deepEqual(m.linux, ['echo', 'head', 'tail']); assert.deepEqual(m.netlab, ['net-my-ip']);
  assert.deepEqual(m.defend, { read: ['hardware', 'networks'], shifts: { networks: 8, hardware: 4 }, perfect: ['networks'] });
  assert.deepEqual(m.duel, { played: 5, wins: 1, best: 900 }); assert.equal(m.readiness, 85);
  assert.deepEqual(m.academy.lessons, ['academy/1.1', 'academy/1.2']); assert.equal(m.academy.attempts.length, 2);
  assert.deepEqual(A.mergeProgress(m, m), m, 'merging is idempotent');
  assert.deepEqual(A.mergeProgress({}, {}), {});
});

test('merge ignores junk from a tampered row', () => {
  const m = A.mergeProgress({ linux: ['a'] }, { linux: [1, null, 'b', { x: 1 }], defend: { shifts: { '<script>': 9, ok: 'NaN' } }, readiness: 'lots' });
  assert.deepEqual(m.linux, ['a', 'b']); assert.deepEqual(m.defend.shifts, { ok: 0 }); assert.equal(m.readiness, 0);
});

test('collect and apply round-trip the browser keys, including the base-path Academy key', () => {
  const ls = new Mem(); ls.setItem('cyberhub:linux', '["echo"]'); ls.setItem('cyberhub:/cyberhub:progress:v1', '{"version":1,"lessons":["academy/2.1"],"attempts":[]}');
  ls.setItem('cyberhub:resume', 'SECRET RESUME'); ls.setItem('cyberhub:theme', 'dark');
  const snap = A.collect('/cyberhub', k => ls.getItem(k));
  assert.deepEqual(Object.keys(snap).sort(), ['academy', 'linux']); assert.ok(!JSON.stringify(snap).includes('SECRET'));
  const ls2 = new Mem(); A.apply('/cyberhub', snap, (k, v) => ls2.setItem(k, v));
  assert.equal(ls2.getItem('cyberhub:linux'), '["echo"]'); assert.ok(ls2.getItem('cyberhub:/cyberhub:progress:v1').includes('academy/2.1'));
});

test('email validation', () => {
  assert.ok(A.validEmail('student@csusb.edu')); assert.ok(!A.validEmail('nope')); assert.ok(!A.validEmail('a b@c.d')); assert.ok(!A.validEmail('x@y'));
});

test('sync pulls, merges, writes locally and pushes to the user\'s own row', async () => {
  const calls = []; const remote = { linux: ['tail'], duel: { played: 9, wins: 2, best: 1000 } };
  globalThis.fetch = async (url, opt = {}) => {
    calls.push({ url, opt });
    if (url.includes('/auth/v1/user')) return new Response(JSON.stringify({ id: 'u-1', email: 'a@b.co' }), { status: 200 });
    if (url.includes('/rest/v1/progress?select')) return new Response(JSON.stringify([{ data: remote }]), { status: 200 });
    if (url.includes('/rest/v1/progress?on_conflict')) return new Response('', { status: 201 });
    return new Response('{}', { status: 404 });
  };
  const ls = new Mem(); ls.setItem('cyberhub:linux', '["echo"]');
  const cloud = new A.Cloud('https://abcdefghijklmnop.supabase.co', 'sb_publishable_test_key_123456', ls);
  const s = await cloud.fromHash('#access_token=AT&refresh_token=RT&expires_in=3600&token_type=bearer');
  assert.equal(s.user.id, 'u-1');
  await A.sync(cloud, '', ls);
  assert.deepEqual(JSON.parse(ls.getItem('cyberhub:linux')), ['echo', 'tail']);
  const push = calls.find(c => c.url.includes('on_conflict')); const body = JSON.parse(push.opt.body);
  assert.equal(body.user_id, 'u-1'); assert.deepEqual(body.data.linux, ['echo', 'tail']);
  assert.equal(push.opt.headers.Authorization, 'Bearer AT'); assert.match(push.opt.headers.Prefer, /merge-duplicates/);
  const pull = calls.find(c => c.url.includes('select=data')); assert.match(pull.url, /user_id=eq\.u-1/);
});

test('merge covers lab progress too', () => {
  const m = A.mergeProgress({ soc: { shifts: 1, best: 80 }, phish: { 'it-reset': 12 }, redteam: [0, 1], start: ['mfa'] }, { soc: { shifts: 3, best: 70 }, phish: { 'it-reset': 20, payroll: 15 }, redteam: [1, 2, 'x'], start: ['pm'] });
  assert.deepEqual(m.soc, { shifts: 3, best: 80 }); assert.deepEqual(m.phish, { 'it-reset': 20, payroll: 15 }); assert.deepEqual(m.redteam, [0, 1, 2]); assert.deepEqual(m.start, ['mfa', 'pm']);
});

test('merge covers flashcards and the study plan', () => {
  const m = A.mergeProgress({ itcards: { 'net-1': 2, 'net-2': 3 }, plan: { goal: 'it', hours: 4, done: ['0'] } }, { itcards: { 'net-1': 3, 'bad key': 9 }, plan: { goal: 'it', hours: 6, done: ['1'] } });
  assert.deepEqual(m.itcards, { 'net-1': 3, 'net-2': 3 }); assert.equal(m.plan.goal, 'it'); assert.deepEqual(m.plan.done, ['0', '1']);
});
