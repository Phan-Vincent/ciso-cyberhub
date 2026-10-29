import test from 'node:test';
import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = mkdtempSync(join(tmpdir(), 'capstone-'));
for (const n of ['capstone', 'account', 'journey']) writeFileSync(join(dir, n + '.mjs'), stripTypeScriptTypes(readFileSync(new URL(`../web/${n}.ts`, import.meta.url), 'utf8'), { mode: 'strip' }));
const C = await import(pathToFileURL(join(dir, 'capstone.mjs')).href);
const A = await import(pathToFileURL(join(dir, 'account.mjs')).href);
const J = await import(pathToFileURL(join(dir, 'journey.mjs')).href);
const data = JSON.parse(readFileSync(new URL('../data/capstone.json', import.meta.url), 'utf8'));
const [email, endpoint, network, ad] = data.stages;
const questions = data.stages.flatMap(s => s.questions);
const q = id => questions.find(x => x.id === id);
const answer = (id, derived) => assert.ok(C.correct(q(id), String(derived)), `${id}: derived ${derived}`);
const id = line => line.split(' | ')[0];
const seconds = line => { const [,h,m,s] = line.match(/\| (\d\d):(\d\d):(\d\d) \|/); return +h*3600 + +m*60 + +s; };
const bytes = line => Number(line.match(/\| (\d+) B out/)[1]);

test('solver follows carried file, C2 IP and internal source through noisy evidence', () => {
  answer('target', email.evidence.find(x => /To:/.test(x)).match(/To: [^<]+<([^>]+)>/)[1]);
  answer('lure', email.evidence.find(x => /Subject:/.test(x)).match(/Subject: Required (.+)$/)[1]);
  answer('authentication', /spf=pass.*dkim=pass.*dmarc=pass/.test(email.evidence.join(' ')) && /unrelated lookalike/.test(email.evidence.join(' ')) ? q('authentication').options[0] : 'unknown');
  const file = email.evidence.find(x => /Gateway extraction/.test(x)).match(/contains ([^;]+);/)[1]; answer('attachment', file);
  const execution = endpoint.evidence.find(x => x.includes(`Downloads\\${file}`)); answer('first-process', id(execution));
  assert.match(execution, /explorer\.exe .*→ wscript\.exe/);
  const child = endpoint.evidence.find(x => /wscript\.exe \(PID 3812\) → powershell\.exe/.test(x));
  const task = endpoint.evidence.find(x => /Security 4698/.test(x) && x.includes('cache.ps1') && /at user logon/.test(x));
  assert.ok(child && task); answer('persistence', 'At-logon scheduled task');
  const ip = endpoint.evidence.find(x => /powershell\.exe \(PID 3920\) →/.test(x)).match(/→ (\d+\.\d+\.\d+\.\d+):/)[1]; answer('c2', ip);
  const flows = network.evidence.filter(x => x.includes(`→ ${ip}:`));
  assert.equal(flows.length, 6);
  const beacon = flows.filter(x => bytes(x) < 1000).map(seconds).sort((a,b) => a-b);
  assert.deepEqual(beacon.slice(1).map((t,i) => t-beacon[i]), [60,60,60]); answer('interval', beacon[1]-beacon[0]);
  const bulk = flows.filter(x => bytes(x) > 100000); assert.equal(bulk.length, 2);
  answer('exfil', bulk.reduce((sum,x) => sum+bytes(x),0)/1024);
  const source = flows[0].match(/\((\d+\.\d+\.\d+\.\d+)\) →/)[1]; answer('source-ip', source);
  const events = ad.evidence.filter(x => x.includes(`(${source})`));
  const change = events.find(x => /Event 4728.*Group=VPN-Admins/.test(x)); answer('group-event', id(change));
  answer('compromised', change.match(/Actor=(\S+)/)[1]);
  const ticket = events.find(x => /Event 4769/.test(x) && /Service=svc-vpn-backup\//.test(x) && /TicketEncryptionType=0x17/.test(x));
  const firstServiceLogon = events.find(x => /Event 4624.*Account=ISU\\svc-vpn-backup/.test(x));
  assert.ok(ticket && firstServiceLogon && seconds(ticket) < seconds(firstServiceLogon)); answer('credential-method', 'Kerberoasting');
  answer('contain', change.match(/Source=(ISU-LT-\d+)/)[1]);
});

test('decoys give wrong answers if the pivots are ignored', () => {
  assert.ok(endpoint.evidence.length >= 12 && endpoint.evidence.length <= 16);
  assert.ok(network.evidence.length >= 12 && network.evidence.length <= 18);
  assert.ok(ad.evidence.length >= 10 && ad.evidence.length <= 14);
  const telemetry = network.evidence.filter(x => /telemetry\.isu\.example\.org/.test(x)).map(seconds).sort((a,b) => a-b);
  assert.equal(telemetry[1]-telemetry[0],30); assert.equal(C.correct(q('interval'), '30'),false);
  const oneDrive = network.evidence.find(x => /onedrive\.example\.com.*1048576 B/.test(x));
  assert.ok(oneDrive); assert.equal(C.correct(q('exfil'),String(bytes(oneDrive)/1024)),false);
  const approved = ad.evidence.find(x => /Event 4728.*approved change/.test(x));
  assert.ok(approved); assert.equal(C.correct(q('group-event'),id(approved)),false);
  assert.equal(C.correct(q('compromised'),approved.match(/Actor=(\S+)/)[1]),false);
  assert.ok(endpoint.evidence.some(x => /powershell\.exe -File C:\\IT\\Inventory\.ps1/.test(x)));
  assert.ok(endpoint.evidence.some(x => /System 7045.*SignedBy=Inland State University IT/.test(x)));
  const otherRc4 = ad.evidence.find(x => /Event 4769.*192\.0\.2\.3.*TicketEncryptionType=0x17/.test(x));
  assert.ok(otherRc4); assert.equal(otherRc4.includes('svc-vpn-backup'),false);
  assert.equal(network.evidence.some(x => /X-User|HTTP POST|\/upload/.test(x)),false);
});

test('every carried value appears in source and destination evidence', () => {
  for (let i=1;i<data.stages.length;i++) for (const item of data.stages[i].questions.filter(x => x.carry)) {
    const from = data.stages[i-1].questions.find(x => x.id === item.carry);
    assert.ok(from, item.id);
    assert.ok(data.stages[i-1].evidence.join('\n').toLowerCase().includes(from.answer.toLowerCase()), item.id);
    assert.ok(data.stages[i].evidence.join('\n').toLowerCase().includes(from.answer.toLowerCase()), item.id);
  }
});

test('normalization accepts sensible variants and rejects wrong values', () => {
  for (const value of ['60','60s','60 sec','60 seconds','1 minute']) assert.ok(C.correct(q('interval'),value),value);
  for (const value of ['512','512 KiB','512KB','512 KB']) assert.ok(C.correct(q('exfil'),value),value);
  for (const value of ['mchen','ISU\\mchen','isu/mchen',' ISU\\MCHEN ']) assert.ok(C.correct(q('compromised'),value),value);
  assert.ok(C.correct(q('attachment'),' vpn-cert-update.JS '));
  assert.ok(C.correct(q('c2'),' 198.51.100.42 '));
  for (const [id,value] of [['interval','30'],['interval','61'],['exfil','1024'],['exfil','512 MB'],['compromised','jlopez'],['attachment','VPN-Cert-Update.zip'],['c2','198.51.100.43']]) assert.equal(C.correct(q(id),value),false,id);
  for (const item of questions) assert.equal(C.correct(item,'wrong'),false,item.id);
});

test('progress merge and badge require all case questions and submitted report', () => {
  const journeySource=readFileSync(new URL('../web/journey.ts',import.meta.url),'utf8');
  const badgeQuestions=[...journeySource.match(/const CAP_QUESTIONS = \[([^\]]+)\]/)[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
  assert.deepEqual(badgeQuestions,questions.map(x=>x.id));
  assert.ok(A.KEYS.includes('capstone'));
  const left = { capstone: { solved: ['target'], hints: ['lure'], stages: ['adv-email'], submitted: false, best: 8 } };
  const right = { capstone: { solved: ['lure'], hints: [], stages: ['adv-endpoint'], submitted: true, best: 20 } };
  const merged = A.mergeProgress(left,right).capstone;
  assert.deepEqual(merged.solved,['lure','target']); assert.deepEqual(merged.hints,['lure']); assert.equal(merged.best,20); assert.equal(merged.submitted,true);
  assert.deepEqual(A.mergeProgress({capstone:merged},{capstone:merged}).capstone,merged);
  const p = { solved: questions.map(x => x.id), hints: [], stages: data.stages.map(s => s.id), submitted: false, best: 0 };
  assert.equal(C.complete(p,data),true); assert.equal(C.caseClosed(p,data),false); p.submitted=true; assert.equal(C.caseClosed(p,data),true);
  const rule=J.BADGES.find(b => b.id==='case-closed'); assert.ok(rule);
  assert.equal(rule.test({capstone:false}),false); assert.equal(rule.test({capstone:true}),true);
  const saved=Object.getOwnPropertyDescriptor(globalThis,'localStorage'); const store=new Map();
  globalThis.localStorage={getItem:key=>store.get(key)??null};
  try {
    store.set('cyberhub:capstone',JSON.stringify(p)); assert.equal(J.counts('').capstone,true); assert.equal(J.counts('').adv,4);
    for (const item of questions) { store.set('cyberhub:capstone',JSON.stringify({...p,solved:p.solved.filter(x=>x!==item.id)})); assert.equal(J.counts('').capstone,false,item.id); }
  } finally { if(saved) Object.defineProperty(globalThis,'localStorage',saved); else delete globalThis.localStorage; }
  assert.equal(C.score(p,data),questions.length*10); assert.match(C.confirmedTimeline(p,data),/09:11 UTC/);
});
