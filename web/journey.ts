// CyberHub journey: the "A day defending it" shifts, reading progress on /defend/ pages,
// and the badges page. Everything is stored only in this browser (localStorage).
// No innerHTML: all text is set with textContent.

import { CAP_STAGE_QUESTIONS, completedStages } from './capstone-progress.js';

type Journey = { read: string[]; shifts: Record<string, number>; perfect: string[] };
const JKEY = 'cyberhub:defend';
const load = <T>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : d; } catch { return d; } };
const store = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };
const journey = (): Journey => { const j = load<Partial<Journey>>(JKEY, {}); return { read: Array.isArray(j.read) ? j.read : [], shifts: j.shifts && typeof j.shifts === 'object' ? j.shifts : {}, perfect: Array.isArray(j.perfect) ? j.perfect : [] }; };

export const SCORE: Record<string, number> = { best: 2, ok: 1, bad: 0 };
export function shiftVerdict(score: number, max: number): string {
  const p = score / max;
  return p === 1 ? 'Perfect shift. You would be trusted with the keys.' : p >= 0.75 ? 'Strong shift. A senior analyst would sign off on this.' : p >= 0.5 ? 'You got through it. Read the explanations for the steps you missed.' : 'Rough night. That is what practice is for; play it again.';
}

/* ------------------------------------------------------------ badges */
export type Counts = { linux: number; net: number; read: number; shifts: number; perfect: number; academy: number; readiness: number; streak: number; role: boolean; duels: number; soc: number; phish: number; redteam: number; ps: number; pcap: number; hunt: number; crypto: number; review: number; cloud: number; ad: number; adv: number; ctf: number; phys: number; gis: number; data: number; capstone: boolean };
export const BADGES: { id: string; test: (c: Counts) => boolean; prog: (c: Counts) => string }[] = [
  { id: 'first-flag', test: c => c.linux >= 1, prog: c => `${Math.min(c.linux, 1)}/1 Linux level` },
  { id: 'shell-analyst', test: c => c.linux >= 10, prog: c => `${Math.min(c.linux, 10)}/10 Linux levels` },
  { id: 'root', test: c => c.linux >= 36, prog: c => `${Math.min(c.linux, 36)}/36 Linux levels` },
  { id: 'connected', test: c => c.net >= 6, prog: c => `${Math.min(c.net, 6)}/6 networking levels` },
  { id: 'network-engineer', test: c => c.net >= 17, prog: c => `${Math.min(c.net, 17)}/17 networking levels` },
  { id: 'field-guide', test: c => c.read >= 5, prog: c => `${Math.min(c.read, 5)}/5 defend guides read` },
  { id: 'night-shift', test: c => c.shifts >= 5, prog: c => `${Math.min(c.shifts, 5)}/5 shifts played` },
  { id: 'cool-head', test: c => c.perfect >= 1, prog: c => `${Math.min(c.perfect, 1)}/1 perfect shift` },
  { id: 'halfway', test: c => c.academy >= 14, prog: c => `${Math.min(c.academy, 14)}/14 Academy lessons` },
  { id: 'all-lessons', test: c => c.academy >= 28, prog: c => `${Math.min(c.academy, 28)}/28 Academy lessons` },
  { id: 'exam-ready', test: c => c.readiness >= 80, prog: c => `Best readiness score ${c.readiness}% of 80%` },
  { id: 'streak', test: c => c.streak >= 5, prog: c => `Best Daily streak ${Math.min(c.streak, 5)}/5` },
  { id: 'role-found', test: c => c.role, prog: c => c.role ? 'Done' : 'Take the role quiz' },
  { id: 'duelist', test: c => c.duels >= 1, prog: c => `${Math.min(c.duels, 1)}/1 duel won` },
  { id: 'windows-ready', test: c => c.ps >= 10, prog: c => `${Math.min(c.ps, 10)}/10 PowerShell levels` },
  { id: 'on-duty', test: c => c.soc >= 90, prog: c => `Best SOC shift ${c.soc}/120 (need 90)` },
  { id: 'phish-spotter', test: c => c.phish >= 8, prog: c => `${Math.min(c.phish, 8)}/8 emails investigated` },
  { id: 'prompt-breaker', test: c => c.redteam >= 5, prog: c => `${Math.min(c.redteam, 5)}/5 AI red team levels` },
  { id: 'packet-sniffer', test: c => c.pcap >= 8, prog: c => `${Math.min(c.pcap, 8)}/8 Packet Lab levels` },
  { id: 'threat-hunter', test: c => c.hunt >= 9, prog: c => `${Math.min(c.hunt, 9)}/9 Log Hunt levels` },
  { id: 'decoder', test: c => c.crypto >= 9, prog: c => `${Math.min(c.crypto, 9)}/9 crypto levels` },
  { id: 'code-guardian', test: c => c.review >= 8, prog: c => `${Math.min(c.review, 8)}/8 code reviews` },
  { id: 'cloud-guard', test: c => c.cloud >= 8, prog: c => `${Math.min(c.cloud, 8)}/8 cloud misconfigurations fixed` },
  { id: 'domain-defender', test: c => c.ad >= 8, prog: c => `${Math.min(c.ad, 8)}/8 Active Directory levels` },
  { id: 'deep-diver', test: c => c.adv >= 10, prog: c => `${Math.min(c.adv, 10)}/10 Advanced lab levels` },
  { id: 'mapmaker', test: c => c.gis >= 10, prog: c => `${Math.min(c.gis, 10)}/10 GIS Lab levels` },
  { id: 'data-detective', test: c => c.data >= 10, prog: c => `${Math.min(c.data, 10)}/10 Data Lab levels` },
  { id: 'locked-down', test: c => c.phys >= 9, prog: c => `${Math.min(c.phys, 9)}/9 Lockdown Lab stars` },
  { id: 'case-closed', test: c => c.capstone, prog: c => c.capstone ? 'Case closed' : 'Finish the case and submit a report' },
  { id: 'flag-hunter', test: c => c.ctf >= 1000, prog: c => `${Math.min(c.ctf, 1000)}/1000 challenge points` },
];
const arr = (k: string): string[] => { const v = load<unknown>(k, []); return Array.isArray(v) ? v.filter(x => typeof x === 'string') as string[] : []; };
export function counts(base: string): Counts {
  const j = journey(); const academy = load<{ lessons?: unknown }>(`cyberhub:${base}:progress:v1`, {});
  const lessons = Array.isArray(academy.lessons) ? new Set((academy.lessons as unknown[]).filter(x => typeof x === 'string' && (x as string).startsWith('academy/'))).size : 0;
  const stats = load<{ best?: number }>('cyberhub:daily:stats', {});
  const cap = load<{ stages?: unknown; solved?: unknown; submitted?: unknown }>('cyberhub:capstone', {});
  const capStages = completedStages(cap.solved);
  return { linux: arr('cyberhub:linux').length, net: arr('cyberhub:netlab').length, read: j.read.length, shifts: Object.keys(j.shifts).length, perfect: j.perfect.length,
    academy: Math.min(28, lessons), readiness: Number(load<number | null>('cyberhub:readiness:best', 0)) || 0, streak: Number(stats.best) || 0, role: load<unknown>('cyberhub:match', null) != null, duels: Number(load<{ wins?: number }>('cyberhub:duel', {}).wins) || 0, soc: Number(load<{ best?: number }>('cyberhub:soc', {}).best) || 0,
    phish: Object.keys(load<Record<string, number>>('cyberhub:phish', {}) || {}).length, redteam: (load<number[]>('cyberhub:redteam', []) || []).filter(n => typeof n === 'number' && n < 5).length, ps: arr('cyberhub:pslab').length, ctf: Object.values(load<Record<string, { s?: number; p?: number }>>('cyberhub:ctf', {}) || {}).reduce((n, v) => n + (v && v.s && typeof v.p === 'number' ? Math.min(500, Math.max(0, v.p)) : 0), 0), adv: ['pcap', 'hunt', 'crypto', 'review', 'cloud', 'ad'].reduce((n, k) => n + arr('cyberhub:' + k).filter(x => typeof x === 'string' && x.startsWith('adv-')).length, 0) + capStages.length, pcap: arr('cyberhub:pcap').length, gis: arr('cyberhub:gis').length, data: arr('cyberhub:data').length, phys: Object.values(load<Record<string, number>>('cyberhub:phys', {}) || {}).reduce((n, v) => n + (typeof v === 'number' ? Math.min(3, Math.max(0, v)) : 0), 0), hunt: arr('cyberhub:hunt').length, crypto: arr('cyberhub:crypto').length, review: arr('cyberhub:review').length, cloud: arr('cyberhub:cloud').length, ad: arr('cyberhub:ad').length, capstone: cap.submitted === true && capStages.length === Object.keys(CAP_STAGE_QUESTIONS).length };
}

/* ------------------------------------------------------------ UI */
if (typeof document !== 'undefined') {
  const base = document.body.dataset.base || '';

  // reading a defend guide counts once it has been open for a little while
  const page = document.querySelector<HTMLElement>('[data-defend-page]');
  if (page) setTimeout(() => { const j = journey(); const slug = page.dataset.defendPage!; if (!j.read.includes(slug)) { j.read.push(slug); store(JKEY, j); } }, 8000);

  // the shift
  const shift = document.querySelector<HTMLElement>('#shift');
  if (shift) {
    const slug = shift.dataset.shift!, max = Number(shift.dataset.max);
    const steps = Array.from(shift.querySelectorAll<HTMLElement>('.shift-step')); const end = shift.querySelector<HTMLElement>('.shift-end')!;
    let score = 0;
    const reset = () => {
      score = 0; end.hidden = true;
      steps.forEach((st, i) => { st.hidden = i > 0; st.classList.remove('answered'); st.querySelectorAll<HTMLButtonElement>('.shift-opt').forEach(b => { b.disabled = false; b.removeAttribute('data-picked'); b.setAttribute('aria-pressed', 'false'); }); st.querySelectorAll<HTMLElement>('.shift-why').forEach(w => { w.hidden = true; }); st.querySelector<HTMLElement>('.shift-next')!.hidden = true; });
    };
    steps.forEach((st, i) => {
      st.querySelectorAll<HTMLButtonElement>('.shift-opt').forEach(b => b.addEventListener('click', () => {
        if (st.classList.contains('answered')) return; st.classList.add('answered');
        score += SCORE[b.dataset.v || 'bad'] ?? 0; b.dataset.picked = '1'; b.setAttribute('aria-pressed', 'true');
        st.querySelectorAll<HTMLButtonElement>('.shift-opt').forEach(o => { o.disabled = true; (o.nextElementSibling as HTMLElement).hidden = false; });
        const nx = st.querySelector<HTMLElement>('.shift-next')!; nx.hidden = false; nx.focus();
      }));
      st.querySelector<HTMLElement>('.shift-next')!.addEventListener('click', () => {
        if (i < steps.length - 1) { steps[i + 1].hidden = false; steps[i + 1].scrollIntoView({ behavior: 'smooth', block: 'start' }); steps[i + 1].querySelector<HTMLElement>('.shift-opt')?.focus({ preventScroll: true }); return; }
        end.hidden = false; end.querySelector('.shift-score')!.textContent = `You scored ${score} of ${max}. ${shiftVerdict(score, max)}`;
        const j = journey(); j.shifts[slug] = Math.max(j.shifts[slug] ?? 0, score); if (score === max && !j.perfect.includes(slug)) j.perfect.push(slug); store(JKEY, j);
        end.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    shift.querySelector('.shift-again')?.addEventListener('click', () => { reset(); steps[0].scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  }

  // badges page
  const board = document.querySelector<HTMLElement>('#badges');
  if (board) {
    const c = counts(base); let earned = 0;
    for (const b of BADGES) {
      const el = board.querySelector<HTMLElement>(`[data-badge="${b.id}"]`); if (!el) continue;
      const ok = b.test(c); if (ok) earned++; el.classList.toggle('earned', ok);
      el.querySelector('.bd-prog')!.textContent = ok ? 'Earned' : b.prog(c);
      // printable card list
      const li = document.querySelector<HTMLElement>(`[data-card-badge="${b.id}"]`); if (li) li.hidden = !ok;
    }
    const sum = document.querySelector('#badge-sum'); if (sum) sum.textContent = `${earned} of ${BADGES.length} badges earned on this browser`;
    const none = document.querySelector<HTMLElement>('#card-none'); if (none) none.hidden = earned > 0;
    const nameIn = document.querySelector<HTMLInputElement>('#card-name'), nameOut = document.querySelector<HTMLElement>('#card-name-out');
    nameIn?.addEventListener('input', () => { if (nameOut) nameOut.textContent = nameIn.value.trim() || 'Your name'; });
    const when = document.querySelector('#card-date'); if (when) when.textContent = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    // print only the card: clone it to a top-level node that print CSS shows on its own
    const prep = () => { document.querySelector('#print-root')?.remove(); const card = document.querySelector('#bd-card'); if (!card) return; const root = document.createElement('div'); root.id = 'print-root'; root.append(card.cloneNode(true)); document.body.append(root); document.documentElement.classList.add('print-card'); };
    const done = () => { document.querySelector('#print-root')?.remove(); document.documentElement.classList.remove('print-card'); };
    addEventListener('beforeprint', prep); addEventListener('afterprint', done);
    document.querySelector('#card-print')?.addEventListener('click', () => { prep(); window.print(); });
    document.querySelector('#badge-reset')?.addEventListener('click', () => {
      const btn = document.querySelector<HTMLButtonElement>('#badge-reset')!;
      if (btn.dataset.confirm !== '1') { btn.dataset.confirm = '1'; btn.textContent = 'Click again to erase shift and guide progress'; return; }
      try { localStorage.removeItem(JKEY); } catch { /* ignore */ } location.reload();
    });
  }
}

/* ------------------------------------------------------------ Start here: quick checks and checklist */
if (typeof document !== 'undefined') {
  document.querySelectorAll<HTMLElement>('.mini-q').forEach(box => {
    box.querySelectorAll<HTMLButtonElement>('.mini-opt').forEach(b => b.addEventListener('click', () => {
      if (box.classList.contains('answered')) return; box.classList.add('answered'); b.dataset.picked = '1';
      box.querySelectorAll<HTMLButtonElement>('.mini-opt').forEach(o => { o.disabled = true; });
      const why = box.querySelector<HTMLElement>('.mini-why')!; why.hidden = false;
      why.prepend(Object.assign(document.createElement('b'), { textContent: b.dataset.ok === '1' ? 'Correct. ' : 'Not quite. ' }));
    }));
  });
  const list = document.querySelector<HTMLElement>('#st-check');
  if (list) {
    const k = 'cyberhub:start'; const done = new Set<string>(load<string[]>(k, []).filter(x => typeof x === 'string'));
    const boxes = Array.from(list.querySelectorAll<HTMLInputElement>('[data-check]'));
    const count = () => { const n = boxes.filter(b => b.checked).length; document.querySelector('#st-count')!.textContent = n === boxes.length ? `All ${n} done. You are safer than most people online.` : `${n} of ${boxes.length} done`; };
    boxes.forEach(b => { b.checked = done.has(b.dataset.check!); b.addEventListener('change', () => { if (b.checked) done.add(b.dataset.check!); else done.delete(b.dataset.check!); store(k, [...done]); count(); }); });
    count();
  }
}

/* ------------------------------------------------------------ Glossary search */
if (typeof document !== 'undefined') {
  const q = document.querySelector<HTMLInputElement>('#gl-q');
  if (q) {
    const items = Array.from(document.querySelectorAll<HTMLElement>('.gl-item')); const secs = Array.from(document.querySelectorAll<HTMLElement>('.gl-sec'));
    const run = () => {
      const v = q.value.trim().toLowerCase(); let n = 0;
      items.forEach(i => { const ok = !v || (i.dataset.q || '').includes(v); i.hidden = !ok; if (ok) n++; });
      secs.forEach(sec => { sec.hidden = !sec.querySelector('.gl-item:not([hidden])'); });
      document.querySelector('#gl-count')!.textContent = v ? `${n} matching term${n === 1 ? '' : 's'}` : `${items.length} terms`;
      document.querySelector<HTMLElement>('#gl-none')!.hidden = n > 0;
    };
    q.addEventListener('input', run); run();
  }
}

/* ------------------------------------------------------------ Start here: open the lesson a link points to */
if (typeof document !== 'undefined' && document.querySelector('.st-acc')) {
  const openHash = () => { const t = location.hash && document.getElementById(location.hash.slice(1)); if (t instanceof HTMLDetailsElement) { t.open = true; t.scrollIntoView({ block: 'start' }); } };
  addEventListener('hashchange', openHash); openHash();
}

/* ------------------------------------------------------------ Homepage: continue where you left off */
if (typeof document !== 'undefined') {
  const box = document.querySelector<HTMLElement>('#continue');
  if (box) {
    const base = document.body.dataset.base || ''; const items: [string, string, string][] = [];
    const last = load<{ t?: string; u?: string } | null>('cyberhub:last', null);
    if (last && last.t && last.u && last.u.startsWith('/')) items.push(['Last visited', last.t, last.u]);
    const next = load<{ t?: string; u?: string; goal?: string } | null>('cyberhub:plan-next', null);
    if (next && next.t && next.u && next.u.startsWith('/')) items.push(['Next in your plan', next.t, next.u]);
    for (const [k, name, total, url] of [['cyberhub:linux', 'Linux Lab', 36, '/linux/'], ['cyberhub:netlab', 'Networking Lab', 17, '/linux/network/'], ['cyberhub:pslab', 'PowerShell Lab', 15, '/linux/powershell/']] as [string, string, number, string][]) {
      const n = arr(k).length; if (n > 0 && n < total) items.push([name, `${n} of ${total} levels done`, url]);
    }
    const c = counts(base); const earned = BADGES.filter(b => b.test(c)).length; if (earned) items.push(['Badges', `${earned} of ${BADGES.length} earned`, '/progress/']);
    const duel = load<{ played?: number; best?: number }>('cyberhub:duel', {}); if (duel.played) items.push(['Cyber Duel', `Best score ${duel.best || 0}. Play again?`, '/duel/']);
    if (items.length) {
      const list = box.querySelector('#cont-list')!;
      list.replaceChildren(...items.slice(0, 4).map(([label, text, url]) => { const a = document.createElement('a'); a.className = 'cont-item'; a.href = base + url; const l = document.createElement('span'); l.className = 'label'; l.textContent = label; const t = document.createElement('strong'); t.textContent = text; a.append(l, t); return a; }));
      box.hidden = false;
    }
  }
}
