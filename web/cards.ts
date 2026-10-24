// CyberHub IT flashcards: Network+ and A+ topics with simple spaced repetition (Leitner boxes).
// Progress stays in this browser. No innerHTML.

export type Card = { id: string; deck: string; topic: string; front: string; back: string };
export type Boxes = Record<string, number>; // 1 = learning … 3 = known
/** Next card: lowest box first, then the order given; never the same card twice in a row if avoidable. */
export function nextCard(cards: Card[], boxes: Boxes, last?: string): Card | null {
  if (!cards.length) return null; const box = (c: Card) => boxes[c.id] || 0;
  const sorted = [...cards].sort((a, b) => box(a) - box(b)); const low = box(sorted[0]);
  const pool = sorted.filter(c => box(c) === low && c.id !== last); return pool[0] || sorted.find(c => c.id !== last) || sorted[0];
}
export const grade = (boxes: Boxes, id: string, knew: boolean): Boxes => ({ ...boxes, [id]: knew ? Math.min(3, (boxes[id] || 0) + 1) : 1 });

const app = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('#itcards');
if (app) {
  const base = document.body.dataset.base || ''; const $ = <T extends HTMLElement = HTMLElement>(s: string) => app.querySelector<T>(s)!;
  const KEY = 'cyberhub:itcards'; let boxes: Boxes = {}; try { boxes = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { /* ignore */ }
  let all: Card[] = [], deck = 'all', cur: Card | null = null, flipped = false, order: string[] = [];
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(boxes)); } catch { /* ignore */ } };
  const list = () => all.filter(c => deck === 'all' || c.deck === deck).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  function show() {
    const cs = list(); cur = nextCard(cs, boxes, cur?.id); flipped = false; const face = $('#ic-face');
    if (!cur) { face.textContent = 'No cards in this deck.'; return; }
    $('#ic-topic').textContent = cur.topic; face.textContent = cur.front; face.setAttribute('aria-pressed', 'false'); $('#ic-side').textContent = 'Question · tap or press Space to flip';
    $('#ic-grade').hidden = true;
    const known = cs.filter(c => (boxes[c.id] || 0) >= 3).length, seen = cs.filter(c => boxes[c.id]).length;
    $('#ic-stats').textContent = `${known} of ${cs.length} known · ${seen} seen`; $('#ic-bar').style.setProperty('--p', String(cs.length ? known / cs.length : 0));
  }
  function flip() { if (!cur) return; flipped = !flipped; const face = $('#ic-face'); face.textContent = flipped ? cur.back : cur.front; face.setAttribute('aria-pressed', String(flipped)); $('#ic-side').textContent = flipped ? 'Answer · did you know it?' : 'Question · tap or press Space to flip'; $('#ic-grade').hidden = !flipped; }
  const mark = (knew: boolean) => { if (!cur) return; boxes = grade(boxes, cur.id, knew); save(); show(); $('#ic-face').focus(); };
  $('#ic-face').addEventListener('click', flip);
  $('#ic-face').addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); } else if (flipped && (e.key === '1' || e.key === 'ArrowLeft')) mark(false); else if (flipped && (e.key === '2' || e.key === 'ArrowRight')) mark(true); });
  $('#ic-again').addEventListener('click', () => mark(false)); $('#ic-knew').addEventListener('click', () => mark(true));
  $('#ic-shuffle').addEventListener('click', () => { order = [...order].sort(() => Math.random() - 0.5); show(); });
  $('#ic-reset').addEventListener('click', () => { const b = $('#ic-reset'); if (b.dataset.c !== '1') { b.dataset.c = '1'; b.textContent = 'Click again to reset this deck'; return; } list().forEach(c => delete boxes[c.id]); save(); b.dataset.c = ''; b.textContent = 'Reset progress'; show(); });
  app.querySelectorAll<HTMLButtonElement>('[data-deck]').forEach(b => b.addEventListener('click', () => { deck = b.dataset.deck!; app.querySelectorAll('[data-deck]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); show(); }));
  fetch(base + '/assets/it_cards.json').then(r => r.json()).then(d => { all = d.cards; order = all.map(c => c.id); show(); }).catch(() => { $('#ic-face').textContent = 'Cards could not load. Refresh to try again.'; });
}
