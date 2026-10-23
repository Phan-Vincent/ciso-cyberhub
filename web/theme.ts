// Runs before first paint: apply a saved theme choice and mark that scripts are available.
try {
  const saved: string | null = localStorage.getItem('cyberhub:theme');
  if (saved === 'dark' || saved === 'light') document.documentElement.dataset.theme = saved;
} catch {}
document.documentElement.classList.add('js');
