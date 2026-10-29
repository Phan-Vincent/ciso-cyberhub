// CyberHub challenge board: checks flags against SHA-256 hashes from /assets/ctf.json, charges a
// quarter of the points per hint (never below a quarter), and keeps score in this browser. Text only.
import { sha256Bytes } from './sha256.js';

export type Prog = Record<string, { s?: 1; h?: number; p?: number }>;
export const normFlag = (s: string) => { let v = s.replace(/\s+/g, '').toLowerCase(); if (v.startsWith('ciso{') && v.endsWith('}')) v = v.slice(5, -1); return v; };
export const award = (pts: number, hints: number) => Math.max(Math.round(pts / 4), Math.round(pts * (1 - 0.25 * hints)));
export const hashHex = (s: string) => [...sha256Bytes(new TextEncoder().encode(s))].map(b => b.toString(16).padStart(2, '0')).join('');

const root = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('#ctf');
if (root) {
  const base = document.body.dataset.base || ''; const KEY = 'cyberhub:ctf';
  let prog: Prog = {}; try { const v = JSON.parse(localStorage.getItem(KEY) || '{}'); if (v && typeof v === 'object' && !Array.isArray(v)) prog = v; } catch { /* ignore */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prog)); } catch { /* ignore */ } };
  const cards = Array.from(root.querySelectorAll<HTMLDetailsElement>('.ctf-card'));
  const score = () => { let s = 0, n = 0; for (const c of cards) { const p = prog[c.dataset.id!]; if (p?.s) { s += p.p || 0; n++; } }
    root.querySelector('#ctf-score')!.textContent = String(s); root.querySelector('#ctf-solved')!.textContent = String(n); };
  fetch(base + '/assets/ctf.json').then(r => r.json()).then((list: { id: string; pts: number; hash: string; hints: number }[]) => {
    const info = new Map(list.map(x => [x.id, x]));
    for (const card of cards) {
      const id = card.dataset.id!, meta = info.get(id); if (!meta) continue;
      const hints = Array.from(card.querySelectorAll<HTMLLIElement>('.ctf-hints li')); const hb = card.querySelector<HTMLButtonElement>('.ctf-hint')!;
      const msg = card.querySelector<HTMLElement>('.ctf-msg')!; const form = card.querySelector<HTMLFormElement>('.ctf-form')!; const input = form.querySelector('input')!;
      const paint = () => { const p = prog[id] || {}; const used = p.h || 0; hints.forEach((li, i) => { li.hidden = i >= used; });
        hb.hidden = !!p.s || used >= hints.length; hb.textContent = `Hint ${used + 1} of ${hints.length} (worth ${award(meta.pts, used + 1)} after)`;
        card.classList.toggle('solved', !!p.s); card.querySelector('.ctf-state')!.textContent = p.s ? `✔ ${p.p}` : used ? `${award(meta.pts, used)} left` : '';
        card.querySelector<HTMLElement>('.ctf-explain')!.hidden = !p.s; form.hidden = !!p.s; if (p.s) msg.textContent = `Solved for ${p.p} points.`; };
      hb.addEventListener('click', () => { const p = prog[id] || (prog[id] = {}); if (p.s) return; p.h = Math.min(hints.length, (p.h || 0) + 1); save(); paint(); });
      form.addEventListener('submit', e => { e.preventDefault(); const v = normFlag(input.value); if (!v) return; const p = prog[id] || (prog[id] = {});
        if (hashHex(v) === meta.hash) { p.s = 1; p.p = award(meta.pts, p.h || 0); save(); paint(); score(); msg.textContent = `✔ Correct! +${p.p} points.`; }
        else msg.textContent = '✘ Not the flag. Check the format CISO{...}, or take a hint.'; });
      paint();
    }
    score();
    const chips = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-ctf-cat]'));
    chips.forEach(ch => ch.addEventListener('click', () => { const c = ch.dataset.ctfCat || ''; chips.forEach(x => x.setAttribute('aria-pressed', String(x === ch)));
      cards.forEach(k => { k.hidden = !!c && k.dataset.cat !== c; }); root.querySelectorAll<HTMLElement>('.ctf-tier').forEach(t => { t.hidden = !t.querySelector('.ctf-card:not([hidden])'); }); }));
    const h = location.hash.slice(1); const target = h && document.getElementById(h); if (target instanceof HTMLDetailsElement) target.open = true;
  }).catch(() => { root.querySelector('.ctf-rules')!.textContent = 'The challenge list could not load. Refresh the page.'; });
}
