// Packet Lab, Log Hunt, Crypto & Encoding Lab and Secure Code Review: every level is solvable
// with the tools the page gives, and the stated answers match the synthetic data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const f = join(mkdtempSync(join(tmpdir(), 'chal-')), 'chal.mjs');
writeFileSync(f, stripTypeScriptTypes(readFileSync(new URL('../web/chal.ts', import.meta.url), 'utf8'), { mode: 'strip' }));
const C = await import(pathToFileURL(f).href);

test('packet filters find every Packet Lab answer', () => {
  const pk = C.capture(); const F = s => pk.filter(C.compileFilter(s)); const A = id => C.PCAP_LEVELS.find(l => l.id === id).a;
  assert.equal(C.PCAP_LEVELS.length, 8);
  assert.deepEqual([...new Set(F('dns').filter(p => /response/.test(p.info)).map(p => p.src))], [A('dns-server')]);
  const syn = F('tcp.flags.syn == 1 && tcp.flags.ack == 0'); const bySrc = {}; for (const p of syn) bySrc[p.src] = (bySrc[p.src] || 0) + 1;
  assert.equal(Object.entries(bySrc).sort((a, b) => b[1] - a[1])[0][0], A('scanner'));
  assert.equal(F('ip.src == 10.0.5.20 && ip.dst == 203.0.113.66 && tcp.flags.reset == 0').map(p => p.sport).join(','), A('open-ports'));
  assert.ok(F('ftp').some(p => p.info === 'Request: USER ' + A('ftp-user')));
  assert.ok(F('http.request')[0].uri.endsWith('/' + A('download'))); assert.equal(F('http.request')[0].host, A('domain'));
  assert.ok(F('dns && ip.src == 10.0.5.52').every(p => p.dns.endsWith('.' + A('tunnel'))));
  assert.ok(F('arp').filter(p => p.src === A('arp-sweep')).length >= 10);
  assert.equal(F('').length, pk.length); assert.equal(F('not arp').length + F('arp').length, pk.length);
  assert.equal(F('(dns || arp) && !(ip.src == 10.0.5.1)').length, F('dns && ip.src != 10.0.5.1').length + F('arp').length);
  for (const bad of ['ip.adr == 1', 'tcp.port ==', '(dns', 'dns ) ', '"open']) assert.throws(() => C.compileFilter(bad));
  for (const L of C.PCAP_LEVELS) { assert.ok(L.hints.length >= 2, L.id); if (L.start) C.compileFilter(L.start); }
});

test('log searches find every Log Hunt answer', () => {
  const ev = C.events(); const Q = q => C.runQuery(ev, q); const A = id => C.HUNT_LEVELS.find(l => l.id === id).a;
  assert.equal(String(Q('source=auth action=failed').count), A('fails'));
  assert.equal(Q('source=auth action=failed | stats count by src_ip').table.rows[0][0], A('top-ip'));
  const win = Q(`src_ip=${A('top-ip')} action=accepted`).rows; assert.equal(win.length, 1); assert.equal(win[0].user, A('breach')); assert.ok(A('time').includes(win[0].time.slice(11, 16)));
  assert.ok(Q('user=deploy action=sudo').rows[0].cmd.includes(A('payload')));
  assert.equal(Q('action=useradd').rows[0].raw.match(/name=(\w+)/)[1], A('persist'));
  assert.ok(Q('source=web | stats count by ua').table.rows.some(r => String(r[0]).startsWith(A('sqlmap'))));
  assert.ok(Q('../').rows.every(e => e.path.startsWith(A('traversal') + '?')));
  assert.equal(String(Q('source=web status=500').count), A('errors'));
  assert.equal(Q('status>=500').count, Number(A('errors'))); assert.equal(Q('path=/download.php*').count, 3);
  assert.equal(Q('source=auth NOT action=failed').count + Q('source=auth action=failed').count, Q('source=auth').count);
  assert.equal(Q('source=web | head 2').rows.length, 2); assert.deepEqual(Q('source=web | table src_ip,status | head 1').table.cols, ['src_ip', 'status']);
  assert.throws(() => Q('nope=1')); assert.throws(() => Q('source=web | sort x'));
  for (const L of C.HUNT_LEVELS) if (L.start) Q(L.start);
});

test('crypto recipes recover every flag', async () => {
  const R = { b64: ['fromb64'], hex: ['fromhex'], rot13: ['rot13'], caesar: [['caesar', -3]], url: ['urld'], layers: ['fromb64', 'fromhex', 'rot13'], xor: [['xor', 42]], bin: ['frombin'] };
  for (const c of C.CRYPTO) {
    if (c.id === 'hash') { assert.equal((await C.sha256(c.input)).length, 64); continue; }
    const recipe = R[c.id].map(s => Array.isArray(s) ? { id: s[0], p: s[1] } : { id: s, p: 0 });
    assert.equal(C.applyRecipe(c.input, recipe), c.a, c.id); assert.notEqual(c.input, c.a);
  }
  assert.equal(C.applyRecipe('hello', [{ id: 'tob64', p: 0 }, { id: 'fromb64', p: 0 }, { id: 'tohex', p: 0 }, { id: 'fromhex', p: 0 }, { id: 'rev', p: 0 }]), 'olleh');
  assert.throws(() => C.applyRecipe('abc', [{ id: 'fromhex', p: 0 }]));
});

test('code review snippets are well formed', () => {
  assert.equal(C.REVIEW.length, 12); const ids = new Set();
  for (const s of C.REVIEW) { assert.ok(!ids.has(s.id)); ids.add(s.id); assert.ok(s.bad >= 1 && s.bad <= s.code.length, s.id); assert.ok(s.code[s.bad - 1].trim(), s.id); assert.equal(s.fixes.length, 3); assert.ok(s.fix >= 0 && s.fix < 3); assert.ok(s.why.length > 40); }
  assert.equal(C.norm('  21, 22 '), '21,22');
});

test('Active Directory searches find every answer', () => {
  const ev = C.adEvents(); const Q = q => C.runQuery(ev, q, C.AD_FIELDS); const A = id => [].concat(C.AD_LEVELS.find(l => l.id === id).a);
  assert.equal(C.AD_LEVELS.length, 8);
  assert.equal(Q('event_id=4771 | stats count by src_ip').table.rows[0][0], A('spray-ip')[0]);
  assert.equal(String(Q('event_id=4771 src_ip=10.10.20.77 | stats count by user').table.rows.length), A('spray-count')[0]);
  assert.deepEqual(Q('src_ip=10.10.20.77 event_id=4624').rows.map(e => e.user)[0], A('spray-win')[0]);
  assert.equal(String(Q('event_id=4769 user=jperez enc=0x17').count), A('kerberoast')[0]);
  assert.equal(Q('event_id=4728').rows[0].member, A('escalate')[0]);
  assert.ok(A('dcsync').includes(Q('event_id=4662').rows[0].time.slice(11, 16)));
  assert.equal(String(Q('cleared').rows[0].event_id), A('cleared')[0]);
  assert.deepEqual(Q('preauth=0').rows.map(e => e.user), A('asrep'));
  assert.throws(() => Q('ua=x'));
  for (const L of C.AD_LEVELS) { assert.ok(L.hints.length >= 1, L.id); if (L.start) Q(L.start); }
});

test('cloud snippets are well formed', () => {
  assert.equal(C.CLOUD.length, 12); const ids = new Set(C.REVIEW.map(s => s.id));
  for (const s of C.CLOUD) { assert.ok(!ids.has(s.id), s.id); ids.add(s.id); assert.ok(s.bad >= 1 && s.bad <= s.code.length, s.id); assert.ok(s.code[s.bad - 1].trim(), s.id); assert.equal(s.fixes.length, 3); assert.ok(s.fix >= 0 && s.fix < 3); }
});
