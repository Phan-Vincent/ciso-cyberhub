// Runs before first paint. CyberHub has one look: dark. Mark that scripts are available.
document.documentElement.dataset.theme = 'dark';
document.documentElement.dataset.themeSource = 'site';
document.documentElement.classList.add('js');
try { localStorage.removeItem('cyberhub:theme'); } catch { /* ignore */ }
