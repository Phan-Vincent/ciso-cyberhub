// Cyber Duel live rooms: host scoring and the Realtime channel protocol (fake socket relay).
import test from 'node:test';
import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = mkdtempSync(join(tmpdir(), 'live-'));
for (const n of ['duel', 'live', 'qr']) writeFileSync(join(dir, n + '.js'), stripTypeScriptTypes(readFileSync(new URL(`../web/${n}.ts`, import.meta.url), 'utf8'), { mode: 'strip' }));
const L = await import(pathToFileURL(join(dir, 'live.js')).href); const D = await import(pathToFileURL(join(dir, 'duel.js')).href);
const bank = JSON.parse(readFileSync(new URL('../data/duel.json', import.meta.url), 'utf8'));

test('room codes avoid look-alike characters', () => {
  for (let i = 0; i < 200; i++) { const c = L.newCode(); assert.ok(L.validCode(c), c); assert.doesNotMatch(c, /[01ILO]/); }
  assert.ok(!L.validCode('abcde')); assert.ok(!L.validCode('K7QP'));
});

test('host scores answers once, ranks players and handles duplicates', () => {
  const h = new L.HostGame();
  assert.ok(h.join('aaaaaaaa1111', 'Ana')); assert.ok(h.join('bbbbbbbb2222', 'Ana')); assert.ok(h.join('cccccccc3333', 'Ben'));
  assert.deepEqual(h.names(), ['Ana', 'Ana 2', 'Ben']); assert.ok(!h.join('not-hex', 'x')); assert.ok(!h.join('dddddddd4444', '<<>>'));
  h.start(bank, 5, 'net', 'mix', 3); assert.ok(h.next()); const r = h.rounds[0];
  const wrong = [0, 1, 2, 3].find(k => k !== r.q.answer);
  assert.ok(h.answer('aaaaaaaa1111', 0, r.q.answer, 1000)); assert.ok(!h.answer('aaaaaaaa1111', 0, wrong, 500), 'second answer ignored');
  assert.ok(h.answer('bbbbbbbb2222', 0, wrong, 800)); assert.ok(!h.answer('eeeeeeee5555', 0, r.q.answer, 1), 'unknown player');
  const rev = h.close(); assert.equal(rev.got['aaaaaaaa1111'], D.points(true, 1000)); assert.ok(!('bbbbbbbb2222' in rev.got) || rev.got['bbbbbbbb2222'] === 0);
  assert.equal(rev.ranks['aaaaaaaa1111'], 1); assert.equal(rev.board[0][0], 'Ana'); assert.ok(!h.answer('cccccccc3333', 0, r.q.answer, 100), 'closed');
  h.kick('cccccccc3333'); assert.ok(!h.join('cccccccc3333', 'Ben'), 'kicked stays out');
  assert.ok(h.next()); assert.ok(h.next()); assert.ok(!h.next()); assert.equal(h.end().total, 2);
});

test('channel joins, relays broadcasts between host and player, and queues early sends', async () => {
  const sockets = [];
  class FakeWS { constructor(url) { this.url = url; this.readyState = 0; this.topic = ''; sockets.push(this); setTimeout(() => { this.readyState = 1; this.onopen?.(); }, 1); }
    send(s) { const m = JSON.parse(s); if (m.event === 'phx_join') { this.topic = m.topic; setTimeout(() => this.onmessage?.({ data: JSON.stringify({ event: 'phx_reply', topic: m.topic, ref: m.ref, payload: { status: 'ok' } }) }), 1); }
      if (m.event === 'broadcast') for (const o of sockets) if (o !== this && o.topic === m.topic) o.onmessage?.({ data: JSON.stringify({ event: 'broadcast', topic: m.topic, ref: null, payload: m.payload }) }); }
    close() { this.readyState = 3; this.onclose?.(); } }
  const url = 'https://abcdefghijklmnopqrst.supabase.co', key = 'sb_publishable_' + 'x'.repeat(30);
  const host = new L.Channel(url, key, 'K7QPX', u => new FakeWS(u)), p1 = new L.Channel(url, key, 'K7QPX', u => new FakeWS(u)), other = new L.Channel(url, key, 'ZZZZZ', u => new FakeWS(u));
  const got = [], stray = []; host.onMsg = m => got.push(m); other.onMsg = m => stray.push(m);
  host.connect(); p1.connect(); other.connect(); p1.send({ t: 'join', id: 'aaaaaaaa1111', name: 'Ana' });
  await new Promise(r => setTimeout(r, 30));
  assert.match(sockets[0].url, /^wss:\/\/abcdefghijklmnopqrst\.supabase\.co\/realtime\/v1\/websocket\?apikey=sb_publishable_x+&vsn=1\.0\.0$/);
  assert.deepEqual(got, [{ t: 'join', id: 'aaaaaaaa1111', name: 'Ana' }]); assert.equal(stray.length, 0, 'other rooms do not hear it');
  host.close(); p1.close(); other.close();
});
