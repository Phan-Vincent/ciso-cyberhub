// Runs before first paint. The theme follows the visitor's system setting: red on black in dark
// mode, red and black on paper in light mode. It updates live if the system setting changes.
const mq = matchMedia('(prefers-color-scheme: light)');
const apply = () => { document.documentElement.dataset.theme = mq.matches ? 'light' : 'dark'; };
apply();
mq.addEventListener?.('change', apply);
document.documentElement.dataset.themeSource = 'system';
document.documentElement.classList.add('js');
try { localStorage.removeItem('cyberhub:theme'); } catch { /* ignore */ }
