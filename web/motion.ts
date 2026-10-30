// Motion system modeled on heronaiapp.com: Lenis smooth scroll, masked line reveals for headings,
// typed mono labels, hairlines that draw in, cards that settle from a slight zoom, a rolling button
// label, a crosshair cursor with coordinates over the hero, and a panel wipe between pages.
// Everything is skipped when the visitor asks for reduced motion.

declare global { interface Window { Lenis?: new (o: Record<string, unknown>) => LenisLike; __lenis?: LenisLike } }
type LenisLike = { raf: (t: number) => void; scrollTo: (target: Element | number | string, o?: Record<string, unknown>) => void; on: (e: string, f: () => void) => void; destroy: () => void };

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const doc = document.documentElement;
const EXPO = 'cubic-bezier(.16, 1, .3, 1)';

if (!reduce) {
  doc.classList.add('hx-motion');

  /* ---------------------------------------------------------- smooth scroll (Lenis, as Heron) */
  if (window.Lenis && fine) {
    const scrollable = (n: HTMLElement | null): boolean => {
      for (let el = n; el && el !== document.body; el = el.parentElement) {
        if (el.matches('[data-lenis-prevent], textarea, select, .menu, .mega, .lx-term, .term-out, canvas')) return true;
        const s = getComputedStyle(el);
        if (/(auto|scroll)/.test(s.overflowY + s.overflowX) && (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2)) return true;
      }
      return false;
    };
    const lenis = new window.Lenis({ duration: 1.15, easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true, prevent: scrollable });
    window.__lenis = lenis;
    const loop = (t: number) => { lenis.raf(t); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    document.addEventListener('click', e => {
      const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]'); if (!a || a.getAttribute('href') === '#') return;
      const t = document.querySelector(a.getAttribute('href')!); if (!t) return;
      e.preventDefault(); lenis.scrollTo(t, { offset: -72 }); history.replaceState(null, '', a.getAttribute('href'));
    });
  }

  /* ---------------------------------------------------------- masked line reveals for headings */
  // Words sit in an overflow-hidden mask and rise from 100% below, staggered line by line.
  const splitWords = (h: HTMLElement) => {
    if (h.dataset.hxSplit) return; h.dataset.hxSplit = '1';
    if (!h.querySelector('.w')) {
      if ([...h.childNodes].some(n => n.nodeType === 1 && !(n as Element).matches('br'))) return; // keep links and markup intact
      const text = h.textContent || ''; if (!text.trim()) return;
      h.setAttribute('aria-label', text.trim());
      h.replaceChildren(...text.split(/(\s+)/).filter(Boolean).map(t => {
        if (/^\s+$/.test(t)) return document.createTextNode(' ');
        const w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
        const i = document.createElement('span'); i.textContent = t; w.append(i); return w;
      }));
    }
    h.classList.add('wr');
  };
  const stagger = (h: HTMLElement) => {
    const words = [...h.querySelectorAll<HTMLElement>('.w')]; let line = -1, top = -1e9, k = 0;
    for (const w of words) { const t = w.offsetTop; if (Math.abs(t - top) > 4) { line++; top = t; k = 0; } w.style.setProperty('--d', `${line * 90 + k * 18}ms`); k++; }
  };
  const HEADS = 'main h1, main .sec-head h2, main .ab-side h2, main .ab-cta h2, main .gx-sec > h2, main .globe-sec h2, main .dir-head h2, main .lab-track-head h2, main .pl-learn > h2, main .gx-live-head h2, main .gx-cta h2, main .scene.cta h2';
  const heads = [...document.querySelectorAll<HTMLElement>(HEADS)];
  heads.forEach(splitWords);
  const ready = () => heads.forEach(stagger);
  (document.fonts?.ready || Promise.resolve()).then(ready);
  addEventListener('resize', () => requestAnimationFrame(ready), { passive: true });

  /* ---------------------------------------------------------- typed mono labels (Heron's TextPlugin) */
  const LABELS = 'main .crumb, main .sec-head .label, main .ab-side .label, main .globe-sec .label, main .brief .label, main .ab-boot, main .gx-live-head .label, main .ab-stack > .label, main .ab-fine > .label, main .lab-track-head .label';
  const typed = [...document.querySelectorAll<HTMLElement>(LABELS)].filter(l => l.children.length === 0 && (l.textContent || '').trim().length > 1 && (l.textContent || '').length < 60);
  typed.forEach(l => { l.dataset.hxText = l.textContent || ''; l.setAttribute('aria-label', l.dataset.hxText); l.classList.add('hx-type'); });
  const type = (l: HTMLElement) => {
    const full = l.dataset.hxText || ''; const glyphs = '#/_[]<>01'; let i = 0;
    const tick = () => { i++; const shown = full.slice(0, i); const tail = i < full.length ? glyphs[i % glyphs.length] : '';
      l.textContent = shown + tail; if (i < full.length) setTimeout(tick, 22); else l.textContent = full; };
    l.textContent = ''; l.classList.add('typing'); setTimeout(tick, doc.classList.contains('hx-booting') ? 1100 : 120);
  };

  /* ---------------------------------------------------------- settle-in for boxes, draw-in for hairlines */
  const BOXES = 'main .card, main .dir-card, main .path-card, main .today-stat, main .gx-card, main .ab-card, main .ctf-card, main .pl-tier, main .brief > div, main .gx-grid article, main .gx-defs > div, main .gx-loop li, main .ab-mission li, main .ab-row, main .dw, main .gx-charts figure';
  const boxes = [...document.querySelectorAll<HTMLElement>(BOXES)];
  boxes.forEach(b => b.classList.add('hx-box'));
  const LINES = 'main .gx-sec, main .ab-story, main .ab-team, main .ab-stack, main .ab-cta, main .ab-fine, main .dir-section, main .lab-track, main .pl-learn, main .brief, main .globe-sec, main #paths, main #today';
  document.querySelectorAll<HTMLElement>(LINES).forEach(s => s.classList.add('hx-rule'));

  const io = new IntersectionObserver(entries => {
    const now = entries.filter(e => e.isIntersecting).map(e => e.target as HTMLElement).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top || a.getBoundingClientRect().left - b.getBoundingClientRect().left);
    now.forEach((el, n) => {
      if (el.classList.contains('hx-box')) el.style.setProperty('--d', `${Math.min(n, 8) * 50}ms`);
      el.classList.add('hx-in');
      if (el.classList.contains('hx-type')) type(el);
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: .01 });
  [...heads, ...typed, ...boxes, ...document.querySelectorAll<HTMLElement>('.hx-rule, main .lead, main .intro, main .hero-lead, main .ab-intro, main .gx-lead')].forEach(el => io.observe(el));

  /* ---------------------------------------------------------- rolling button labels */
  document.querySelectorAll<HTMLElement>('a.button, button.primary, button.ghost, .pl-row button, .infra-nav button, .ab-go .button').forEach(b => {
    if (b.children.length || !(b.textContent || '').trim() || b.dataset.hxRoll) return;
    const t = (b.textContent || '').trim(); b.dataset.hxRoll = '1'; b.setAttribute('aria-label', b.getAttribute('aria-label') || t);
    const roll = document.createElement('span'); roll.className = 'hx-roll'; roll.setAttribute('aria-hidden', 'true');
    const a1 = document.createElement('span'); a1.textContent = t; const a2 = document.createElement('span'); a2.textContent = t; roll.append(a1, a2);
    b.replaceChildren(roll);
  });

  /* ---------------------------------------------------------- crosshair cursor with coordinates over the hero */
  const hero = document.querySelector<HTMLElement>('.infra-art, .ab-art');
  if (hero && fine) {
    const box = document.createElement('div'); box.className = 'hx-cross'; box.setAttribute('aria-hidden', 'true');
    const h = document.createElement('i'), v = document.createElement('i'), tag = document.createElement('b'); h.className = 'h'; v.className = 'v'; box.append(h, v, tag);
    hero.append(box); if (getComputedStyle(hero).position === 'static') hero.style.position = 'relative';
    let tx = 0, ty = 0, x = 0, y = 0, on = false, raf = 0;
    const step = () => { x += (tx - x) * .18; y += (ty - y) * .18; box.style.setProperty('--x', `${x}px`); box.style.setProperty('--y', `${y}px`);
      tag.textContent = `X:${Math.round(x)}PX / Y:${Math.round(y)}PX`; if (Math.abs(tx - x) + Math.abs(ty - y) > .3) raf = requestAnimationFrame(step); else raf = 0; };
    hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); tx = e.clientX - r.left; ty = e.clientY - r.top; if (!on) { x = tx; y = ty; on = true; box.classList.add('on'); } if (!raf) raf = requestAnimationFrame(step); });
    hero.addEventListener('pointerleave', () => { on = false; box.classList.remove('on'); });
  }

  /* ---------------------------------------------------------- first-visit loader: rulers, counter, X/Y readout */
  // Once per browser session, like Heron's intro: a ruled panel counts to 100% and lifts away.
  let booted = true; try { booted = sessionStorage.getItem('cyberhub:hx-boot') === '1'; sessionStorage.setItem('cyberhub:hx-boot', '1'); } catch { /* storage off */ }
  let comingFromWipe = false; try { comingFromWipe = sessionStorage.getItem('cyberhub:hx-nav') === '1'; } catch { /* storage off */ }
  if (!booted && !comingFromWipe) {
    const ld = document.createElement('div'); ld.className = 'hx-load'; ld.setAttribute('aria-hidden', 'true');
    const top = document.createElement('i'); top.className = 'rl rl-x';
    const side = document.createElement('i'); side.className = 'rl rl-y';
    const name = document.createElement('b'); name.className = 'nm'; name.textContent = 'CYBERHUB';
    const pct = document.createElement('strong'); pct.className = 'pc'; pct.textContent = '0%';
    const bar = document.createElement('i'); bar.className = 'bar';
    const xy = document.createElement('span'); xy.className = 'xy'; xy.textContent = 'X:0PX / Y:0PX';
    const note = document.createElement('span'); note.className = 'nt'; note.textContent = 'LOADING LABS';
    ld.append(top, side, name, pct, bar, xy, note); document.body.append(ld); doc.classList.add('hx-booting');
    const t0 = performance.now(), dur = 950;
    const move = (e: PointerEvent) => { xy.textContent = `X:${Math.round(e.clientX)}PX / Y:${Math.round(e.clientY)}PX`; };
    addEventListener('pointermove', move, { passive: true });
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      pct.textContent = `${Math.round(e * 100)}%`; ld.style.setProperty('--p', String(e));
      if (k < 1) requestAnimationFrame(tick);
      else { ld.classList.add('done'); removeEventListener('pointermove', move);
        setTimeout(() => { ld.remove(); doc.classList.remove('hx-booting'); }, 900); }
    };
    requestAnimationFrame(tick);
  }

  /* ---------------------------------------------------------- page transition: a panel wipes across */
  const veil = document.createElement('div'); veil.className = 'hx-veil'; veil.setAttribute('aria-hidden', 'true');
  const veilTag = document.createElement('span'); veil.append(veilTag); document.body.append(veil);
  let arrived = false; try { arrived = sessionStorage.getItem('cyberhub:hx-nav') === '1'; sessionStorage.removeItem('cyberhub:hx-nav'); } catch { /* storage off */ }
  if (arrived) { veil.classList.add('cover'); veilTag.textContent = location.pathname.replace(/\/$/, '').split('/').pop()?.toUpperCase() || 'HOME'; requestAnimationFrame(() => requestAnimationFrame(() => veil.classList.add('out'))); }
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href]'); if (!a || a.target || a.hasAttribute('download')) return;
    const u = new URL(a.href, location.href); if (u.origin !== location.origin || (u.pathname === location.pathname && u.hash) || /\.(json|xml|png|jpg|svg|pdf|ics|csv)$/i.test(u.pathname)) return;
    e.preventDefault(); veil.classList.remove('out', 'cover'); veilTag.textContent = (u.pathname.replace(/\/$/, '').split('/').pop() || 'home').toUpperCase();
    veil.classList.add('in'); try { sessionStorage.setItem('cyberhub:hx-nav', '1'); } catch { /* storage off */ }
    setTimeout(() => { location.href = u.href; }, 520);
  });
  addEventListener('pageshow', e => { if ((e as PageTransitionEvent).persisted) veil.classList.remove('in', 'cover'); });
  void EXPO;
}
export {};
