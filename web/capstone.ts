import { completedStages } from './capstone-progress.js';

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
export function markdown(title: string, fields: Record<string, string>): string {
  return [`# Incident report: ${title}`, ...['Summary', 'Timeline (UTC)', 'Affected accounts and hosts', 'Indicators', 'Containment and next steps'].map((title, i) => `## ${title}\n${fields[['summary', 'timeline', 'affected', 'indicators', 'containment'][i]] || ''}`)].join('\n\n');
}
export function reconcileProgress(value: unknown): Progress {
  const p = value && typeof value === 'object' ? value as Partial<Progress> : {};
  if (!Array.isArray(p.solved)) return empty();
  const solved = p.solved.filter((id): id is string => typeof id === 'string');
  return { solved, hints: Array.isArray(p.hints) ? p.hints.filter((id): id is string => typeof id === 'string') : [], stages: completedStages(solved), submitted: p.submitted === true, best: typeof p.best === 'number' && Number.isFinite(p.best) ? p.best : 0 };
}
const load = (): Progress => { try { return reconcileProgress(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch { return empty(); } };
export function refreshTargets(stageIndex: number, questionId: string, newlyUnlocked: boolean) {
  return { questionId, stageIndex, newStageIndex: newlyUnlocked ? stageIndex + 1 : null };
}
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
  const progressLines: HTMLElement[] = [];
  const cards: Record<string, { input: HTMLInputElement | HTMLSelectElement; button: HTMLElement; message: HTMLElement }> = {};
  const rendered = new Set<number>();
  const updateReport = () => {
    report.hidden = !complete(p, c);
    if (!report.hidden && !controls.timeline.value) controls.timeline.value = confirmedTimeline(p, c);
  };
  const renderStage = (index: number) => {
    if (rendered.has(index)) return;
    rendered.add(index);
    const s = c.stages[index]; const el = stageElements[index]; el.hidden = false;
    const box = el.querySelector<HTMLElement>('.cap-questions')!;
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
      cards[q.id] = { input, button, message };
      if (done) { input.remove(); button.remove(); continue; }
      form.addEventListener('submit', event => { event.preventDefault(); const value = input.value;
        if (!correct(q, value)) { p.hints = [...new Set([...p.hints, q.id])]; message.textContent = `Try again. Hint: ${q.hint}`; save(p); return; }
        const wasComplete = s.questions.every(item => p.solved.includes(item.id));
        p.solved = [...new Set([...p.solved, q.id])]; p.stages = completedStages(p.solved);
        p.best = Math.max(p.best, score(p, c)); save(p);
        refresh(refreshTargets(index, q.id, !wasComplete && p.stages.includes(s.id) && index + 1 < c.stages.length));
      });
    }
    progressLines[index] = add(box, 'p', '', 'label');
    updateProgress(index);
  };
  const updateProgress = (index: number) => {
    const s = c.stages[index]; const done = s.questions.filter(q => p.solved.includes(q.id)).length;
    progressLines[index].textContent = `${done}/${s.questions.length} findings confirmed · ${score(p, c)} points`;
  };
  const refresh = (targets: ReturnType<typeof refreshTargets>) => {
    const { questionId, stageIndex, newStageIndex } = targets;
    const q = c.stages[stageIndex].questions.find(item => item.id === questionId)!;
    const card = cards[questionId]; card.message.textContent = `Confirmed · ${q.answer}`;
    card.input.remove(); card.button.remove(); updateProgress(stageIndex);
    if (newStageIndex !== null) renderStage(newStageIndex);
    updateReport();
    const next = c.stages[stageIndex].questions.find(item => !p.solved.includes(item.id));
    if (next) cards[next.id].input.focus();
    else if (newStageIndex !== null) { const heading = stageElements[newStageIndex].querySelector<HTMLElement>('h2')!; heading.tabIndex = -1; heading.focus(); }
    else if (!report.hidden) { const heading = report.querySelector<HTMLElement>('h2')!; heading.tabIndex = -1; heading.focus(); }
  };
  c.stages.forEach((stage, index) => {
    stageElements[index].hidden = true;
    if (index === 0 || c.stages.slice(0, index).every(prev => prev.questions.every(q => p.solved.includes(q.id)))) renderStage(index);
  });
  updateReport();
  const result = document.querySelector<HTMLElement>('#cap-result')!;
  document.querySelector<HTMLButtonElement>('#cap-submit')!.addEventListener('click', () => {
    if (!complete(p, c)) return;
    const values = Object.fromEntries(names.map(([key]) => [key, controls[key].value.trim()]));
    if (Object.values(values).some(v => !v)) { document.querySelector('#cap-report-message')!.textContent = 'Complete every report field before submitting.'; return; }
    document.querySelector('#cap-report-message')!.textContent = `Report submitted · ${score(p, c)}/${all.length * 10} evidence points · ${p.hints.length} hints used. The write-up is not auto-graded.`;
    document.querySelector<HTMLTextAreaElement>('#cap-markdown')!.value = markdown(c.title, values); result.hidden = false;
    p.submitted = true; p.best = Math.max(p.best, score(p, c)); save(p);
    const model = result.querySelector<HTMLElement>('.cap-model-text')!; model.replaceChildren();
    for (const [key, value] of Object.entries(c.model)) { add(model, 'h4', key[0].toUpperCase() + key.slice(1)); add(model, 'p', value); }
  });
  document.querySelector<HTMLButtonElement>('#cap-copy')!.addEventListener('click', async () => {
    const area = document.querySelector<HTMLTextAreaElement>('#cap-markdown')!;
    try { await navigator.clipboard.writeText(area.value); document.querySelector('#cap-report-message')!.textContent = 'Report copied.'; }
    catch { area.focus(); area.select(); document.querySelector('#cap-report-message')!.textContent = 'Select and copy the report text.'; }
  });
}
if (typeof document !== 'undefined' && document.getElementById('capstone')) {
  fetch(`${document.body.dataset.base || ''}/assets/capstone.json`).then(r => { if (!r.ok) throw Error('Case data unavailable'); return r.json(); }).then((c: Case) => run(c)).catch(() => { const el = document.querySelector('#cap-load-error'); if (el) el.textContent = 'Case questions could not load. The evidence remains readable below.'; });
}
