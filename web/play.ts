// CyberHub play layer: Daily puzzle, Security+ readiness check, role match.
// Progressive enhancement only. No innerHTML; all text goes through textContent.
const q = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const qa = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));
const base = document.body.dataset.base || '';
const pageUrl = (path: string) => location.origin + base + path;
const load = <T>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : d; } catch { return d; } };
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };
const el = (tag: string, text = '', cls = '') => { const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; };
const shuffle = <T>(a: T[]) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

function flash(btn: HTMLElement | null, msg: string) {
  if (!btn) return; const old = btn.dataset.label || btn.textContent || ''; btn.dataset.label = old; btn.textContent = msg;
  setTimeout(() => { btn.textContent = old; }, 1600);
}
async function copy(text: string, btn: HTMLElement | null) {
  try { await navigator.clipboard.writeText(text); flash(btn, 'Copied'); } catch { flash(btn, 'Select the text below'); }
}
async function share(title: string, text: string, url: string, btn: HTMLElement | null) {
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
  if (nav.share && matchMedia('(pointer: coarse)').matches) { try { await nav.share({ title, text, url }); return; } catch { /* cancelled */ } }
  await copy(`${text}\n${url}`, btn);
}

/* ------------------------------------------------------------------ Daily */
type Fam = { id: string; label: string; hint: string; what: string; defend: string; links: { title: string; path: string }[] };
type Puz = { id: string; vendor: string; product: string; title: string; added: string; due: string; cvss: number | null; epss: number | null; family: string };
type DayState = { day: number; id: string; guesses: string[]; done: boolean; won: boolean };
type Stats = { played: number; wins: number; streak: number; best: number; lastWin: number; lastDay: number; dist: number[]; fams: string[] };

const daily = q('#daily');
if (daily) (async () => {
  let data: { start: string; families: Fam[]; puzzles: Puz[] };
  try { data = await (await fetch(base + '/assets/daily.json', { cache: 'no-cache' })).json(); } catch { q('#d-q')!.textContent = 'Today\'s puzzle could not load. Try again in a moment.'; return; }
  if (!data.puzzles.length) { q('#d-q')!.textContent = 'No puzzle data yet.'; return; }
  const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const [sy, sm, sd] = data.start.split('-').map(Number);
  const day = Math.max(1, Math.round((midnight(new Date()) - new Date(sy, sm - 1, sd).getTime()) / 864e5) + 1);
  const pool = data.puzzles.slice().sort((a, b) => a.id.localeCompare(b.id));
  const hash = (s: string) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  let st = load<DayState | null>('cyberhub:daily:today', null);
  if (!st || st.day !== day || !pool.some(p => p.id === st!.id)) st = { day, id: pool[hash('cyberhub-daily-' + day) % pool.length].id, guesses: [], done: false, won: false };
  const P = pool.find(p => p.id === st!.id)!;
  const F = data.families.find(f => f.id === P.family)!;
  const stats = load<Stats>('cyberhub:daily:stats', { played: 0, wins: 0, streak: 0, best: 0, lastWin: 0, lastDay: 0, dist: [0, 0, 0, 0], fams: [] });

  q('#d-num')!.textContent = '#' + day;
  q('#d-date')!.textContent = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  q('#d-vendor')!.textContent = P.vendor || 'Not reported';
  q('#d-product')!.textContent = P.product || 'Not reported';
  q('#d-added')!.textContent = P.added || 'Not reported';
  q('#d-due')!.textContent = P.due ? `${P.due} (${Math.max(0, Math.round((Date.parse(P.due) - Date.parse(P.added)) / 864e5))} days to patch)` : 'Not set';
  if (P.cvss == null) q('#d-cvss')!.parentElement!.hidden = true;
  if (P.epss == null) q('#d-epss')!.parentElement!.hidden = true;
  q('#d-cvss')!.textContent = P.cvss == null ? 'Not scored' : `${P.cvss.toFixed(1)} / 10 ${P.cvss >= 9 ? '· Critical' : P.cvss >= 7 ? '· High' : P.cvss >= 4 ? '· Medium' : '· Low'}`;
  q('#d-epss')!.textContent = P.epss == null ? 'Not reported' : `${(P.epss * 100).toFixed(P.epss < .01 ? 2 : 1)}% in 30 days (EPSS)`;
  qa('[data-fig]').forEach(f => { f.hidden = f.dataset.fig !== P.family; });
  const fig = q('#d-fig')!, hint = q('#d-hint')!, opts = qa<HTMLButtonElement>('#d-opts .opt');

  const save2 = () => save('cyberhub:daily:today', st);
  function stage() {
    const misses = st!.guesses.filter(g => g !== P.family).length;
    fig.className = 'daily-fig ' + (st!.done || misses >= 2 ? 'blur-0' : misses === 1 ? 'blur-1' : 'blur-3');
    q('#d-fignote')!.textContent = st!.done || misses >= 2 ? 'Clue fully revealed' : 'Clue sharpens with each miss';
    if (misses >= 2 || st!.done) { hint.hidden = false; hint.textContent = 'Hint: ' + F.hint; }
    qa('#d-pips i').forEach((p, i) => { p.className = i < st!.guesses.length ? (st!.guesses[i] === P.family ? 'hit' : 'miss') : ''; });
    opts.forEach(b => {
      const g = b.dataset.family!; b.classList.toggle('wrong', st!.guesses.includes(g) && g !== P.family); b.classList.toggle('right', st!.done && g === P.family);
      b.disabled = st!.done || st!.guesses.includes(g);
    });
    if (misses >= 3 && !st!.done) {
      const keep = new Set([P.family, ...shuffleSeeded(data.families.map(f => f.id).filter(id => id !== P.family && !st!.guesses.includes(id))).slice(0, 2)]);
      opts.forEach(b => { if (!keep.has(b.dataset.family!) && !st!.guesses.includes(b.dataset.family!)) { b.disabled = true; b.classList.add('out'); } });
      hint.textContent = 'Hint: ' + F.hint + ' Down to three options.';
    }
    if (st!.done) result();
  }
  function shuffleSeeded(a: string[]) { return a.slice().sort((x, y) => hash(x + day) - hash(y + day)); }

  function grid() { return st!.guesses.map(g => g === P.family ? '🟦' : '⬛').join(''); }
  function shareText() { return `CyberHub Daily #${day} · ${st!.won ? st!.guesses.length : 'X'}/4\n${grid()}\nStreak ${stats.streak} · Name the weakness`; }
  function result() {
    const r = q('#d-result')!; r.hidden = false; q('#d-q')!.textContent = st!.won ? 'Solved.' : 'Out of tries.';
    q('#d-verdict-label')!.textContent = st!.won ? `Solved in ${st!.guesses.length} of 4` : 'The answer was';
    q('#d-verdict')!.textContent = F.label;
    const link = q<HTMLAnchorElement>('#d-link')!; link.textContent = `${P.title} (${P.id})`; link.href = 'https://www.cve.org/CVERecord?id=' + encodeURIComponent(P.id);
    q('#d-cve')!.textContent = P.id;
    q('#d-what')!.textContent = F.what; q('#d-defend')!.textContent = F.defend;
    const learn = q('#d-learn')!; learn.replaceChildren(el('span', 'Learn it on CyberHub: '));
    F.links.forEach((l, i) => { const a = el('a', l.title) as HTMLAnchorElement; a.href = base + l.path; if (i) learn.append(el('span', ' · ')); learn.append(a); });
    q('#d-preview')!.textContent = shareText() + '\n' + pageUrl('/daily/');
    tick();
  }
  function tick() {
    const now = new Date(), next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1), m = Math.max(0, Math.round((next.getTime() - now.getTime()) / 60000));
    q('#d-next')!.textContent = `Next puzzle in ${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
  }
  setInterval(() => { if (st!.done) tick(); }, 30000);

  function renderStats() {
    const streak = stats.lastWin >= day - 1 ? stats.streak : 0;
    q('#d-played')!.textContent = String(stats.played); q('#d-winp')!.textContent = String(stats.played ? Math.round(stats.wins / stats.played * 100) : 0);
    q('#d-streak')!.textContent = String(streak); q('#d-best')!.textContent = String(stats.best);
    const max = Math.max(1, ...stats.dist);
    stats.dist.forEach((n, i) => { q(`#d-dist-${i + 1}`)!.style.setProperty('--w', String(n / max)); q(`#d-distn-${i + 1}`)!.textContent = String(n); });
    const earned: Record<string, boolean> = { first: stats.wins >= 1, sharp: stats.dist[0] >= 1, streak3: stats.best >= 3, streak7: stats.best >= 7, wins10: stats.wins >= 10, all8: stats.fams.length >= data.families.length };
    qa('[data-badge]').forEach(b => b.classList.toggle('earned', !!earned[b.dataset.badge!]));
  }
  opts.forEach(b => b.addEventListener('click', () => {
    if (st!.done) return; const g = b.dataset.family!; if (st!.guesses.includes(g)) return;
    st!.guesses.push(g);
    if (g === P.family || st!.guesses.length >= 4) {
      st!.done = true; st!.won = g === P.family;
      if (stats.lastDay !== day) {
        stats.played++; stats.lastDay = day;
        if (st!.won) { stats.wins++; stats.dist[st!.guesses.length - 1]++; stats.streak = stats.lastWin === day - 1 ? stats.streak + 1 : 1; stats.lastWin = day; stats.best = Math.max(stats.best, stats.streak); if (!stats.fams.includes(P.family)) stats.fams.push(P.family); }
        else stats.streak = 0;
        save('cyberhub:daily:stats', stats);
      }
    }
    save2(); stage(); renderStats();
    if (st!.done) q('#d-result')!.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
  }));
  q('#d-share')!.addEventListener('click', e => share('CyberHub Daily', shareText(), pageUrl('/daily/'), e.currentTarget as HTMLElement));
  q('#d-copy')!.addEventListener('click', e => copy(shareText() + '\n' + pageUrl('/daily/'), e.currentTarget as HTMLElement));
  stage(); renderStats();
})();

/* ------------------------------------------------------- Readiness check */
type Question = { id: string; objective: string; prompt: string; choices: string[]; answer: number; rationale: string };
const check = q('#check');
if (check) (async () => {
  type Course = { domains: { id: string; title: string }[]; objectives: { id: string; title: string; lesson: string }[]; questions: Question[] };
  let course: Course;
  try { course = await (await fetch(base + '/assets/academy.json')).json(); } catch { q('#c-best')!.textContent = 'Questions could not load. Try again in a moment.'; return; }
  const best = load<number | null>('cyberhub:readiness:best', null);
  if (best != null) q('#c-best')!.textContent = `Your best so far: ${best}%`;
  let set: Question[] = [], i = 0, right = 0, t0 = 0, timer = 0;
  const per: Record<string, [number, number]> = {}; const wrong: Question[] = [];
  const domainOf = (o: string) => o.split('.')[0];
  function start() {
    // Balanced draw: three per domain where possible, then fill.
    const byDom: Record<string, Question[]> = {}; shuffle(course.questions).forEach(x => (byDom[domainOf(x.objective)] ||= []).push(x));
    set = []; course.domains.forEach(d => set.push(...(byDom[d.id] || []).slice(0, 3)));
    const rest = shuffle(course.questions.filter(x => !set.includes(x))); while (set.length < Math.min(15, course.questions.length) && rest.length) set.push(rest.pop()!);
    set = shuffle(set); i = 0; right = 0; wrong.length = 0; course.domains.forEach(d => { per[d.id] = [0, 0]; });
    q('#c-intro')!.hidden = true; q('#c-result')!.hidden = true; q('#c-q')!.hidden = false; t0 = Date.now();
    clearInterval(timer); timer = window.setInterval(() => { const s = Math.round((Date.now() - t0) / 1000); q('#c-time')!.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }, 1000);
    draw();
  }
  function draw() {
    const x = set[i]; q('#c-obj')!.textContent = x.objective; q('#c-num')!.textContent = `${i + 1} of ${set.length}`; q('#c-prompt')!.textContent = x.prompt;
    q('#c-prog')!.style.setProperty('--p', String(i / set.length)); q('#c-why')!.textContent = 'Pick an answer.'; q('#c-score')!.textContent = `${right} correct`;
    const next = q<HTMLButtonElement>('#c-next')!; next.disabled = true; next.textContent = i === set.length - 1 ? 'See my score' : 'Next';
    const ol = q('#c-choices')!; ol.replaceChildren();
    x.choices.forEach((c, k) => {
      const li = el('li'), b = el('button', '', '') as HTMLButtonElement; b.type = 'button'; b.append(el('span', 'ABCD'[k], 'label'), el('span', c));
      b.addEventListener('click', () => {
        const ok = k === x.answer; const d = domainOf(x.objective); per[d] = per[d] || [0, 0]; per[d][1]++; if (ok) { right++; per[d][0]++; } else wrong.push(x);
        qa<HTMLButtonElement>('#c-choices button').forEach((bb, kk) => { bb.disabled = true; if (kk === x.answer) bb.classList.add('right'); else if (kk === k) bb.classList.add('wrong'); });
        const why = q('#c-why')!; why.replaceChildren(el('b', ok ? 'Correct. ' : 'Not quite. '), el('span', x.rationale)); q('#c-score')!.textContent = `${right} correct`; next.disabled = false; next.focus();
      });
      li.append(b); ol.append(li);
    });
  }
  function finish() {
    clearInterval(timer); const pct = Math.round(right / set.length * 100); const secs = Math.round((Date.now() - t0) / 1000);
    q('#c-q')!.hidden = true; const r = q('#c-result')!; r.hidden = false; q('#c-pct')!.textContent = String(pct);
    const band = pct >= 85 ? ['Exam-ready signal', 'Strong across the board. Book a full-length practice exam next.'] : pct >= 70 ? ['Close', 'You are near the pass line. Shore up the weakest domain below.'] : pct >= 50 ? ['Building', 'Good foundation. Work through the lessons for the domains below, then retake.'] : ['Starting out', 'Everyone starts here. Begin with the Security foundations lessons and come back.'];
    q('#c-band')!.textContent = band[0]; q('#c-band-text')!.textContent = `${band[1]} (${right}/${set.length} in ${Math.floor(secs / 60)}m ${secs % 60}s)`;
    qa('#c-domains li').forEach(li => { const [a, n] = per[li.dataset.domain!] || [0, 0]; li.querySelector<HTMLElement>('.bar i')!.style.setProperty('--w', String(n ? a / n : 0)); li.querySelector('b')!.textContent = n ? `${a}/${n}` : '—'; });
    const rv = q('#c-review')!; rv.replaceChildren(); const seen = new Set<string>();
    wrong.forEach(x => { const o = course.objectives.find(o => o.id === x.objective); if (!o || seen.has(o.id) || seen.size >= 5) return; seen.add(o.id); const a = el('a', `${o.id} ${o.title}`) as HTMLAnchorElement; a.href = `${base}/academy/${o.lesson}/`; const li = el('li'); li.append(a); rv.append(li); });
    q('#c-review-h')!.hidden = !seen.size;
    const prev = load<number | null>('cyberhub:readiness:best', null); if (prev == null || pct > prev) save('cyberhub:readiness:best', pct);
    const bars = course.domains.map(d => { const [a, n] = per[d.id] || [0, 0]; return n ? (a / n >= .67 ? '🟦' : a / n >= .34 ? '🔷' : '⬛') : '⬜'; }).join('');
    const text = `My Security+ readiness on CyberHub: ${pct}% · ${band[0]}\nDomains ${bars}`;
    q('#c-preview')!.textContent = text + '\n' + pageUrl('/academy/readiness/');
    q('#c-share')!.onclick = e => share('Security+ readiness', text, pageUrl('/academy/readiness/'), e.currentTarget as HTMLElement);
    q('#c-copy')!.onclick = e => copy(text + '\n' + pageUrl('/academy/readiness/'), e.currentTarget as HTMLElement);
    r.scrollIntoView({ block: 'start' });
  }
  q('#c-start')!.addEventListener('click', start); q('#c-again')!.addEventListener('click', start);
  q('#c-next')!.addEventListener('click', () => { if (i < set.length - 1) { i++; draw(); } else finish(); });
})();

/* ------------------------------------------------------------- Role match */
const match = q('#match');
if (match) {
  const steps = qa<HTMLFieldSetElement>('.match-q'); let at = 0; const score: Record<string, number> = {};
  const prog = q('#m-prog')!;
  const show = (n: number) => { steps.forEach((s, k) => { s.hidden = k !== n; }); prog.style.setProperty('--p', String(n / steps.length)); steps[n]?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true }); };
  steps.forEach(s => qa<HTMLButtonElement>('button', s).forEach(b => b.addEventListener('click', () => {
    const w = JSON.parse(b.dataset.w || '{}') as Record<string, number>; Object.entries(w).forEach(([k, v]) => { score[k] = (score[k] || 0) + v; });
    at++; if (at < steps.length) show(at); else finish();
  })));
  function finish() {
    steps.forEach(s => { s.hidden = true; }); prog.style.setProperty('--p', '1');
    const ranked = Object.entries(score).sort((a, b) => b[1] - a[1]); const top = ranked[0]?.[0]; const second = ranked[1]?.[0];
    const res = q('#m-result')!; res.hidden = false; qa('.role-card').forEach(c => { c.hidden = c.dataset.role !== top; });
    const card = q(`.role-card[data-role="${top}"]`); const name = card?.querySelector('h3')?.textContent || 'Security pro';
    const second2 = second ? q(`.role-card[data-role="${second}"] h3`)?.textContent : '';
    q('#m-runner')!.textContent = second2 ? `Close second: ${second2}` : '';
    const text = `CyberHub says I'm a ${name}. Which security role are you?`;
    q('#m-preview')!.textContent = text + '\n' + pageUrl('/careers/match/');
    q('#m-share')!.onclick = e => share('Which security role are you?', text, pageUrl('/careers/match/'), e.currentTarget as HTMLElement);
    q('#m-copy')!.onclick = e => copy(text + '\n' + pageUrl('/careers/match/'), e.currentTarget as HTMLElement);
    save('cyberhub:match', top);
  }
  q('#m-again')!.addEventListener('click', () => { Object.keys(score).forEach(k => delete score[k]); at = 0; q('#m-result')!.hidden = true; show(0); });
  show(0);
}

/* ---------------------------------------------------- Copy buttons (guides) */
qa<HTMLButtonElement>('[data-copy]').forEach(b => b.addEventListener('click', () => {
  const target = q(b.dataset.copy || ''); if (target) copy(target.textContent || '', b);
}));

/* ------------------------------------------------- OS tabs (local AI guide) */
const tabs = qa<HTMLButtonElement>('.os-tab');
if (tabs.length) {
  const select = (k: string) => { tabs.forEach(t => { const on = t.dataset.os === k; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; }); qa('.os-panel').forEach(p => { p.hidden = p.id !== 'os-' + k; }); };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t.dataset.os!));
    t.addEventListener('keydown', e => { if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; n.focus(); select(n.dataset.os!); });
  });
  const ua = navigator.userAgent; select(/Windows/i.test(ua) ? 'win' : /Mac OS X|Macintosh/i.test(ua) && !/iPhone|iPad/.test(ua) ? 'mac' : /Linux/i.test(ua) && !/Android/i.test(ua) ? 'linux' : 'win');
}
