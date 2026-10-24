// CyberHub Cyber Duel: head-to-head speed quiz. Three ways to play with no server:
//   face-off  two players on one screen (keyboard or touch), great on a projector
//   bot       one player against a computer opponent
//   challenge play a seeded round, share a link; the friend races your recorded run live
// Questions and choice order come from a seeded generator, so a challenge link replays the
// exact same round. Nothing is uploaded; links carry only the seed, settings, a name and answers.

export type Q = { id: string; cat: string; level: number; q: string; choices: string[]; answer: number; why: string };
export type Bank = { categories: Record<string, string>; questions: Q[] };
export type Round = { q: Q; order: number[] }; // order[displayIndex] = original choice index
export type Run = { pick: number; ms: number }[]; // pick = original choice index, -1 = no answer
export type Challenge = { v: 1; s: number; c: string; d: string; n: string; r: number; a: Run };

export const ROUND_MS = 15000;
export function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function makeRound(bank: Bank, seed: number, cat: string, diff: string, n: number): Round[] {
  const r = rng(seed); const lv = diff === '1' ? [1] : diff === '2' ? [1, 2] : diff === '3' ? [2, 3] : [1, 2, 3];
  let pool = bank.questions.filter(q => (cat === 'all' || q.cat === cat) && lv.includes(q.level));
  if (pool.length < n) pool = bank.questions.filter(q => cat === 'all' || q.cat === cat);
  pool = [...pool].sort((x, y) => x.id < y.id ? -1 : 1);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, n).map(q => { const order = [0, 1, 2, 3]; for (let i = 3; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; } return { q, order }; });
}
export const points = (correct: boolean, ms: number) => correct ? 100 + Math.round(100 * Math.max(0, ROUND_MS - ms) / ROUND_MS) : 0;
export function scoreRun(rounds: Round[], run: Run) { return run.reduce((t, a, i) => t + (rounds[i] ? points(a.pick === rounds[i].q.answer, a.ms) : 0), 0); }

const b64 = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
export const cleanName = (s: string) => (s || '').replace(/[^\p{L}\p{N} ._-]/gu, '').trim().slice(0, 20);
export function encodeChallenge(c: Challenge) { return b64(JSON.stringify([c.v, c.s, c.c, c.d, c.n, c.r, c.a.map(x => [x.pick, x.ms])])); }
export function decodeChallenge(s: string, bank: Bank): Challenge | null {
  try {
    const x = JSON.parse(unb64(s)); if (!Array.isArray(x) || x[0] !== 1) return null;
    const [, seed, cat, diff, name, rounds, ans] = x;
    if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) return null;
    if (cat !== 'all' && !(cat in bank.categories)) return null; if (!['1', '2', '3', 'mix'].includes(diff)) return null;
    if (!Number.isInteger(rounds) || rounds < 3 || rounds > 20 || !Array.isArray(ans) || ans.length !== rounds) return null;
    const a = ans.map((p: unknown) => Array.isArray(p) && Number.isInteger(p[0]) && p[0] >= -1 && p[0] <= 3 && Number.isInteger(p[1]) && p[1] >= 0 && p[1] <= ROUND_MS ? { pick: p[0] as number, ms: p[1] as number } : null);
    if (a.some((v: unknown) => v === null)) return null;
    return { v: 1, s: seed, c: cat, d: diff, n: cleanName(String(name)), r: rounds, a: a as Run };
  } catch { return null; }
}
export const BOTS: Record<string, { name: string; acc: number; min: number; max: number }> = {
  rookie: { name: 'Rookie bot', acc: 0.55, min: 7000, max: 13000 }, analyst: { name: 'Analyst bot', acc: 0.75, min: 4500, max: 10000 }, elite: { name: 'Elite bot', acc: 0.9, min: 2500, max: 7000 },
};
export function botRun(rounds: Round[], level: string, seed: number): Run {
  const b = BOTS[level] || BOTS.analyst; const r = rng(seed ^ 0x9e3779b9);
  return rounds.map(rd => { const ok = r() < b.acc * (rd.q.level === 3 ? 0.9 : 1); const ms = Math.round(b.min + r() * (b.max - b.min)); const wrong = [0, 1, 2, 3].filter(i => i !== rd.q.answer); return { pick: ok ? rd.q.answer : wrong[Math.floor(r() * 3)], ms }; });
}

/* ------------------------------------------------------------ UI */
const root = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('#duel');
if (root) {
  const base = document.body.dataset.base || '';
  const $ = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const el = (tag: string, text = '', cls = '') => { const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const load = <T>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : d; } catch { return d; } };
  const store = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };
  type Stats = { played: number; wins: number; best: number };
  const stats = load<Stats>('cyberhub:duel', { played: 0, wins: 0, best: 0 });
  const showStats = () => { $('#duel-stats').textContent = `${stats.played} duels played · ${stats.wins} won · best score ${stats.best}`; };
  showStats();

  let bank: Bank | null = null;
  const ready = fetch(base + '/assets/duel.json').then(r => r.json()).then((b: Bank) => { bank = b; const sel = $<HTMLSelectElement>('#d-cat'); for (const [k, v] of Object.entries(b.categories)) { const o = el('option', v) as HTMLOptionElement; o.value = k; sel.append(o); } $('#d-start').removeAttribute('disabled'); $('#d-status').textContent = `${b.questions.length} questions ready.`; })
    .catch(() => { $('#d-status').textContent = 'Questions could not load. Refresh to try again.'; });

  // ---- mode tabs
  let mode = 'faceoff';
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-mode]'));
  const setMode = (m: string) => { mode = m; tabs.forEach(t => { const on = t.dataset.mode === m; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; }); root.querySelectorAll<HTMLElement>('[data-for]').forEach(x => { x.hidden = !x.dataset.for!.split(' ').includes(m); }); };
  tabs.forEach((t, i) => { t.addEventListener('click', () => setMode(t.dataset.mode!)); t.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; n.focus(); setMode(n.dataset.mode!); } }); });
  setMode('faceoff');

  // ---- arena state
  type Player = { name: string; score: number; run: Run; locked: boolean; ghost?: Run };
  let rounds: Round[] = [], idx = 0, t0 = 0, timer = 0, tick = 0, players: Player[] = [], seed = 0, cat = 'all', diff = 'mix', incoming: Challenge | null = null, revealing = false;
  const arena = $('#duel-arena'), setup = $('#duel-setup'), result = $('#duel-result');
  const pane = (i: number) => root.querySelector<HTMLElement>(`[data-player="${i}"]`)!;

  function start(fromChallenge?: Challenge) {
    if (!bank) return;
    const n = fromChallenge ? fromChallenge.r : Number($<HTMLSelectElement>('#d-rounds').value) || 10;
    cat = fromChallenge ? fromChallenge.c : $<HTMLSelectElement>('#d-cat').value; diff = fromChallenge ? fromChallenge.d : $<HTMLSelectElement>('#d-diff').value;
    seed = fromChallenge ? fromChallenge.s : crypto.getRandomValues(new Uint32Array(1))[0];
    rounds = makeRound(bank, seed, cat, diff, n); idx = 0;
    const p1 = cleanName($<HTMLInputElement>('#d-p1').value) || 'Player 1', p2 = cleanName($<HTMLInputElement>('#d-p2').value) || 'Player 2';
    if (mode === 'faceoff') players = [{ name: p1, score: 0, run: [], locked: false }, { name: p2, score: 0, run: [], locked: false }];
    else if (mode === 'bot') { const lvl = $<HTMLSelectElement>('#d-bot').value; players = [{ name: p1 === 'Player 1' ? 'You' : p1, score: 0, run: [], locked: false }, { name: BOTS[lvl].name, score: 0, run: [], locked: false, ghost: botRun(rounds, lvl, seed) }]; }
    else if (fromChallenge) players = [{ name: p1 === 'Player 1' ? 'You' : p1, score: 0, run: [], locked: false }, { name: fromChallenge.n || 'Challenger', score: 0, run: [], locked: false, ghost: fromChallenge.a }];
    else players = [{ name: p1 === 'Player 1' ? 'You' : p1, score: 0, run: [], locked: false }];
    root.classList.toggle('solo', players.length === 1); root.classList.toggle('faceoff', mode === 'faceoff');
    players.forEach((p, i) => { const pn = pane(i); pn.hidden = false; pn.querySelector('.dp-name')!.textContent = p.name; pn.querySelector('.dp-score')!.textContent = '0'; pn.classList.toggle('is-ghost', !!p.ghost); });
    if (players.length === 1) pane(1).hidden = true;
    root.querySelectorAll<HTMLElement>('.dp-keys').forEach(k => { k.hidden = mode !== 'faceoff'; });
    setup.hidden = true; result.hidden = true; arena.hidden = false; arena.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    countdown(3);
  }
  function countdown(n: number) {
    const big = $('#duel-q'); $('#duel-cat').textContent = 'Get ready'; big.textContent = String(n); root.querySelectorAll<HTMLElement>('.dp-choices').forEach(c => c.replaceChildren()); $('#duel-why').hidden = true;
    if (n > 0) setTimeout(() => countdown(n - 1), reduce ? 300 : 700); else ask();
  }
  function ask() {
    revealing = false; const rd = rounds[idx]; players.forEach(p => { p.locked = false; });
    $('#duel-cat').textContent = `${idx + 1} / ${rounds.length} · ${bank!.categories[rd.q.cat] || rd.q.cat} · ${['', 'Beginner', 'Student', 'Pro'][rd.q.level]}`;
    $('#duel-q').textContent = rd.q.q; $('#duel-why').hidden = true; $('#duel-next').hidden = true;
    players.forEach((p, i) => {
      const box = pane(i).querySelector<HTMLElement>('.dp-choices')!; box.replaceChildren(); pane(i).querySelector('.dp-state')!.textContent = p.ghost ? 'Thinking…' : '';
      if (p.ghost) return;
      rd.order.forEach((orig, k) => { const b = el('button', '', 'dp-choice') as HTMLButtonElement; b.type = 'button'; b.dataset.k = String(k); const key = mode === 'faceoff' ? (i === 0 ? 'ASDF' : 'HJKL')[k] : String(k + 1); b.append(el('span', key, 'dp-key'), el('span', rd.q.choices[orig])); b.addEventListener('click', () => answer(i, k)); box.append(b); });
    });
    t0 = performance.now(); clearTimeout(timer); timer = window.setTimeout(reveal, ROUND_MS);
    cancelAnimationFrame(tick); const bar = $('#duel-bar'); const loop = () => { const f = Math.max(0, 1 - (performance.now() - t0) / ROUND_MS); bar.style.setProperty('--p', String(f)); ghosts(); if (!revealing) tick = requestAnimationFrame(loop); }; loop();
    (pane(0).querySelector('.dp-choice') as HTMLElement | null)?.focus({ preventScroll: true });
  }
  function ghosts() { const ms = performance.now() - t0; players.forEach((p, i) => { if (p.ghost && !p.locked && p.ghost[idx] && p.ghost[idx].pick !== -1 && ms >= p.ghost[idx].ms) { p.locked = true; p.run[idx] = p.ghost[idx]; pane(i).querySelector('.dp-state')!.textContent = 'Answered'; pane(i).classList.add('pulse'); setTimeout(() => pane(i).classList.remove('pulse'), 400); check(); } }); }
  function answer(i: number, k: number) {
    const p = players[i]; if (!p || p.locked || p.ghost || revealing) return; p.locked = true;
    const rd = rounds[idx]; const ms = Math.round(Math.min(ROUND_MS, performance.now() - t0)); p.run[idx] = { pick: rd.order[k], ms };
    pane(i).querySelectorAll<HTMLButtonElement>('.dp-choice').forEach(b => { b.disabled = true; if (b.dataset.k === String(k)) b.classList.add('picked'); });
    pane(i).querySelector('.dp-state')!.textContent = mode === 'faceoff' ? 'Locked in' : `Locked in at ${(ms / 1000).toFixed(1)}s`;
    check();
  }
  function check() { if (players.every(p => p.locked || (p.ghost && p.ghost[idx]?.pick === -1))) reveal(); }
  function reveal() {
    if (revealing) return; revealing = true; clearTimeout(timer); const rd = rounds[idx];
    players.forEach((p, i) => {
      const a = p.run[idx] || (p.ghost ? p.ghost[idx] : undefined) || { pick: -1, ms: ROUND_MS }; p.run[idx] = a; const ok = a.pick === rd.q.answer; const pts = points(ok, a.ms); p.score += pts;
      const pn = pane(i); pn.querySelector('.dp-score')!.textContent = String(p.score);
      pn.querySelector('.dp-state')!.textContent = a.pick === -1 ? 'No answer · +0' : ok ? `Correct · +${pts}` : 'Wrong · +0';
      pn.classList.remove('right', 'wrong'); void pn.offsetWidth; pn.classList.add(ok ? 'right' : 'wrong');
      pn.querySelectorAll<HTMLButtonElement>('.dp-choice').forEach(b => { b.disabled = true; if (rd.order[Number(b.dataset.k)] === rd.q.answer) b.classList.add('correct'); });
    });
    const why = $('#duel-why'); why.replaceChildren(el('b', 'Answer: ' + rd.q.choices[rd.q.answer] + '. '), document.createTextNode(rd.q.why)); why.hidden = false;
    const nx = $('#duel-next'); nx.hidden = false; nx.textContent = idx < rounds.length - 1 ? 'Next question (Space)' : 'See results'; nx.focus({ preventScroll: true });
  }
  function next() { players.forEach((_, i) => pane(i).classList.remove('right', 'wrong')); if (idx < rounds.length - 1) { idx++; ask(); } else finish(); }
  function finish() {
    arena.hidden = true; result.hidden = false; const sorted = [...players].sort((x, y) => y.score - x.score);
    const head = $('#duel-winner'); const tie = players.length > 1 && sorted[0].score === sorted[1].score;
    head.textContent = players.length === 1 ? `You scored ${players[0].score}` : tie ? `It's a tie at ${sorted[0].score}!` : sorted[0].name === "You" ? "You win!" : `${sorted[0].name} wins!`;
    const board = $('#duel-board'); board.replaceChildren(...players.map(p => { const li = el('li'); li.append(el('strong', p.name), el('span', `${p.score} points · ${p.run.filter((a, i) => a && a.pick === rounds[i].q.answer).length}/${rounds.length} correct`)); return li; }));
    const review = $('#duel-review'); review.replaceChildren(...rounds.map((rd, i) => { const li = el('li'); const mine = players[0].run[i]; li.className = mine && mine.pick === rd.q.answer ? 'ok' : 'no'; li.append(el('span', rd.q.q, 'rq'), el('span', 'Answer: ' + rd.q.choices[rd.q.answer], 'ra')); return li; }));
    // stats and badge
    stats.played++; if (players.length > 1 && !tie && sorted[0] === players[0] && mode !== 'faceoff') stats.wins++; if (mode === 'faceoff' && !tie) stats.wins++; stats.best = Math.max(stats.best, players[0].score); store('cyberhub:duel', stats); showStats();
    // challenge links
    const share = $('#duel-share'); share.hidden = mode === 'faceoff';
    if (mode !== 'faceoff') {
      const c: Challenge = { v: 1, s: seed, c: cat, d: diff, n: players[0].name === 'You' ? '' : players[0].name, r: rounds.length, a: players[0].run.map(a => a || { pick: -1, ms: ROUND_MS }) };
      const url = location.origin + location.pathname + '#c=' + encodeChallenge(c); $<HTMLInputElement>('#duel-link').value = url;
      $('#duel-share-msg').textContent = incoming ? `Send this back so ${incoming.n || 'they'} can try to beat your ${players[0].score}.` : `Anyone who opens this link plays the same ${rounds.length} questions against your run, live.`;
    }
    result.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); $('#duel-again').focus({ preventScroll: true });
  }

  // ---- inputs
  $('#d-start').addEventListener('click', () => { incoming = null; start(); });
  $('#duel-next').addEventListener('click', next);
  $('#duel-again').addEventListener('click', () => { result.hidden = true; setup.hidden = false; history.replaceState(null, '', location.pathname); setup.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); });
  $('#duel-quit').addEventListener('click', () => { clearTimeout(timer); cancelAnimationFrame(tick); revealing = true; arena.hidden = true; setup.hidden = false; });
  $('#duel-copy').addEventListener('click', async () => { const b = $('#duel-copy'); try { await navigator.clipboard.writeText($<HTMLInputElement>('#duel-link').value); b.textContent = 'Copied'; } catch { $<HTMLInputElement>('#duel-link').select(); b.textContent = 'Press Ctrl+C'; } setTimeout(() => { b.textContent = 'Copy link'; }, 1600); });
  $('#duel-native').addEventListener('click', async () => { const url = $<HTMLInputElement>('#duel-link').value; try { if (navigator.share) await navigator.share({ title: 'Cyber Duel', text: `I scored ${players[0]?.score ?? 0} on CyberHub Cyber Duel. Beat me:`, url }); else await navigator.clipboard.writeText(url); } catch { /* cancelled */ } });
  document.addEventListener('keydown', e => {
    if (arena.hidden || e.ctrlKey || e.metaKey || e.altKey) return; const tgt = e.target as HTMLElement; if (tgt.tagName === 'INPUT' || tgt.tagName === 'SELECT') return;
    if (revealing && (e.key === ' ' || e.key === 'Enter') && !$('#duel-next').hidden) { e.preventDefault(); next(); return; }
    const k = e.key.toUpperCase();
    if (mode === 'faceoff') { const a = 'ASDF'.indexOf(k), b = 'HJKL'.indexOf(k); if (a >= 0) { e.preventDefault(); answer(0, a); } else if (b >= 0) { e.preventDefault(); answer(1, b); } }
    else { const n = '1234'.indexOf(k); if (n >= 0) { e.preventDefault(); answer(0, n); } }
  });

  // ---- incoming challenge
  const m = /#c=([\w-]+)/.exec(location.hash);
  if (m) ready.then(() => {
    const c = bank ? decodeChallenge(m[1], bank) : null; const box = $('#duel-incoming');
    if (!c) { box.hidden = false; box.querySelector('p')!.textContent = 'That challenge link is not valid. Start a new duel below.'; box.querySelector('button')!.hidden = true; return; }
    incoming = c; setMode('challenge'); const total = scoreRun(makeRound(bank!, c.s, c.c, c.d, c.r), c.a);
    box.hidden = false; box.querySelector('strong')!.textContent = `${c.n || 'A friend'} challenged you`;
    box.querySelector('p')!.textContent = `${c.r} questions · ${c.c === 'all' ? 'all topics' : bank!.categories[c.c]} · their score: ${total}. You will race their recorded answers live.`;
    box.querySelector('button')!.addEventListener('click', () => { box.hidden = true; mode = 'challenge'; start(c); });
  });
}
