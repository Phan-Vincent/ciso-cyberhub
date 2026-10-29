// Challenge board: every flag is reachable from its evidence with CyberHub's own tools, the
// stored hash matches, hints cost points as advertised, and only hashes ship to the browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const dir = mkdtempSync(join(tmpdir(), 'ctf-'));
for (const n of ['ctf', 'chal', 'sha256']) writeFileSync(join(dir, n + '.js'), stripTypeScriptTypes(readFileSync(new URL(`../web/${n}.ts`, import.meta.url), 'utf8'), { mode: 'strip' }));
const T = await import(pathToFileURL(join(dir, 'ctf.js')).href); const C = await import(pathToFileURL(join(dir, 'chal.js')).href);
const data = JSON.parse(readFileSync(new URL('../data/ctf.json', import.meta.url), 'utf8')).challenges;
const by = id => data.find(c => c.id === id); const R = (s, ...ops) => C.applyRecipe(s, ops.map(o => Array.isArray(o) ? { id: o[0], p: o[1] } : { id: o, p: 0 }));
const inner = a => T.normFlag(a);

test('board shape, hashes and scoring', () => {
  assert.equal(data.length, 16); assert.equal(new Set(data.map(c => c.id)).size, 16);
  for (const c of data) {
    assert.ok([100, 200, 300, 400, 500].includes(c.pts), c.id); assert.ok(c.hints.length >= 2, c.id); assert.ok(c.explain.length > 40, c.id);
    assert.equal(c.hash, createHash('sha256').update(inner(c.answer)).digest('hex'), c.id); assert.equal(T.hashHex(inner(c.answer)), c.hash, c.id);
    assert.match(c.answer, /^CISO\{[^\s{}]+\}$/, c.id);
  }
  assert.equal(T.normFlag(' ciso{ Shift_Happens } '), 'shift_happens'); assert.equal(T.normFlag('shift_happens'), 'shift_happens');
  assert.equal(T.award(400, 0), 400); assert.equal(T.award(400, 1), 300); assert.equal(T.award(400, 3), 100); assert.equal(T.award(400, 9), 100);
});

test('every flag can be recovered from its evidence', () => {
  const art = id => by(id).artifact, ans = id => by(id).answer;
  assert.equal(R(art('view-source').match(/launch: (\S+) -->/)[1], 'fromb64'), ans('view-source'));
  assert.equal(R(art('headers').match(/X-Debug-Token: (\S+)/)[1], 'fromhex'), ans('headers'));
  assert.equal(`CISO{${2 ** (32 - 22) - 2}}`, ans('subnet'));
  const M = { '...': 's', '..': 'i', '--.': 'g', '-.': 'n', '.-': 'a', '.-..': 'l', '.-.': 'r', '.': 'e', '-..': 'd', '-': 't' };
  assert.equal(`CISO{${art('morse').split(' / ').map(w => w.split(' ').map(x => M[x]).join('')).join('_')}}`, ans('morse'));
  const first = art('acrostic').split('\n').map(l => l[0]).join('').toLowerCase(); assert.equal(`CISO{${first.slice(0, 4)}_${first.slice(4, 7)}_${first.slice(7)}}`, ans('acrostic'));
  const rec = art('phish-origin').split('\n').filter(l => l.startsWith('Received:')).pop(); assert.equal(`CISO{${rec.match(/\(([\d.]+)\)/)[1]}}`, ans('phish-origin'));
  const ok = art('brute-window').split('\n').find(l => l.includes('Accepted password') && l.includes('198.51.100.9')); assert.equal(`CISO{${ok.match(/for (\w+)/)[1]}_${ok.slice(7, 12).replace(':', '')}}`, ans('brute-window'));
  const cnt = {}; for (const l of art('wp-count').split('\n')) if (l.includes('POST /wp-login.php')) cnt[l.split(' ')[0]] = (cnt[l.split(' ')[0]] || 0) + 1;
  assert.equal(`CISO{${Object.values(cnt).filter(n => n > 3).length}}`, ans('wp-count'));
  const knock = art('port-knock').split('\n').filter(l => l.includes('BLOCK') && l.includes('198.51.100.40')).map(l => l.split(':').pop()); assert.equal(`CISO{${knock.join('-')}}`, ans('port-knock'));
  const sh = (art('caesar-unknown').charCodeAt(0) - 'C'.charCodeAt(0) + 26) % 26; assert.equal(R(art('caesar-unknown'), ['caesar', -sh]), ans('caesar-unknown'));
  const hx = R(art('b64-xor'), 'fromb64', 'tohex'); const key = parseInt(hx.slice(0, 2), 16) ^ 0x43; assert.equal(R(hx, ['xor', key]), ans('b64-xor'));
  const sess = JSON.parse(R(art('cookie').match(/session=([^;]+)/)[1], 'fromb64url')); const want = art('cookie').match(/s\.role === "(\w+)"/)[1];
  assert.equal(sess.role, 'student'); assert.equal(`CISO{role_${want}}`, ans('cookie'));
  const parts = art('dns-pieces').split('\n').map(l => l.match(/TXT\s+(\d+)-([0-9a-f]+)\.s\.exfil/)).filter(Boolean).sort((a, b) => a[1] - b[1]).map(m => m[2]).join('');
  assert.equal(R(parts, 'fromhex'), ans('dns-pieces'));
  const pub = art('hash-match').match(/SHA-256: ([0-9a-f]{64})/)[1]; const hit = [...art('hash-match').matchAll(/^(\S+): "([^"]+)"$/gm)].find(m => createHash('sha256').update(m[2]).digest('hex') === pub);
  assert.equal(`CISO{${hit[1]}}`, ans('hash-match'));
  const pol = JSON.parse(art('iam-deny')); const deny = pol.Statement.find(s => s.Effect === 'Deny' && [].concat(s.Action).includes('s3:DeleteObject') && [].concat(s.Resource).some(r => r.startsWith('arn:aws:s3:::reports-prod')));
  assert.equal(`CISO{deny_${deny.Sid}}`, ans('iam-deny'));
  const cmd = R(art('kill-chain').match(/-enc (\S+)/)[1], 'fromb64'); assert.equal(`CISO{${cmd.match(/\/tn "([^"]+)"/)[1]}}`, ans('kill-chain'));
});

test('only hashes reach the browser', () => {
  const src = readFileSync(new URL('../hub/ctf.py', import.meta.url), 'utf8');
  assert.match(src, /'hash': c\['hash'\]/); assert.doesNotMatch(src.match(/pub = \[.*\]/)[0], /answer|explain/);
});
