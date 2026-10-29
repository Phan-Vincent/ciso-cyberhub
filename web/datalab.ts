// Data Lab: answer questions about real open data (CISA KEV snapshot, internship listings) with an
// in-browser explorer. Expected answers are computed from the same data the learner sees, so they
// stay right when the daily pipeline refreshes the snapshot. Pure functions are exported for tests.

export type Kev = { id: string; vendor: string; product: string; added: string; cvss: number | null; epss: number | null };
export type Job = { company: string; title: string; city: string; miles: number | null; zone: string; security: boolean; category: string; posted: string };
export type Row = Record<string, string | number | boolean | null>;

export const median = (xs: number[]) => { if (!xs.length) return NaN; const a = [...xs].sort((p, q) => p - q), m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
export const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : NaN);
export function pearson(xs: number[], ys: number[]) {
  const mx = mean(xs), my = mean(ys); let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < xs.length; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  return sxy / Math.sqrt(sxx * syy);
}
export function countBy<T>(rows: T[], key: (r: T) => string) { const m = new Map<string, number>(); for (const r of rows) { const k = key(r); m.set(k, (m.get(k) || 0) + 1); } return [...m.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)); }
export const snapshotDate = (k: Kev[]) => k.reduce((m, r) => (r.added > m ? r.added : m), '');
export const daysBefore = (iso: string, n: number) => new Date(Date.parse(iso + 'T00:00:00Z') - n * 864e5).toISOString().slice(0, 10);
export function lastMonths(iso: string, n: number) { const [y, m] = iso.split('-').map(Number); const out: string[] = []; for (let i = n - 1; i >= 0; i--) { const d = new Date(Date.UTC(y, m - 1 - i, 1)); out.push(d.toISOString().slice(0, 7)); } return out; }
export function monthly(k: Kev[], months: string[]) { const c = Object.fromEntries(months.map(m => [m, 0])) as Record<string, number>; for (const r of k) { const m = r.added.slice(0, 7); if (m in c) c[m]++; } return months.map(m => [m, c[m]] as [string, number]); }

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9.%-]/g, '');
const num = (v: string) => { const m = v.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/); return m ? Number(m[0]) : NaN; };
export type DLevel = { id: string; tier: 'Beginner' | 'Intermediate' | 'Advanced'; title: string; q: (k: Kev[], j: Job[]) => string; answer: (k: Kev[], j: Job[]) => string | number;
  check: (v: string, a: string | number) => boolean; set: 'kev' | 'jobs' | 'chart'; hints: string[]; lesson: string };
const eqNum = (tol: number) => (v: string, a: string | number) => Math.abs(num(v) - Number(a)) <= tol;
const eqText = (v: string, a: string | number) => norm(v) === norm(String(a));

export const DLEVELS: DLevel[] = [
  { id: 'count', tier: 'Beginner', title: 'How big is it?', set: 'kev', q: () => 'How many vulnerabilities are in this snapshot of the CISA Known Exploited Vulnerabilities (KEV) catalog?',
    answer: k => k.length, check: eqNum(0), hints: ['Clear every filter. The explorer shows the row count.'],
    lesson: 'Always start with the size and the date of your data. KEV only lists vulnerabilities with evidence of exploitation in the wild, so every row is a known, real-world risk.' },
  { id: 'vendor', tier: 'Beginner', title: 'Top vendor', set: 'kev', q: () => 'Which vendor has the most entries in the catalog?',
    answer: k => countBy(k, r => r.vendor)[0][0], check: eqText, hints: ['Group by vendor and count.'],
    lesson: 'The biggest vendors top the list because they ship the most widely deployed software, not necessarily because their code is worse. A count without a denominator (how much software they ship) can mislead.' },
  { id: 'recent', tier: 'Beginner', title: 'Last 30 days', set: 'kev', q: k => `How many entries were added in the 30 days up to and including ${snapshotDate(k)}, the newest date in this snapshot?`,
    answer: k => { const d = snapshotDate(k), from = daysBefore(d, 29); return k.filter(r => r.added >= from && r.added <= d).length; }, check: eqNum(0),
    hints: (() => ['Set "Added on or after" to 29 days before the newest date.', 'The window includes both the first and last day.'])(),
    lesson: 'Use the snapshot date, not today, as your reference. Analyses that quietly use "now" give different answers every day and cannot be reproduced.' },
  { id: 'median', tier: 'Intermediate', title: 'Typical severity', set: 'kev', q: () => 'Among entries that have a CVSS score, what is the median score? (one decimal)',
    answer: k => median(k.filter(r => r.cvss !== null).map(r => r.cvss as number)), check: eqNum(.05), hints: ['Group by nothing, metric: median CVSS.', 'Rows without a score are left out, not counted as zero.'],
    lesson: 'The median is the middle value and ignores outliers. With scores bunched at the top of the scale, the median tells you what a typical exploited vulnerability looks like better than the mean.' },
  { id: 'missing', tier: 'Intermediate', title: 'Missing data', set: 'kev', q: () => 'What percentage of entries have no CVSS score in this snapshot? (whole percent)',
    answer: k => Math.round((k.filter(r => r.cvss === null).length / k.length) * 100), check: eqNum(.5), hints: ['Filter to "CVSS: missing" and compare the count to the total.'],
    lesson: 'Missing values are information. Older KEV entries often predate the scoring data this site pulls, so a chart of "average severity" over time can be driven by what is missing, not by what changed.' },
  { id: 'month', tier: 'Intermediate', title: 'Busiest month', set: 'chart', q: k => `In the 12 months up to ${snapshotDate(k).slice(0, 7)}, which month had the most additions? Answer as YYYY-MM.`,
    answer: k => { const ms = monthly(k, lastMonths(snapshotDate(k), 12)); return [...ms].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? 1 : -1))[0][0]; }, check: eqText,
    hints: ['Group by month. The chart shows the last 12 months.', 'If two months tie, pick the most recent.'],
    lesson: 'Time series show bursts. A spike often means one event, such as a batch of related vulnerabilities in one product, not a sudden change in the threat landscape. Read the rows behind a spike before you explain it.' },
  { id: 'epss', tier: 'Advanced', title: 'Likely next', set: 'kev', q: () => 'EPSS estimates the chance a vulnerability is exploited in the next 30 days. How many entries have an EPSS score of 0.5 or higher?',
    answer: k => k.filter(r => r.epss !== null && (r.epss as number) >= .5).length, check: eqNum(0), hints: ['Set "EPSS at least" to 0.5.'],
    lesson: 'Severity (CVSS) says how bad an exploit would be; EPSS says how likely exploitation is. Teams patch KEV entries first, then use EPSS to rank the rest of the backlog.' },
  { id: 'corr', tier: 'Advanced', title: 'Severity versus likelihood', set: 'kev', q: () => 'For entries with both scores, is the correlation between CVSS and EPSS strong (0.5 or more), weak (0 to 0.5) or negative? Answer strong, weak or negative.',
    answer: k => { const b = k.filter(r => r.cvss !== null && r.epss !== null); const r = pearson(b.map(x => x.cvss as number), b.map(x => x.epss as number)); return r >= .5 ? 'strong' : r >= 0 ? 'weak' : 'negative'; }, check: eqText,
    hints: ['The explorer shows the Pearson correlation when both scores are present.', 'Values near 0 mean one score tells you little about the other.'],
    lesson: 'Severity and exploitation likelihood are only loosely related. That is the whole argument for using both: a 9.8 nobody exploits can wait behind a 7.5 that is being used every day.' },
  { id: 'axis', tier: 'Advanced', title: 'Honest charts', set: 'chart', q: () => 'Two charts show the same monthly counts. One makes the change look far bigger than it is. Which one misleads: A or B?',
    answer: () => 'b', check: eqText, hints: ['Look where each y-axis starts.'],
    lesson: 'Bar charts must start at zero, because we compare bar lengths. Chart B starts its axis near the smallest value, so a small change looks dramatic. Check the axis before you believe the slope.' },
  { id: 'near', tier: 'Advanced', title: 'Maps meet data', set: 'jobs', q: () => 'In the internship snapshot, how many listings are flagged as security roles and are within 45 miles of CSUSB?',
    answer: (_k, j) => j.filter(x => x.security && x.miles !== null && x.miles <= 45).length, check: eqNum(0), hints: ['Switch the dataset to internships.', 'Filter security = yes and miles at most 45.'],
    lesson: 'Distance is a column like any other once data is geocoded. Joining location with attributes ("security roles near campus") is where GIS and data analysis become one workflow.' },
];

/* ================================================================== UI */
const NS = 'http://www.w3.org/2000/svg';
function h(tag: string, props: Record<string, string> = {}, ...kids: (Node | string | null | false)[]): HTMLElement {
  const e = document.createElement(tag); for (const [k, v] of Object.entries(props)) e.setAttribute(k, v); for (const k of kids) if (k) e.append(k); return e;
}
function s(tag: string, attrs: Record<string, string | number> = {}, text = ''): SVGElement { const e = document.createElementNS(NS, tag) as SVGElement; for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v)); if (text) e.textContent = text; return e; }
/** Smallest 1, 2 or 5 × 10^k step at least x. */
export function niceStep(x: number) { const p = 10 ** Math.floor(Math.log10(Math.max(x, 1e-9))); for (const m of [1, 2, 5, 10]) if (m * p >= x) return m * p; return 10 * p; }
/** Single-series bar chart, values labeled selectively, hover title per bar. */
export function barSvg(rows: [string, number][], label: string, opts: { from?: number; highlight?: string; w?: number; hgt?: number } = {}) {
  const W = opts.w || 640, H = opts.hgt || 240, L = 40, B = 46, T = 14; const from = opts.from ?? 0; const raw = Math.max(from + 1, ...rows.map(r => r[1]));
  const step = niceStep((raw - from) / 5), max = from + Math.ceil((raw - from) / step) * step;
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'dl-chart', role: 'img', 'aria-label': label });
  const y = (v: number) => H - B - ((v - from) / (max - from)) * (H - B - T); const bw = (W - L - 8) / Math.max(1, rows.length);
  for (let v = from, i = 0; v <= max + 1e-9; v += step, i++) svg.append(s('path', { d: `M${L} ${y(v).toFixed(1)}H${W - 4}`, class: i ? 'dl-grid' : 'dl-base' }), s('text', { x: L - 6, y: y(v) + 3, class: 'dl-tick dl-r' }, String(+v.toFixed(2))));
  rows.forEach(([k, v], i) => { const x = L + 4 + i * bw, top = y(Math.max(v, from)); const b = s('rect', { x: x.toFixed(1), y: top.toFixed(1), width: Math.max(2, bw - 6).toFixed(1), height: Math.max(0, H - B - top).toFixed(1), class: k === opts.highlight ? 'dl-bar hi' : 'dl-bar' });
    b.append(s('title', {}, `${k}: ${v}`)); svg.append(b);
    if (rows.length <= 14) svg.append(s('text', { x: (x + (bw - 6) / 2).toFixed(1), y: H - B + 14, class: 'dl-tick dl-c' }, k.length > 9 ? k.slice(0, 8) + '…' : k));
    if (k === opts.highlight || rows.length <= 6) svg.append(s('text', { x: (x + (bw - 6) / 2).toFixed(1), y: top - 5, class: 'dl-val dl-c' }, String(v))); });
  return svg;
}

const root = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('#datalab');
if (root) {
  const base = document.body.dataset.base || ''; const KEY = 'cyberhub:data';
  const $ = <T extends HTMLElement = HTMLElement>(q: string) => root.querySelector<T>(q)!;
  let solved: string[] = []; try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); if (Array.isArray(v)) solved = v.filter(x => typeof x === 'string'); } catch { /* ignore */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(solved)); } catch { /* ignore */ } };
  let kev: Kev[] = [], jobs: Job[] = [], cur = 0, hintN = 0, set: 'kev' | 'jobs' = 'kev';
  const nav = $('#dl-lvls'), fb = $('#dl-msg');
  const fields = { kev: { group: [['', 'Nothing (all rows)'], ['vendor', 'Vendor'], ['product', 'Product'], ['month', 'Month added'], ['year', 'Year added']], metric: [['count', 'Count'], ['mcvss', 'Mean CVSS'], ['medcvss', 'Median CVSS'], ['mepss', 'Mean EPSS']] },
    jobs: { group: [['', 'Nothing (all rows)'], ['company', 'Company'], ['city', 'City'], ['zone', 'Zone'], ['category', 'Category']], metric: [['count', 'Count'], ['mmiles', 'Mean miles']] } };
  const fill = (sel: HTMLSelectElement, opts: string[][]) => sel.replaceChildren(...opts.map(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; return o; }));
  function setData(which: 'kev' | 'jobs') {
    set = which; $<HTMLSelectElement>('#dx-set').value = which; fill($<HTMLSelectElement>('#dx-group'), fields[which].group); fill($<HTMLSelectElement>('#dx-metric'), fields[which].metric);
    root!.querySelectorAll<HTMLElement>('[data-for]').forEach(x => { x.hidden = x.dataset.for !== which; }); run();
  }
  function filtered(): Row[] {
    const q = $<HTMLInputElement>('#dx-q').value.trim().toLowerCase();
    if (set === 'kev') { const from = $<HTMLInputElement>('#dx-from').value, to = $<HTMLInputElement>('#dx-to').value, mc = $<HTMLInputElement>('#dx-cvss').value, me = $<HTMLInputElement>('#dx-epss').value, miss = $<HTMLSelectElement>('#dx-miss').value;
      return kev.filter(r => (!q || (r.vendor + ' ' + r.product + ' ' + r.id).toLowerCase().includes(q)) && (!from || r.added >= from) && (!to || r.added <= to)
        && (mc === '' || (r.cvss !== null && r.cvss >= Number(mc))) && (me === '' || (r.epss !== null && r.epss >= Number(me))) && (miss === '' || (miss === 'cvss' ? r.cvss === null : r.epss === null))) as unknown as Row[]; }
    const sec = $<HTMLSelectElement>('#dx-sec').value, mi = $<HTMLInputElement>('#dx-miles').value;
    return jobs.filter(r => (!q || (r.company + ' ' + r.title + ' ' + r.city).toLowerCase().includes(q)) && (sec === '' || String(r.security) === sec) && (mi === '' || (r.miles !== null && r.miles <= Number(mi)))) as unknown as Row[];
  }
  let lastTable: Row[] = [];
  function run() {
    const rows = filtered(); const g = $<HTMLSelectElement>('#dx-group').value, m = $<HTMLSelectElement>('#dx-metric').value;
    const key = (r: Row) => g === 'month' ? String(r.added).slice(0, 7) : g === 'year' ? String(r.added).slice(0, 4) : String(r[g] ?? '(blank)');
    const val = (rs: Row[]) => { const col = m === 'mmiles' ? 'miles' : m.endsWith('epss') ? 'epss' : 'cvss'; const xs = rs.map(r => r[col]).filter(v => typeof v === 'number') as number[];
      return m === 'count' ? rs.length : m.startsWith('med') ? median(xs) : mean(xs); };
    let out: [string, number][];
    if (!g) out = [['All rows', val(rows)]];
    else { const groups = new Map<string, Row[]>(); for (const r of rows) { const k = key(r); (groups.get(k) || groups.set(k, []).get(k)!).push(r); }
      out = [...groups.entries()].map(([k, rs]) => [k, val(rs)] as [string, number]); out.sort(g === 'month' || g === 'year' ? (a, b) => (a[0] < b[0] ? -1 : 1) : (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)); }
    const dec = m === 'count' ? 0 : m.endsWith('epss') ? 3 : 2; const fmtv = (v: number) => Number.isFinite(v) ? v.toFixed(dec) : '—';
    $('#dx-count').textContent = `${rows.length.toLocaleString('en-US')} rows match` + (set === 'kev' ? (() => { const b = (rows as unknown as Kev[]).filter(r => r.cvss !== null && r.epss !== null); return b.length > 2 ? ` · CVSS–EPSS correlation r = ${pearson(b.map(x => x.cvss as number), b.map(x => x.epss as number)).toFixed(2)} (${b.length} rows with both)` : ''; })() : '');
    const shown = g === 'month' ? out.slice(-24) : out.slice(0, 15);
    const chart = $('#dx-chart'); chart.replaceChildren(g && shown.length > 1 ? barSvg(shown.map(([k, v]) => [k, Number(fmtv(v)) || 0]), `Bar chart: ${$<HTMLSelectElement>('#dx-metric').selectedOptions[0].text} by ${$<HTMLSelectElement>('#dx-group').selectedOptions[0].text}`) : h('span'));
    const tb = h('tbody', {}, ...out.slice(0, 50).map(([k, v]) => h('tr', {}, h('td', {}, k), h('td', { class: 'num' }, fmtv(v)))));
    $('#dx-table').replaceChildren(h('table', { class: 'dl-table' }, h('thead', {}, h('tr', {}, h('th', {}, g ? $<HTMLSelectElement>('#dx-group').selectedOptions[0].text : 'Rows'), h('th', { class: 'num' }, $<HTMLSelectElement>('#dx-metric').selectedOptions[0].text))), tb),
      out.length > 50 ? h('p', { class: 'gl-note' }, `Showing 50 of ${out.length} groups.`) : '');
    lastTable = rows;
  }
  $('#dx-form').addEventListener('input', run); $('#dx-form').addEventListener('submit', e => { e.preventDefault(); run(); });
  $('#dx-set').addEventListener('change', () => setData($<HTMLSelectElement>('#dx-set').value as 'kev' | 'jobs'));
  $('#dx-reset').addEventListener('click', () => { ($('#dx-form') as HTMLFormElement).reset(); setData(set); });
  $('#dx-csv').addEventListener('click', () => { if (!lastTable.length) return; const cols = Object.keys(lastTable[0]); const esc = (v: unknown) => { const t = v === null ? '' : String(v); return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
    const blob = new Blob([[cols.join(','), ...lastTable.map(r => cols.map(c => esc(r[c])).join(','))].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `cyberhub-${set}-filtered.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); });

  DLEVELS.forEach((L, i) => { if (i === 0 || DLEVELS[i - 1].tier !== L.tier) nav.append(h('span', { class: 'label ch-adv-sep' }, L.tier));
    const b = h('button', { type: 'button', 'data-i': String(i), title: L.title, 'aria-label': `Level ${i + 1}, ${L.tier}: ${L.title}` }, String(i + 1)); if (L.tier === 'Advanced') b.classList.add('adv'); b.addEventListener('click', () => open(i)); nav.append(b); });
  const mark = () => { nav.querySelectorAll<HTMLButtonElement>('button').forEach(b => { const i = Number(b.dataset.i); b.classList.toggle('done', solved.includes(DLEVELS[i].id)); b.setAttribute('aria-current', String(i === cur)); });
    $('#dl-count').textContent = `${solved.filter(id => DLEVELS.some(l => l.id === id)).length} of ${DLEVELS.length} solved`; };
  function open(i: number) {
    cur = i; hintN = 0; const L = DLEVELS[i];
    $('#dl-lvl').textContent = `Level ${i + 1} of ${DLEVELS.length} · ${L.tier}: ${L.title}`; $('#dl-q').textContent = L.q(kev, jobs);
    $('#dl-lesson').hidden = true; fb.textContent = ''; $('#dl-hints').replaceChildren(); $('#dl-hint').textContent = 'Stuck? Get a hint'; $<HTMLInputElement>('#dl-a').value = '';
    const extra = $('#dl-extra'); extra.replaceChildren();
    if (L.id === 'month') { const ms = monthly(kev, lastMonths(snapshotDate(kev), 12)); extra.append(barSvg(ms.map(([m, c]) => [m.slice(2), c]), 'KEV additions per month, last 12 months of the snapshot.')); }
    if (L.id === 'axis') { const ms = monthly(kev, lastMonths(snapshotDate(kev), 6)); const lo = Math.min(...ms.map(x => x[1]));
      extra.append(h('div', { class: 'dl-ab' }, h('figure', {}, h('figcaption', { class: 'label' }, 'Chart A'), barSvg(ms.map(([m, c]) => [m.slice(5), c]), 'Chart A, axis from zero', { w: 320, hgt: 200 })),
        h('figure', {}, h('figcaption', { class: 'label' }, 'Chart B'), barSvg(ms.map(([m, c]) => [m.slice(5), c]), 'Chart B, axis truncated', { from: Math.max(0, lo - 2), w: 320, hgt: 200 })))); }
    if (L.set === 'jobs' && set !== 'jobs') setData('jobs'); if (L.set === 'kev' && set !== 'kev') setData('kev');
    mark();
  }
  $('#dl-hint').addEventListener('click', () => { const H = DLEVELS[cur].hints; if (hintN < H.length) { $('#dl-hints').append(h('li', {}, H[hintN])); hintN++; } $('#dl-hint').textContent = hintN < H.length ? 'Another hint' : 'No more hints'; });
  $('#dl-form').addEventListener('submit', e => { e.preventDefault(); const L = DLEVELS[cur]; const v = $<HTMLInputElement>('#dl-a').value.trim(); if (!v) { fb.textContent = 'Type an answer first.'; return; }
    const ok = L.check(v, L.answer(kev, jobs)); fb.textContent = ok ? '✔ Correct. Level complete.' : '✘ Not quite. Check your filters, or take a hint.';
    if (ok) { if (!solved.includes(L.id)) { solved.push(L.id); save(); } const r = $('#dl-lesson'); r.hidden = false; r.querySelector('p')!.textContent = L.lesson; ($('#dl-next') as HTMLButtonElement).hidden = cur >= DLEVELS.length - 1; mark(); } });
  $('#dl-next').addEventListener('click', () => open(Math.min(cur + 1, DLEVELS.length - 1)));

  Promise.all([fetch(base + '/assets/data/kev.json').then(r => r.json()), fetch(base + '/assets/data/internships.json').then(r => r.json())]).then(([k, j]) => {
    kev = (k.rows as unknown[][]).map(r => ({ id: String(r[0]), vendor: String(r[1]), product: String(r[2]), added: String(r[3]), cvss: r[4] === null ? null : Number(r[4]), epss: r[5] === null ? null : Number(r[5]) }));
    jobs = (j.rows as unknown[][]).map(r => ({ company: String(r[0]), title: String(r[1]), city: String(r[2]), miles: r[3] === null ? null : Number(r[3]), zone: String(r[4]), security: r[5] === true, category: String(r[6]), posted: String(r[7]) }));
    $('#dx-meta').textContent = `KEV snapshot ${k.version || ''} (${kev.length.toLocaleString('en-US')} rows, newest ${snapshotDate(kev)}) · internships generated ${String(j.generated || '').slice(0, 10)} (${jobs.length} rows)`;
    setData('kev'); const first = DLEVELS.findIndex(l => !solved.includes(l.id)); open(first < 0 ? 0 : first);
  }).catch(() => { $('#dl-q').textContent = 'The data could not load. Refresh the page.'; });
}
