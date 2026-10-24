// CyberHub Linux Lab: a small, safe, in-browser shell with a virtual filesystem.
// Nothing runs on a real machine. No innerHTML; all output is textContent.
// Level lessons are server-rendered (hub/linux.py); setups and checks live here, keyed by id.

type Node = { t: 'd' | 'f'; kids?: Map<string, Node>; data?: string; mode: number; owner: string };
type Proc = { pid: number; user: string; cmd: string };
type State = { root: Node; cwd: string; env: Record<string, string>; procs: Proc[]; ran: string[]; answer: string; hist: string[] };
type Out = { out: string[]; err: string[]; code: number };
type Level = { id: string; setup?: (s: State) => void; check?: (s: State) => boolean; submit?: boolean; start?: string };

const ME = 'student', HOME = '/home/student', HOST = 'hub01';
const rnd = (n = 12) => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => (b % 16).toString(16)).join('');
const flag = () => `CISO{${rnd(6)}-${rnd(6)}-${rnd(4)}}`;
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const ri = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

/* ------------------------------------------------------------ filesystem */
const dir = (owner = 'root', mode = 0o755): Node => ({ t: 'd', kids: new Map(), mode, owner });
const norm = (cwd: string, p: string, env: Record<string, string>) => {
  if (p === '~' || p.startsWith('~/')) p = (env.HOME || HOME) + p.slice(1);
  const parts = (p.startsWith('/') ? p : cwd + '/' + p).split('/'); const out: string[] = [];
  for (const x of parts) { if (!x || x === '.') continue; if (x === '..') out.pop(); else out.push(x); }
  return '/' + out.join('/');
};
function get(s: State, path: string): Node | null {
  let n: Node = s.root; if (path === '/') return n;
  for (const part of path.split('/').filter(Boolean)) { if (n.t !== 'd') return null; const k = n.kids!.get(part); if (!k) return null; n = k; }
  return n;
}
const parentOf = (p: string) => p.slice(0, p.lastIndexOf('/')) || '/';
const baseOf = (p: string) => p.slice(p.lastIndexOf('/') + 1);
function mkdirp(s: State, path: string, owner = 'root', mode = 0o755) {
  let n = s.root; for (const part of path.split('/').filter(Boolean)) { if (!n.kids!.has(part)) n.kids!.set(part, dir(owner, mode)); n = n.kids!.get(part)!; }
  return n;
}
function put(s: State, path: string, data: string, owner = ME, mode = 0o644) {
  const d = mkdirp(s, parentOf(path), path.startsWith(HOME) ? ME : 'root'); d.kids!.set(baseOf(path), { t: 'f', data, mode, owner });
}
const canRead = (n: Node, su: boolean) => su || n.owner === ME ? (su || (n.mode & 0o400) !== 0) : (n.mode & 0o004) !== 0;
const canWrite = (n: Node, su: boolean) => su || (n.owner === ME ? (n.mode & 0o200) !== 0 : (n.mode & 0o002) !== 0);
const modeStr = (n: Node) => (n.t === 'd' ? 'd' : '-') + [6, 3, 0].map(sh => { const m = (n.mode >> sh) & 7; return (m & 4 ? 'r' : '-') + (m & 2 ? 'w' : '-') + (m & 1 ? 'x' : '-'); }).join('');

function baseFs(): State {
  const s: State = { root: dir(), cwd: HOME, env: { HOME, USER: ME, SHELL: '/bin/bash', PATH: '/usr/local/bin:/usr/bin:/bin', PWD: HOME, HOSTNAME: HOST }, procs: [], ran: [], answer: '', hist: [] };
  for (const d of ['/bin', '/usr/bin', '/usr/local/bin', '/etc', '/var/log', '/opt', '/srv', '/root']) mkdirp(s, d);
  get(s, '/root')!.mode = 0o700; mkdirp(s, '/tmp').mode = 0o777;
  mkdirp(s, HOME, ME, 0o755); get(s, '/home')!.owner = 'root';
  for (const c of CMDS) put(s, '/usr/bin/' + c, '#!/bin/cyberhub-builtin', 'root', 0o755);
  put(s, '/etc/hostname', HOST + '\n', 'root');
  put(s, '/etc/passwd', 'root:x:0:0:root:/root:/bin/bash\nstudent:x:1000:1000:CyberHub Student:/home/student:/bin/bash\nanalyst:x:1001:1001:SOC Analyst:/home/analyst:/bin/bash\nbackup:x:34:34:backup:/var/backups:/usr/sbin/nologin\n', 'root');
  put(s, '/etc/shadow', 'root:$6$redacted:19700:0:99999:7:::\n', 'root', 0o600);
  put(s, HOME + '/README', 'Welcome to hub01, the CISO practice server.\nType "help" for commands, "hint" if you are stuck, and "submit <flag>" when you find one.\n');
  s.procs = [{ pid: 1, user: 'root', cmd: '/sbin/init' }, { pid: 412, user: 'root', cmd: 'sshd: /usr/sbin/sshd -D' }, { pid: 733, user: 'syslog', cmd: '/usr/sbin/rsyslogd' }, { pid: 1201, user: ME, cmd: '-bash' }];
  return s;
}

/* ------------------------------------------------------------ log generators */
const IPS = () => Array.from({ length: 7 }, () => `${pick([45, 91, 103, 185, 203])}.${ri(1, 254)}.${ri(1, 254)}.${ri(1, 254)}`);
function authLog(lines: number, ips: string[], weights?: number[]) {
  const users = ['root', 'admin', 'student', 'analyst', 'oracle', 'test', 'ubuntu']; const out: string[] = []; let failed = 0;
  for (let i = 0; i < lines; i++) {
    const t = `Oct 2${ri(0, 3)} ${String(ri(0, 23)).padStart(2, '0')}:${String(ri(0, 59)).padStart(2, '0')}:${String(ri(0, 59)).padStart(2, '0')}`;
    let ip = pick(ips); if (weights) { const r = Math.random(); let acc = 0; for (let k = 0; k < ips.length; k++) { acc += weights[k]; if (r <= acc) { ip = ips[k]; break; } } }
    if (Math.random() < .55) { failed++; out.push(`${t} ${HOST} sshd[${ri(1000, 9999)}]: Failed password for ${pick(users)} from ${ip} port ${ri(30000, 65000)} ssh2`); }
    else out.push(`${t} ${HOST} sshd[${ri(1000, 9999)}]: Accepted publickey for ${pick(['student', 'analyst'])} from 10.0.${ri(0, 9)}.${ri(2, 250)} port ${ri(30000, 65000)} ssh2`);
  }
  return { text: out.join('\n') + '\n', failed };
}
const filler = (n: number) => Array.from({ length: n }, (_, i) => `${String(i + 1).padStart(5, '0')} INFO heartbeat ok service=${pick(['web', 'dns', 'vpn', 'mail'])} latency=${ri(3, 90)}ms`).join('\n');

/* ------------------------------------------------------------ levels */
const sub = (s: State, f: string) => { s.answer = f; return f; };
const has = (s: State, re: RegExp) => s.ran.some(c => re.test(c));
const exists = (s: State, p: string) => !!get(s, p);
const LEVELS: Level[] = [
  // shell basics
  { id: 'first-command', check: s => has(s, /^whoami\b/) },
  { id: 'echo', check: s => has(s, /^echo\s+(["']?)hello,?\s+hub01\1\s*$/i) },
  { id: 'manual', check: s => has(s, /^(man|help)\s+ls\b|^ls\s+--help\b/) },
  { id: 'read-the-flag', submit: true, setup: s => put(s, '/flag', sub(s, flag()) + '\n', 'root', 0o644) },
  // navigation
  { id: 'where-am-i', check: s => has(s, /^pwd\b/) },
  { id: 'change-directory', check: s => s.cwd === '/var/log' },
  { id: 'absolute-paths', submit: true, setup: s => put(s, '/opt/cases/2026/october/ir-17/flag', sub(s, flag()) + '\n', 'root') },
  { id: 'home-sweet-home', submit: true, start: '/srv', setup: s => put(s, HOME + '/notes/handoff.txt', 'Shift handoff. Flag for the lab: ' + sub(s, flag()) + '\n') },
  { id: 'hidden-files', submit: true, setup: s => { put(s, HOME + '/.analyst_scratch', sub(s, flag()) + '\n'); put(s, HOME + '/todo.txt', 'nothing to see here\n'); } },
  { id: 'dot-dot', submit: true, start: '/opt/drop/a/b/c', setup: s => { mkdirp(s, '/opt/drop/a/b/c'); put(s, '/opt/drop/a/marker', sub(s, flag()) + '\n', 'root'); } },
  // reading files
  { id: 'head', submit: true, setup: s => put(s, '/var/log/boot.log', sub(s, flag()) + '\n' + filler(400) + '\n', 'root') },
  { id: 'tail', submit: true, setup: s => put(s, '/var/log/app.log', filler(600) + '\n' + sub(s, flag()) + '\n', 'root') },
  { id: 'count-lines', submit: true, setup: s => { const n = ri(180, 420); put(s, '/var/log/dns.log', filler(n) + '\n', 'root'); sub(s, String(n)); } },
  { id: 'grep', submit: true, setup: s => { const f = flag(); const lines = filler(1500).split('\n'); lines.splice(ri(100, 1400), 0, `00000 WARN beacon payload=${f}`); put(s, '/var/log/proxy.log', lines.join('\n') + '\n', 'root'); sub(s, f); } },
  // files and folders
  { id: 'mkdir', check: s => get(s, HOME + '/cases')?.t === 'd' },
  { id: 'touch', setup: s => { mkdirp(s, HOME + '/cases', ME); }, check: s => get(s, HOME + '/cases/report.txt')?.t === 'f' },
  { id: 'copy', setup: s => { mkdirp(s, HOME + '/cases', ME); put(s, '/opt/evidence/capture.pcap', 'pcap-bytes\n', 'root'); }, check: s => exists(s, HOME + '/cases/capture.pcap') && exists(s, '/opt/evidence/capture.pcap') },
  { id: 'move', setup: s => put(s, HOME + '/cases/draft.txt', 'Initial notes\n'), check: s => !exists(s, HOME + '/cases/draft.txt') && exists(s, HOME + '/cases/final-report.txt') },
  { id: 'remove', setup: s => { for (let i = 1; i <= 6; i++) put(s, `${HOME}/scratch/dump${i}.tmp`, 'x\n'); put(s, HOME + '/scratch/keep.txt', 'keep me\n'); },
    check: s => { const d = get(s, HOME + '/scratch'); return !!d && [...d.kids!.keys()].every(k => !k.endsWith('.tmp')) && d.kids!.has('keep.txt'); } },
  // wildcards
  { id: 'star', setup: s => { for (const n of ['web', 'vpn', 'mail', 'dns']) put(s, `/var/log/edge/${n}.log`, filler(5) + '\n', 'root'); put(s, '/var/log/edge/README.txt', 'not a log\n', 'root'); },
    check: s => ['web', 'vpn', 'mail', 'dns'].every(n => exists(s, `${HOME}/logs/${n}.log`)) && !exists(s, HOME + '/logs/README.txt') },
  { id: 'brackets', setup: s => { for (let i = 0; i <= 9; i++) put(s, `${HOME}/exports/report_${i}.csv`, 'a,b\n'); put(s, HOME + '/exports/report_final.csv', 'a,b\n'); },
    check: s => { const d = get(s, HOME + '/exports')!; return d && [...Array(10).keys()].every(i => !d.kids!.has(`report_${i}.csv`)) && d.kids!.has('report_final.csv'); } },
  // redirection and pipes
  { id: 'redirect', check: s => (get(s, HOME + '/status.txt')?.data || '').trim() === 'incident logged' },
  { id: 'append', setup: s => put(s, HOME + '/timeline.txt', '09:02 alert received\n'),
    check: s => { const t = get(s, HOME + '/timeline.txt')?.data || ''; return t.startsWith('09:02 alert received\n') && /09:15 host isolated/.test(t); } },
  { id: 'pipe-count', submit: true, setup: s => { const a = authLog(ri(120, 260), IPS()); put(s, '/var/log/auth.log', a.text, 'root'); sub(s, String(a.failed)); } },
  { id: 'top-talker', submit: true, setup: s => { const ips = IPS(); const w = [.34, .2, .14, .12, .1, .06, .04]; const a = authLog(ri(300, 500), ips, w);
    const counts: Record<string, number> = {}; a.text.split('\n').forEach(l => { const m = /Failed password .* from (\S+)/.exec(l); if (m) counts[m[1]] = (counts[m[1]] || 0) + 1; });
    put(s, '/var/log/auth.log', a.text, 'root'); sub(s, Object.entries(counts).sort((x, y) => y[1] - x[1])[0][0]); } },
  // finding things
  { id: 'find', submit: true, setup: s => { const f = flag(); const spot = pick(['/srv/www/static/img', '/opt/legacy/cfg/old', '/var/backups/2026/q3']); for (const d of ['/srv/www/static/img', '/opt/legacy/cfg/old', '/var/backups/2026/q3', '/srv/data']) mkdirp(s, d); put(s, spot + '/deploy.key', f + '\n', 'root'); sub(s, f); } },
  { id: 'grep-recursive', submit: true, setup: s => { const f = flag(); for (let i = 0; i < 12; i++) put(s, `/srv/config/svc${i}/settings.ini`, `name=svc${i}\nport=${ri(1000, 9000)}\n`, 'root'); put(s, `/srv/config/svc${ri(0, 11)}/settings.ini`, `name=svc\nadmin_token=${f}\n`, 'root'); sub(s, f); } },
  // permissions
  { id: 'read-permissions', submit: true, setup: s => { const names = ['alpha.conf', 'bravo.conf', 'charlie.conf', 'delta.conf', 'echo.conf']; const bad = pick(names); names.forEach(n => put(s, `${HOME}/configs/${n}`, 'x=1\n', ME, n === bad ? 0o666 : 0o644)); sub(s, bad); } },
  { id: 'chmod-private', setup: s => { mkdirp(s, HOME + '/.ssh', ME, 0o700); put(s, HOME + '/.ssh/id_ed25519', '-----BEGIN KEY (practice)-----\nnot-a-real-key\n-----END KEY-----\n', ME, 0o644); },
    check: s => (get(s, HOME + '/.ssh/id_ed25519')?.mode ?? 0) === 0o600 },
  { id: 'run-script', submit: true, setup: s => { const f = flag(); put(s, HOME + '/tools/triage.sh', `#!/bin/bash\necho "triage complete"\necho "flag: ${f}"\n`, ME, 0o644); sub(s, f); } },
  { id: 'sudo', submit: true, setup: s => put(s, '/root/incident-key.txt', sub(s, flag()) + '\n', 'root', 0o600) },
  // environment and processes
  { id: 'env-var', submit: true, setup: s => { s.env.CASE_TOKEN = sub(s, flag()); } },
  { id: 'export', check: s => s.env.CASE_ID === 'IR-2026-17' },
  { id: 'path', submit: true, setup: s => { const f = flag(); put(s, '/opt/soc/bin/ioc-check', `#!/bin/bash\necho "ioc-check v1.2: 0 matches"\necho "flag: ${f}"\n`, 'root', 0o755); sub(s, f); } },
  { id: 'processes', setup: s => s.procs.push({ pid: ri(3000, 9000), user: ME, cmd: './xmr-helper --pool stratum+tcp://203.0.113.9:3333' }, { pid: ri(3000, 9000), user: ME, cmd: 'python3 -m http.server 8000' }),
    check: s => !s.procs.some(p => p.cmd.includes('xmr-helper')) && s.procs.some(p => p.cmd.includes('http.server')) },
  { id: 'who-has-a-shell', submit: true, setup: s => { const extra = pick(['svc_deploy', 'jenkins', 'temp_contractor']); const p = get(s, '/etc/passwd')!; p.data += `${extra}:x:1002:1002::/home/${extra}:/bin/bash\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\n`; sub(s, extra); } },
];

/* ------------------------------------------------------------ shell */
const CMDS = ['help', 'man', 'whoami', 'id', 'hostname', 'pwd', 'cd', 'ls', 'cat', 'head', 'tail', 'wc', 'grep', 'sort', 'uniq', 'cut', 'echo', 'touch', 'mkdir', 'rm', 'rmdir', 'cp', 'mv', 'find', 'chmod', 'file', 'env', 'export', 'unset', 'which', 'ps', 'kill', 'sudo', 'history', 'clear', 'submit', 'hint', 'date', 'uname'];
const MAN: Record<string, string> = {
  ls: 'ls [-a] [-l] [path]  list a directory. -a shows hidden files (names starting with a dot). -l shows permissions, owner and size.',
  cd: 'cd [path]  change directory. "cd" alone goes home. ".." is the parent, "~" is your home.', pwd: 'pwd  print the current working directory.',
  cat: 'cat file...  print files.', head: 'head [-n N] file  first N lines (default 10).', tail: 'tail [-n N] file  last N lines (default 10).',
  wc: 'wc [-l|-w|-c] [file]  count lines, words or bytes.', grep: 'grep [-i] [-v] [-c] [-n] [-r] pattern [file...]  print matching lines. -r searches folders.',
  sort: 'sort [-n] [-r] [-u]  sort lines.', uniq: 'uniq [-c]  collapse repeated adjacent lines; -c counts them. Sort first!', cut: 'cut -d DELIM -f N  print field N.',
  echo: 'echo text...  print text. Use > to write a file, >> to append.', touch: 'touch file  create an empty file.', mkdir: 'mkdir [-p] dir  make a directory.',
  rm: 'rm [-r] [-f] path  remove files (-r for folders). There is no undo.', cp: 'cp [-r] src dest  copy.', mv: 'mv src dest  move or rename.',
  find: 'find [path] [-name PATTERN] [-type f|d]  search the tree.', chmod: 'chmod MODE file  e.g. chmod 600 key, chmod +x script.sh, chmod o-w file.',
  env: 'env  list environment variables.', export: 'export NAME=value  set a variable for this shell.', which: 'which cmd  where a command lives on your PATH.',
  ps: 'ps [aux]  list processes.', kill: 'kill PID  stop a process.', sudo: 'sudo command  run one command as root (you are allowed to on this lab box).',
  submit: 'submit FLAG  check a flag or answer for the current level.', hint: 'hint  show the next hint for this level.',
};

const tokenize = (line: string, s: State): string[][] => {
  // returns pipeline segments; each segment is an argv including redirection tokens
  const segs: string[][] = [[]]; let cur = '', q = '', any = false;
  const push = () => { if (any) segs[segs.length - 1].push(cur); cur = ''; any = false; };
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === q) q = ''; else if (c === '$' && q === '"') { const m = /^\$(\w+|\{\w+\})/.exec(line.slice(i)); if (m) { cur += s.env[m[1].replace(/[{}]/g, '')] ?? ''; i += m[0].length - 1; } else cur += c; } else cur += c; any = true; continue; }
    if (c === '"' || c === "'") { q = c; any = true; continue; }
    if (c === '\\' && i + 1 < line.length) { cur += line[++i]; any = true; continue; }
    if (c === ' ' || c === '\t') { push(); continue; }
    if (c === '|') { push(); segs.push([]); continue; }
    if (c === '>' || (c === '2' && line[i + 1] === '>' && !any)) {
      push(); let tok = c === '2' ? (i++, '2>') : '>'; if (line[i + 1] === '>') { tok += '>'; i++; } segs[segs.length - 1].push('\u0000' + tok); continue;
    }
    if (c === '$') { const m = /^\$(\w+|\{\w+\})/.exec(line.slice(i)); if (m) { cur += s.env[m[1].replace(/[{}]/g, '')] ?? ''; any = true; i += m[0].length - 1; continue; } }
    if (c === '~' && !any && (line[i + 1] === undefined || line[i + 1] === '/' || line[i + 1] === ' ')) { cur += s.env.HOME; any = true; continue; }
    if (/[*?[]/.test(c)) { cur += '\u0001' + c; any = true; continue; } // mark unquoted glob chars
    cur += c; any = true;
  }
  push();
  return segs;
};
const globRe = (pat: string) => new RegExp('^' + pat.replace(/[.+^${}()|\\]/g, '\\$&').replace(/\u0001\*/g, '[^/]*').replace(/\u0001\?/g, '[^/]').replace(/\u0001\[/g, '[') + '$');
function expand(s: State, w: string): string[] {
  if (!w.includes('\u0001')) return [w];
  const abs = w.startsWith('/'); const parts = w.split('/').filter((p, i) => p || i === 0);
  let paths = [abs ? '/' : s.cwd];
  const rel: string[] = [''];
  for (const part of parts.filter(Boolean)) {
    const next: string[] = [], nextRel: string[] = [];
    paths.forEach((p, k) => {
      const n = get(s, p); if (!n || n.t !== 'd') return;
      if (part.includes('\u0001')) { const re = globRe(part); for (const name of [...n.kids!.keys()].sort()) if (re.test(name) && !name.startsWith('.')) { next.push(norm(p, name, s.env)); nextRel.push(rel[k] ? rel[k] + '/' + name : name); } }
      else { next.push(norm(p, part, s.env)); nextRel.push(rel[k] ? rel[k] + '/' + part : part); }
    });
    paths = next; rel.splice(0, rel.length, ...nextRel);
  }
  const found = paths.map((p, i) => abs ? p : rel[i]).filter((_, i) => !!get(s, paths[i]));
  return found.length ? found : [w.replace(/\u0001/g, '')];
}

export class Shell {
  s: State; level: Level | null = null; hints: string[] = []; hintAt = 0; onWin: () => void = () => { }; onClear: () => void = () => { };
  constructor() { this.s = baseFs(); }
  load(level: Level, hints: string[]) {
    this.s = baseFs(); this.level = level; this.hints = hints; this.hintAt = 0; level.setup?.(this.s);
    if (level.start) { mkdirp(this.s, level.start); this.s.cwd = level.start; this.s.env.PWD = level.start; }
  }
  prompt() { const c = this.s.cwd === HOME ? '~' : this.s.cwd.startsWith(HOME + '/') ? '~' + this.s.cwd.slice(HOME.length) : this.s.cwd; return `${ME}@${HOST}:${c}$ `; }
  run(line: string): Out {
    const o: Out = { out: [], err: [], code: 0 }; const trimmed = line.trim(); if (!trimmed) return o;
    this.s.hist.push(trimmed);
    for (const part of trimmed.split(/\s*(?:;|&&)\s*/)) { if (!part) continue; this.s.ran.push(part); const r = this.pipeline(part); o.out.push(...r.out); o.err.push(...r.err); o.code = r.code; if (r.code && trimmed.includes('&&')) break; }
    if (this.level?.check && this.level.check(this.s)) this.onWin();
    return o;
  }
  private pipeline(line: string): Out {
    const segs = tokenize(line, this.s); let input: string | null = null; const res: Out = { out: [], err: [], code: 0 };
    for (let i = 0; i < segs.length; i++) {
      let argv = segs[i]; let redir: [string, string] | null = null; let quietErr = false; const clean: string[] = [];
      for (let k = 0; k < argv.length; k++) {
        if (argv[k].startsWith('\u0000')) { const op = argv[k].slice(1); const target = (argv[k + 1] || '').replace(/\u0001/g, ''); k++; if (op === '2>') { if (target === '/dev/null') quietErr = true; } else redir = [op, target]; }
        else clean.push(...expand(this.s, argv[k]));
      }
      argv = clean.map(a => a.replace(/\u0001/g, ''));
      const r = this.exec(argv, input); if (!quietErr) res.err.push(...r.err); res.code = r.code;
      if (redir) {
        const p = norm(this.s.cwd, redir[1], this.s.env); const parent = get(this.s, parentOf(p)); const ex = get(this.s, p);
        if (!parent || parent.t !== 'd') { res.err.push(`bash: ${redir[1]}: No such file or directory`); return res; }
        if ((ex && !canWrite(ex, false)) || (!ex && !canWrite(parent, false))) { res.err.push(`bash: ${redir[1]}: Permission denied`); return res; }
        const text = r.out.length ? r.out.join('\n') + '\n' : '';
        if (ex && redir[0] === '>>') ex.data = (ex.data || '') + text; else parent.kids!.set(baseOf(p), { t: 'f', data: text, mode: ex?.mode ?? 0o644, owner: ex?.owner ?? ME });
        input = ''; if (i === segs.length - 1) return res; continue;
      }
      input = r.out.join('\n') + (r.out.length ? '\n' : '');
      if (i === segs.length - 1) res.out.push(...r.out);
    }
    return res;
  }
  private readFile(p: string, name: string, su: boolean): [string | null, string | null] {
    const n = get(this.s, p); if (!n) return [null, `${name}: No such file or directory`]; if (n.t === 'd') return [null, `${name}: Is a directory`];
    if (!canRead(n, su)) return [null, `${name}: Permission denied`]; return [n.data || '', null];
  }
  private inputs(args: string[], input: string | null, cmd: string, su: boolean): { texts: string[]; err: string[] } {
    const err: string[] = [], texts: string[] = [];
    if (!args.length) texts.push(input ?? '');
    for (const a of args) { const [t, e] = this.readFile(norm(this.s.cwd, a, this.s.env), a, su); if (e) err.push(`${cmd}: ${e}`); else texts.push(t!); }
    return { texts, err };
  }
  exec(argv: string[], input: string | null, su = false): Out {
    const o: Out = { out: [], err: [], code: 0 }; if (!argv.length) return o;
    const [cmd, ...rest] = argv; const flags = new Set<string>(); const args: string[] = [];
    const s = this.s, P = (p: string) => norm(s.cwd, p, s.env), fail = (m: string, c = 1) => { o.err.push(m); o.code = c; return o; };
    const optVal = (name: string, def?: string) => { const i = rest.indexOf(name); if (i >= 0) { const v = rest[i + 1]; rest.splice(i, 2); return v; } const j = rest.findIndex(r => r.startsWith(name) && r.length > name.length && name.length === 2); if (j >= 0) { const v = rest[j].slice(2); rest.splice(j, 1); return v; } return def; };
    const parseFlags = () => { for (const r of rest) { if (/^-[a-zA-Z]+$/.test(r)) [...r.slice(1)].forEach(f => flags.add(f)); else if (r.startsWith('--')) flags.add(r); else args.push(r); } };
    // executables by path
    if (cmd.includes('/') || (!CMDS.includes(cmd) && this.onPath(cmd))) {
      const p = cmd.includes('/') ? P(cmd) : this.onPath(cmd)!; const n = get(s, p);
      if (!n) return fail(`bash: ${cmd}: No such file or directory`, 127);
      if (n.t === 'd') return fail(`bash: ${cmd}: Is a directory`, 126);
      if (!(n.mode & 0o111) && !su) return fail(`bash: ${cmd}: Permission denied`, 126);
      for (const line of (n.data || '').split('\n')) { if (!line || line.startsWith('#')) continue; const r = this.exec(tokenize(line, s)[0].map(x => x.replace(/\u0001/g, '')), null); o.out.push(...r.out); o.err.push(...r.err); }
      return o;
    }
    switch (cmd) {
      case 'help': o.out.push('Commands on hub01:', '  ' + CMDS.join('  '), 'Pipes |, redirection > >> 2>/dev/null, wildcards * ? [..], variables $NAME, ~ and ; or && all work.', 'Try "man ls". Stuck? "hint". Found it? "submit <answer>".'); return o;
      case 'man': { const m = MAN[rest[0]]; return m ? (o.out.push(m), o) : fail(rest[0] ? `No manual entry for ${rest[0]}` : 'What manual page do you want?'); }
      case 'whoami': o.out.push(su ? 'root' : ME); return o;
      case 'id': o.out.push(su ? 'uid=0(root) gid=0(root) groups=0(root)' : 'uid=1000(student) gid=1000(student) groups=1000(student),27(sudo)'); return o;
      case 'hostname': o.out.push(HOST); return o;
      case 'uname': o.out.push(rest.includes('-a') ? `Linux ${HOST} 6.8.0-cyberhub #1 SMP x86_64 GNU/Linux` : 'Linux'); return o;
      case 'date': o.out.push(new Date().toString()); return o;
      case 'pwd': o.out.push(s.cwd); return o;
      case 'cd': { const t = P(rest[0] ?? '~'); const n = get(s, t); if (!n) return fail(`bash: cd: ${rest[0]}: No such file or directory`); if (n.t !== 'd') return fail(`bash: cd: ${rest[0]}: Not a directory`); if (!su && n.owner !== ME && !(n.mode & 0o001)) return fail(`bash: cd: ${rest[0]}: Permission denied`); s.cwd = t; s.env.PWD = t; return o; }
      case 'ls': {
        parseFlags(); const targets = args.length ? args : ['.'];
        for (const a of targets) {
          const p = P(a), n = get(s, p); if (!n) { fail(`ls: cannot access '${a}': No such file or directory`, 2); continue; }
          if (targets.length > 1 && n.t === 'd') o.out.push(`${a}:`);
          if (n.t === 'f') { o.out.push(flags.has('l') ? `${modeStr(n)} 1 ${n.owner} ${n.owner} ${String((n.data || '').length).padStart(6)} Oct 24 09:00 ${a}` : a); continue; }
          if (!su && !canRead(n, false)) { fail(`ls: cannot open directory '${a}': Permission denied`, 2); continue; }
          const names = [...n.kids!.keys()].filter(k => flags.has('a') || !k.startsWith('.')).sort(); if (flags.has('a')) names.unshift('.', '..');
          if (flags.has('l')) { o.out.push(`total ${names.length * 4}`); names.forEach(k => { const c = k === '.' ? n : k === '..' ? get(s, parentOf(p))! : n.kids!.get(k)!; o.out.push(`${modeStr(c)} 1 ${c.owner.padEnd(7)} ${c.owner.padEnd(7)} ${String(c.t === 'd' ? 4096 : (c.data || '').length).padStart(6)} Oct 24 09:00 ${k}${c.t === 'd' ? '/' : ''}`); }); }
          else if (names.length) o.out.push(names.map(k => (n.kids!.get(k)?.t === 'd' ? k + '/' : k)).join('  '));
        }
        return o;
      }
      case 'cat': { const r = this.inputs(rest, input, 'cat', su); o.err.push(...r.err); const t = r.texts.join(''); if (t) o.out.push(...t.replace(/\n$/, '').split('\n')); o.code = r.err.length ? 1 : 0; return o; }
      case 'head': case 'tail': {
        let n = 10; const nv = optVal('-n'); if (nv) n = parseInt(nv, 10) || 10; const dash = rest.findIndex(r => /^-\d+$/.test(r)); if (dash >= 0) { n = parseInt(rest[dash].slice(1), 10); rest.splice(dash, 1); }
        const r = this.inputs(rest, input, cmd, su); o.err.push(...r.err); const lines = r.texts.join('').replace(/\n$/, '').split('\n').filter((l, i, a) => l || i < a.length - 1);
        o.out.push(...(cmd === 'head' ? lines.slice(0, n) : lines.slice(-n))); return o;
      }
      case 'wc': {
        parseFlags(); const r = this.inputs(args, input, 'wc', su); o.err.push(...r.err);
        r.texts.forEach((t, i) => { const l = (t.match(/\n/g) || []).length, w = t.split(/\s+/).filter(Boolean).length, c = t.length; const name = args[i] ? ' ' + args[i] : '';
          o.out.push(flags.has('l') ? `${l}${name}` : flags.has('w') ? `${w}${name}` : flags.has('c') ? `${c}${name}` : `${String(l).padStart(4)} ${String(w).padStart(5)} ${String(c).padStart(6)}${name}`); }); return o;
      }
      case 'grep': {
        parseFlags(); const pat = args.shift(); if (pat === undefined) return fail('usage: grep [-i] [-v] [-c] [-n] [-r] PATTERN [FILE...]', 2);
        let re: RegExp; try { re = new RegExp(pat, flags.has('i') ? 'i' : ''); } catch { re = new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags.has('i') ? 'i' : ''); }
        const files: [string, string][] = [];
        const walk = (p: string, label: string) => { const n = get(s, p); if (!n) { o.err.push(`grep: ${label}: No such file or directory`); return; } if (n.t === 'd') { if (!flags.has('r') && !flags.has('R')) { o.err.push(`grep: ${label}: Is a directory`); return; } if (!canRead(n, su) && n.owner !== ME && !su && !(n.mode & 4)) { o.err.push(`grep: ${label}: Permission denied`); return; } [...n.kids!.keys()].sort().forEach(k => walk(p === '/' ? '/' + k : p + '/' + k, label.replace(/\/$/, '') + '/' + k)); return; } if (!canRead(n, su)) { o.err.push(`grep: ${label}: Permission denied`); return; } files.push([label, n.data || '']); };
        if (!args.length) files.push(['', input ?? '']); else args.forEach(a => walk(P(a), a));
        const multi = files.length > 1 || flags.has('r');
        for (const [label, text] of files) {
          const lines = text.replace(/\n$/, '').split('\n'); let c = 0;
          lines.forEach((l, i) => { if (re.test(l) !== flags.has('v')) { c++; if (!flags.has('c')) o.out.push(`${multi ? label + ':' : ''}${flags.has('n') ? i + 1 + ':' : ''}${l}`); } });
          if (flags.has('c')) o.out.push(`${multi ? label + ':' : ''}${c}`);
        }
        if (!o.out.length) o.code = 1; return o;
      }
      case 'sort': { parseFlags(); const r = this.inputs(args, input, 'sort', su); let lines = r.texts.join('').replace(/\n$/, '').split('\n').filter(Boolean);
        lines.sort(flags.has('n') ? (a, b) => parseFloat(a) - parseFloat(b) || a.localeCompare(b) : (a, b) => a < b ? -1 : a > b ? 1 : 0); if (flags.has('r')) lines.reverse(); if (flags.has('u')) lines = [...new Set(lines)]; o.out.push(...lines); return o; }
      case 'uniq': { parseFlags(); const r = this.inputs(args, input, 'uniq', su); const lines = r.texts.join('').replace(/\n$/, '').split('\n'); const res: [string, number][] = [];
        lines.forEach(l => { if (res.length && res[res.length - 1][0] === l) res[res.length - 1][1]++; else if (l !== '' || res.length) res.push([l, 1]); });
        o.out.push(...res.map(([l, n]) => flags.has('c') ? `${String(n).padStart(7)} ${l}` : l)); return o; }
      case 'cut': { const d = optVal('-d', '\t')!; const f = optVal('-f', '1')!; const idx = f.split(',').map(x => parseInt(x, 10) - 1); const r = this.inputs(rest.filter(x => !x.startsWith('-')), input, 'cut', su);
        r.texts.join('').replace(/\n$/, '').split('\n').forEach(l => o.out.push(idx.map(i => l.split(d)[i] ?? '').join(d))); return o; }
      case 'echo': { const nflag = rest[0] === '-n'; o.out.push((nflag ? rest.slice(1) : rest).join(' ')); return o; }
      case 'touch': for (const a of rest) { const p = P(a); const parent = get(s, parentOf(p)); if (!parent || parent.t !== 'd') { fail(`touch: cannot touch '${a}': No such file or directory`); continue; } if (!get(s, p)) { if (!canWrite(parent, su)) { fail(`touch: cannot touch '${a}': Permission denied`); continue; } parent.kids!.set(baseOf(p), { t: 'f', data: '', mode: 0o644, owner: su ? 'root' : ME }); } } return o;
      case 'mkdir': { parseFlags(); for (const a of args) { const p = P(a); if (get(s, p)) { if (!flags.has('p')) fail(`mkdir: cannot create directory '${a}': File exists`); continue; } const parent = get(s, parentOf(p)); if (!parent && !flags.has('p')) { fail(`mkdir: cannot create directory '${a}': No such file or directory`); continue; } if (parent && !canWrite(parent, su)) { fail(`mkdir: cannot create directory '${a}': Permission denied`); continue; } mkdirp(s, p, su ? 'root' : ME); } return o; }
      case 'rmdir': for (const a of rest) { const p = P(a), n = get(s, p); if (!n) fail(`rmdir: failed to remove '${a}': No such file or directory`); else if (n.t !== 'd') fail(`rmdir: failed to remove '${a}': Not a directory`); else if (n.kids!.size) fail(`rmdir: failed to remove '${a}': Directory not empty`); else get(s, parentOf(p))!.kids!.delete(baseOf(p)); } return o;
      case 'rm': { parseFlags(); for (const a of args) { const p = P(a), n = get(s, p); if (!n) { if (!flags.has('f')) fail(`rm: cannot remove '${a}': No such file or directory`); continue; } if (n.t === 'd' && !flags.has('r') && !flags.has('R')) { fail(`rm: cannot remove '${a}': Is a directory`); continue; } const parent = get(s, parentOf(p))!; if (!canWrite(parent, su)) { fail(`rm: cannot remove '${a}': Permission denied`); continue; } if (p === '/' || p === HOME) { fail(`rm: refusing to remove '${a}' on the lab box`); continue; } parent.kids!.delete(baseOf(p)); } return o; }
      case 'cp': case 'mv': {
        parseFlags(); if (args.length < 2) return fail(`${cmd}: missing destination file operand`);
        const dest = P(args[args.length - 1]); const dn = get(s, dest); const srcs = args.slice(0, -1);
        if (srcs.length > 1 && (!dn || dn.t !== 'd')) return fail(`${cmd}: target '${args[args.length - 1]}' is not a directory`);
        for (const a of srcs) {
          const sp = P(a), sn = get(s, sp); if (!sn) { fail(`${cmd}: cannot stat '${a}': No such file or directory`); continue; }
          if (sn.t === 'd' && cmd === 'cp' && !flags.has('r') && !flags.has('R')) { fail(`cp: -r not specified; omitting directory '${a}'`); continue; }
          if (cmd === 'cp' && !canRead(sn, su)) { fail(`cp: cannot open '${a}' for reading: Permission denied`); continue; }
          const target = dn && dn.t === 'd' ? dest + '/' + baseOf(sp) : dest; const tp = get(s, parentOf(target)); if (!tp || tp.t !== 'd') { fail(`${cmd}: cannot create '${args[args.length - 1]}': No such file or directory`); continue; }
          if (!canWrite(tp, su)) { fail(`${cmd}: cannot create '${args[args.length - 1]}': Permission denied`); continue; }
          const clone = (n: Node): Node => n.t === 'f' ? { ...n, owner: cmd === 'cp' ? (su ? 'root' : ME) : n.owner } : { ...n, kids: new Map([...n.kids!].map(([k, v]) => [k, clone(v)])) };
          tp.kids!.set(baseOf(target), cmd === 'cp' ? clone(sn) : sn); if (cmd === 'mv') { const sparent = get(s, parentOf(sp))!; if (!canWrite(sparent, su)) { fail(`mv: cannot move '${a}': Permission denied`); tp.kids!.delete(baseOf(target)); continue; } sparent.kids!.delete(baseOf(sp)); }
        }
        return o;
      }
      case 'find': {
        const start = rest[0] && !rest[0].startsWith('-') ? rest.shift()! : '.'; const name = optVal('-name') ?? optVal('-iname'); const type = optVal('-type');
        const re = name ? new RegExp('^' + name.replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', rest.includes('-iname') ? 'i' : '') : null;
        const walk = (p: string, label: string) => { const n = get(s, p)!; if ((!re || re.test(baseOf(p) || '/')) && (!type || (type === 'd') === (n.t === 'd'))) o.out.push(label); if (n.t === 'd') { if (!su && n.owner !== ME && !(n.mode & 0o004)) { o.err.push(`find: '${label}': Permission denied`); return; } [...n.kids!.keys()].sort().forEach(k => walk(p === '/' ? '/' + k : p + '/' + k, (label === '/' ? '' : label) + '/' + k)); } };
        const sp = P(start); if (!get(s, sp)) return fail(`find: '${start}': No such file or directory`); walk(sp, start); return o;
      }
      case 'chmod': {
        const [mode, ...files] = rest; if (!mode || !files.length) return fail('chmod: missing operand');
        for (const a of files) { const n = get(s, P(a)); if (!n) { fail(`chmod: cannot access '${a}': No such file or directory`); continue; } if (!su && n.owner !== ME) { fail(`chmod: changing permissions of '${a}': Operation not permitted`); continue; }
          if (/^[0-7]{3,4}$/.test(mode)) { n.mode = parseInt(mode, 8) & 0o777; continue; }
          for (const clause of mode.split(',')) { const m = /^([ugoa]*)([+\-=])([rwx]*)$/.exec(clause); if (!m) { fail(`chmod: invalid mode: '${mode}'`); break; }
            const who = m[1] || 'a'; let bits = 0; for (const p of m[3]) bits |= p === 'r' ? 4 : p === 'w' ? 2 : 1; let mask = 0;
            for (const w of who === 'a' ? 'ugo' : who) mask |= bits << (w === 'u' ? 6 : w === 'g' ? 3 : 0);
            if (m[2] === '+') n.mode |= mask; else if (m[2] === '-') n.mode &= ~mask; else { let clear = 0; for (const w of who === 'a' ? 'ugo' : who) clear |= 7 << (w === 'u' ? 6 : w === 'g' ? 3 : 0); n.mode = (n.mode & ~clear) | mask; } } }
        return o;
      }
      case 'file': for (const a of rest) { const n = get(s, P(a)); o.out.push(!n ? `${a}: cannot open` : n.t === 'd' ? `${a}: directory` : (n.data || '').startsWith('#!') ? `${a}: Bourne-Again shell script, ASCII text executable` : (n.data || '').length ? `${a}: ASCII text` : `${a}: empty`); } return o;
      case 'env': Object.entries(s.env).sort().forEach(([k, v]) => o.out.push(`${k}=${v}`)); return o;
      case 'export': for (const a of rest) { const m = /^(\w+)=(.*)$/.exec(a); if (m) s.env[m[1]] = m[2]; else if (!/^\w+$/.test(a)) fail(`bash: export: '${a}': not a valid identifier`); } return o;
      case 'unset': rest.forEach(a => delete s.env[a]); return o;
      case 'which': for (const a of rest) { const p = CMDS.includes(a) ? '/usr/bin/' + a : this.onPath(a); if (p) o.out.push(p); else o.code = 1; } return o;
      case 'ps': o.out.push('  PID USER     COMMAND', ...s.procs.map(p => `${String(p.pid).padStart(5)} ${p.user.padEnd(8)} ${p.cmd}`)); return o;
      case 'kill': for (const a of rest.filter(x => !x.startsWith('-'))) { const pid = parseInt(a, 10); const p = s.procs.find(x => x.pid === pid); if (!p) fail(`bash: kill: (${a}) - No such process`); else if (p.user !== ME && !su) fail(`bash: kill: (${a}) - Operation not permitted`); else if (p.pid === 1201) fail('kill: that is your own shell; the lab keeps it alive'); else s.procs = s.procs.filter(x => x !== p); } return o;
      case 'sudo': if (!rest.length) return fail('usage: sudo command'); o.out.push(...(su ? [] : [])); return this.exec(rest, input, true);
      case 'history': s.hist.forEach((h, i) => o.out.push(`${String(i + 1).padStart(5)}  ${h}`)); return o;
      case 'clear': this.onClear(); return o;
      case 'hint': o.out.push(this.hints.length ? `Hint ${Math.min(this.hintAt + 1, this.hints.length)}/${this.hints.length}: ${this.hints[Math.min(this.hintAt++, this.hints.length - 1)]}` : 'No hints for this level.'); return o;
      case 'submit': {
        const v = rest.join(' ').trim(); if (!this.level?.submit) return fail('This level is checked automatically. Just do the task.');
        if (!v) return fail('usage: submit <flag or answer>');
        if (v === s.answer) { o.out.push('✔ Correct.'); this.onWin(); } else fail('✘ Not quite. Check what you copied, or type "hint".'); return o;
      }
    }
    return fail(`bash: ${cmd}: command not found`, 127);
  }
  onPath(cmd: string): string | null {
    for (const d of (this.s.env.PATH || '').split(':')) { const p = norm('/', d + '/' + cmd, this.s.env); const n = get(this.s, p); if (n && n.t === 'f') return p; }
    return null;
  }
}

/* ------------------------------------------------------------ UI */
const app = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('#lab');
if (app) {
  const levels = Array.from(document.querySelectorAll<HTMLElement>('[data-level]'));
  const term = document.querySelector<HTMLElement>('#term-out')!, form = document.querySelector<HTMLFormElement>('#term-form')!, inp = document.querySelector<HTMLInputElement>('#term-in')!, ps1 = document.querySelector<HTMLElement>('#term-ps1')!;
  const status = document.querySelector<HTMLElement>('#lab-status')!;
  const key = 'cyberhub:linux';
  const done = new Set<string>(((): string[] => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } })());
  const save = () => { try { localStorage.setItem(key, JSON.stringify([...done])); } catch { /* ignore */ } };
  const sh = new Shell(); let cur = 0, hi = -1; const pending: (() => void)[] = [];
  const line = (text: string, cls = '') => { const d = document.createElement('div'); d.textContent = text; if (cls) d.className = cls; term.append(d); };
  sh.onClear = () => term.replaceChildren();
  function mark() {
    levels.forEach(l => l.classList.toggle('done', done.has(l.dataset.level!)));
    document.querySelectorAll<HTMLElement>('[data-goto]').forEach(b => { b.classList.toggle('done', done.has(b.dataset.goto!)); b.setAttribute('aria-current', String(b.dataset.goto === levels[cur].dataset.level)); });
    const n = levels.filter(l => done.has(l.dataset.level!)).length; status.textContent = `${n} of ${levels.length} levels complete in this module`;
  }
  function open(i: number, focus = true) {
    cur = Math.max(0, Math.min(levels.length - 1, i)); const el = levels[cur]; const id = el.dataset.level!;
    levels.forEach((l, k) => { l.hidden = k !== cur; });
    const def = LEVELS.find(l => l.id === id); const hints = Array.from(el.querySelectorAll('.hint-list li')).map(li => li.textContent || '');
    if (!def) return; sh.load(def, hints);
    sh.onWin = () => { if (sh.level?.id !== id) return; const first = !done.has(id); done.add(id); save(); mark(); pending.push(() => line(first ? `★ Level complete: ${el.querySelector('h2')?.textContent}. ${cur < levels.length - 1 ? 'Type "next" or use the Next button.' : 'Module complete!'}` : '★ Already complete. Nice repeat.', 'win')); el.querySelector('.level-done')?.removeAttribute('hidden'); };
    term.replaceChildren(); line(`Connected to ${HOST}. Level: ${el.querySelector('h2')?.textContent}`, 'sys'); line(el.querySelector('.goal')?.textContent || '', 'goal'); line('Type "help" for commands, "hint" for a nudge.', 'sys');
    el.querySelector('.level-done')?.toggleAttribute('hidden', !done.has(id));
    ps1.textContent = sh.prompt(); history.replaceState(null, '', '#' + id); mark(); if (focus) inp.focus({ preventScroll: true });
  }
  form.addEventListener('submit', e => {
    e.preventDefault(); const v = inp.value; inp.value = ''; hi = -1; line(sh.prompt() + v, 'cmd');
    if (v.trim() === 'next') { open(cur + 1); return; } if (v.trim() === 'reset') { open(cur); return; }
    const r = sh.run(v); r.out.forEach(t => line(t)); r.err.forEach(t => line(t, 'err')); pending.splice(0).forEach(f => f()); ps1.textContent = sh.prompt(); term.scrollTop = term.scrollHeight;
  });
  inp.addEventListener('keydown', e => {
    const h = sh.s.hist;
    if (e.key === 'ArrowUp' && h.length) { e.preventDefault(); hi = hi < 0 ? h.length - 1 : Math.max(0, hi - 1); inp.value = h[hi]; }
    else if (e.key === 'ArrowDown' && hi >= 0) { e.preventDefault(); hi = hi >= h.length - 1 ? -1 : hi + 1; inp.value = hi < 0 ? '' : h[hi]; }
    else if (e.key === 'Tab') { e.preventDefault(); const words = inp.value.split(' '); const w = words.pop() || ''; const dirPart = w.includes('/') ? w.slice(0, w.lastIndexOf('/') + 1) : ''; const n = get(sh.s, norm(sh.s.cwd, dirPart || '.', sh.s.env));
      if (n?.t === 'd') { const opts = [...n.kids!.keys()].filter(k => k.startsWith(w.slice(dirPart.length))); if (opts.length === 1) { const c = n.kids!.get(opts[0])!; words.push(dirPart + opts[0] + (c.t === 'd' ? '/' : '')); inp.value = words.join(' '); } else if (opts.length > 1) line(opts.join('  '), 'sys'); }
      else if (words.length === 0) { const opts = CMDS.filter(c => c.startsWith(w)); if (opts.length === 1) inp.value = opts[0] + ' '; } }
    else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); term.replaceChildren(); }
  });
  term.addEventListener('click', () => { if (!getSelection()?.toString()) inp.focus(); });
  document.querySelectorAll<HTMLElement>('[data-goto]').forEach(b => b.addEventListener('click', () => open(levels.findIndex(l => l.dataset.level === b.dataset.goto))));
  document.querySelector('#lab-prev')?.addEventListener('click', () => open(cur - 1));
  document.querySelector('#lab-next')?.addEventListener('click', () => open(cur + 1));
  document.querySelector('#lab-reset')?.addEventListener('click', () => open(cur));
  const fromHash = levels.findIndex(l => l.dataset.level === location.hash.slice(1));
  open(fromHash >= 0 ? fromHash : Math.max(0, levels.findIndex(l => !done.has(l.dataset.level!))), false);
}

// Index page: mark completed levels
const idx = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('#linux-index');
if (idx) { try { const d = new Set<string>(JSON.parse(localStorage.getItem('cyberhub:linux') || '[]')); idx.querySelectorAll<HTMLElement>('[data-lv]').forEach(e => e.classList.toggle('done', d.has(e.dataset.lv!))); idx.querySelectorAll<HTMLElement>('[data-mod-count]').forEach(e => { const ids = (e.dataset.modCount || '').split(','); e.textContent = `${ids.filter(i => d.has(i)).length}/${ids.length}`; }); } catch { /* ignore */ } }
export const LEVEL_IDS = LEVELS.map(l => l.id);
export { LEVELS };
