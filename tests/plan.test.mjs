// Study planner packing and calendar export; IT flashcard spaced repetition.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const load = async name => { const f = join(mkdtempSync(join(tmpdir(), name + '-')), name + '.mjs'); writeFileSync(f, stripTypeScriptTypes(readFileSync(new URL(`../web/${name}.ts`, import.meta.url), 'utf8'), { mode: 'strip' })); return import(pathToFileURL(f).href); };
const P = await load('plan'), C = await load('cards');

test('planner packs tasks into weekly budgets in order', () => {
  const tasks = [30, 40, 50, 200, 20].map((m, i) => ({ t: 'T' + i, u: '/x/', m }));
  const w = P.pack(tasks, 2); assert.deepEqual(w.map(x => x.map(t => t.t)), [['T0', 'T1', 'T2'], ['T3'], ['T4']]);
  assert.equal(P.pack(tasks, 10).length, 1); assert.deepEqual(P.pack(tasks, 10).flat().map(t => t.t), tasks.map(t => t.t));
});

test('calendar export is valid iCalendar with one event per week', () => {
  const weeks = [[{ t: 'Linux, part 1; basics', u: '/linux/', m: 40 }], [{ t: 'Networking', u: '/linux/network/', m: 45 }]];
  const s = P.ics('IT fundamentals', weeks, new Date(2026, 9, 24), 6, '10:30', 'https://example.org', new Date(Date.UTC(2026, 9, 24, 12)));
  assert.match(s, /^BEGIN:VCALENDAR\r\n/); assert.match(s, /END:VCALENDAR\r\n$/); assert.equal((s.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert.match(s, /DTSTART:20261024T103000/); assert.match(s, /DTSTART:20261031T103000/); assert.match(s, /Linux\\, part 1\; basics/);
  assert.ok(s.split('\r\n').every(l => l.length <= 75), 'lines folded');
});

test('planner bounds invalid hours', () => {
  const tasks = [40, 40].map((m, i) => ({ t: String(i), u: '/x', m }));
  assert.equal(P.pack(tasks, NaN).length, 2);
});

test('calendar rejects invalid date, weekday and time', () => {
  const tasks = [40, 40].map((m, i) => ({ t: String(i), u: '/x', m }));
  const weeks = [tasks];
  for (const [date, day, time] of [[new Date('invalid'), 6, '10:00'], [new Date(), 7, '10:00'], [new Date(), 6, '']]) {
    assert.throws(() => P.ics('x', weeks, date, day, time, 'https://example.org'), /Invalid/);
  }
});

test('flashcards: missed cards come back first, known cards rise to box 3', () => {
  const cards = ['a', 'b', 'c'].map(id => ({ id, deck: 'net', topic: 'x', front: id, back: id }));
  let b = {}; b = C.grade(b, 'a', true); b = C.grade(b, 'b', false); b = C.grade(b, 'c', true); b = C.grade(b, 'c', true);
  assert.equal(C.nextCard(cards, b).id, 'a'); assert.equal(C.nextCard(cards, b, 'a').id, 'b');
  b = C.grade(C.grade(C.grade(b, 'a', true), 'a', true), 'a', true); assert.equal(b.a, 3); assert.equal(C.grade(b, 'a', false).a, 1);
  assert.equal(C.nextCard([], {}), null);
});
