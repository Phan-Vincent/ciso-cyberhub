// CyberHub study planner: pack a goal's activities into weeks, track ticks, export to calendar.
export type Task = { t: string; u: string; m: number };
export type Week = Task[];
/** Greedy, order-preserving packing into weekly minute budgets; an oversized task gets its own week. */
export function pack(tasks: Task[], hoursPerWeek: number): Week[] {
  const cap = Math.max(30, (Number.isFinite(hoursPerWeek) && hoursPerWeek > 0 ? hoursPerWeek : 0.5) * 60); const weeks: Week[] = []; let cur: Week = [], used = 0;
  for (const t of tasks) { if (cur.length && used + t.m > cap) { weeks.push(cur); cur = []; used = 0; } cur.push(t); used += t.m; }
  if (cur.length) weeks.push(cur); return weeks;
}
const pad = (n: number) => String(n).padStart(2, '0');
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const fold = (line: string) => { const out: string[] = []; let s = line; while (s.length > 74) { out.push(s.slice(0, 74)); s = ' ' + s.slice(74); } out.push(s); return out.join('\r\n'); };
/** One calendar event per week on the chosen weekday and time (floating local time). */
export function ics(title: string, weeks: Week[], start: Date, weekday: number, time: string, origin: string, now = new Date()): string {
  if (!Number.isFinite(start.getTime()) || !Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Invalid calendar date, weekday or time');
  const first = new Date(start.getFullYear(), start.getMonth(), start.getDate()); while (first.getDay() !== weekday) first.setDate(first.getDate() + 1);
  const [h, mi] = time.split(':').map(Number); const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CISO CyberHub//Study planner//EN', 'CALSCALE:GREGORIAN'];
  weeks.forEach((w, i) => { const d = new Date(first); d.setDate(first.getDate() + 7 * i); const mins = w.reduce((x, t) => x + t.m, 0);
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, mi + Math.min(mins, 180));
    const f = (x: Date, hh: number, mm: number) => `${x.getFullYear()}${pad(x.getMonth() + 1)}${pad(x.getDate())}T${pad(hh)}${pad(mm)}00`;
    lines.push('BEGIN:VEVENT', `UID:cyberhub-${d.getTime()}-${i}@cyberhub`, `DTSTAMP:${stamp}`, `DTSTART:${f(d, h, mi)}`, `DTEND:${f(end, end.getHours(), end.getMinutes())}`,
      fold(`SUMMARY:${esc(`CyberHub · ${title} · week ${i + 1}`)}`), fold(`DESCRIPTION:${esc(w.map(t => `• ${t.t} (${t.m} min) ${origin}${t.u}`).join('\n'))}`), 'END:VEVENT'); });
  lines.push('END:VCALENDAR'); return lines.join('\r\n') + '\r\n';
}

const app = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('#planner');
if (app) {
  const base = document.body.dataset.base || ''; const $ = <T extends HTMLElement = HTMLElement>(s: string) => app.querySelector<T>(s)!;
  const el = (tag: string, text = '', cls = '') => { const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; };
  type Saved = { goal: string; hours: number; start: string; day: number; time: string; done: string[] };
  const KEY = 'cyberhub:plan'; let goals: Record<string, { name: string; tasks: Task[] }> = {}; let saved: Saved | null = null;
  try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* ignore */ }
  const store = () => { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { /* ignore */ } };
  const today = new Date(); $<HTMLInputElement>('#pl-start').value = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  function render() {
    if (!saved || !goals[saved.goal]) { $('#pl-out').hidden = true; return; } const g = goals[saved.goal]; const weeks = pack(g.tasks, saved.hours); const done = new Set(saved.done);
    const start = new Date(saved.start + 'T00:00'); $('#pl-out').hidden = false; $('#pl-title').textContent = g.name;
    const total = g.tasks.length, n = g.tasks.filter((t, i) => done.has(`${i}`)).length; $('#pl-sum').textContent = `${weeks.length} weeks at ${saved.hours} h/week · ${n} of ${total} done`; $('#pl-bar').style.setProperty('--p', String(n / total));
    let k = 0; const ol = $('#pl-weeks'); ol.replaceChildren(...weeks.map((w, wi) => { const li = el('li', '', 'pl-week'); const d = new Date(start); d.setDate(start.getDate() + 7 * wi);
      const mins = w.reduce((x, t) => x + t.m, 0); li.append(el('h3', `Week ${wi + 1}`), el('p', `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · about ${Math.round(mins / 6) / 10} h`, 'label'));
      const ul = el('ul'); for (const t of w) { const id = String(k++); const row = el('li'); const lab = el('label'); const cb = el('input') as HTMLInputElement; cb.type = 'checkbox'; cb.checked = done.has(id);
        cb.addEventListener('change', () => { const s = new Set(saved!.done); if (cb.checked) s.add(id); else s.delete(id); saved!.done = [...s]; store(); render(); });
        const a = el('a', t.t) as HTMLAnchorElement; a.href = base + t.u; lab.append(cb, a, el('span', ` ${t.m} min`, 'label')); row.append(lab); ul.append(row); }
      li.append(ul); if (w.every((_, j) => done.has(String(k - w.length + j)))) li.classList.add('done'); return li; }));
  }
  fetch(base + '/assets/plan.json').then(r => r.json()).then(g => { goals = g; const sel = $<HTMLSelectElement>('#pl-goal'); for (const [k, v] of Object.entries(goals)) { const o = el('option', v.name) as HTMLOptionElement; o.value = k; sel.append(o); }
    if (saved) { sel.value = saved.goal; $<HTMLSelectElement>('#pl-hours').value = String(saved.hours); $<HTMLInputElement>('#pl-start').value = saved.start; $<HTMLSelectElement>('#pl-day').value = String(saved.day); $<HTMLInputElement>('#pl-time').value = saved.time; } render(); });
  $('#pl-form').addEventListener('submit', e => { e.preventDefault(); saved = { goal: $<HTMLSelectElement>('#pl-goal').value, hours: Number($<HTMLSelectElement>('#pl-hours').value), start: $<HTMLInputElement>('#pl-start').value || new Date().toISOString().slice(0, 10), day: Number($<HTMLSelectElement>('#pl-day').value), time: $<HTMLInputElement>('#pl-time').value || '10:00', done: [] }; store(); render(); $('#pl-out').scrollIntoView({ block: 'start' }); });
  $('#pl-ics').addEventListener('click', () => { if (!saved) return; const g = goals[saved.goal]; const txt = ics(g.name, pack(g.tasks, saved.hours), new Date(saved.start + 'T00:00'), saved.day, saved.time, location.origin);
    const a = el('a') as HTMLAnchorElement; a.href = URL.createObjectURL(new Blob([txt], { type: 'text/calendar' })); a.download = 'cyberhub-study-plan.ics'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); });
  $('#pl-print').addEventListener('click', () => window.print());
  $('#pl-clear').addEventListener('click', () => { saved = null; try { localStorage.removeItem(KEY); } catch { /* ignore */ } render(); });
}
