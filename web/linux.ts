// CyberHub Linux Lab: a small, safe, in-browser shell with a virtual filesystem.
// Nothing runs on a real machine. No innerHTML; all output is textContent.
// Level lessons are server-rendered (hub/linux.py); setups and checks live here, keyed by id.

type Node = { t: 'd' | 'f'; kids?: Map<string, Node>; data?: string; mode: number; owner: string };
type Proc = { pid: number; user: string; cmd: string };
type Host = { ip: string; up: boolean; ports: number[]; path?: string[]; dieAfter?: number; http?: { headers: string[]; body: string } };
type Net = { ip: string; cidr: number; gw: string; mac: string; hosts: Record<string, Host>; dns: Record<string, Record<string, string[]>>; listen: { port: number; proc: string }[]; conns: { local: string; remote: string; proc: string }[] };
type State = { root: Node; cwd: string; env: Record<string, string>; procs: Proc[]; ran: string[]; answer: string; hist: string[]; net: Net };
type Out = { out: string[]; err: string[]; code: number };
type Level = { id: string; setup?: (s: State) => void; check?: (s: State) => boolean; submit?: boolean; start?: string };

const ME = 'student', HOME = '/home/student', HOST = 'hub01';
const rnd = (n = 12) => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => (b % 16).toString(16)).join('');
const flag = () => `HUB{${rnd(6)}-${rnd(6)}-${rnd(4)}}`;
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
  const s: State = { root: dir(), cwd: HOME, env: { HOME, USER: ME, SHELL: '/bin/bash', PATH: '/usr/local/bin:/usr/bin:/bin', PWD: HOME, HOSTNAME: HOST }, procs: [], ran: [], answer: '', hist: [], net: baseNet() };
  for (const d of ['/bin', '/usr/bin', '/usr/local/bin', '/etc', '/var/log', '/opt', '/srv', '/root']) mkdirp(s, d);
  get(s, '/root')!.mode = 0o700; mkdirp(s, '/tmp').mode = 0o777;
  mkdirp(s, HOME, ME, 0o755); get(s, '/home')!.owner = 'root';
  for (const c of CMDS) put(s, '/usr/bin/' + c, '#!/bin/cyberhub-builtin', 'root', 0o755);
  put(s, '/etc/hostname', HOST + '\n', 'root');
  writeNetFiles(s);
  put(s, '/etc/passwd', 'root:x:0:0:root:/root:/bin/bash\nstudent:x:1000:1000:CyberHub Student:/home/student:/bin/bash\nanalyst:x:1001:1001:SOC Analyst:/home/analyst:/bin/bash\nbackup:x:34:34:backup:/var/backups:/usr/sbin/nologin\n', 'root');
  put(s, '/etc/shadow', 'root:$6$redacted:19700:0:99999:7:::\n', 'root', 0o600);
  put(s, HOME + '/README', 'Welcome to hub01, the CyberHub practice server.\nType "help" for commands, "hint" if you are stuck, and "submit <flag>" when you find one.\n');
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


/* ------------------------------------------------------------ network (Networking Lab) */
const ip4 = (a: number, b: number, c: number, d: number) => `${a}.${b}.${c}.${d}`;
const toInt = (ip: string) => ip.split('.').reduce((n, x) => n * 256 + Number(x), 0);
const toIp = (n: number) => [24, 16, 8, 0].map(sh => Math.floor(n / 2 ** sh) % 256).join('.');
const maskOf = (p: number) => p === 0 ? 0 : (2 ** 32 - 2 ** (32 - p));
const netAddr = (ip: string, p: number) => toIp(Math.floor(toInt(ip) / 2 ** (32 - p)) * 2 ** (32 - p));
const bcast = (ip: string, p: number) => toIp(toInt(netAddr(ip, p)) + 2 ** (32 - p) - 1);
function baseNet(): Net {
  const c = ri(10, 99);
  return { ip: ip4(10, 20, c, ri(201, 250)), cidr: 24, gw: ip4(10, 20, c, 1), mac: '52:54:00:' + [0, 0, 0].map(() => ri(16, 255).toString(16)).join(':'),
    hosts: { 'portal.hub.lab': { ip: ip4(10, 20, c, 80), up: true, ports: [80, 443], http: { headers: ['HTTP/1.1 200 OK', 'Server: nginx', 'Content-Type: text/html'], body: '<h1>CyberHub portal</h1>' } } },
    dns: { 'portal.hub.lab': { A: [ip4(10, 20, c, 80)] }, 'hub.lab': { NS: ['ns1.hub.lab.'], MX: ['10 mail.hub.lab.'] } },
    listen: [{ port: 22, proc: 'sshd' }], conns: [] };
}
function writeNetFiles(s: State, resolver = ip4(10, 20, Number(s.net.gw.split('.')[2]), 53), hostsExtra = '') {
  put(s, '/etc/resolv.conf', `# managed by netplan\nnameserver ${resolver}\nsearch hub.lab\n`, 'root');
  put(s, '/etc/hosts', `127.0.0.1 localhost\n127.0.1.1 ${HOST}\n${hostsExtra}`, 'root');
}
function hostsFile(s: State): Record<string, string> {
  const m: Record<string, string> = {}; for (const l of (get(s, '/etc/hosts')?.data || '').split('\n')) { const [ip, ...names] = l.replace(/#.*/, '').trim().split(/\s+/); if (ip) names.forEach(n => { m[n] = ip; }); } return m;
}
function resolve(s: State, name: string): string | null {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(name)) return name;
  const fq = name.includes('.') ? name : name + '.hub.lab';
  return hostsFile(s)[name] ?? s.net.dns[fq]?.A?.[0] ?? s.net.dns[name]?.A?.[0] ?? null;
}
const hostByIp = (s: State, ip: string) => Object.values(s.net.hosts).find(h => h.ip === ip);
const NETCMDS = ['ip', 'ping', 'traceroute', 'dig', 'nslookup', 'host', 'ss', 'netstat', 'nc', 'curl'];
function netExec(s: State, cmd: string, rest: string[], o: Out): Out {
  const fail = (m: string, c = 1) => { o.err.push(m); o.code = c; return o; }; const n = s.net;
  switch (cmd) {
    case 'ip': {
      const obj = rest.find(r => !r.startsWith('-')) || '';
      if (/^a(ddr(ess)?)?$/.test(obj)) { o.out.push('1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 state UNKNOWN', '    inet 127.0.0.1/8 scope host lo', `2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP`, `    link/ether ${n.mac} brd ff:ff:ff:ff:ff:ff`, `    inet ${n.ip}/${n.cidr} brd ${bcast(n.ip, n.cidr)} scope global eth0`); return o; }
      if (/^r(o(ute)?)?$/.test(obj)) { o.out.push(`default via ${n.gw} dev eth0 proto dhcp`, `${netAddr(n.ip, n.cidr)}/${n.cidr} dev eth0 proto kernel scope link src ${n.ip}`); return o; }
      if (/^n(eigh(bour)?)?$/.test(obj)) { o.out.push(`${n.gw} dev eth0 lladdr 52:54:00:00:00:01 REACHABLE`); return o; }
      return fail('Usage: ip addr | ip route | ip neigh');
    }
    case 'ping': {
      const ci = rest.indexOf('-c'); const count = ci >= 0 ? Math.min(10, Math.max(1, parseInt(rest[ci + 1], 10) || 4)) : 4;
      const target = rest.filter((r, i) => !r.startsWith('-') && rest[i - 1] !== '-c')[0]; if (!target) return fail('ping: usage error: Destination address required', 2);
      const ip = resolve(s, target); if (!ip) return fail(`ping: ${target}: Name or service not known`, 2);
      const h = hostByIp(s, ip); const up = ip === n.gw || ip === n.ip || ip.startsWith('127.') || !!h?.up;
      o.out.push(`PING ${target} (${ip}) 56(84) bytes of data.`);
      for (let i = 1; i <= count; i++) o.out.push(up ? `64 bytes from ${ip}: icmp_seq=${i} ttl=${h?.path ? 64 - h.path.length : 64} time=${(Math.random() * 20 + 0.3).toFixed(1)} ms` : `From ${n.ip} icmp_seq=${i} Destination Host Unreachable`);
      o.out.push('', `--- ${target} ping statistics ---`, `${count} packets transmitted, ${up ? count : 0} received, ${up ? 0 : 100}% packet loss`); if (!up) o.code = 1; return o;
    }
    case 'traceroute': {
      const target = rest.find(r => !r.startsWith('-')); if (!target) return fail('Usage: traceroute host');
      const ip = resolve(s, target); if (!ip) return fail(`${target}: Name or service not known`, 2);
      const h = hostByIp(s, ip); const path = [n.gw, ...(h?.path || []), ip]; o.out.push(`traceroute to ${target} (${ip}), 30 hops max, 60 byte packets`);
      const stop = h?.dieAfter ?? path.length;
      for (let i = 0; i < Math.min(path.length, stop); i++) o.out.push(`${String(i + 1).padStart(2)}  ${path[i]}  ${(Math.random() * 9 + 1 + i * 4).toFixed(3)} ms`);
      if (stop < path.length) for (let i = stop; i < stop + 4; i++) o.out.push(`${String(i + 1).padStart(2)}  * * *`);
      return o;
    }
    case 'dig': case 'host': case 'nslookup': {
      const short = rest.includes('+short'); const args = rest.filter(r => !r.startsWith('+') && !r.startsWith('@') && !r.startsWith('-'));
      let type = 'A'; const tIdx = args.findIndex(a => /^(A|AAAA|MX|TXT|NS|CNAME)$/i.test(a)); if (tIdx >= 0) type = args.splice(tIdx, 1)[0].toUpperCase();
      const ti = rest.indexOf('-t'); if (ti >= 0 && rest[ti + 1]) { type = rest[ti + 1].toUpperCase(); args.splice(args.indexOf(rest[ti + 1]), 1); }
      const qq = rest.find(r => /^-(type|query)=/.test(r)); if (qq) type = qq.split('=')[1].toUpperCase();
      const name = (args[0] || '').replace(/\.$/, ''); if (!name) return fail(`usage: ${cmd} name [type]`);
      const recs = s.net.dns[name]?.[type] || []; const server = (get(s, '/etc/resolv.conf')?.data || '').match(/nameserver (\S+)/)?.[1] || '';
      if (cmd === 'dig') {
        if (short) { o.out.push(...recs); return o; }
        o.out.push(`; <<>> DiG 9.18 <<>> ${name} ${type}`, `;; status: ${recs.length ? 'NOERROR' : (s.net.dns[name] ? 'NOERROR' : 'NXDOMAIN')}`, '', ';; ANSWER SECTION:');
        recs.forEach(r => o.out.push(`${name}.\t\t300\tIN\t${type}\t${r}`)); o.out.push('', `;; SERVER: ${server}#53(${server})`); return o;
      }
      if (!recs.length) return fail(cmd === 'host' ? `Host ${name} not found: 3(NXDOMAIN)` : `** server can't find ${name}: NXDOMAIN`);
      if (cmd === 'host') recs.forEach(r => o.out.push(type === 'A' ? `${name} has address ${r}` : type === 'MX' ? `${name} mail is handled by ${r}` : type === 'TXT' ? `${name} descriptive text ${r}` : `${name} ${type} ${r}`));
      else { o.out.push(`Server:\t\t${server}`, `Address:\t${server}#53`, '', 'Non-authoritative answer:'); recs.forEach(r => o.out.push(type === 'A' ? `Name:\t${name}\nAddress: ${r}` : `${name}\t${type.toLowerCase()} = ${r}`)); }
      return o;
    }
    case 'ss': case 'netstat': {
      const f = rest.join('').replace(/-/g, ''); const listenOnly = f.includes('l'); const showP = f.includes('p');
      o.out.push('State      Local Address:Port        Peer Address:Port     ' + (showP ? 'Process' : ''));
      n.listen.forEach(l => o.out.push(`LISTEN     0.0.0.0:${String(l.port).padEnd(18)}0.0.0.0:*              ${showP ? `users:(("${l.proc}"))` : ''}`));
      if (!listenOnly) n.conns.forEach(c => o.out.push(`ESTAB      ${c.local.padEnd(26)}${c.remote.padEnd(23)}${showP ? `users:(("${c.proc}"))` : ''}`));
      return o;
    }
    case 'nc': {
      const args = rest.filter(r => !r.startsWith('-')); const target = args[0]; if (!target || args.length < 2) return fail('usage: nc -zv host port [port...]  (ranges like 20-25 work)');
      const ip = resolve(s, target); if (!ip) return fail(`nc: getaddrinfo for host "${target}" port ${args[1]}: Name or service not known`);
      const h = hostByIp(s, ip); const ports: number[] = [];
      args.slice(1).forEach(a => { const m = /^(\d+)-(\d+)$/.exec(a); if (m) { for (let p = +m[1]; p <= Math.min(+m[2], +m[1] + 1024); p++) ports.push(p); } else if (/^\d+$/.test(a)) ports.push(+a); });
      ports.forEach(p => { if (h?.up && h.ports.includes(p)) o.err.push(`Connection to ${target} (${ip}) ${p} port [tcp/*] succeeded!`); else if (ports.length <= 8) o.err.push(`nc: connect to ${target} (${ip}) port ${p} (tcp) failed: ${h?.up ? 'Connection refused' : 'No route to host'}`); });
      return o;
    }
    case 'curl': {
      const head = rest.includes('-I') || rest.includes('--head'); const url = rest.find(r => !r.startsWith('-')); if (!url) return fail('curl: try \'curl -I http://host/\'', 2);
      const m = /^(https?:\/\/)?([^/:]+)/.exec(url); const hname = m?.[2] || ''; const ip = resolve(s, hname); if (!ip) return fail(`curl: (6) Could not resolve host: ${hname}`, 6);
      const h = hostByIp(s, ip); if (!h?.up || !h.http) return fail(`curl: (7) Failed to connect to ${hname} port 80: Connection refused`, 7);
      o.out.push(...h.http.headers); if (!head) o.out.push('', h.http.body); return o;
    }
  }
  return fail(`bash: ${cmd}: command not found`, 127);
}
const sameNet = (s: State) => s.net.gw.split('.').slice(0, 3).join('.');
const question = (s: State, text: string) => put(s, HOME + '/question.txt', text + '\n');
const NET_LEVELS: Level[] = [
  // your connection
  { id: 'net-my-ip', submit: true, setup: s => { sub(s, s.net.ip); } },
  { id: 'net-gateway', submit: true, setup: s => { sub(s, s.net.gw); } },
  { id: 'net-resolver', submit: true, setup: s => { const r = `${sameNet(s)}.${ri(2, 60)}`; writeNetFiles(s, r); sub(s, r); } },
  // reachability
  { id: 'net-ping-down', submit: true, setup: s => { const names = ['web01', 'db01', 'backup01', 'files01']; const down = pick(names);
    names.forEach((nm, i) => { const ip = `${sameNet(s)}.${100 + i}`; s.net.hosts[nm + '.hub.lab'] = { ip, up: nm !== down, ports: [22] }; s.net.dns[nm + '.hub.lab'] = { A: [ip] }; });
    put(s, HOME + '/servers.txt', names.join('\n') + '\n'); sub(s, down); } },
  { id: 'net-traceroute', submit: true, setup: s => { const hops = [`100.64.${ri(0, 255)}.1`, `198.51.100.${ri(1, 254)}`, `203.0.113.${ri(1, 120)}`, `203.0.113.${ri(121, 254)}`]; const dieAfter = ri(2, 4);
    s.net.hosts['vpn.partner.example'] = { ip: `192.0.2.${ri(10, 250)}`, up: false, ports: [], path: hops, dieAfter }; s.net.dns['vpn.partner.example'] = { A: [s.net.hosts['vpn.partner.example'].ip] };
    sub(s, [s.net.gw, ...hops][dieAfter - 1]); } },
  // dns
  { id: 'net-dig-a', submit: true, setup: s => { const ip = `${sameNet(s)}.${ri(110, 199)}`; s.net.dns['grades.hub.lab'] = { A: [ip] }; s.net.hosts['grades.hub.lab'] = { ip, up: true, ports: [443] }; sub(s, ip); } },
  { id: 'net-dig-mx', submit: true, setup: s => { const a = pick(['mx1', 'smtp-a', 'mail-east']), b = pick(['mx2', 'smtp-b', 'mail-west']); s.net.dns['hub.lab'].MX = [`20 ${b}.hub.lab.`, `10 ${a}.hub.lab.`]; sub(s, `${a}.hub.lab`); } },
  { id: 'net-dig-txt', submit: true, setup: s => { s.net.dns['_verify.hub.lab'] = { TXT: [`"v=spf1 -all"`, `"cyberhub-verify=${sub(s, flag())}"`] }; } },
  { id: 'net-hosts-poison', submit: true, setup: s => { const evil = `185.${ri(100, 220)}.${ri(1, 254)}.${ri(1, 254)}`; s.net.dns['login.bank.example'] = { A: [`192.0.2.${ri(10, 99)}`] };
    writeNetFiles(s, undefined, `${evil} login.bank.example\n`); sub(s, evil); } },
  // ports and connections
  { id: 'net-listening', submit: true, setup: s => { const odd = pick([4444, 1337, 31337, 6667, 9001]); s.net.listen = [{ port: 22, proc: 'sshd' }, { port: 80, proc: 'nginx' }, { port: 443, proc: 'nginx' }, { port: odd, proc: pick(['kworkerd', 'dbus-helper', 'syslogd2']) }, { port: 5432, proc: 'postgres' }].sort((x, y) => x.port - y.port); sub(s, String(odd)); } },
  { id: 'net-established', submit: true, setup: s => { const evil = `${pick([45, 91, 185])}.${ri(1, 254)}.${ri(1, 254)}.${ri(1, 254)}`; s.net.listen = [{ port: 22, proc: 'sshd' }, { port: 443, proc: 'nginx' }];
    s.net.conns = [{ local: `${s.net.ip}:22`, remote: `${sameNet(s)}.${ri(2, 60)}:${ri(40000, 60000)}`, proc: 'sshd' }, { local: `${s.net.ip}:${ri(50000, 60000)}`, remote: `${evil}:4444`, proc: 'bash' }, { local: `${s.net.ip}:443`, remote: `${sameNet(s)}.${ri(61, 99)}:${ri(40000, 60000)}`, proc: 'nginx' }];
    sub(s, evil); } },
  { id: 'net-port-check', submit: true, setup: s => { const open = pick([3306, 5432, 1433, 27017]); const ip = `${sameNet(s)}.${ri(150, 200)}`; s.net.hosts['db01.hub.lab'] = { ip, up: true, ports: [22, open] }; s.net.dns['db01.hub.lab'] = { A: [ip] }; sub(s, String(open)); } },
  { id: 'net-curl-headers', submit: true, setup: s => { const ip = `${sameNet(s)}.${ri(110, 140)}`; s.net.dns['intranet.hub.lab'] = { A: [ip] };
    s.net.hosts['intranet.hub.lab'] = { ip, up: true, ports: [80], http: { headers: ['HTTP/1.1 200 OK', 'Server: Apache/2.4.29 (Ubuntu)', 'Content-Type: text/html', `X-Debug-Token: ${sub(s, flag())}`], body: '<h1>Intranet</h1><p>Welcome back.</p>' } }; } },
  // subnetting (answers worked out by hand)
  { id: 'subnet-hosts', submit: true, setup: s => { const p = ri(22, 29); question(s, `How many usable host addresses are in 10.${ri(1, 250)}.0.0/${p}?`); sub(s, String(2 ** (32 - p) - 2)); } },
  { id: 'subnet-network', submit: true, setup: s => { const p = pick([25, 26, 27, 28]); const ip = ip4(192, 168, ri(0, 255), ri(1, 254)); question(s, `What is the network address of ${ip}/${p}?`); sub(s, netAddr(ip, p)); } },
  { id: 'subnet-broadcast', submit: true, setup: s => { const p = pick([25, 26, 27, 28, 29]); const ip = ip4(172, 16, ri(0, 255), ri(1, 254)); question(s, `What is the broadcast address of ${ip}/${p}?`); sub(s, bcast(ip, p)); } },
  { id: 'subnet-same', submit: true, setup: s => { const p = pick([25, 26, 27, 28]); const a = ip4(10, 0, ri(0, 255), ri(1, 254)); const sizeB = 2 ** (32 - p); const same = Math.random() < .5;
    const base = toInt(netAddr(a, p)); const bInt = same ? base + ri(1, sizeB - 2) : (base + sizeB + ri(1, sizeB - 2)) % 2 ** 32; const b = toIp(bInt);
    question(s, `Mask: /${p} (${toIp(maskOf(p))})\nHost A: ${a}\nHost B: ${b}\nAre A and B on the same subnet? Answer yes or no.`); sub(s, netAddr(a, p) === netAddr(b, p) ? 'yes' : 'no'); } },
];
const ALL_LEVELS = [...LEVELS, ...NET_LEVELS];

/* ------------------------------------------------------------ shell */
const CMDS = ['help', 'man', 'whoami', 'id', 'hostname', 'pwd', 'cd', 'ls', 'cat', 'head', 'tail', 'wc', 'grep', 'sort', 'uniq', 'cut', 'echo', 'touch', 'mkdir', 'rm', 'rmdir', 'cp', 'mv', 'find', 'chmod', 'file', 'env', 'export', 'unset', 'which', 'ps', 'kill', 'sudo', 'history', 'clear', 'submit', 'hint', 'date', 'uname', ...NETCMDS];
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
  submit: 'submit FLAG  check a flag or answer for the current level.',
  ip: 'ip addr | ip route | ip neigh  show addresses, routes and neighbors.', ping: 'ping [-c N] host  is it reachable? Sends echo requests.',
  traceroute: 'traceroute host  list each router (hop) on the way. * * * means no reply.', dig: 'dig name [A|MX|TXT|NS] [+short]  ask DNS. +short prints just the answer.',
  nslookup: 'nslookup name  ask DNS (older tool).', host: 'host [-t TYPE] name  simple DNS lookup.', ss: 'ss -tlnp  listening TCP ports with process. ss -tanp  all connections.',
  netstat: 'netstat -tlnp  older version of ss.', nc: 'nc -zv host port...  test whether TCP ports are open (ranges like 20-25 work).', curl: 'curl [-I] url  fetch a web page; -I shows only the response headers.', hint: 'hint  show the next hint for this level.',
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
const globRe = (pat: string) => { try { return new RegExp('^' + pat.replace(/[.+^${}()|\\]/g, '\\$&').replace(/\u0001\*/g, '[^/]*').replace(/\u0001\?/g, '[^/]').replace(/\u0001\[/g, '[') + '$'); } catch { return new RegExp('^' + pat.replace(/\u0001/g, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'); } };
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
  exec(argv: string[], input: string | null, su = false, depth = 0): Out {
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
      if (depth >= 32) return fail(`bash: ${cmd}: maximum script depth exceeded`, 126);
      for (const line of (n.data || '').split('\n')) { if (!line || line.startsWith('#')) continue; const r = this.exec(tokenize(line, s)[0].map(x => x.replace(/\u0001/g, '')), null, su, depth + 1); o.out.push(...r.out); o.err.push(...r.err); o.code = r.code; }
      return o;
    }
    if (NETCMDS.includes(cmd)) return netExec(s, cmd, rest, o);
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
          const target = dn && dn.t === 'd' ? dest + '/' + baseOf(sp) : dest; if (cmd === 'mv' && sn.t === 'd' && (target === sp || target.startsWith(sp + '/'))) { fail(`mv: cannot move '${a}' to a subdirectory of itself`); continue; } const tp = get(s, parentOf(target)); if (!tp || tp.t !== 'd') { fail(`${cmd}: cannot create '${args[args.length - 1]}': No such file or directory`); continue; }
          if (!canWrite(tp, su)) { fail(`${cmd}: cannot create '${args[args.length - 1]}': Permission denied`); continue; }
          const clone = (n: Node): Node => n.t === 'f' ? { ...n, owner: cmd === 'cp' ? (su ? 'root' : ME) : n.owner } : { ...n, kids: new Map([...n.kids!].map(([k, v]) => [k, clone(v)])) };
          tp.kids!.set(baseOf(target), cmd === 'cp' ? clone(sn) : sn); if (cmd === 'mv') { const sparent = get(s, parentOf(sp))!; if (!canWrite(sparent, su)) { fail(`mv: cannot move '${a}': Permission denied`); tp.kids!.delete(baseOf(target)); continue; } sparent.kids!.delete(baseOf(sp)); }
        }
        return o;
      }
      case 'find': {
        const start = rest[0] && !rest[0].startsWith('-') ? rest.shift()! : '.'; const name = optVal('-name') ?? optVal('-iname'); const type = optVal('-type');
        let re: RegExp | null = null; if (name) { const pattern = '^' + name.replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$'; try { re = new RegExp(pattern, rest.includes('-iname') ? 'i' : ''); } catch { re = new RegExp('^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'); } }
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
  const key = app.dataset.key || 'cyberhub:linux';
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
    const def = ALL_LEVELS.find(l => l.id === id); const hints = Array.from(el.querySelectorAll('.hint-list li')).map(li => li.textContent || '');
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
const idx = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('#linux-index, #net-index');
if (idx) { try { const d = new Set<string>(JSON.parse(localStorage.getItem(idx.dataset.key || 'cyberhub:linux') || '[]')); idx.querySelectorAll<HTMLElement>('[data-lv]').forEach(e => e.classList.toggle('done', d.has(e.dataset.lv!))); idx.querySelectorAll<HTMLElement>('[data-mod-count]').forEach(e => { const ids = (e.dataset.modCount || '').split(','); e.textContent = `${ids.filter(i => d.has(i)).length}/${ids.length}`; }); } catch { /* ignore */ } }
// Rank ladder on the index page
const rankEl = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('#lx-rank');
if (rankEl) {
  const set = rankEl.dataset.key === 'cyberhub:netlab' ? NET_LEVELS : LEVELS; const total = set.length;
  let n = 0; try { n = (JSON.parse(localStorage.getItem(rankEl.dataset.key || 'cyberhub:linux') || '[]') as string[]).filter(id => set.some(l => l.id === id)).length; } catch { /* ignore */ }
  const ranks = (rankEl.dataset.ranks || '').split(',').map(x => { const [a, b] = x.split(':'); return [Number(a), b] as [number, string]; });
  let cur = ranks[0], next: [number, string] | undefined; for (const r of ranks) { if (n >= r[0]) cur = r; else { next = r; break; } }
  rankEl.querySelector('#lx-rank-name')!.textContent = cur[1];
  rankEl.querySelector<HTMLElement>('#lx-rank-fill')!.style.setProperty('--p', String(Math.min(1, n / total)));
  rankEl.querySelector('#lx-rank-next')!.textContent = next ? `${n} of ${total} levels · ${next[0] - n} more to reach ${next[1]}` : `All ${total} levels complete. ${set === LEVELS ? 'You are root.' : 'You own the network.'}`;
  rankEl.querySelectorAll<HTMLElement>('[data-at]').forEach(li => li.classList.toggle('on', n >= Number(li.dataset.at)));
}
export const LEVEL_IDS = LEVELS.map(l => l.id);
export { LEVELS, NET_LEVELS };
