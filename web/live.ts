// CyberHub Cyber Duel: Live rooms. A host screen (projector) and players on phones, joined by
// a 5-letter code. Messages travel over Supabase Realtime broadcast (a public channel per room);
// nothing is written to a database. Players send only a nickname and their answers.
// The host is the source of truth for scoring. No innerHTML; text only.

import { makeRound, points, cleanName, ROUND_MS, type Bank, type Round } from './duel.js';

/* ------------------------------------------------------------ protocol */
export type Msg =
  | { t: 'join'; id: string; name: string }
  | { t: 'ans'; id: string; i: number; pick: number; ms: number }
  | { t: 'lobby'; names: string[] }
  | { t: 'start'; seed: number; cat: string; diff: string; n: number }
  | { t: 'q'; i: number }
  | { t: 'reveal'; i: number; board: [string, number][]; scores: Record<string, number>; ranks: Record<string, number>; got: Record<string, number> }
  | { t: 'end'; board: [string, number][]; ranks: Record<string, number>; total: number }
  | { t: 'kick'; id: string };

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const newCode = (rand: () => number = Math.random) => Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)]).join('');
export const validCode = (c: string) => new RegExp(`^[${CODE_CHARS}]{5}$`).test(c);
export const MAX_PLAYERS = 150;

/** Host-side game state: who joined, who answered what, and the scores. */
export class HostGame {
  players = new Map<string, { name: string; score: number }>(); answers = new Map<number, Map<string, { pick: number; ms: number }>>(); kicked = new Set<string>();
  rounds: Round[] = []; i = -1; open = false;
  join(id: string, name: string): boolean {
    const n = cleanName(name); if (!/^[a-f0-9]{8,16}$/.test(id) || !n || this.kicked.has(id)) return false;
    if (!this.players.has(id)) { if (this.players.size >= MAX_PLAYERS) return false; let nm = n; let k = 2; const taken = new Set([...this.players.values()].map(p => p.name.toLowerCase())); while (taken.has(nm.toLowerCase())) nm = `${n.slice(0, 17)} ${k++}`; this.players.set(id, { name: nm, score: 0 }); }
    return true;
  }
  kick(id: string) { this.players.delete(id); this.kicked.add(id); }
  names() { return [...this.players.values()].map(p => p.name); }
  start(bank: Bank, seed: number, cat: string, diff: string, n: number) { this.rounds = makeRound(bank, seed, cat, diff, n); this.i = -1; this.players.forEach(p => { p.score = 0; }); this.answers.clear(); }
  next(): boolean { if (this.i >= this.rounds.length - 1) return false; this.i++; this.open = true; this.answers.set(this.i, new Map()); return true; }
  answer(id: string, i: number, pick: number, ms: number): boolean {
    if (!this.open || i !== this.i || !this.players.has(id) || !Number.isInteger(pick) || pick < 0 || pick > 3) return false;
    const a = this.answers.get(i)!; if (a.has(id)) return false; a.set(id, { pick, ms: Math.max(0, Math.min(ROUND_MS, Math.round(Number(ms) || ROUND_MS))) }); return true;
  }
  answered() { return this.answers.get(this.i)?.size || 0; }
  close(): Msg & { t: 'reveal' } {
    this.open = false; const r = this.rounds[this.i]; const got: Record<string, number> = {};
    for (const [id, a] of this.answers.get(this.i) || []) { const p = this.players.get(id); if (!p) continue; const pts = points(a.pick === r.q.answer, a.ms); p.score += pts; got[id] = pts; }
    const { board, ranks, scores } = this.standings(); return { t: 'reveal', i: this.i, board: board.slice(0, 10), scores, ranks, got };
  }
  standings() {
    const list = [...this.players.entries()].sort((a, b) => b[1].score - a[1].score || a[1].name.localeCompare(b[1].name));
    const ranks: Record<string, number> = {}; const scores: Record<string, number> = {}; let rank = 0, last = -1;
    list.forEach(([id, p], k) => { if (p.score !== last) { rank = k + 1; last = p.score; } ranks[id] = rank; scores[id] = p.score; });
    return { board: list.map(([, p]) => [p.name, p.score] as [string, number]), ranks, scores };
  }
  end(): Msg & { t: 'end' } { const s = this.standings(); return { t: 'end', board: s.board.slice(0, 10), ranks: s.ranks, total: this.players.size }; }
}

/** Minimal Supabase Realtime (Phoenix channels v1 JSON) client for one broadcast channel. */
export class Channel {
  private ws: WebSocket | null = null; private ref = 0; private joinRef = ''; private hb = 0; private tries = 0; private closed = false; private queue: string[] = [];
  onMsg: (m: Msg) => void = () => { }; onStatus: (s: 'connecting' | 'live' | 'offline') => void = () => { };
  url: string; key: string; topic: string; make: (u: string) => WebSocket;
  constructor(url: string, key: string, room: string, make: (u: string) => WebSocket = u => new WebSocket(u)) { this.url = url; this.key = key; this.topic = 'realtime:cyberhub-duel-' + room; this.make = make; }
  connect() {
    this.closed = false; this.onStatus('connecting');
    const ws = this.ws = this.make(`${this.url.replace(/^https:/, 'wss:')}/realtime/v1/websocket?apikey=${encodeURIComponent(this.key)}&vsn=1.0.0`);
    ws.onopen = () => { this.joinRef = String(++this.ref); this.raw({ topic: this.topic, event: 'phx_join', payload: { config: { broadcast: { self: false, ack: false }, presence: { key: '' }, private: false } }, ref: this.joinRef, join_ref: this.joinRef });
      clearInterval(this.hb); this.hb = setInterval(() => this.raw({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(++this.ref) }), 25000) as unknown as number; };
    ws.onmessage = e => { let m: any; try { m = JSON.parse(String(e.data)); } catch { return; }
      if (m.event === 'phx_reply' && m.ref === this.joinRef) { if (m.payload?.status === 'ok') { this.tries = 0; this.onStatus('live'); this.queue.splice(0).forEach(q => this.ws?.send(q)); } else this.onStatus('offline'); return; }
      if (m.event === 'broadcast' && m.topic === this.topic && m.payload?.event === 'duel') { const p = m.payload.payload; if (p && typeof p.t === 'string') this.onMsg(p as Msg); } };
    ws.onclose = () => { clearInterval(this.hb); if (this.closed) return; this.onStatus('offline'); const wait = Math.min(10000, 500 * 2 ** this.tries++); setTimeout(() => { if (!this.closed) this.connect(); }, wait); };
    ws.onerror = () => { try { ws.close(); } catch { /* ignore */ } };
  }
  private raw(o: unknown) { const s = JSON.stringify(o); if (this.ws && this.ws.readyState === 1) this.ws.send(s); }
  send(m: Msg) { const s = JSON.stringify({ topic: this.topic, event: 'broadcast', payload: { type: 'broadcast', event: 'duel', payload: m }, ref: String(++this.ref), join_ref: this.joinRef });
    if (this.ws && this.ws.readyState === 1 && this.joinRef) this.ws.send(s); else this.queue.push(s); }
  close() { this.closed = true; clearInterval(this.hb); try { this.ws?.close(); } catch { /* ignore */ } }
}

/* ------------------------------------------------------------ UI */
const app = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('#live');
if (app) {
  const base = document.body.dataset.base || ''; const sbUrl = document.body.dataset.sbUrl || '', sbKey = document.body.dataset.sbKey || '';
  const $ = <T extends HTMLElement = HTMLElement>(s: string) => app.querySelector<T>(s)!;
  const el = (tag: string, text = '', cls = '') => { const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; };
  const show = (id: string) => { app.querySelectorAll<HTMLElement>('.lv-screen').forEach(s => { s.hidden = s.id !== id; }); if (!['lv-off', 'lv-choose'].includes(id)) app.scrollIntoView({ block: 'start' }); };
  const SHAPES = ['▲', '◆', '●', '■'];
  let bank: Bank | null = null; const ready = fetch(base + '/assets/duel.json').then(r => r.json()).then((b: Bank) => { bank = b; const sel = $<HTMLSelectElement>('#lv-cat'); for (const [k, v] of Object.entries(b.categories)) { const o = el('option', v) as HTMLOptionElement; o.value = k; sel.append(o); } });
  const status = (s: string) => { app.querySelectorAll<HTMLElement>('.lv-status').forEach(x => { x.textContent = s === 'live' ? '● Connected' : s === 'connecting' ? '○ Connecting…' : '○ Reconnecting…'; x.dataset.s = s; }); };
  if (!sbUrl || !sbKey) { show('lv-off'); } else show('lv-choose');
  const joinUrl = (code: string) => `${location.origin}${location.pathname}#${code}`;

  // ---------------- host
  let host: HostGame | null = null, ch: Channel | null = null, code = '', timer = 0, tick = 0, t0 = 0; let lastStart: Msg | null = null;
  const lobby = () => { const names = host!.names(); $('#lv-count').textContent = `${names.length} player${names.length === 1 ? '' : 's'}`;
    $('#lv-players').replaceChildren(...[...host!.players.entries()].map(([id, p]) => { const b = el('button', p.name, 'lv-chip') as HTMLButtonElement; b.type = 'button'; b.title = 'Remove ' + p.name; b.addEventListener('click', () => { host!.kick(id); ch!.send({ t: 'kick', id }); lobby(); }); return b; }));
    ($('#lv-start') as HTMLButtonElement).disabled = names.length < 1; ch!.send({ t: 'lobby', names }); };
  $('#lv-host').addEventListener('click', () => { show('lv-setup'); });
  $('#lv-create').addEventListener('click', async () => {
    await ready; if (!bank) return; code = newCode(); host = new HostGame(); ch?.close(); ch = new Channel(sbUrl, sbKey, code); ch.onStatus = status;
    ch.onMsg = m => { if (!host) return; if (m.t === 'join') { if (host.join(m.id, m.name) && host.i < 0) lobby(); else if (host.i >= 0) { ch!.send({ t: 'lobby', names: host.names() }); if (lastStart) ch!.send(lastStart); } }
      if (m.t === 'ans' && host.answer(m.id, m.i, m.pick, m.ms)) { $('#lv-answered').textContent = `${host.answered()} of ${host.players.size} answered`; if (host.answered() >= host.players.size) reveal(); } };
    ch.connect(); $('#lv-code').textContent = code; $('#lv-url').textContent = joinUrl(code).replace(/^https?:\/\//, ''); show('lv-lobby'); lobby();
  });
  $('#lv-start').addEventListener('click', () => { if (!host || !bank) return; const seed = crypto.getRandomValues(new Uint32Array(1))[0]; const cat = $<HTMLSelectElement>('#lv-cat').value, diff = $<HTMLSelectElement>('#lv-diff').value, n = Number($<HTMLSelectElement>('#lv-n').value);
    host.start(bank, seed, cat, diff, n); lastStart = { t: 'start', seed, cat, diff, n }; ch!.send(lastStart); ask(); });
  function ask() {
    if (!host || !host.next()) return finish(); const r = host.rounds[host.i]; ch!.send({ t: 'q', i: host.i }); show('lv-hq');
    $('#lv-qn').textContent = `Question ${host.i + 1} of ${host.rounds.length} · ${bank!.categories[r.q.cat] || r.q.cat}`; $('#lv-qtext').textContent = r.q.q; $('#lv-answered').textContent = `0 of ${host.players.size} answered`;
    $('#lv-qchoices').replaceChildren(...r.order.map((o, k) => { const li = el('li', '', 'lv-c lv-c' + k); li.append(el('span', SHAPES[k], 'lv-shape'), el('span', r.q.choices[o])); return li; }));
    t0 = performance.now(); clearTimeout(timer); timer = window.setTimeout(reveal, ROUND_MS + 1500); cancelAnimationFrame(tick);
    const loop = () => { const f = Math.max(0, 1 - (performance.now() - t0) / ROUND_MS); $('#lv-bar').style.setProperty('--p', String(f)); if (host?.open) tick = requestAnimationFrame(loop); }; loop();
  }
  function reveal() { if (!host || !host.open) return; clearTimeout(timer); const msg = host.close(); ch!.send(msg); const r = host.rounds[host.i];
    show('lv-hr'); $('#lv-ans').textContent = `${SHAPES[r.order.indexOf(r.q.answer)]} ${r.q.choices[r.q.answer]}`; $('#lv-why').textContent = r.q.why;
    $('#lv-board').replaceChildren(...msg.board.map(([n, s], k) => { const li = el('li'); li.append(el('span', `${k + 1}. ${n}`), el('strong', String(s))); return li; }));
    $('#lv-next').textContent = host.i < host.rounds.length - 1 ? 'Next question →' : 'Final results →'; }
  $('#lv-next').addEventListener('click', ask); $('#lv-skip').addEventListener('click', reveal);
  function finish() { if (!host) return; const m = host.end(); ch!.send(m); show('lv-hend'); $('#lv-podium').replaceChildren(...m.board.map(([n, s], k) => { const li = el('li', '', k < 3 ? 'top' : ''); li.append(el('span', `${['🥇', '🥈', '🥉'][k] || k + 1 + '.'} ${n}`), el('strong', String(s))); return li; })); }
  $('#lv-again').addEventListener('click', () => { if (!host) return; host.i = -1; host.players.forEach(p => { p.score = 0; }); show('lv-lobby'); lobby(); });

  // ---------------- player
  let me = ''; try { me = sessionStorage.getItem('cyberhub:live-id') || ''; } catch { /* ignore */ }
  if (!/^[a-f0-9]{12}$/.test(me)) { me = Array.from(crypto.getRandomValues(new Uint8Array(6)), b => b.toString(16).padStart(2, '0')).join(''); try { sessionStorage.setItem('cyberhub:live-id', me); } catch { /* ignore */ } }
  let rounds: Round[] = [], qi = -1, q0 = 0, myName = '', answeredQ = -1, joinTimer = 0, joined = false;
  $('#lv-join-btn').addEventListener('click', () => show('lv-join'));
  const fromHash = location.hash.slice(1).toUpperCase(); if (sbUrl && validCode(fromHash)) { $<HTMLInputElement>('#lv-jcode').value = fromHash; show('lv-join'); }
  $('#lv-jform').addEventListener('submit', async e => {
    e.preventDefault(); const c = $<HTMLInputElement>('#lv-jcode').value.trim().toUpperCase(); myName = cleanName($<HTMLInputElement>('#lv-jname').value);
    if (!validCode(c)) { $('#lv-jmsg').textContent = 'Room codes are 5 letters and numbers, like K7QPX.'; return; } if (!myName) { $('#lv-jmsg').textContent = 'Pick a nickname (letters and numbers).'; return; }
    await ready; ch?.close(); ch = new Channel(sbUrl, sbKey, c); ch.onStatus = status; joined = false;
    ch.onMsg = m => {
      if (m.t === 'lobby') { if (m.names.some(n => n.toLowerCase().startsWith(myName.toLowerCase()))) { joined = true; clearInterval(joinTimer); } if (qi < 0) { show('lv-wait'); $('#lv-wcount').textContent = `${m.names.length} in the room`; } }
      if (m.t === 'kick' && m.id === me) { ch!.close(); show('lv-join'); $('#lv-jmsg').textContent = 'The host removed you from the room.'; }
      if (m.t === 'start' && bank) { rounds = makeRound(bank, m.seed, m.cat, m.diff, m.n); qi = -1; }
      if (m.t === 'q' && rounds[m.i]) { qi = m.i; q0 = performance.now(); const r = rounds[qi]; show('lv-pq'); $('#lv-pqn').textContent = `Question ${qi + 1} of ${rounds.length}`; $('#lv-pqtext').textContent = r.q.q;
        $('#lv-pbtns').replaceChildren(...r.order.map((o, k) => { const b = el('button', '', 'lv-pb lv-c' + k) as HTMLButtonElement; b.type = 'button'; b.append(el('span', SHAPES[k], 'lv-shape'), el('span', r.q.choices[o])); b.addEventListener('click', () => {
          if (answeredQ === qi) return; answeredQ = qi; ch!.send({ t: 'ans', id: me, i: qi, pick: o, ms: Math.round(performance.now() - q0) }); show('lv-locked'); }); return b; })); }
      if (m.t === 'reveal') { show('lv-pr'); const pts = m.got[me]; $('#lv-pres').textContent = pts ? `Correct! +${pts}` : answeredQ === m.i ? 'Not this time' : 'Too slow!'; $('#lv-pres').dataset.ok = pts ? '1' : '0';
        $('#lv-prank').textContent = m.ranks[me] ? `You are #${m.ranks[me]} with ${m.scores[me]} points` : ''; }
      if (m.t === 'end') { show('lv-pend'); $('#lv-pfinal').textContent = m.ranks[me] ? `You finished #${m.ranks[me]} of ${m.total}` : 'Game over'; }
    };
    ch.connect(); show('lv-wait'); $('#lv-wcount').textContent = 'Joining…';
    const announce = () => ch!.send({ t: 'join', id: me, name: myName }); announce(); clearInterval(joinTimer); joinTimer = window.setInterval(() => { if (!joined) announce(); else clearInterval(joinTimer); }, 2000);
  });
}
