// CyberHub Cyber Duel: Live rooms. A host screen (projector) and players on phones, joined by
// a 5-letter code. Messages travel over Supabase Realtime broadcast; nothing is written to a database.
// Two public channels per room keep traffic inside the free plan's message limit (every delivery
// counts, and going over disconnects clients): the host broadcasts to everyone on `cyberhub-duel-CODE`,
// and players send joins and answers to `cyberhub-duel-CODE-up` over the REST broadcast endpoint,
// which only the host listens to, so one phone's answer is not copied to every other phone. Players send only a nickname and their answers.
// The host is the source of truth for scoring. No innerHTML; text only.

import { makeRound, points, cleanName, roundMs, ROUND_MS, type Bank, type Round } from './duel.js';
import { qrMatrix, qrPath } from './qr.js';

/* ------------------------------------------------------------ protocol */
export type Msg =
  | { t: 'join'; id: string; name: string; p?: 1 }
  | { t: 'ans'; id: string; i: number; pick: number; ms: number }
  | { t: 'lobby'; names: string[] }
  | { t: 'start'; seed: number; cat: string; diff: string; n: number }
  | { t: 'q'; i: number; seed: number; cat: string; diff: string; n: number; left: number }
  | { t: 'sync'; id: string; phase: 'lobby' | 'q' | 'between' | 'end'; names: string[]; q?: Msg & { t: 'q' }; rank?: number; score?: number }
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
    const a = this.answers.get(i)!; if (a.has(id)) return false; const lim = this.rounds[i] ? roundMs(this.rounds[i]) : ROUND_MS; a.set(id, { pick, ms: Math.max(0, Math.min(lim, Math.round(Number(ms) || lim))) }); return true;
  }
  answered() { return this.answers.get(this.i)?.size || 0; }
  close(): Msg & { t: 'reveal' } {
    this.open = false; const r = this.rounds[this.i]; const got: Record<string, number> = {};
    for (const [id, a] of this.answers.get(this.i) || []) { const p = this.players.get(id); if (!p) continue; const pts = points(a.pick === r.q.answer, a.ms * ROUND_MS / roundMs(r)); p.score += pts; got[id] = pts; }
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
      if (m.event === 'broadcast' && m.topic === this.topic && m.payload?.event === 'duel') { const p = m.payload.payload; if (p && typeof p.t === 'string') try { this.onMsg(p as Msg); } catch { /* ignore malformed room messages */ } } };
    ws.onclose = () => { if (this.ws !== ws) return; clearInterval(this.hb); if (this.closed) return; this.onStatus('offline'); const wait = Math.min(10000, 500 * 2 ** this.tries++); setTimeout(() => { if (!this.closed) this.connect(); }, wait); };
    ws.onerror = () => { try { ws.close(); } catch { /* ignore */ } };
  }
  private raw(o: unknown) { const s = JSON.stringify(o); if (this.ws && this.ws.readyState === 1) this.ws.send(s); }
  send(m: Msg) { const s = JSON.stringify({ topic: this.topic, event: 'broadcast', payload: { type: 'broadcast', event: 'duel', payload: m }, ref: String(++this.ref), join_ref: this.joinRef });
    if (this.ws && this.ws.readyState === 1 && this.joinRef) this.ws.send(s); else this.queue.push(s); }
  /** Reconnect now if the socket dropped (a phone that slept or switched apps). */
  wake() { if (this.closed) return; if (!this.ws || this.ws.readyState > 1) { try { this.ws?.close(); } catch { /* ignore */ } this.tries = 0; this.connect(); } }
  close() { this.closed = true; clearInterval(this.hb); try { this.ws?.close(); } catch { /* ignore */ } }
}

/** Send one message to a room's host-only channel through the Realtime REST broadcast endpoint. */
export async function postUp(url: string, key: string, room: string, m: Msg, f: typeof fetch = fetch): Promise<boolean> {
  const body = JSON.stringify({ messages: [{ topic: `cyberhub-duel-${room}-up`, event: 'duel', payload: m, private: false }] });
  for (let k = 0; k < 3; k++) {
    const r = await f(`${url}/realtime/v1/api/broadcast`, { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => null);
    if (r && r.ok) return true; await new Promise(res => setTimeout(res, 400 * (k + 1)));
  }
  return false;
}

/* ------------------------------------------------------------ UI */
const app = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('#live');
if (app) {
  const base = document.body.dataset.base || ''; const sbUrl = document.body.dataset.sbUrl || '', sbKey = document.body.dataset.sbKey || '';
  const $ = <T extends HTMLElement = HTMLElement>(s: string) => app.querySelector<T>(s)!;
  const el = (tag: string, text = '', cls = '') => { const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; };
  const show = (id: string) => { app.querySelectorAll<HTMLElement>('.lv-screen').forEach(s => { s.hidden = s.id !== id; }); const qb = app.querySelector<HTMLElement>('#lv-qrbtn'); if (qb) qb.hidden = !app.dataset.room || !['lv-hq', 'lv-hr', 'lv-hend'].includes(id); if (!['lv-off', 'lv-choose'].includes(id)) app.scrollIntoView({ block: 'start' }); };
  const SHAPES = ['▲', '◆', '●', '■'];
  let bank: Bank | null = null; const ready = fetch(base + '/assets/duel.json').then(r => r.json()).then((b: Bank) => { bank = b; const sel = $<HTMLSelectElement>('#lv-cat'); for (const [k, v] of Object.entries(b.categories)) { const o = el('option', v) as HTMLOptionElement; o.value = k; sel.append(o); }
    if (b.scenarios?.length) { const g = document.createElement('optgroup'); g.label = 'Incident tabletop (teams, 30 s per decision)';
      for (const sc of b.scenarios) { b.categories['tt:' + sc.id] = 'Tabletop: ' + sc.title; const o = el('option', sc.title) as HTMLOptionElement; o.value = 'tt:' + sc.id; g.append(o); } sel.append(g); }
    const sync = () => { const tt = sel.value.startsWith('tt:'); app.querySelectorAll<HTMLElement>('.lv-qonly').forEach(x => { x.hidden = tt; }); $('#lv-ttnote').hidden = !tt; }; sel.addEventListener('change', sync); sync(); });
  const status = (s: string) => { app.querySelectorAll<HTMLElement>('.lv-status').forEach(x => { x.textContent = s === 'live' ? '● Connected' : s === 'connecting' ? '○ Connecting…' : '○ Reconnecting…'; x.dataset.s = s; }); };
  if (!sbUrl || !sbKey) { show('lv-off'); } else show('lv-choose');
  const joinUrl = (code: string) => `${location.origin}${location.pathname}#${code}`;
  const drawQr = (svg: SVGSVGElement, text: string) => { const m = qrMatrix(text); const n = m.length + 8; const NS = 'http://www.w3.org/2000/svg';
    svg.setAttribute('viewBox', `0 0 ${n} ${n}`); svg.setAttribute('shape-rendering', 'crispEdges');
    const bg = document.createElementNS(NS, 'rect'); bg.setAttribute('width', String(n)); bg.setAttribute('height', String(n)); bg.setAttribute('fill', '#fff');
    const path = document.createElementNS(NS, 'path'); path.setAttribute('d', qrPath(m)); path.setAttribute('fill', '#000'); svg.replaceChildren(bg, path); };
  const qrBtn = $<HTMLButtonElement>('#lv-qrbtn'), dlg = app.querySelector<HTMLDialogElement>('#lv-qrdlg')!;
  qrBtn.addEventListener('click', () => { if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', ''); });

  // ---------------- host
  let host: HostGame | null = null, ch: Channel | null = null, up: Channel | null = null, code = '', timer = 0, tick = 0, t0 = 0; let lastStart: (Msg & { t: 'start' }) | null = null, qStart = 0, ended = false;
  const lobby = (send = true) => { const names = host!.names(); $('#lv-count').textContent = `${names.length} player${names.length === 1 ? '' : 's'}`;
    $('#lv-players').replaceChildren(...[...host!.players.entries()].map(([id, p]) => { const b = el('button', p.name, 'lv-chip') as HTMLButtonElement; b.type = 'button'; b.title = 'Remove ' + p.name; b.addEventListener('click', () => { host!.kick(id); ch!.send({ t: 'kick', id }); lobby(); }); return b; }));
    ($('#lv-start') as HTMLButtonElement).disabled = names.length < 1; if (send) sendLobby(); };
  let lobbyT = 0, lobbyLast = 0; const sendLobby = () => { if (lobbyT) return; const wait = Math.max(0, lobbyLast + 1500 - Date.now()); lobbyT = window.setTimeout(() => { lobbyT = 0; lobbyLast = Date.now(); if (host && ch) ch.send({ t: 'lobby', names: host.names() }); }, wait); };
  const qMsg = (): Msg & { t: 'q' } => { const r = host!.rounds[host!.i]; return { t: 'q', i: host!.i, seed: lastStart!.seed, cat: lastStart!.cat, diff: lastStart!.diff, n: lastStart!.n, left: Math.max(0, Math.round(roundMs(r) - (performance.now() - qStart))) }; };
  // Officer gate: hosting needs a signed-in account on the officers list (checked by is_officer()).
  // This is a convenience gate in the page, not a hard security boundary: rooms use public channels.
  const officerOnly = app.dataset.hosting !== 'anyone';
  const session = async (): Promise<{ access_token: string; email: string } | null> => {
    let s: any = null; try { s = JSON.parse(localStorage.getItem('cyberhub:session') || 'null'); } catch { return null; }
    if (!s || !s.access_token) return null;
    if (s.expires_at - Date.now() < 60000 && s.refresh_token) {
      const r = await fetch(`${sbUrl}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: sbKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: s.refresh_token }) }).catch(() => null);
      if (!r || !r.ok) return null; const d = await r.json(); s = { ...s, access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() + (d.expires_in || 3600) * 1000 };
      try { localStorage.setItem('cyberhub:session', JSON.stringify(s)); } catch { /* ignore */ }
    }
    return { access_token: s.access_token, email: s.user?.email || 'your account' };
  };
  const checkOfficer = async () => {
    const msg = $('#lv-omsg'); const s = await session();
    if (!s) { msg.textContent = 'Sign in with your officer email to host a room. Anyone can join a room without an account.'; show('lv-officer'); return; }
    msg.textContent = 'Checking…';
    const r = await fetch(`${sbUrl}/rest/v1/rpc/is_officer`, { method: 'POST', headers: { apikey: sbKey, Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json' }, body: '{}' }).catch(() => null);
    if (r && r.ok && (await r.json()) === true) { show('lv-setup'); return; }
    msg.textContent = !r ? 'Could not reach the server. Check your connection and try again.' : r.status === 404 ? 'The officer list is not set up yet: run supabase/schema.sql in the Supabase SQL editor.' : `You are signed in as ${s.email}, which is not on the officer list. Ask a club officer to add it.`;
    show('lv-officer');
  };
  $('#lv-host').addEventListener('click', () => { if (officerOnly) checkOfficer(); else show('lv-setup'); });
  $('#lv-ocheck').addEventListener('click', () => { checkOfficer(); });
  $('#lv-oback').addEventListener('click', () => show('lv-choose'));
  $('#lv-create').addEventListener('click', async () => {
    await ready; if (!bank) return; code = newCode(); host = new HostGame(); ch?.close(); up?.close(); ch = new Channel(sbUrl, sbKey, code); up = new Channel(sbUrl, sbKey, code + '-up');
    const both: Record<string, string> = { out: 'connecting', in: 'connecting' }; const mix = () => status(both.out === 'live' && both.in === 'live' ? 'live' : Object.values(both).includes('offline') ? 'offline' : 'connecting');
    ch.onStatus = x => { both.out = x; mix(); }; up.onStatus = x => { both.in = x; mix(); };
    up.onMsg = m => { if (!host) return;
      if (m.t === 'join') { const known = host.players.has(m.id); if (!host.join(m.id, m.name)) return;
        // New players in the lobby update everyone's count. Anyone else (a late joiner, or a phone that
        // reconnected after sleeping) gets a private catch-up: the current question, or what to wait for.
        if (host.i < 0 && !ended) { if (!known) lobby(); else if (!m.p) ch!.send({ t: 'sync', id: m.id, phase: 'lobby', names: host.names() }); return; }
        if (!known) lobby(false);
        const s = host.standings(); const base = { t: 'sync' as const, id: m.id, names: host.names(), rank: s.ranks[m.id], score: s.scores[m.id] };
        ch!.send(ended ? { ...base, phase: 'end' } : host.open ? { ...base, phase: 'q', q: qMsg() } : { ...base, phase: 'between' }); }
      if (m.t === 'ans' && host.answer(m.id, m.i, m.pick, m.ms)) { $('#lv-answered').textContent = `${host.answered()} of ${host.players.size} answered`; if (host.answered() >= host.players.size) reveal(); } };
    ch.connect(); up.connect(); const url = joinUrl(code), shortUrl = url.replace(/^https?:\/\//, '');
    $('#lv-code').textContent = code; $('#lv-url').textContent = shortUrl; $('#lv-code2').textContent = code; $('#lv-url2').textContent = shortUrl;
    try { drawQr(app.querySelector<SVGSVGElement>('#lv-qr')!, url); drawQr(app.querySelector<SVGSVGElement>('#lv-qr2')!, url); } catch { app.querySelectorAll<SVGSVGElement>('.lv-qr').forEach(q => { q.style.display = 'none'; }); }
    app.dataset.room = code; show('lv-lobby'); lobby();
  });
  $('#lv-start').addEventListener('click', () => { if (!host || !bank) return; const seed = crypto.getRandomValues(new Uint32Array(1))[0]; const cat = $<HTMLSelectElement>('#lv-cat').value, diff = $<HTMLSelectElement>('#lv-diff').value, n = Number($<HTMLSelectElement>('#lv-n').value);
    host.start(bank, seed, cat, diff, n); ended = false; lastStart = { t: 'start', seed, cat, diff, n }; ask(); });
  function ask() {
    if (!host || !host.next()) return finish(); const r = host.rounds[host.i]; qStart = performance.now(); ch!.send(qMsg()); show('lv-hq');
    $('#lv-qn').textContent = `Question ${host.i + 1} of ${host.rounds.length} · ${bank!.categories[r.q.cat] || r.q.cat}`; $('#lv-qtext').textContent = r.q.q; $('#lv-answered').textContent = `0 of ${host.players.size} answered`;
    $('#lv-qchoices').replaceChildren(...r.order.map((o, k) => { const li = el('li', '', 'lv-c lv-c' + k); li.append(el('span', SHAPES[k], 'lv-shape'), el('span', r.q.choices[o])); return li; }));
    t0 = performance.now(); clearTimeout(timer); const lim = roundMs(r); timer = window.setTimeout(reveal, lim + 1500); cancelAnimationFrame(tick);
    const loop = () => { const f = Math.max(0, 1 - (performance.now() - t0) / lim); $('#lv-bar').style.setProperty('--p', String(f)); if (host?.open) tick = requestAnimationFrame(loop); }; loop();
  }
  function reveal() { if (!host || !host.open) return; clearTimeout(timer); const msg = host.close(); ch!.send(msg); const r = host.rounds[host.i];
    show('lv-hr'); $('#lv-ans').textContent = `${SHAPES[r.order.indexOf(r.q.answer)]} ${r.q.choices[r.q.answer]}`; $('#lv-why').textContent = r.q.why;
    $('#lv-board').replaceChildren(...msg.board.map(([n, s], k) => { const li = el('li'); li.append(el('span', `${k + 1}. ${n}`), el('strong', String(s))); return li; }));
    $('#lv-next').textContent = host.i < host.rounds.length - 1 ? 'Next question →' : 'Final results →'; }
  $('#lv-next').addEventListener('click', ask); $('#lv-skip').addEventListener('click', reveal);
  function finish() { if (!host) return; ended = true; const m = host.end(); ch!.send(m); show('lv-hend'); $('#lv-podium').replaceChildren(...m.board.map(([n, s], k) => { const li = el('li', '', k < 3 ? 'top' : ''); li.append(el('span', `${['🥇', '🥈', '🥉'][k] || k + 1 + '.'} ${n}`), el('strong', String(s))); return li; })); }
  $('#lv-again').addEventListener('click', () => { if (!host) return; ended = false; host.i = -1; host.players.forEach(p => { p.score = 0; }); show('lv-lobby'); lobby(); });

  // ---------------- player
  let me = ''; try { me = sessionStorage.getItem('cyberhub:live-id') || ''; } catch { /* ignore */ }
  if (!/^[a-f0-9]{12}$/.test(me)) { me = Array.from(crypto.getRandomValues(new Uint8Array(6)), b => b.toString(16).padStart(2, '0')).join(''); try { sessionStorage.setItem('cyberhub:live-id', me); } catch { /* ignore */ } }
  let rounds: Round[] = [], gameKey = '', qi = -1, q0 = 0, qLim = ROUND_MS, myName = '', answeredQ = -1, joinTimer = 0, joined = false, pingTimer = 0;
  const setGame = (seed: number, cat: string, diff: string, n: number) => { const k = `${seed}|${cat}|${diff}|${n}`; if (k !== gameKey && bank) { rounds = makeRound(bank, seed, cat, diff, n); gameKey = k; answeredQ = -1; } };
  const waiting = (count: string) => { $('#lv-wtitle').textContent = joined ? 'You are in!' : 'Joining…'; $('#lv-wcount').textContent = count; show('lv-wait'); };
  const showQ = (m: Msg & { t: 'q' }) => {
    setGame(m.seed, m.cat, m.diff, m.n); const r = rounds[m.i]; if (!r) return;
    joined = true; clearInterval(joinTimer);
    if (m.i === qi && answeredQ === qi) { show('lv-locked'); return; }
    if (m.i === qi && !app.querySelector<HTMLElement>('#lv-pq')!.hidden) return;
    qi = m.i; qLim = roundMs(r); q0 = performance.now() - Math.max(0, qLim - (Number(m.left) || qLim)); show('lv-pq'); $('#lv-pqn').textContent = `Question ${qi + 1} of ${rounds.length}`; $('#lv-pqtext').textContent = r.q.q;
    $('#lv-pbtns').replaceChildren(...r.order.map((o, k) => { const b = el('button', '', 'lv-pb lv-c' + k) as HTMLButtonElement; b.type = 'button'; b.append(el('span', SHAPES[k], 'lv-shape'), el('span', r.q.choices[o])); b.addEventListener('click', () => {
      if (answeredQ === qi) return; answeredQ = qi; const ai = qi; show('lv-locked'); toHost({ t: 'ans', id: me, i: ai, pick: o, ms: Math.min(qLim, Math.round(performance.now() - q0)) }).then(ok => { if (!ok && answeredQ === ai) { answeredQ = -1; show('lv-pq'); $('#lv-pqn').textContent = 'Your answer did not send. Check your connection and tap again.'; } }); }); return b; }));
  };
  const standing = (rank?: number, score?: number) => rank ? `You are #${rank} with ${score || 0} points` : '';
  $('#lv-join-btn').addEventListener('click', () => show('lv-join'));
  const fromHash = location.hash.slice(1).toUpperCase(); if (sbUrl && validCode(fromHash)) { $<HTMLInputElement>('#lv-jcode').value = fromHash; show('lv-join'); }
  // A phone that slept or switched apps drops its connection: reconnect at once and ask the host to catch us up.
  let room = ''; const toHost = (m: Msg) => postUp(sbUrl, sbKey, room, m);
  const hello = (ping = false) => { if (room && myName) toHost(ping ? { t: 'join', id: me, name: myName, p: 1 } : { t: 'join', id: me, name: myName }); };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && ch && myName) { ch.wake(); hello(); } });
  addEventListener('online', () => { if (ch && myName) { ch.wake(); hello(); } });
  addEventListener('pageshow', e => { if ((e as PageTransitionEvent).persisted && ch && myName) { ch.wake(); hello(); } });
  $('#lv-jform').addEventListener('submit', async e => {
    e.preventDefault(); const c = $<HTMLInputElement>('#lv-jcode').value.trim().toUpperCase(); myName = cleanName($<HTMLInputElement>('#lv-jname').value);
    if (!validCode(c)) { $('#lv-jmsg').textContent = 'Room codes are 5 letters and numbers, like K7QPX.'; return; } if (!myName) { $('#lv-jmsg').textContent = 'Pick a nickname (letters and numbers).'; return; }
    $('#lv-jmsg').textContent = ''; await ready; ch?.close(); room = c; ch = new Channel(sbUrl, sbKey, c); joined = false; qi = -1; gameKey = ''; rounds = [];
    ch.onStatus = st => { status(st); if (st === 'live') hello(); }; // announce once listening, so the host's reply is not missed
    ch.onMsg = m => {
      if (m.t === 'lobby') { if (m.names.some(n => n.toLowerCase().startsWith(myName.toLowerCase()))) { joined = true; clearInterval(joinTimer); } if (qi < 0) waiting(`${m.names.length} in the room`); }
      if (m.t === 'kick' && m.id === me) { ch!.close(); clearInterval(pingTimer); myName = ''; show('lv-join'); $('#lv-jmsg').textContent = 'The host removed you from the room.'; }
      if (m.t === 'start') { setGame(m.seed, m.cat, m.diff, m.n); qi = -1; }
      if (m.t === 'q') showQ(m);
      if (m.t === 'sync' && m.id === me) { joined = true; clearInterval(joinTimer);
        if (m.phase === 'q' && m.q) showQ(m.q);
        else if (m.phase === 'lobby') waiting(`${m.names.length} in the room`);
        else if (m.phase === 'between' && app.querySelector<HTMLElement>('#lv-pr')!.hidden) { show('lv-pr'); $('#lv-pres').textContent = 'Get ready for the next question'; $('#lv-pres').dataset.ok = ''; $('#lv-prank').textContent = standing(m.rank, m.score); }
        else if (m.phase === 'end') { show('lv-pend'); $('#lv-pfinal').textContent = m.rank ? `You finished #${m.rank} of ${m.names.length}` : 'Game over'; } }
      if (m.t === 'reveal') { show('lv-pr'); const pts = m.got[me]; $('#lv-pres').textContent = pts ? `Correct! +${pts}` : answeredQ === m.i ? 'Not this time' : 'Too slow!'; $('#lv-pres').dataset.ok = pts ? '1' : '0';
        $('#lv-prank').textContent = standing(m.ranks[me], m.scores[me]); }
      if (m.t === 'end') { show('lv-pend'); $('#lv-pfinal').textContent = m.ranks[me] ? `You finished #${m.ranks[me]} of ${m.total}` : 'Game over'; }
    };
    ch.connect(); waiting('Connecting to the room…');
    clearInterval(joinTimer); joinTimer = window.setInterval(() => { if (!joined) hello(); else clearInterval(joinTimer); }, 3000);
    // While waiting between screens, check in now and then so a missed message never strands the phone.
    clearInterval(pingTimer); pingTimer = window.setInterval(() => { if (joined && document.visibilityState === 'visible' && !app.querySelector<HTMLElement>('#lv-wait')!.hidden) hello(true); }, 8000);
  });
}
