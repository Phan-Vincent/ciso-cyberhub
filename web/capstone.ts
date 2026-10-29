// Connected fictional investigation. Evidence is also server-rendered for reading without JS.
export type Question = { id: string; prompt: string; type: 'exact' | 'choice' | 'line'; answer: string; accept?: string[]; derived?: boolean; options?: string[]; carry?: string; hint: string; timeline?: string };
export type Stage = { id: string; title: string; intro: string; evidence: string[]; questions: Question[] };
export type Case = { id: string; title: string; setting: string; stages: Stage[]; model: Record<string, string> };
export type Progress = { solved: string[]; hints: string[]; stages: string[]; submitted: boolean; best: number };
export const KEY = 'cyberhub:capstone';
export const empty = (): Progress => ({ solved: [], hints: [], stages: [], submitted: false, best: 0 });
export function normalize(s: string): string { return s.trim().toLowerCase().replace(/[\u2010-\u2015]/g, '-').replace(/\s+/g, ' '); }
export function correct(q: Question, value: string): boolean { return [q.answer, ...(q.accept || [])].some(a => normalize(value) === normalize(a)); }
export function score(p: Progress, c: Case): number { return c.stages.flatMap(s => s.questions).reduce((n, q) => n + (p.solved.includes(q.id) ? (p.hints.includes(q.id) ? 8 : 10) : 0), 0); }
export function complete(p: Progress, c: Case): boolean { return c.stages.every(s => s.questions.every(q => p.solved.includes(q.id))); }
export function caseClosed(p: Progress, c: Case): boolean { return p.submitted && complete(p, c); }
export function confirmedTimeline(p: Progress, c: Case): string { return c.stages.flatMap(s => s.questions.filter(q => q.timeline && p.solved.includes(q.id)).map(q => q.timeline!)).join('\n'); }
export function markdown(fields: Record<string, string>): string {
  return ['# Incident report: The VPN update', ...['Summary', 'Timeline (UTC)', 'Affected accounts and hosts', 'Indicators', 'Containment and next steps'].map((title, i) => `## ${title}\n${fields[['summary', 'timeline', 'affected', 'indicators', 'containment'][i]] || ''}`)].join('\n\n');
}
const load = (): Progress => { try { const p = JSON.parse(localStorage.getItem(KEY) || 'null'); return p && Array.isArray(p.solved) && Array.isArray(p.hints) && Array.isArray(p.stages) ? { ...empty(), ...p } : empty(); } catch { return empty(); } };
const save = (p: Progress) => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage unavailable */ } };
const add = (parent: Element, tag: string, content: string, className = ''): HTMLElement => { const el = document.createElement(tag); el.textContent = content; if (className) el.className = className; parent.append(el); return el; };
function run(c: Case) {
  const p = load();
  const all = c.stages.flatMap(s => s.questions);
  const report = document.querySelector<HTMLElement>('#cap-report')!;
  const fields = report.querySelector<HTMLElement>('.cap-fields')!;
  const names: [string, string][] = [['summary', 'Summary'], ['timeline', 'Timeline (UTC)'], ['affected', 'Affected accounts and hosts'], ['indicators', 'Indicators'], ['containment', 'Containment and next steps']];
  const controls: Record<string, HTMLTextAreaElement> = {};
  for (const [key, label] of names) { const wrap = add(fields, 'div', '', 'cap-field'); const id = `cap-${key}`; const lab = add(wrap, 'label', label); lab.setAttribute('for', id); const area = document.createElement('textarea'); area.id = id; area.rows = key === 'timeline' ? 6 : 4; area.maxLength = 4000; wrap.append(area); controls[key] = area; }
  const stageElements = c.stages.map(s => document.getElementById(s.id)!);
  const refresh = () => {
    c.stages.forEach((s, index) => {
      const unlocked = index === 0 || c.stages.slice(0, index).every(prev => prev.questions.every(q => p.solved.includes(q.id)));
      const el = stageElements[index]; el.hidden = !unlocked;
      if (!unlocked) return;
      const box = el.querySelector<HTMLElement>('.cap-questions')!; box.replaceChildren();
      const carry = s.questions.find(q => q.carry)?.carry;
      const prior = carry ? all.find(q => q.id === carry) : null;
      if (prior) add(box, 'p', `Carried from stage ${index}: ${prior.answer}`, 'cap-carry');
      for (const q of s.questions) {
        const card = add(box, 'div', '', 'cap-question'); add(card, 'h3', q.prompt);
        const done = p.solved.includes(q.id); const form = document.createElement('form'); card.append(form);
        let input: HTMLInputElement | HTMLSelectElement;
        if (q.type === 'exact') { const field = document.createElement('input'); field.type = 'text'; field.autocomplete = 'off'; field.spellcheck = false; field.setAttribute('aria-label', q.prompt); input = field; }
        else { const select = document.createElement('select'); select.setAttribute('aria-label', q.prompt); const first = document.createElement('option'); first.value = ''; first.textContent = q.type === 'line' ? 'Select a log line' : 'Choose an answer'; select.append(first); for (const value of q.type === 'line' ? s.evidence.map(e => e.split(' | ')[0]) : q.options || []) { const opt = document.createElement('option'); opt.value = value; opt.textContent = value; select.append(opt); } input = select; }
        form.append(input); const button = add(form, 'button', 'Check answer'); button.setAttribute('type', 'submit');
        const message = add(card, 'p', done ? `Confirmed · ${q.answer}` : p.hints.includes(q.id) ? `Hint: ${q.hint}` : '', 'cap-feedback'); message.setAttribute('role', 'status');
        if (done) { input.remove(); button.remove(); continue; }
        form.addEventListener('submit', event => { event.preventDefault(); const value = input.value;
          if (!correct(q, value)) { p.hints = [...new Set([...p.hints, q.id])]; message.textContent = `Try again. Hint: ${q.hint}`; save(p); return; }
          p.solved = [...new Set([...p.solved, q.id])]; if (s.questions.every(item => p.solved.includes(item.id))) p.stages = [...new Set([...p.stages, s.id])]; p.best = Math.max(p.best, score(p, c)); save(p); refresh(); });
      }
      const done = s.questions.filter(q => p.solved.includes(q.id)).length;
      add(box, 'p', `${done}/${s.questions.length} findings confirmed · ${score(p, c)} points`, 'label');
    });
    report.hidden = !complete(p, c);
    if (!report.hidden && !controls.timeline.value) controls.timeline.value = confirmedTimeline(p, c);
  };
  const result = document.querySelector<HTMLElement>('#cap-result')!;
  document.querySelector<HTMLButtonElement>('#cap-submit')!.addEventListener('click', () => {
    if (!complete(p, c)) return;
    const values = Object.fromEntries(names.map(([key]) => [key, controls[key].value.trim()]));
    if (Object.values(values).some(v => !v)) { document.querySelector('#cap-report-message')!.textContent = 'Complete every report field before submitting.'; return; }
    document.querySelector('#cap-report-message')!.textContent = `Report submitted · ${score(p, c)}/${all.length * 10} evidence points · ${p.hints.length} hints used. The write-up is not auto-graded.`;
    document.querySelector<HTMLTextAreaElement>('#cap-markdown')!.value = markdown(values); result.hidden = false;
    p.submitted = true; p.best = Math.max(p.best, score(p, c)); save(p);
    const model = result.querySelector<HTMLElement>('.cap-model-text')!; model.replaceChildren();
    for (const [key, value] of Object.entries(c.model)) { add(model, 'h4', key[0].toUpperCase() + key.slice(1)); add(model, 'p', value); }
  });
  document.querySelector<HTMLButtonElement>('#cap-copy')!.addEventListener('click', async () => {
    const area = document.querySelector<HTMLTextAreaElement>('#cap-markdown')!;
    try { await navigator.clipboard.writeText(area.value); document.querySelector('#cap-report-message')!.textContent = 'Report copied.'; }
    catch { area.focus(); area.select(); document.querySelector('#cap-report-message')!.textContent = 'Select and copy the report text.'; }
  });
  refresh();
}
if (typeof document !== 'undefined' && document.getElementById('capstone')) {
  fetch(`${document.body.dataset.base || ''}/assets/capstone.json`).then(r => { if (!r.ok) throw Error('Case data unavailable'); return r.json(); }).then((c: Case) => run(c)).catch(() => { const el = document.querySelector('#cap-load-error'); if (el) el.textContent = 'Case questions could not load. The evidence remains readable below.'; });
}
