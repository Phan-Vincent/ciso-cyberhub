// Runs before first paint: apply a saved theme choice and mark that scripts are available.
try {
  const saved: string | null = localStorage.getItem('cyberhub:theme');
  if (saved === 'dark' || saved === 'light') document.documentElement.dataset.theme = saved;
} catch {}
document.documentElement.classList.add('js');

// Homepage scenes have fixed tones in dark mode. In light mode they invert
// (void and carbon become paper, paper becomes void, blue stays) so the page
// keeps its contrast rhythm but reads as a light site.
const SWAP: Record<string, string> = { void: 'paper', carbon: 'paper', paper: 'void', blue: 'blue' };
function isLight(): boolean {
  const t = document.documentElement.dataset.theme;
  return t ? t === 'light' : matchMedia('(prefers-color-scheme: light)').matches;
}
function applyTones(): void {
  const light = isLight();
  document.querySelectorAll<HTMLElement>('.home .scene, .home .aperture').forEach(el => {
    if (!el.dataset.toneBase) {
      const m = /\btone-(void|carbon|paper|blue)\b/.exec(el.className);
      if (!m) return;
      el.dataset.toneBase = m[1];
    }
    const base = el.dataset.toneBase!;
    const next = light ? SWAP[base] : base;
    el.classList.remove('tone-void', 'tone-carbon', 'tone-paper', 'tone-blue');
    el.classList.add('tone-' + next);
    if (el.dataset.tone) el.dataset.tone = next;
  });
  document.dispatchEvent(new CustomEvent('cyberhub:tones'));
}
document.addEventListener('DOMContentLoaded', applyTones);
document.addEventListener('cyberhub:theme', applyTones);
try { matchMedia('(prefers-color-scheme: light)').addEventListener('change', applyTones); } catch {}
