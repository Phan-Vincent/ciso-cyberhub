// CyberHub accounts: optional sign-in that backs up and syncs progress.
// Local-first: progress always lives in this browser (localStorage) and works with no account.
// When the site is configured with a Supabase project (site.json), signing in copies that
// progress to the student's own row in the database and merges it on every device.
// No SDK: plain fetch to Supabase Auth (GoTrue) and the REST API (PostgREST), guarded by
// row-level security so each user can only read and write their own row.
// Never synced: resume text, theme, names typed for printing.

export type Snapshot = Record<string, unknown>;
const ACADEMY = (base: string) => `cyberhub:${base}:progress:v1`;
// payload key -> localStorage key (academy depends on the base path, so it is mapped)
export const KEYS = ['linux', 'netlab', 'defend', 'duel', 'daily', 'readiness', 'match', 'academy'] as const;
const storageKey = (k: string, base: string) => k === 'academy' ? ACADEMY(base) : k === 'daily' ? 'cyberhub:daily:stats' : k === 'readiness' ? 'cyberhub:readiness:best' : 'cyberhub:' + k;

const arr = (v: unknown): string[] => Array.isArray(v) ? v.filter(x => typeof x === 'string') as string[] : [];
const obj = (v: unknown): Record<string, any> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, any> : {};
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : 0;
const union = (a: unknown, b: unknown) => [...new Set([...arr(a), ...arr(b)])].sort();

/** Merge two progress snapshots without ever losing completed work. */
export function mergeProgress(a: Snapshot, b: Snapshot): Snapshot {
  const out: Snapshot = {};
  if (a.linux !== undefined || b.linux !== undefined) out.linux = union(a.linux, b.linux);
  if (a.netlab !== undefined || b.netlab !== undefined) out.netlab = union(a.netlab, b.netlab);
  if (a.defend !== undefined || b.defend !== undefined) {
    const x = obj(a.defend), y = obj(b.defend); const shifts: Record<string, number> = {};
    for (const [k, v] of [...Object.entries(obj(x.shifts)), ...Object.entries(obj(y.shifts))]) if (/^[a-z-]{1,40}$/.test(k)) shifts[k] = Math.max(shifts[k] ?? 0, num(v));
    out.defend = { read: union(x.read, y.read), shifts, perfect: union(x.perfect, y.perfect) };
  }
  if (a.duel !== undefined || b.duel !== undefined) { const x = obj(a.duel), y = obj(b.duel); out.duel = { played: Math.max(num(x.played), num(y.played)), wins: Math.max(num(x.wins), num(y.wins)), best: Math.max(num(x.best), num(y.best)) }; }
  if (a.daily !== undefined || b.daily !== undefined) { const x = obj(a.daily), y = obj(b.daily); const pick = num(y.wins) > num(x.wins) ? y : x; out.daily = { ...pick, best: Math.max(num(x.best), num(y.best)) }; }
  if (a.readiness !== undefined || b.readiness !== undefined) out.readiness = Math.max(num(a.readiness), num(b.readiness));
  if (a.match !== undefined || b.match !== undefined) out.match = a.match ?? b.match;
  if (a.academy !== undefined || b.academy !== undefined) {
    const x = obj(a.academy), y = obj(b.academy); const seen = new Set<string>(); const attempts: any[] = [];
    for (const t of [...(Array.isArray(x.attempts) ? x.attempts : []), ...(Array.isArray(y.attempts) ? y.attempts : [])]) { const id = typeof t?.at === 'string' ? t.at : ''; if (id && !seen.has(id)) { seen.add(id); attempts.push(t); } }
    attempts.sort((p, q) => p.at < q.at ? -1 : 1);
    out.academy = { version: 1, lessons: union(x.lessons, y.lessons), attempts: attempts.slice(-50) };
  }
  return out;
}
export function collect(base: string, read: (k: string) => string | null): Snapshot {
  const s: Snapshot = {};
  for (const k of KEYS) { const raw = read(storageKey(k, base)); if (raw == null) continue; try { s[k] = JSON.parse(raw); } catch { /* skip corrupt */ } }
  return s;
}
export function apply(base: string, snap: Snapshot, write: (k: string, v: string) => void) {
  for (const k of KEYS) if (snap[k] !== undefined) write(storageKey(k, base), JSON.stringify(snap[k]));
}
export function summary(s: Snapshot) {
  const d = obj(s.defend), a = obj(s.academy);
  return { linux: arr(s.linux).length, netlab: arr(s.netlab).length, guides: arr(d.read).length, shifts: Object.keys(obj(d.shifts)).length, lessons: arr(a.lessons).length, duels: num(obj(s.duel).played) };
}
export const validEmail = (e: string) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[A-Za-z]{2,}$/.test(e) && e.length <= 254;

/* ------------------------------------------------------------ Supabase (plain fetch) */
type Session = { access_token: string; refresh_token: string; expires_at: number; user: { id: string; email?: string } };
const SKEY = 'cyberhub:session';
export class Cloud {
  url: string; key: string; private ls: Storage;
  constructor(url: string, key: string, ls: Storage) { this.url = url; this.key = key; this.ls = ls; }
  private h(token?: string) { return { apikey: this.key, Authorization: 'Bearer ' + (token || this.key), 'Content-Type': 'application/json' }; }
  session(): Session | null { try { const s = JSON.parse(this.ls.getItem(SKEY) || 'null'); return s && s.access_token && s.user?.id ? s : null; } catch { return null; } }
  private save(s: Session | null) { try { if (s) this.ls.setItem(SKEY, JSON.stringify(s)); else this.ls.removeItem(SKEY); } catch { /* ignore */ } }
  async sendLink(email: string, redirect: string) {
    const r = await fetch(`${this.url}/auth/v1/otp?redirect_to=${encodeURIComponent(redirect)}`, { method: 'POST', headers: this.h(), body: JSON.stringify({ email, create_user: true }) });
    if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.msg || `Sign-in link failed (${r.status})`);
  }
  googleUrl(redirect: string) { return `${this.url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirect)}`; }
  /** Finish sign-in from the #access_token=… fragment Supabase redirects back with. */
  async fromHash(hash: string): Promise<Session | null> {
    const p = new URLSearchParams(hash.replace(/^#/, '')); const at = p.get('access_token'), rt = p.get('refresh_token');
    if (!at || !rt) return null;
    const u = await fetch(`${this.url}/auth/v1/user`, { headers: this.h(at) }); if (!u.ok) return null; const user = await u.json();
    const s: Session = { access_token: at, refresh_token: rt, expires_at: Date.now() + (Number(p.get('expires_in')) || 3600) * 1000, user: { id: user.id, email: user.email } };
    this.save(s); return s;
  }
  async fresh(): Promise<Session | null> {
    const s = this.session(); if (!s) return null; if (s.expires_at - Date.now() > 60000) return s;
    const r = await fetch(`${this.url}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: this.h(), body: JSON.stringify({ refresh_token: s.refresh_token }) });
    if (!r.ok) { this.save(null); return null; }
    const d = await r.json(); const n: Session = { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() + (d.expires_in || 3600) * 1000, user: { id: d.user?.id || s.user.id, email: d.user?.email || s.user.email } };
    this.save(n); return n;
  }
  async pull(s: Session): Promise<Snapshot> {
    const r = await fetch(`${this.url}/rest/v1/progress?select=data&user_id=eq.${encodeURIComponent(s.user.id)}`, { headers: this.h(s.access_token) });
    if (!r.ok) throw new Error(`Could not load saved progress (${r.status})`); const rows = await r.json(); return rows[0]?.data || {};
  }
  async push(s: Session, data: Snapshot) {
    const r = await fetch(`${this.url}/rest/v1/progress?on_conflict=user_id`, { method: 'POST', headers: { ...this.h(s.access_token), Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: s.user.id, data, updated_at: new Date().toISOString() }) });
    if (!r.ok) throw new Error(`Could not save progress (${r.status})`);
  }
  async signOut() { const s = this.session(); if (s) await fetch(`${this.url}/auth/v1/logout`, { method: 'POST', headers: this.h(s.access_token) }).catch(() => undefined); this.save(null); }
  async deleteAccount(s: Session) { const r = await fetch(`${this.url}/rest/v1/rpc/delete_me`, { method: 'POST', headers: this.h(s.access_token), body: '{}' }); if (!r.ok) throw new Error(`Could not delete the account (${r.status})`); this.save(null); }
}

/** Pull, merge with local, write both ways. Local progress is never thrown away. */
export async function sync(cloud: Cloud, base: string, ls: Storage) {
  const s = await cloud.fresh(); if (!s) return null;
  const local = collect(base, k => ls.getItem(k)); const remote = await cloud.pull(s); const merged = mergeProgress(local, remote);
  apply(base, merged, (k, v) => { try { ls.setItem(k, v); } catch { /* ignore */ } });
  await cloud.push(s, merged); try { ls.setItem('cyberhub:last-sync', new Date().toISOString()); } catch { /* ignore */ }
  return merged;
}

/* ------------------------------------------------------------ UI */
if (typeof document !== 'undefined') {
  const base = document.body.dataset.base || ''; const cfg = document.body.dataset;
  const cloud = cfg.sbUrl && cfg.sbKey ? new Cloud(cfg.sbUrl, cfg.sbKey, localStorage) : null;
  const btn = document.querySelector<HTMLElement>('#acct-btn');
  const mark = () => { const s = cloud?.session(); btn?.classList.toggle('signed-in', !!s); btn?.setAttribute('aria-label', s ? 'Your account (signed in) and progress' : 'Your progress and account'); };
  mark();
  // Quiet background sync on every page for signed-in users (at most every 5 minutes, and when leaving).
  if (cloud?.session()) {
    let last = 0; try { last = Date.parse(localStorage.getItem('cyberhub:last-sync') || '') || 0; } catch { /* ignore */ }
    if (Date.now() - last > 300000 && !document.querySelector('#account')) sync(cloud, base, localStorage).catch(() => undefined);
    addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { const s = cloud.session(); if (s) cloud.push(s, collect(base, k => localStorage.getItem(k))).catch(() => undefined); } });
  }

  const page = document.querySelector<HTMLElement>('#account');
  if (page) {
    const $ = <T extends HTMLElement = HTMLElement>(s: string) => page.querySelector<T>(s)!;
    const say = (t: string) => { $('#ac-msg').textContent = t; };
    const draw = () => {
      const s = summary(collect(base, k => { try { return localStorage.getItem(k); } catch { return null; } }));
      $('#ac-sum').textContent = `On this device: ${s.linux} Linux levels, ${s.netlab} networking levels, ${s.lessons} Academy lessons, ${s.guides} guides read, ${s.shifts} shifts played, ${s.duels} duels.`;
      const sess = cloud?.session(); $('#ac-out').hidden = !!sess || !cloud; $('#ac-in').hidden = !sess;
      if (sess) { $('#ac-email').textContent = sess.user.email || 'your account'; let t = ''; try { t = localStorage.getItem('cyberhub:last-sync') || ''; } catch { /* ignore */ } $('#ac-last').textContent = t ? 'Last synced ' + new Date(t).toLocaleString() : 'Not synced yet'; }
      mark();
    };
    $('#ac-off').hidden = !!cloud;
    draw();
    // finishing a sign-in link
    if (cloud && /access_token=/.test(location.hash)) {
      say('Signing you in…');
      cloud.fromHash(location.hash).then(async s => { history.replaceState(null, '', location.pathname); if (!s) { say('That sign-in link did not work. Request a new one.'); return; } await sync(cloud, base, localStorage); say('Signed in. Your progress is saved to your account and merged with this device.'); draw(); })
        .catch(e => say('Sign-in failed: ' + (e as Error).message));
    } else if (/error_description=/.test(location.hash)) { say('Sign-in failed: ' + decodeURIComponent((/error_description=([^&]+)/.exec(location.hash) || [])[1] || '').replace(/\+/g, ' ')); history.replaceState(null, '', location.pathname); }
    const redirect = location.origin + location.pathname;
    $('#ac-form').addEventListener('submit', async e => {
      e.preventDefault(); if (!cloud) return; const email = $<HTMLInputElement>('#ac-mail').value.trim();
      if (!$<HTMLInputElement>('#ac-age').checked) { say('Accounts are for people 13 or older. You can still use everything without one.'); return; }
      if (!validEmail(email)) { say('Enter a valid email address.'); return; }
      say('Sending…'); try { await cloud.sendLink(email, redirect); say(`Check ${email} for a sign-in link. It works once and expires soon.`); } catch (err) { say((err as Error).message); }
    });
    $('#ac-google').addEventListener('click', () => { if (!cloud) return; if (!$<HTMLInputElement>('#ac-age').checked) { say('Accounts are for people 13 or older.'); return; } location.href = cloud.googleUrl(redirect); });
    $('#ac-sync').addEventListener('click', async () => { if (!cloud) return; say('Syncing…'); try { await sync(cloud, base, localStorage); say('Synced.'); draw(); } catch (e) { say((e as Error).message); } });
    $('#ac-signout').addEventListener('click', async () => { if (!cloud) return; await cloud.signOut(); say('Signed out. Your progress stays on this device.'); draw(); });
    $('#ac-delete').addEventListener('click', async () => {
      const b = $('#ac-delete'); if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'Click again to permanently delete your account and cloud copy'; return; }
      const s = await cloud?.fresh(); if (!cloud || !s) return; try { await cloud.deleteAccount(s); say('Account deleted. Progress on this device was kept.'); } catch (e) { say((e as Error).message); } draw();
    });
    // export / import works with or without accounts
    $('#ac-export').addEventListener('click', () => {
      const data = { app: 'cyberhub', version: 1, exported: new Date().toISOString(), progress: collect(base, k => localStorage.getItem(k)) };
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' })); a.download = `cyberhub-progress-${new Date().toISOString().slice(0, 10)}.json`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      say('Progress file downloaded. Open it on another device with "Load a progress file".');
    });
    $<HTMLInputElement>('#ac-import').addEventListener('change', async e => {
      const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return; if (f.size > 1_000_000) { say('That file is too large to be a CyberHub progress file.'); return; }
      try { const d = JSON.parse(await f.text()); if (d?.app !== 'cyberhub' || typeof d.progress !== 'object') throw new Error('not ours');
        const merged = mergeProgress(collect(base, k => localStorage.getItem(k)), d.progress); apply(base, merged, (k, v) => localStorage.setItem(k, v)); say('Progress loaded and merged. Nothing on this device was lost.'); draw();
        const s = cloud?.session(); if (cloud && s) sync(cloud, base, localStorage).then(draw).catch(() => undefined);
      } catch { say('That is not a CyberHub progress file.'); }
      (e.target as HTMLInputElement).value = '';
    });
  }
}
