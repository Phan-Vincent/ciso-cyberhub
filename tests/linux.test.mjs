// Solves every Linux Lab level with real shell commands against the simulated shell.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'linux-'));
const file = join(dir, 'linux.mjs');
writeFileSync(file, stripTypeScriptTypes(readFileSync(new URL('../web/linux.ts', import.meta.url), 'utf8'), { mode: 'strip' }));
const { Shell, LEVELS } = await import(pathToFileURL(file).href);

const out = (sh, cmd) => { const r = sh.run(cmd); return r.out.join('\n'); };
const grab = s => (s.match(/CISO\{[0-9a-f-]+\}/) || [])[0];
// For each level: commands to run, then optional function producing the submission from outputs.
const SOLVE = {
  'first-command': ['whoami'],
  'echo': ['echo "hello, hub01"'],
  'manual': ['man ls'],
  'read-the-flag': sh => grab(out(sh, 'cat /flag')),
  'where-am-i': ['pwd'],
  'change-directory': ['cd /var/log'],
  'absolute-paths': sh => grab(out(sh, 'cat /opt/cases/2026/october/ir-17/flag')),
  'home-sweet-home': sh => grab(out(sh, 'cd ~; cat notes/handoff.txt')),
  'hidden-files': sh => { assert.match(out(sh, 'ls -a'), /\.analyst_scratch/); return grab(out(sh, 'cat .analyst_scratch')); },
  'dot-dot': sh => grab(out(sh, 'cd ../..; cat marker')),
  'head': sh => grab(out(sh, 'head -n 1 /var/log/boot.log')),
  'tail': sh => grab(out(sh, 'tail -n 1 /var/log/app.log')),
  'count-lines': sh => out(sh, 'wc -l /var/log/dns.log').split(' ')[0],
  'grep': sh => grab(out(sh, 'grep CISO /var/log/proxy.log')),
  'mkdir': ['mkdir ~/cases'],
  'touch': ['touch ~/cases/report.txt'],
  'copy': ['cp /opt/evidence/capture.pcap ~/cases/'],
  'move': ['mv ~/cases/draft.txt ~/cases/final-report.txt'],
  'remove': ['rm ~/scratch/*.tmp'],
  'star': ['mkdir ~/logs', 'cp /var/log/edge/*.log ~/logs/'],
  'brackets': ['rm ~/exports/report_[0-9].csv'],
  'redirect': ['echo "incident logged" > ~/status.txt'],
  'append': ['echo "09:15 host isolated" >> ~/timeline.txt'],
  'pipe-count': sh => out(sh, 'grep "Failed password" /var/log/auth.log | wc -l').trim(),
  'top-talker': sh => out(sh, "grep Failed /var/log/auth.log | cut -d ' ' -f 11 | sort | uniq -c | sort -nr | head -n 1").trim().split(/\s+/)[1],
  'find': sh => { const p = out(sh, 'find / -name "*.key" 2>/dev/null').trim().split('\n')[0]; return grab(out(sh, 'cat ' + p)); },
  'grep-recursive': sh => grab(out(sh, 'grep -r CISO /srv/config')),
  'read-permissions': sh => (out(sh, 'ls -l ~/configs').split('\n').find(l => l.startsWith('-rw-rw-rw-')) || '').trim().split(/\s+/).pop(),
  'chmod-private': ['chmod 600 ~/.ssh/id_ed25519'],
  'run-script': sh => { assert.match(out(sh, 'cd ~/tools; chmod +x triage.sh'), /^$/); return grab(out(sh, './triage.sh')); },
  'sudo': sh => { assert.equal(sh.run('cat /root/incident-key.txt').err.length > 0, true); return grab(out(sh, 'sudo cat /root/incident-key.txt')); },
  'env-var': sh => grab(out(sh, 'echo $CASE_TOKEN')),
  'export': ['export CASE_ID=IR-2026-17'],
  'path': sh => { assert.equal(sh.run('ioc-check').code, 127); return grab(out(sh, 'export PATH=$PATH:/opt/soc/bin; ioc-check')); },
  'processes': sh => { const pid = out(sh, 'ps').split('\n').find(l => l.includes('xmr-helper')).trim().split(/\s+/)[0]; sh.run('kill ' + pid); return null; },
  'who-has-a-shell': sh => out(sh, 'grep /bin/bash /etc/passwd | cut -d : -f 1').split('\n').find(u => !['root', 'student', 'analyst'].includes(u)),
};

test('every level has a solution and is solvable', () => {
  assert.deepEqual(Object.keys(SOLVE).sort(), LEVELS.map(l => l.id).sort());
  for (const level of LEVELS) {
    const sh = new Shell(); let won = false; sh.onWin = () => { won = true; };
    sh.load(level, ['h']);
    const how = SOLVE[level.id];
    if (Array.isArray(how)) how.forEach(c => sh.run(c));
    else { const answer = how(sh); if (level.submit) { assert.ok(answer, `${level.id}: no answer found`); sh.run('submit ' + answer); } }
    assert.ok(won, `level ${level.id} was not solved`);
  }
});

test('wrong submissions and permissions are enforced', () => {
  const lvl = LEVELS.find(l => l.id === 'sudo'); const sh = new Shell(); let won = false; sh.onWin = () => { won = true; }; sh.load(lvl, []);
  assert.match(sh.run('cat /root/incident-key.txt').err.join(''), /Permission denied/);
  sh.run('submit CISO{nope}'); assert.equal(won, false);
  assert.match(sh.run('rm -r /').err.join(''), /refusing|Permission/);
});

// Networking Lab: solve every level with the simulated network commands.
const { NET_LEVELS } = await import(pathToFileURL(file).href);
const NET = {
  'net-my-ip': sh => out(sh, 'ip a').match(/inet (10\.[\d.]+)\//)[1],
  'net-gateway': sh => out(sh, 'ip route').match(/default via (\S+)/)[1],
  'net-resolver': sh => out(sh, 'cat /etc/resolv.conf').match(/nameserver (\S+)/)[1],
  'net-ping-down': sh => out(sh, 'cat ~/servers.txt').trim().split('\n').find(n => sh.run('ping -c 1 ' + n).code !== 0),
  'net-traceroute': sh => out(sh, 'traceroute vpn.partner.example').split('\n').filter(l => /^\s*\d+\s+\d/.test(l)).pop().trim().split(/\s+/)[1],
  'net-dig-a': sh => out(sh, 'dig grades.ciso.lab +short').trim(),
  'net-dig-mx': sh => out(sh, 'dig ciso.lab MX +short').trim().split('\n').map(l => l.split(' ')).sort((a, b) => a[0] - b[0])[0][1].replace(/\.$/, ''),
  'net-dig-txt': sh => grab(out(sh, 'dig _verify.ciso.lab TXT')),
  'net-hosts-poison': sh => { const dns = out(sh, 'dig login.bank.example +short').trim(); const hosts = out(sh, 'grep bank /etc/hosts').split(' ')[0]; assert.notEqual(dns, hosts); return hosts; },
  'net-listening': sh => out(sh, 'ss -tlnp').split('\n').find(l => /kworkerd|dbus-helper|syslogd2/.test(l)).match(/:(\d+)/)[1],
  'net-established': sh => out(sh, 'ss -tanp').split('\n').find(l => l.includes('bash')).match(/(\d+\.\d+\.\d+\.\d+):4444/)[1],
  'net-port-check': sh => sh.run('nc -zv db01 3306 5432 1433 27017').err.find(l => l.includes('succeeded')).match(/\) (\d+) port/)[1],
  'net-curl-headers': sh => grab(out(sh, 'curl -I http://intranet.ciso.lab/')),
};
const calc = q => {
  const toInt = ip => ip.split('.').reduce((n, x) => n * 256 + +x, 0), toIp = n => [24, 16, 8, 0].map(s => Math.floor(n / 2 ** s) % 256).join('.');
  const net = (ip, p) => toIp(Math.floor(toInt(ip) / 2 ** (32 - p)) * 2 ** (32 - p));
  let m;
  if ((m = /usable host addresses are in \S+\/(\d+)/.exec(q))) return String(2 ** (32 - +m[1]) - 2);
  if ((m = /network address of (\S+)\/(\d+)/.exec(q))) return net(m[1], +m[2]);
  if ((m = /broadcast address of (\S+)\/(\d+)/.exec(q))) return toIp(toInt(net(m[1], +m[2])) + 2 ** (32 - +m[2]) - 1);
  m = /\/(\d+)[\s\S]*Host A: (\S+)\nHost B: (\S+)/.exec(q); return net(m[2], +m[1]) === net(m[3], +m[1]) ? 'yes' : 'no';
};
for (const id of ['subnet-hosts', 'subnet-network', 'subnet-broadcast', 'subnet-same']) NET[id] = sh => calc(out(sh, 'cat ~/question.txt'));

test('every networking level is solvable with real commands', () => {
  assert.deepEqual(Object.keys(NET).sort(), NET_LEVELS.map(l => l.id).sort());
  for (let round = 0; round < 5; round++) for (const level of NET_LEVELS) {
    const sh = new Shell(); let won = false; sh.onWin = () => { won = true; }; sh.load(level, []);
    const answer = NET[level.id](sh); assert.ok(answer, `${level.id}: no answer`); sh.run('submit ' + answer); assert.ok(won, `${level.id} not solved with ${answer}`);
  }
});

test('network commands fail like the real ones', () => {
  const sh = new Shell(); sh.load(NET_LEVELS[0], []);
  assert.match(sh.run('ping nowhere.example').err.join(''), /Name or service not known/);
  assert.match(sh.run('curl http://nowhere.example').err.join(''), /Could not resolve host/);
  assert.match(out(sh, 'man dig'), /DNS/);
});
