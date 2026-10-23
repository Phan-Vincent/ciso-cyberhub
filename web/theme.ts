// Runs before first paint: apply a saved theme choice, or the system preference,
// and mark that scripts are available. The visible button state is synced in app.ts.
let saved: string | null = null;
try {
  saved = localStorage.getItem('cyberhub:theme');
} catch {}
const explicit: 'dark' | 'light' | null = saved === 'dark' || saved === 'light' ? saved : null;
const systemLight = matchMedia('(prefers-color-scheme: light)').matches;
document.documentElement.dataset.theme = explicit ?? (systemLight ? 'light' : 'dark');
document.documentElement.dataset.themeSource = explicit ? 'user' : 'system';
document.documentElement.classList.add('js');
