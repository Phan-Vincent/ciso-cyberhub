// CyberHub SOC Simulator: work a shift's alert queue like a Tier 1 analyst.
// Each alert is synthetic. Decide malicious or benign, then the best response.
// No innerHTML; text only.

export type Alert = { id: string; title: string; sev: string; src: string; evidence: string[]; bad: boolean; actions: string[]; best: number; why: string; tactic: string };
const R = Math.random;
const pick = <T>(a: T[]) => a[Math.floor(R() * a.length)];
const ri = (a: number, b: number) => a + Math.floor(R() * (b - a + 1));
const ext = () => `${pick([45, 91, 103, 185, 193])}.${ri(1, 254)}.${ri(1, 254)}.${ri(1, 254)}`;
const lan = () => `10.${ri(10, 40)}.${ri(0, 9)}.${ri(2, 250)}`;
const who = () => pick(['mgarcia', 'jnguyen', 'apatel', 'dlee', 'srodriguez', 'kkim', 'tjohnson', 'lhernandez']);
const box = () => pick(['FIN-LT', 'HR-LT', 'ENG-WS', 'MKT-LT', 'LAB-PC']) + '-' + ri(100, 999);
const at = (h: number) => `${String(h).padStart(2, '0')}:${String(ri(0, 59)).padStart(2, '0')}`;
const BENIGN_CLOSE = ['Close as benign and note why', 'Escalate to Tier 2 as an incident', 'Isolate the host'];

const TEMPLATES: (() => Alert)[] = [
  () => { const u = who(), a = ext(); return { id: 'bf-success', title: `Brute force then successful login: ${u}`, sev: 'High', src: 'SIEM · VPN logs', bad: true, tactic: 'Credential Access',
    evidence: [`${at(2)} 47 failed VPN logins for ${u} from ${a} in 6 minutes`, `${at(2)} Successful VPN login for ${u} from ${a}`, `${u} usually signs in from Inland Empire residential IPs, weekdays 8–6`],
    actions: ['Close: the login eventually succeeded, so it was the user', `Disable ${u}'s sessions, reset the password, block ${a}, and escalate`, 'Email the user and wait for a reply'], best: 1,
    why: 'Many failures followed by a success from the same unfamiliar address is a guessed or sprayed password. Cut off the session first, then investigate what the account did.' }; },
  () => { const s = lan(); return { id: 'scan-window', title: 'Many failed logins across hosts', sev: 'Medium', src: 'SIEM · Windows 4625', bad: false, tactic: 'Discovery',
    evidence: [`${at(1)}–${at(3)} 900 failed logons from ${s} across 120 hosts`, `${s} resolves to nessus-scan01.corp.example (approved vulnerability scanner)`, 'Change ticket CHG-4471: authenticated scan, 01:00–04:00 tonight'],
    actions: BENIGN_CLOSE, best: 0, why: 'The source is the approved scanner, inside its scheduled change window. Close it, and suggest a tuning rule so scheduled scans stop paging the SOC.' }; },
  () => { const h = box(), u = who(); return { id: 'office-ps', title: `Word spawned encoded PowerShell on ${h}`, sev: 'Critical', src: 'EDR', bad: true, tactic: 'Execution',
    evidence: [`${at(10)} WINWORD.EXE → powershell.exe -nop -w hidden -enc JABjAD0ATgBlAHcA…`, `User ${u} opened "Invoice_Oct.docm" from email 2 minutes earlier`, `${h} then connected to ${ext()}:443 (first time seen)`],
    actions: ['Close: PowerShell is a normal admin tool', `Isolate ${h} with EDR, keep the evidence, and escalate`, 'Reboot the laptop to stop the script'], best: 1,
    why: 'Office documents should not launch hidden, encoded PowerShell. This is a classic malicious macro. Isolating keeps the evidence and stops spread; rebooting destroys memory evidence.' }; },
  () => { const h = box(); return { id: 'it-ps', title: `PowerShell script run on ${h}`, sev: 'Low', src: 'EDR', bad: false, tactic: 'Execution',
    evidence: [`${at(9)} CcmExec.exe → powershell.exe -File C:\\Windows\\CCM\\Scripts\\Install-Printer.ps1`, 'Script is signed by the company code-signing certificate', 'Same script ran on 340 laptops this morning'],
    actions: BENIGN_CLOSE, best: 0, why: 'The parent is the IT management agent, the script is signed, and it ran fleet-wide as part of a deployment. Benign.' }; },
  () => { const u = who(); return { id: 'mfa-fatigue', title: `MFA push spam then approval: ${u}`, sev: 'High', src: 'Identity provider', bad: true, tactic: 'Credential Access',
    evidence: [`${at(23)} 18 MFA push prompts to ${u} in 9 minutes`, `${at(23)} Push approved; sign-in from ${ext()} (new country)`, 'New session created an inbox forwarding rule to an outside address'],
    actions: ['Close: MFA was approved', `Revoke ${u}'s sessions, remove the forwarding rule, reset the password, re-register MFA`, 'Turn off MFA for the user so the prompts stop'], best: 1,
    why: 'Prompt bombing until a tired user approves (MFA fatigue) plus a mail-forwarding rule is account takeover. Number matching or phishing-resistant MFA prevents it.' }; },
  () => { const u = who(); return { id: 'vpn-travel', title: `Impossible travel: ${u}`, sev: 'Medium', src: 'Identity provider', bad: false, tactic: 'Initial Access',
    evidence: [`${at(10)} ${u} signed in from San Bernardino`, `${at(10)} ${u} signed in from Virginia 4 minutes later`, 'Second address belongs to the company VPN egress range; device is the user\'s managed laptop'],
    actions: BENIGN_CLOSE, best: 0, why: 'The "travel" is the corporate VPN exit point on the same managed device. Benign; consider excluding VPN egress from this rule.' }; },
  () => { const h = box(); return { id: 'exfil', title: `4.2 GB upload to unknown cloud storage from ${h}`, sev: 'High', src: 'Firewall · proxy', bad: true, tactic: 'Exfiltration',
    evidence: [`${at(3)} ${h} uploaded 4.2 GB to files-share-${ri(10, 99)}.example over 40 minutes`, 'Destination domain registered 6 days ago; not an approved service', `${h} belongs to Finance; the user is on vacation this week`],
    actions: ['Close: people upload files all the time', `Isolate ${h}, block the domain, preserve proxy logs and escalate`, 'Delete the files from the laptop'], best: 1,
    why: 'Large off-hours uploads to a brand-new, unapproved domain from a laptop whose owner is away is likely data theft. Contain and preserve evidence.' }; },
  () => { const h = box(); return { id: 'backup', title: `Large nightly upload from ${h}`, sev: 'Low', src: 'Firewall', bad: false, tactic: 'Exfiltration',
    evidence: [`${at(1)} ${h} uploaded 6 GB to the approved backup provider`, 'Same time and size range every night for 8 months', 'Destination is on the approved-services list'],
    actions: BENIGN_CLOSE, best: 0, why: 'A regular, approved backup job matching months of history. Benign.' }; },
  () => { const u = who(); return { id: 'new-admin', title: 'New domain admin account created', sev: 'Critical', src: 'SIEM · Windows 4720/4728', bad: true, tactic: 'Persistence',
    evidence: [`${at(4)} Account "svc_backup2" created by ${u}`, `${at(4)} svc_backup2 added to Domain Admins`, `${u} is in Marketing and has never administered servers; no change ticket`],
    actions: ['Close: IT creates service accounts often', 'Disable svc_backup2, investigate how the creator got that access, escalate now', 'Rename the account'], best: 1,
    why: 'A non-admin creating a privileged account outside change control is a strong sign of a compromised account and attacker persistence.' }; },
  () => ({ id: 'log-clear', title: 'Security event log cleared', sev: 'High', src: 'SIEM · Windows 1102', bad: true, tactic: 'Defense Evasion',
    evidence: [`${at(5)} Event 1102: the audit log was cleared on FILE-SRV-02`, 'No maintenance scheduled', 'Preceded by an RDP logon from a workstation that does not normally connect'],
    actions: ['Close: logs fill up and get cleared', 'Escalate as an incident and pull logs already forwarded to the SIEM', 'Turn off logging to avoid more alerts'], best: 1,
    why: 'Attackers clear logs to cover tracks. The forwarded copies in the SIEM still show what happened before the clear.' }),
  () => { const h = box(); return { id: 'beacon', title: `Regular DNS lookups to random-looking domains from ${h}`, sev: 'Medium', src: 'DNS logs', bad: true, tactic: 'Command and Control',
    evidence: [`${h} looks up a new random domain every 60 seconds (e.g. qx7v2k9p.example)`, 'Domains were registered this week', 'Started after an unsigned program ran from the Downloads folder'],
    actions: ['Close: DNS lookups are normal', `Isolate ${h}, block the domains, and escalate for malware analysis`, 'Clear the DNS cache'], best: 1,
    why: 'Clockwork lookups to freshly registered random names look like malware calling home (beaconing). Contain and analyze.' }; },
  () => ({ id: 'eicar', title: 'Antivirus detection: EICAR test file', sev: 'Low', src: 'Antivirus', bad: false, tactic: 'Execution',
    evidence: ['File: eicar.com in C:\\IT\\AV-Test\\', 'Detected and quarantined', 'IT ticket: "monthly antivirus alerting test"'],
    actions: BENIGN_CLOSE, best: 0, why: 'EICAR is a harmless industry-standard file for testing antivirus. This is the scheduled test proving alerting works.' }),
];

export function shift(n = 8): Alert[] { const pool = [...TEMPLATES]; for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; } return pool.slice(0, n).map(f => f()); }
export function grade(a: Alert, verdict: boolean, action: number) { return (verdict === a.bad ? 10 : 0) + (verdict === a.bad && action === a.best ? 5 : 0); }
export const TEMPLATE_COUNT = TEMPLATES.length;

/* ------------------------------------------------------------ UI */
const app = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('#soc');
if (app) {
  const $ = <T extends HTMLElement = HTMLElement>(s: string) => app.querySelector<T>(s)!;
  const el = (tag: string, text = '', cls = '') => { const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; };
  let queue: Alert[] = [], i = 0, score = 0, t0 = 0, missed = 0, falseAlarms = 0; const times: number[] = []; const log: { a: Alert; v: boolean; act: number; pts: number }[] = [];
  let verdict: boolean | null = null;
  const start = () => { queue = shift(8); i = 0; score = 0; missed = 0; falseAlarms = 0; times.length = 0; log.length = 0; $('#soc-intro').hidden = true; $('#soc-end').hidden = true; $('#soc-work').hidden = false; show(); };
  function show() {
    const a = queue[i]; verdict = null; t0 = performance.now();
    $('#soc-count').textContent = `Alert ${i + 1} of ${queue.length} · score ${score}`;
    const list = $('#soc-queue'); list.replaceChildren(...queue.map((q, k) => { const li = el('li', '', k < i ? 'done' : k === i ? 'cur' : ''); li.append(el('span', q.sev, 'sev sev-' + q.sev.toLowerCase()), el('span', q.title)); return li; }));
    $('#soc-title').textContent = a.title; $('#soc-sev').textContent = a.sev; $('#soc-sev').className = 'sev sev-' + a.sev.toLowerCase(); $('#soc-src').textContent = a.src;
    $('#soc-ev').replaceChildren(...a.evidence.map(e => el('li', e)));
    $('#soc-step2').hidden = true; $('#soc-result').hidden = true; app.querySelectorAll<HTMLButtonElement>('[data-v]').forEach(b => { b.disabled = false; b.removeAttribute('aria-pressed'); });
    const acts = $('#soc-acts'); acts.replaceChildren(...a.actions.map((t, k) => { const b = el('button', t, 'soc-act') as HTMLButtonElement; b.type = 'button'; b.addEventListener('click', () => decide(k)); return b; }));
    $<HTMLButtonElement>('[data-v="bad"]').focus({ preventScroll: true });
  }
  app.querySelectorAll<HTMLButtonElement>('[data-v]').forEach(b => b.addEventListener('click', () => { verdict = b.dataset.v === 'bad'; app.querySelectorAll<HTMLButtonElement>('[data-v]').forEach(x => { x.disabled = true; x.setAttribute('aria-pressed', String(x === b)); }); $('#soc-step2').hidden = false; ($('#soc-acts').firstElementChild as HTMLElement)?.focus(); }));
  function decide(k: number) {
    const a = queue[i]; if (verdict === null) return; const pts = grade(a, verdict, k); score += pts; times.push((performance.now() - t0) / 1000);
    if (a.bad && !verdict) missed++; if (!a.bad && verdict) falseAlarms++; log.push({ a, v: verdict, act: k, pts });
    $('#soc-acts').querySelectorAll<HTMLButtonElement>('button').forEach((b, n) => { b.disabled = true; if (n === a.best) b.classList.add('best'); if (n === k) b.classList.add('picked'); });
    const r = $('#soc-result'); r.hidden = false;
    r.querySelector('strong')!.textContent = (verdict === a.bad ? (k === a.best ? 'Right call. +15' : 'Right verdict, weaker response. +10') : a.bad ? 'Missed: this one was malicious. +0' : 'False alarm: this one was benign. +0');
    r.querySelector('p')!.textContent = `${a.bad ? 'Malicious' : 'Benign'} · MITRE ATT&CK tactic: ${a.tactic}. ${a.why}`;
    const nx = $<HTMLButtonElement>('#soc-next'); nx.textContent = i < queue.length - 1 ? 'Next alert →' : 'End shift'; nx.focus({ preventScroll: true });
  }
  function end() {
    $('#soc-work').hidden = true; const e = $('#soc-end'); e.hidden = false; const max = queue.length * 15; const avg = times.reduce((x, y) => x + y, 0) / Math.max(1, times.length);
    e.querySelector('h2')!.textContent = `Shift score: ${score} / ${max}`;
    $('#soc-metrics').replaceChildren(...[[`${Math.round(100 * log.filter(l => l.v === l.a.bad).length / log.length)}%`, 'verdict accuracy'], [String(missed), 'missed threats'], [String(falseAlarms), 'false alarms'], [`${avg.toFixed(0)}s`, 'average time per alert']].map(([n, l]) => { const d = el('div'); d.append(el('strong', n), el('span', l, 'label')); return d; }));
    $('#soc-review').replaceChildren(...log.map(l => { const li = el('li', '', l.pts === 15 ? 'ok' : 'no'); li.append(el('b', l.a.title), el('span', ` — ${l.a.bad ? 'malicious' : 'benign'}; best response: ${l.a.actions[l.a.best]}`)); return li; }));
    try { const k = 'cyberhub:soc'; const s = JSON.parse(localStorage.getItem(k) || '{}'); localStorage.setItem(k, JSON.stringify({ shifts: (s.shifts || 0) + 1, best: Math.max(s.best || 0, score) })); } catch { /* ignore */ }
    e.scrollIntoView({ block: 'start' });
  }
  $('#soc-next').addEventListener('click', () => { if (i < queue.length - 1) { i++; show(); } else end(); });
  $('#soc-start').addEventListener('click', start); $('#soc-again').addEventListener('click', start);
}
