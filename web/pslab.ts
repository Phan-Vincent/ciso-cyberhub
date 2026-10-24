// CyberHub PowerShell Lab: a small simulated Windows PowerShell for investigation practice.
// Nothing runs on a real machine. Objects flow through pipelines like real PowerShell
// (a simplified subset). No innerHTML; all output is textContent.

type Row = Record<string, string | number | boolean>;
type Out = { rows?: Row[]; cols?: string[]; text?: string[]; err?: string[] };
type FNode = { dir: boolean; path: string; hidden?: boolean; data?: string; hash?: string };
export type World = { files: Map<string, FNode>; cwd: string; procs: Row[]; services: Row[]; users: Row[]; admins: Row[]; events: Row[]; run: Row[]; tasks: Row[]; conns: Row[]; answer: string; ran: string[]; env: Record<string, string> };
export type PLevel = { id: string; setup?: (w: World) => void; check?: (w: World) => boolean; submit?: boolean };

const R = Math.random; const pick = <T>(a: T[]) => a[Math.floor(R() * a.length)]; const ri = (a: number, b: number) => a + Math.floor(R() * (b - a + 1));
const hex = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => b.toString(16).padStart(2, '0')).join('');
const flag = () => `CISO{${hex(3)}-${hex(3)}-${hex(2)}}`;
const HOME = 'C:\\Users\\student';
const key = (p: string) => p.toLowerCase().replace(/\\+$/, '');
function abs(w: World, p: string) {
  if (!p) return w.cwd; p = p.replace(/\//g, '\\').replace(/^~/, HOME).replace(/^\$env:USERPROFILE/i, HOME);
  const full = /^[a-z]:/i.test(p) ? p : w.cwd + '\\' + p; const out: string[] = [];
  for (const part of full.split('\\')) { if (!part || part === '.') continue; if (part === '..') { if (out.length > 1) out.pop(); } else out.push(part); }
  return out.length === 1 ? out[0] + '\\' : out.join('\\');
}
function put(w: World, path: string, data: string, hidden = false, hash?: string) {
  const parts = path.split('\\'); for (let i = 1; i < parts.length; i++) { const d = parts.slice(0, i).join('\\') || parts[0]; const real = i === 1 ? parts[0] + '\\' : d; const k = key(real); if (!w.files.has(k)) w.files.set(k, { dir: true, path: real }); }
  w.files.set(key(path), { dir: false, path, data, hidden, hash: hash || hex(32).toUpperCase() });
}
const mkdir = (w: World, path: string) => w.files.set(key(path), { dir: true, path });
function base(): World {
  const w: World = { files: new Map(), cwd: HOME, procs: [], services: [], users: [], admins: [], events: [], run: [], tasks: [], conns: [], answer: '', ran: [], env: { USERNAME: 'student', COMPUTERNAME: 'HUB-WIN01', USERPROFILE: HOME } };
  for (const d of ['C:\\', 'C:\\Users', HOME, HOME + '\\Desktop', HOME + '\\Documents', 'C:\\Windows', 'C:\\Windows\\System32', 'C:\\Cases', 'C:\\Logs']) mkdir(w, d);
  put(w, HOME + '\\Desktop\\README.txt', 'Welcome to HUB-WIN01, the CISO Windows practice box.\nType "help" for commands, "hint" if stuck, "submit <answer>" to check an answer.');
  w.procs = [['System', 4, 'SYSTEM'], ['svchost', 812, 'SYSTEM'], ['explorer', 3120, 'student'], ['msedge', 4410, 'student'], ['Teams', 5120, 'student'], ['OneDrive', 6004, 'student']].map(([n, i, u]) => ({ Name: n, Id: i, UserName: u, CPU: ri(0, 40) }));
  w.services = [['Dnscache', 'DNS Client', 'Running'], ['EventLog', 'Windows Event Log', 'Running'], ['WinDefend', 'Microsoft Defender Antivirus', 'Running'], ['Spooler', 'Print Spooler', 'Running'], ['wuauserv', 'Windows Update', 'Running'], ['RemoteRegistry', 'Remote Registry', 'Stopped']].map(([n, d, s]) => ({ Name: n, DisplayName: d, Status: s }));
  w.users = [['Administrator', false], ['student', true], ['Guest', false], ['analyst', true]].map(([n, e]) => ({ Name: n, Enabled: e }));
  w.admins = [{ Name: 'HUB-WIN01\\Administrator', ObjectClass: 'User' }, { Name: 'HUB-WIN01\\analyst', ObjectClass: 'User' }];
  w.run = [{ Name: 'OneDrive', Value: 'C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe /background' }, { Name: 'SecurityHealth', Value: 'C:\\Windows\\System32\\SecurityHealthSystray.exe' }];
  w.tasks = [['GoogleUpdateTaskMachineCore', '\\', 'Ready'], ['OneDrive Standalone Update Task', '\\', 'Ready'], ['ScheduledDefrag', '\\Microsoft\\Windows\\Defrag\\', 'Ready']].map(([n, p, s]) => ({ TaskName: n, TaskPath: p, State: s }));
  w.conns = [{ LocalAddress: '10.20.5.40', LocalPort: 52144, RemoteAddress: '52.96.' + ri(1, 254) + '.' + ri(1, 254), RemotePort: 443, State: 'Established', OwningProcess: 5120 }];
  return w;
}
const sub = (w: World, v: string) => { w.answer = v; return v; };
const did = (w: World, re: RegExp) => w.ran.some(c => re.test(c));

export const PS_LEVELS: PLevel[] = [
  { id: 'ps-whoami', check: w => did(w, /^(whoami|\$env:username)\b/i) },
  { id: 'ps-location', check: w => did(w, /^(get-location|pwd|gl)\b/i) },
  { id: 'ps-list', submit: true, setup: w => { const f = sub(w, flag()); for (const n of ['notes.txt', 'todo.txt']) put(w, 'C:\\Cases\\' + n, 'nothing here'); put(w, 'C:\\Cases\\IR-2026-17\\handoff.txt', 'Shift handoff. Flag: ' + f); } },
  { id: 'ps-hidden', submit: true, setup: w => { put(w, HOME + '\\Documents\\report.docx', 'quarterly report'); put(w, HOME + '\\Documents\\.stash.txt', sub(w, flag()), true); } },
  { id: 'ps-tail', submit: true, setup: w => { const lines = Array.from({ length: 500 }, (_, i) => `2026-10-24 0${ri(0, 9)}:${ri(10, 59)} INFO heartbeat ${i}`); lines.push('2026-10-24 23:59 WARN ' + sub(w, flag())); put(w, 'C:\\Logs\\app.log', lines.join('\n')); } },
  { id: 'ps-search', submit: true, setup: w => { const lines = Array.from({ length: 2000 }, (_, i) => `${i} GET /index.html 200`); lines.splice(ri(200, 1800), 0, '1337 GET /admin?token=' + sub(w, flag()) + ' 200'); put(w, 'C:\\Logs\\web.log', lines.join('\n')); } },
  { id: 'ps-process', setup: w => { w.procs.push({ Name: 'xmrig', Id: ri(7000, 9000), UserName: 'student', CPU: 98 }); },
    check: w => !w.procs.some(p => p.Name === 'xmrig') && w.procs.some(p => p.Name === 'explorer') },
  { id: 'ps-service', submit: true, setup: w => { const n = pick(['WinUpdateHelper', 'DefenderSvc32', 'SysCacheMgr']); w.services.push({ Name: n, DisplayName: 'Windows Helper', Status: 'Running' }); sub(w, n); } },
  { id: 'ps-users', submit: true, setup: w => { const n = pick(['support$', 'backup_admin', 'tempuser']); w.users.push({ Name: n, Enabled: true }); sub(w, n); } },
  { id: 'ps-admins', submit: true, setup: w => { const n = pick(['student', 'svc_print', 'guest2']); w.admins.push({ Name: 'HUB-WIN01\\' + n, ObjectClass: 'User' }); sub(w, n); } },
  { id: 'ps-events', submit: true, setup: w => { const n = ri(40, 140); for (let i = 0; i < n; i++) w.events.push({ Id: 4625, TimeCreated: `10/24/2026 02:${String(ri(0, 59)).padStart(2, '0')}`, Message: 'An account failed to log on. Account: administrator' });
    for (let i = 0; i < ri(20, 60); i++) w.events.push({ Id: 4624, TimeCreated: `10/24/2026 0${ri(8, 9)}:${String(ri(10, 59))}`, Message: 'An account was successfully logged on. Account: student' });
    w.events.push({ Id: 4688, TimeCreated: '10/24/2026 02:41', Message: 'A new process has been created: powershell.exe' }); sub(w, String(n)); } },
  { id: 'ps-persistence', submit: true, setup: w => { const n = pick(['Updater', 'SysHelper', 'AdobeSync']); w.run.push({ Name: n, Value: `C:\\Users\\student\\AppData\\Roaming\\${n.toLowerCase()}.exe -silent` }); sub(w, n); } },
  { id: 'ps-tasks', submit: true, setup: w => { const n = pick(['MicrosoftEdgeUpdateCheck', 'WindowsTelemetrySync', 'ChromeHelperTask']); w.tasks.push({ TaskName: n, TaskPath: '\\', State: 'Ready', Action: 'powershell.exe -w hidden -enc SQBFAFgA…' }); sub(w, n); } },
  { id: 'ps-hash', submit: true, setup: w => { const bad = hex(32).toUpperCase(); const names = ['invoice.pdf.exe', 'setup.exe', 'photo.jpg']; const which = pick(names);
    names.forEach(n => put(w, HOME + '\\Desktop\\Downloads\\' + n, 'binary', false, n === which ? bad : undefined)); put(w, 'C:\\Cases\\ioc.txt', 'Known-bad SHA256 from the threat intel feed:\n' + bad); sub(w, which); } },
  { id: 'ps-network', submit: true, setup: w => { const ip = `${pick([45, 91, 185])}.${ri(1, 254)}.${ri(1, 254)}.${ri(1, 254)}`; const pid = ri(6100, 6999); w.procs.push({ Name: 'rundll32', Id: pid, UserName: 'student', CPU: 3 });
    w.conns.push({ LocalAddress: '10.20.5.40', LocalPort: ri(49000, 60000), RemoteAddress: ip, RemotePort: 8443, State: 'Established', OwningProcess: pid }); sub(w, ip); } },
];

/* ------------------------------------------------------------ interpreter */
const ALIAS: Record<string, string> = { ls: 'get-childitem', dir: 'get-childitem', gci: 'get-childitem', cat: 'get-content', type: 'get-content', gc: 'get-content', cd: 'set-location', sl: 'set-location', chdir: 'set-location', pwd: 'get-location', gl: 'get-location',
  ps: 'get-process', gps: 'get-process', kill: 'stop-process', spps: 'stop-process', sls: 'select-string', measure: 'measure-object', select: 'select-object', sort: 'sort-object', where: 'where-object', '?': 'where-object', gsv: 'get-service', cls: 'clear-host', clear: 'clear-host', echo: 'write-output' };
export const CMDLETS = ['Get-ChildItem', 'Get-Content', 'Set-Location', 'Get-Location', 'Select-String', 'Get-Process', 'Stop-Process', 'Get-Service', 'Get-LocalUser', 'Get-LocalGroupMember', 'Get-WinEvent', 'Get-ItemProperty', 'Get-ScheduledTask', 'Get-FileHash', 'Get-NetTCPConnection', 'Where-Object', 'Measure-Object', 'Select-Object', 'Sort-Object', 'Write-Output', 'whoami', 'Get-Help'];
const HELP: Record<string, string> = {
  'get-childitem': 'Get-ChildItem [-Path] <dir> [-Force] [-Recurse] [-Filter *.txt]   (aliases: ls, dir)', 'get-content': 'Get-Content <file> [-Tail N] [-TotalCount N]   (aliases: cat, type)',
  'select-string': 'Select-String -Pattern <text> [-Path] <file>   or   ... | Select-String <text>', 'get-process': 'Get-Process [-Name n]   (alias: ps)', 'stop-process': 'Stop-Process -Id <pid>',
  'get-winevent': "Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625}", 'get-itemproperty': 'Get-ItemProperty HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
  'get-filehash': 'Get-FileHash <file> [-Algorithm SHA256]', 'get-nettcpconnection': 'Get-NetTCPConnection [-State Established|Listen]', 'where-object': "... | Where-Object { $_.Name -eq 'x' }   operators: -eq -ne -like -gt -lt",
  'measure-object': '... | Measure-Object   (Count)', 'get-localgroupmember': 'Get-LocalGroupMember -Group Administrators',
};
function args(tokens: string[]) { const named: Record<string, string> = {}; const pos: string[] = []; const sw = new Set<string>();
  for (let i = 0; i < tokens.length; i++) { const t = tokens[i]; if (/^-[a-z]/i.test(t) && !/^-\d/.test(t)) { const k = t.slice(1).toLowerCase(); const v = tokens[i + 1]; if (v !== undefined && !/^-[a-z]/i.test(v) && !['force', 'recurse'].includes(k)) { named[k] = v; i++; } else sw.add(k); } else pos.push(t); }
  return { named, pos, sw }; }
function split(line: string): string[] { const out: string[] = []; let cur = '', q = '', depth = 0;
  for (const c of line) { if (q) { if (c === q) q = ''; else cur += c; continue; } if (c === '"' || c === "'") { q = c; continue; } if (c === '{' || c === '@') depth += c === '{' ? 1 : 0; if (c === '}') depth--; if (c === ' ' && depth <= 0) { if (cur) out.push(cur); cur = ''; continue; } cur += c; }
  if (cur) out.push(cur); return out; }
function pipes(line: string): string[] { const segs: string[] = []; let cur = '', q = '', depth = 0; for (const c of line) { if (q) { if (c === q) q = ''; cur += c; continue; } if (c === '"' || c === "'") q = c; if (c === '{') depth++; if (c === '}') depth--; if (c === '|' && depth === 0) { segs.push(cur.trim()); cur = ''; continue; } cur += c; } segs.push(cur.trim()); return segs.filter(Boolean); }
function statements(line: string): string[] { const out: string[] = []; let cur = '', q = '', depth = 0; for (const c of line) { if (q) { if (c === q) q = ''; cur += c; continue; } if (c === '"' || c === "'") q = c; if (c === '{') depth++; if (c === '}') depth--; if (c === ';' && depth === 0) { out.push(cur.trim()); cur = ''; continue; } cur += c; } out.push(cur.trim()); return out.filter(Boolean); }
const like = (v: string, pat: string) => new RegExp('^' + pat.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i').test(v);
function whereFn(expr: string): ((r: Row) => boolean) | null {
  const m = /\$_\.(\w+)\s+-(eq|ne|like|notlike|gt|lt|match)\s+['"]?([^'"}]*)['"]?/i.exec(expr); if (!m) return null; const [, f, op] = m; const v = m[3].trim();
  return r => { const x = r[Object.keys(r).find(k => k.toLowerCase() === f.toLowerCase()) || f]; const s = String(x ?? ''); const n = Number(v);
    switch (op.toLowerCase()) { case 'eq': return s.toLowerCase() === v.toLowerCase(); case 'ne': return s.toLowerCase() !== v.toLowerCase(); case 'like': return like(s, v); case 'notlike': return !like(s, v); case 'gt': return Number(x) > n; case 'lt': return Number(x) < n; default: return new RegExp(v, 'i').test(s); } };
}
export class PS {
  w: World = base(); level: PLevel | null = null; hints: string[] = []; hintAt = 0; onWin: () => void = () => { }; onClear: () => void = () => { };
  load(l: PLevel, hints: string[]) { this.w = base(); this.level = l; this.hints = hints; this.hintAt = 0; l.setup?.(this.w); }
  prompt() { return `PS ${this.w.cwd}> `; }
  run(line: string): { out: string[]; err: string[] } {
    const t = line.trim(); const res = { out: [] as string[], err: [] as string[] }; if (!t) return res;
    for (const stmt of statements(t)) { this.w.ran.push(stmt); const r = this.pipeline(stmt); res.out.push(...r.out); res.err.push(...r.err); }
    if (this.level?.check?.(this.w)) this.onWin(); return res;
  }
  private pipeline(stmt: string) {
    let cur: Out = {}; const segs = pipes(stmt); const res = { out: [] as string[], err: [] as string[] };
    for (const seg of segs) { cur = this.exec(seg, cur); if (cur.err?.length) { res.err.push(...cur.err); return res; } }
    res.out.push(...format(cur)); return res;
  }
  private exec(seg: string, input: Out): Out {
    const toks = split(seg); if (!toks.length) return {}; let name = toks[0].toLowerCase(); name = ALIAS[name] || name; const a = args(toks.slice(1)); const w = this.w;
    const err = (m: string): Out => ({ err: [m] });
    if (/^\$env:(\w+)$/i.test(toks[0])) return { text: [w.env[toks[0].split(':')[1].toUpperCase()] ?? ''] };
    switch (name) {
      case 'help': case 'get-help': { const c = (a.pos[0] || '').toLowerCase(); if (c && HELP[ALIAS[c] || c]) return { text: [HELP[ALIAS[c] || c]] }; return { text: ['Cmdlets on HUB-WIN01:', '  ' + CMDLETS.join(', '), 'Aliases: ls dir cat type cd pwd ps kill sls measure select sort where', 'Pipelines with | work. Try "help Get-WinEvent". Stuck? "hint". Found it? "submit <answer>".'] }; }
      case 'hint': return { text: [this.hints.length ? `Hint ${Math.min(this.hintAt + 1, this.hints.length)}/${this.hints.length}: ${this.hints[Math.min(this.hintAt++, this.hints.length - 1)]}` : 'No hints for this level.'] };
      case 'submit': { const v = toks.slice(1).join(' ').trim(); if (!this.level?.submit) return err('This level is checked automatically. Just do the task.'); if (!v) return err('usage: submit <answer>');
        if (v.toLowerCase() === w.answer.toLowerCase()) { setTimeout(() => this.onWin()); return { text: ['✔ Correct.'] }; } return err('✘ Not quite. Type "hint" if you are stuck.'); }
      case 'whoami': return { text: ['hub-win01\\' + w.env.USERNAME] };
      case 'clear-host': this.onClear(); return {};
      case 'write-output': return { text: [a.pos.join(' ')] };
      case 'get-location': return { rows: [{ Path: w.cwd }] };
      case 'set-location': { const p = abs(w, a.named.path || a.pos[0] || HOME); const n = w.files.get(key(p)); if (!n || !n.dir) return err(`Set-Location: Cannot find path '${p}' because it does not exist.`); w.cwd = n.path.replace(/\\$/, '') || n.path; if (/^[a-z]:$/i.test(w.cwd)) w.cwd += '\\'; return {}; }
      case 'get-childitem': {
        const dir = abs(w, a.named.path || a.pos[0] || '.'); const dk = key(dir); if (!w.files.get(dk)?.dir) return err(`Get-ChildItem: Cannot find path '${dir}' because it does not exist.`);
        const filter = a.named.filter || a.named.include; const rows: Row[] = [];
        for (const [k, n] of w.files) { if (k === dk || !k.startsWith(dk + (dk.endsWith('\\') ? '' : '\\'))) continue; const rest = k.slice(dk.length + (dk.endsWith('\\') ? 0 : 1)); if (!a.sw.has('recurse') && rest.includes('\\')) continue; if (n.hidden && !a.sw.has('force')) continue;
          const nm = n.path.split('\\').pop()!; if (filter && !like(nm, filter)) continue; rows.push({ Mode: (n.dir ? 'd' : '-') + '-' + (n.hidden ? 'h' : '-') + '--', Length: n.dir ? '' : (n.data || '').length, Name: a.sw.has('recurse') ? n.path.slice(n.path.length - rest.length) : nm, FullName: n.path }); }
        return { rows: rows.sort((x, y) => String(x.Name).localeCompare(String(y.Name))), cols: ['Mode', 'Length', 'Name'] };
      }
      case 'get-content': { const p = abs(w, a.named.path || a.pos[0] || ''); const n = w.files.get(key(p)); if (!n || n.dir) return err(`Get-Content: Cannot find path '${p}' because it does not exist.`);
        let lines = (n.data || '').split('\n'); const tail = Number(a.named.tail), head = Number(a.named.totalcount || a.named.head || a.named.first); if (tail) lines = lines.slice(-tail); if (head) lines = lines.slice(0, head); return { text: lines }; }
      case 'select-string': { const pat = a.named.pattern || a.pos[0]; if (!pat) return err('Select-String: -Pattern is required'); let re: RegExp; try { re = new RegExp(pat, 'i'); } catch { re = new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); }
        const file = a.named.path || (a.named.pattern ? a.pos[0] : a.pos[1]); let lines: string[] = [];
        if (file) { const n = w.files.get(key(abs(w, file))); if (!n || n.dir) return err(`Select-String: Cannot find path '${file}'.`); lines = (n.data || '').split('\n'); }
        else lines = input.text || (input.rows || []).map(r => Object.values(r).join(' '));
        return { text: lines.map((l, i) => [l, i] as [string, number]).filter(([l]) => re.test(l)).map(([l, i]) => file ? `${file}:${i + 1}:${l}` : l) }; }
      case 'get-process': { let rows = w.procs; if (a.named.name || a.pos[0]) rows = rows.filter(p => like(String(p.Name), a.named.name || a.pos[0])); if (a.named.id) rows = rows.filter(p => String(p.Id) === a.named.id); return { rows, cols: ['Id', 'Name', 'CPU', 'UserName'] }; }
      case 'stop-process': { const ids = (a.named.id || a.pos[0] || '').split(','); const name = a.named.name; let n = 0;
        w.procs = w.procs.filter(p => { const hit = ids.includes(String(p.Id)) || (name && like(String(p.Name), name)); if (hit) n++; return !hit; }); return n ? {} : err('Stop-Process: Cannot find a process with that identifier.'); }
      case 'get-service': { let rows = w.services; if (a.named.name || a.pos[0]) rows = rows.filter(s => like(String(s.Name), a.named.name || a.pos[0])); return { rows, cols: ['Status', 'Name', 'DisplayName'] }; }
      case 'get-localuser': return { rows: w.users, cols: ['Name', 'Enabled'] };
      case 'get-localgroupmember': { const g = (a.named.group || a.named.name || a.pos[0] || '').toLowerCase(); if (g !== 'administrators') return err("Get-LocalGroupMember: Group not found. Try -Group Administrators"); return { rows: w.admins, cols: ['ObjectClass', 'Name'] }; }
      case 'get-winevent': { const fh = a.named.filterhashtable || a.pos.find(x => x.startsWith('@{')) || ''; const ln = (/LogName\s*=\s*['"]?(\w+)/i.exec(fh) || [, a.named.logname || ''])[1];
        if (!/security/i.test(String(ln))) return err("Get-WinEvent: Try -FilterHashtable @{LogName='Security'; Id=4625} or -LogName Security"); const id = (/Id\s*=\s*(\d+)/i.exec(fh) || [])[1];
        let rows = w.events; if (id) rows = rows.filter(e => String(e.Id) === id); const max = Number(a.named.maxevents); if (max) rows = rows.slice(0, max); return { rows, cols: ['TimeCreated', 'Id', 'Message'] }; }
      case 'get-itemproperty': { const p = (a.named.path || a.pos[0] || '').toLowerCase(); if (!/hk(cu|lm):\\software\\microsoft\\windows\\currentversion\\run$/.test(p.replace(/\\+$/, ''))) return err('Get-ItemProperty: Cannot find path. Try HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run');
        return { rows: w.run, cols: ['Name', 'Value'] }; }
      case 'get-scheduledtask': return { rows: w.tasks, cols: ['TaskPath', 'TaskName', 'State', 'Action'] };
      case 'get-filehash': { const files = a.named.path ? [a.named.path] : a.pos.length ? a.pos : (input.rows || []).map(r => String(r.FullName)).filter(Boolean); if (!files.length) return err('Get-FileHash: a file path is required');
        const rows: Row[] = []; for (const f of files) { const p = abs(w, f); const n = w.files.get(key(p)); if (!n) return err(`Get-FileHash: Cannot find path '${p}'.`); if (n.dir) continue; rows.push({ Algorithm: 'SHA256', Hash: n.hash || '', Path: p }); } return { rows, cols: ['Algorithm', 'Hash', 'Path'] }; }
      case 'get-nettcpconnection': { let rows = w.conns; if (a.named.state) rows = rows.filter(c => String(c.State).toLowerCase() === a.named.state.toLowerCase()); return { rows, cols: ['LocalAddress', 'LocalPort', 'RemoteAddress', 'RemotePort', 'State', 'OwningProcess'] }; }
      case 'where-object': { const f = whereFn(seg.slice(seg.indexOf(' ') + 1)); if (!f) return err("Where-Object: use the form { $_.Name -eq 'value' }"); if (input.rows) return { ...input, rows: input.rows.filter(f) }; return { text: (input.text || []).filter(l => f({ Line: l })) }; }
      case 'measure-object': { const n = input.rows ? input.rows.length : (input.text || []).length; return { text: ['', 'Count    : ' + n, ''] }; }
      case 'select-object': { const first = Number(a.named.first), last = Number(a.named.last); const props = (a.named.property || a.pos[0] || '').split(',').filter(Boolean);
        if (input.rows) { let rows = input.rows; if (first) rows = rows.slice(0, first); if (last) rows = rows.slice(-last); return { rows, cols: props.length ? props.map(p => Object.keys(rows[0] || {}).find(k => k.toLowerCase() === p.toLowerCase()) || p) : input.cols }; }
        let t = input.text || []; if (first) t = t.slice(0, first); if (last) t = t.slice(-last); return { text: t }; }
      case 'sort-object': { const prop = a.named.property || a.pos[0]; const desc = a.sw.has('descending'); if (!input.rows) return { text: [...(input.text || [])].sort() };
        const k = Object.keys(input.rows[0] || {}).find(x => x.toLowerCase() === String(prop || '').toLowerCase()) || prop; const rows = [...input.rows].sort((x, y) => { const p = x[k!], q = y[k!]; const c = typeof p === 'number' && typeof q === 'number' ? p - q : String(p).localeCompare(String(q)); return desc ? -c : c; }); return { ...input, rows }; }
      case 'format-table': case 'format-list': case 'out-string': return input;
    }
    return err(`${toks[0]} : The term '${toks[0]}' is not recognized as a cmdlet. Type "help" for the list.`);
  }
}
function format(o: Out): string[] {
  if (o.text) return o.text; if (!o.rows) return []; if (!o.rows.length) return [];
  const cols = o.cols || Object.keys(o.rows[0]); const width = cols.map(c => Math.min(70, Math.max(c.length, ...o.rows!.map(r => String(r[c] ?? '').length))));
  const line = (vals: string[]) => vals.map((v, i) => v.slice(0, 70).padEnd(width[i])).join('  ').trimEnd();
  return ['', line(cols), line(width.map(n => '-'.repeat(n))), ...o.rows.map(r => line(cols.map(c => String(r[c] ?? '')))), ''];
}

/* ------------------------------------------------------------ UI (same page markup as the Linux Lab) */
const app = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('#lab[data-key="cyberhub:pslab"]');
if (app) {
  const levels = Array.from(document.querySelectorAll<HTMLElement>('[data-level]'));
  const term = document.querySelector<HTMLElement>('#term-out')!, form = document.querySelector<HTMLFormElement>('#term-form')!, inp = document.querySelector<HTMLInputElement>('#term-in')!, ps1 = document.querySelector<HTMLElement>('#term-ps1')!, status = document.querySelector<HTMLElement>('#lab-status')!;
  const KEY = 'cyberhub:pslab'; const done = new Set<string>(((): string[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } })());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify([...done])); } catch { /* ignore */ } };
  const sh = new PS(); let cur = 0, hi = -1; const hist: string[] = [];
  const line = (text: string, cls = '') => { const d = document.createElement('div'); d.textContent = text; if (cls) d.className = cls; term.append(d); term.scrollTop = term.scrollHeight; };
  sh.onClear = () => term.replaceChildren();
  const mark = () => { levels.forEach(l => l.classList.toggle('done', done.has(l.dataset.level!))); document.querySelectorAll<HTMLElement>('[data-goto]').forEach(b => { b.classList.toggle('done', done.has(b.dataset.goto!)); b.setAttribute('aria-current', String(b.dataset.goto === levels[cur].dataset.level)); }); status.textContent = `${levels.filter(l => done.has(l.dataset.level!)).length} of ${levels.length} levels complete in this module`; };
  function open(i: number, focus = true) {
    cur = Math.max(0, Math.min(levels.length - 1, i)); const el = levels[cur]; const id = el.dataset.level!; levels.forEach((l, k) => { l.hidden = k !== cur; });
    const def = PS_LEVELS.find(l => l.id === id); if (!def) return; sh.load(def, Array.from(el.querySelectorAll('.hint-list li')).map(li => li.textContent || ''));
    sh.onWin = () => { if (sh.level?.id !== id) return; const first = !done.has(id); done.add(id); save(); mark(); line(first ? `★ Level complete: ${el.querySelector('h2')?.textContent}. ${cur < levels.length - 1 ? 'Type "next" or use the Next button.' : 'Module complete!'}` : '★ Already complete.', 'win'); el.querySelector('.level-done')?.removeAttribute('hidden'); };
    term.replaceChildren(); line('Windows PowerShell (CyberHub practice box HUB-WIN01)', 'sys'); line(el.querySelector('.goal')?.textContent || '', 'goal'); line('Type "help" for cmdlets, "hint" for a nudge.', 'sys');
    el.querySelector('.level-done')?.toggleAttribute('hidden', !done.has(id)); ps1.textContent = sh.prompt(); history.replaceState(null, '', '#' + id); mark(); if (focus) inp.focus({ preventScroll: true });
  }
  form.addEventListener('submit', e => { e.preventDefault(); const v = inp.value; inp.value = ''; hi = -1; if (v.trim()) hist.push(v); line(sh.prompt() + v, 'cmd');
    if (v.trim() === 'next') { open(cur + 1); return; } if (v.trim() === 'reset') { open(cur); return; }
    const r = sh.run(v); r.out.forEach(t => line(t)); r.err.forEach(t => line(t, 'err')); ps1.textContent = sh.prompt(); });
  inp.addEventListener('keydown', e => { if (e.key === 'ArrowUp' && hist.length) { e.preventDefault(); hi = hi < 0 ? hist.length - 1 : Math.max(0, hi - 1); inp.value = hist[hi]; } else if (e.key === 'ArrowDown' && hi >= 0) { e.preventDefault(); hi = hi >= hist.length - 1 ? -1 : hi + 1; inp.value = hi < 0 ? '' : hist[hi]; }
    else if (e.key === 'Tab') { e.preventDefault(); const words = inp.value.split(' '); const w0 = words.pop() || ''; const opts = CMDLETS.filter(c => c.toLowerCase().startsWith(w0.toLowerCase())); if (w0 && opts.length === 1) { words.push(opts[0]); inp.value = words.join(' ') + ' '; } else if (opts.length > 1 && w0) line(opts.join('  '), 'sys'); } });
  term.addEventListener('click', () => { if (!getSelection()?.toString()) inp.focus(); });
  document.querySelectorAll<HTMLElement>('[data-goto]').forEach(b => b.addEventListener('click', () => open(levels.findIndex(l => l.dataset.level === b.dataset.goto))));
  document.querySelector('#lab-prev')?.addEventListener('click', () => open(cur - 1)); document.querySelector('#lab-next')?.addEventListener('click', () => open(cur + 1)); document.querySelector('#lab-reset')?.addEventListener('click', () => open(cur));
  const fromHash = levels.findIndex(l => l.dataset.level === location.hash.slice(1)); open(fromHash >= 0 ? fromHash : Math.max(0, levels.findIndex(l => !done.has(l.dataset.level!))), false);
}
// index page progress
const pidx = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('#ps-index');
if (pidx) { try { const d = new Set<string>(JSON.parse(localStorage.getItem('cyberhub:pslab') || '[]')); pidx.querySelectorAll<HTMLElement>('[data-lv]').forEach(e => e.classList.toggle('done', d.has(e.dataset.lv!))); pidx.querySelectorAll<HTMLElement>('[data-mod-count]').forEach(e => { const ids = (e.dataset.modCount || '').split(','); e.textContent = `${ids.filter(i => d.has(i)).length}/${ids.length}`; }); } catch { /* ignore */ } }
const prank = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('#lx-rank[data-key="cyberhub:pslab"]');
if (prank) {
  let n = 0; try { n = (JSON.parse(localStorage.getItem('cyberhub:pslab') || '[]') as string[]).filter(id => PS_LEVELS.some(l => l.id === id)).length; } catch { /* ignore */ }
  const ranks = (prank.dataset.ranks || '').split(',').map(x => { const [a, b] = x.split(':'); return [Number(a), b] as [number, string]; });
  let cur = ranks[0], next: [number, string] | undefined; for (const r of ranks) { if (n >= r[0]) cur = r; else { next = r; break; } }
  prank.querySelector('#lx-rank-name')!.textContent = cur[1]; prank.querySelector<HTMLElement>('#lx-rank-fill')!.style.setProperty('--p', String(Math.min(1, n / PS_LEVELS.length)));
  prank.querySelector('#lx-rank-next')!.textContent = next ? `${n} of ${PS_LEVELS.length} levels · ${next[0] - n} more to reach ${next[1]}` : `All ${PS_LEVELS.length} levels complete.`;
  prank.querySelectorAll<HTMLElement>('[data-at]').forEach(li => li.classList.toggle('on', n >= Number(li.dataset.at)));
}
