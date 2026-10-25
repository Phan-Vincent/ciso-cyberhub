// CyberHub Phishing lab: investigate an inbox like an email security analyst.
// Fictional organisation (Inland State University) on reserved example domains. Text only.

export type Mail = { id: string; from: string; addr: string; replyTo?: string; subject: string; body: string[]; link?: { text: string; href: string }; attach?: string;
  auth: { spf: string; dkim: string; dmarc: string }; phish: boolean; clues: string[]; why: string };
export const CLUES = ['Sender domain does not match the organisation', 'Reply-To goes somewhere else', 'Link text and real destination differ', 'Urgency or threat', 'Asks for a password, code or payment',
  'Unexpected attachment type', 'SPF/DKIM/DMARC failed', 'Generic greeting'] as const;

export const INBOX: Mail[] = [
  { id: 'it-reset', from: 'ISU IT Service Desk', addr: 'it-support@isu-helpdesk.example', subject: 'ACTION REQUIRED: password expires in 2 hours', phish: true,
    body: ['Dear user,', 'Your Inland State password expires in 2 hours. To avoid losing access to email and Canvas, verify your account now.'],
    link: { text: 'https://login.isu.example/verify', href: 'https://isu.example.login-verify.example/session' }, auth: { spf: 'pass', dkim: 'none', dmarc: 'fail' },
    clues: ['Sender domain does not match the organisation', 'Link text and real destination differ', 'Urgency or threat', 'Asks for a password, code or payment', 'Generic greeting', 'SPF/DKIM/DMARC failed'],
    why: 'The sender is isu-helpdesk.example, not isu.example. The link text shows the real login page but points to a lookalike domain. DMARC fails. Real IT teams do not threaten two-hour lockouts.' },
  { id: 'registrar', from: 'Office of the Registrar', addr: 'registrar@isu.example', subject: 'Spring registration opens Monday', phish: false,
    body: ['Hi Alex,', 'Registration for spring opens Monday at 8:00 a.m. for seniors. Check your time slot in the student portal. Advisers are available in University Hall all week.'],
    auth: { spf: 'pass', dkim: 'pass', dmarc: 'pass' }, clues: [],
    why: 'Correct domain, all checks pass, no link to click, no request for anything sensitive, and the message tells you to use the portal you already know.' },
  { id: 'payroll', from: 'Payroll', addr: 'payroll@isu.example', replyTo: 'payroll.update@freemail.example', subject: 'Update direct deposit before Friday', phish: true,
    body: ['Hello,', 'Due to a system change, all student workers must reply with their new bank account and routing number before Friday or paychecks will be delayed.'],
    auth: { spf: 'softfail', dkim: 'none', dmarc: 'fail' }, clues: ['Reply-To goes somewhere else', 'Urgency or threat', 'Asks for a password, code or payment', 'Generic greeting', 'SPF/DKIM/DMARC failed'],
    why: 'The display address looks right, but replies go to a free-mail account and authentication fails: the From address is spoofed. Payroll changes happen in the HR portal, never by email reply.' },
  { id: 'club', from: 'CISO officers', addr: 'officers@clubs.isu.example', subject: 'Cyber Duel night this Thursday', phish: false,
    body: ['Hey everyone,', 'Duel night is Thursday 6 p.m. in JB-359. Bring a laptop or just your phone. Pizza is on us. See the club calendar for details.'],
    auth: { spf: 'pass', dkim: 'pass', dmarc: 'pass' }, clues: [], why: 'An organisation subdomain, passing checks, and an ordinary event message with nothing to enter or download.' },
  { id: 'invoice', from: 'Accounts Receivable', addr: 'billing@vendor-invoices.example', subject: 'Overdue invoice #88213', phish: true,
    body: ['Please see the attached overdue invoice and process payment today to avoid late fees.'], attach: 'Invoice_88213.html',
    auth: { spf: 'pass', dkim: 'pass', dmarc: 'none' }, clues: ['Sender domain does not match the organisation', 'Urgency or threat', 'Unexpected attachment type', 'Asks for a password, code or payment', 'Generic greeting'],
    why: 'An unknown vendor, pressure to pay today, and an .html "invoice": HTML attachments often open fake login pages. SPF and DKIM can pass for an attacker\'s own domain, so passing checks alone do not prove a message is safe.' },
  { id: 'shared-doc', from: 'Prof. Rivera (via DocShare)', addr: 'no-reply@docshare.example', subject: 'Prof. Rivera shared "Final exam review" with you', phish: false,
    body: ['Prof. Rivera shared a document with you.', 'Open it from your DocShare account. If you were not expecting this, you can ignore it.'], link: { text: 'Open in DocShare', href: 'https://docshare.example/d/7f3k' },
    auth: { spf: 'pass', dkim: 'pass', dmarc: 'pass' }, clues: [],
    why: 'The notification comes from the real sharing service, the link goes to that same service, and it matches a class you take. Still, if in doubt, open the service directly instead of the link.' },
  { id: 'giftcard', from: 'Dr. Patel, Department Chair', addr: 'dr.patel.chair@freemail.example', subject: 'Quick favour', phish: true,
    body: ['Are you on campus? I need you to pick up four $100 gift cards for a student award, I\'m stuck in a meeting. Send me the codes and I\'ll reimburse you.'],
    auth: { spf: 'pass', dkim: 'pass', dmarc: 'pass' }, clues: ['Sender domain does not match the organisation', 'Urgency or threat', 'Asks for a password, code or payment'],
    why: 'A classic gift-card scam impersonating a boss from a free-mail address. Authentication passes because it is a real free-mail account. Verify by calling the person on a known number.' },
  { id: 'mfa-code', from: 'ISU Security', addr: 'security@isu.example.secure-alert.example', subject: 'Unusual sign-in: confirm it was you', phish: true,
    body: ['We noticed a sign-in from a new device. Reply with the 6-digit code we just texted you to keep your account active.'],
    auth: { spf: 'pass', dkim: 'none', dmarc: 'none' }, clues: ['Sender domain does not match the organisation', 'Urgency or threat', 'Asks for a password, code or payment', 'Generic greeting'],
    why: 'The domain only starts with "isu.example"; the real domain is secure-alert.example. No real service asks you to send back a one-time code. That code is the attacker\'s way past MFA.' },
];

export function score(m: Mail, verdict: boolean, picked: string[]) {
  const right = verdict === m.phish ? 10 : 0; if (!m.phish || !right) return right;
  const hits = picked.filter(c => m.clues.includes(c)).length, wrong = picked.length - hits;
  return right + Math.max(0, Math.round(10 * hits / m.clues.length) - 2 * wrong);
}

/* ------------------------------------------------------------ UI */
const app = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('#phish');
if (app) {
  const $ = <T extends HTMLElement = HTMLElement>(s: string) => app.querySelector<T>(s)!;
  const el = (tag: string, text = '', cls = '') => { const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; };
  const done: Record<string, number> = {}; let cur = 0;
  const list = $('#ph-list');
  function drawList() { list.replaceChildren(...INBOX.map((m, k) => { const b = el('button', '', 'ph-item' + (k === cur ? ' cur' : '') + (m.id in done ? ' done' : '')) as HTMLButtonElement; b.type = 'button'; b.append(el('strong', m.from), el('span', m.subject)); if (m.id in done) b.append(el('span', `${done[m.id]} pts`, 'label')); b.addEventListener('click', () => open(k)); return b; })); $('#ph-total').textContent = `${Object.keys(done).length} of ${INBOX.length} investigated · ${Object.values(done).reduce((x, y) => x + y, 0)} points`; }
  function open(k: number) {
    cur = k; const m = INBOX[k]; drawList();
    $('#ph-from').textContent = `${m.from} <${m.addr}>`; $('#ph-reply').textContent = m.replyTo ? `Reply-To: ${m.replyTo}` : ''; $('#ph-reply').hidden = !m.replyTo;
    $('#ph-subj').textContent = m.subject; $('#ph-body').replaceChildren(...m.body.map(p => el('p', p)));
    const lk = $('#ph-link'); lk.hidden = !m.link; if (m.link) { lk.querySelector('.ph-ltext')!.textContent = m.link.text; lk.querySelector('.ph-lreal')!.textContent = m.link.href; (lk.querySelector('.ph-lreal') as HTMLElement).hidden = true; }
    $('#ph-att').hidden = !m.attach; $('#ph-att').textContent = m.attach ? '📎 ' + m.attach : '';
    $('#ph-hdr').replaceChildren(...[`From: ${m.from} <${m.addr}>`, ...(m.replyTo ? [`Reply-To: ${m.replyTo}`] : []), `Authentication-Results: spf=${m.auth.spf}; dkim=${m.auth.dkim}; dmarc=${m.auth.dmarc}`].map(x => el('li', x)));
    $('#ph-hdrbox').removeAttribute('open');
    app.querySelectorAll<HTMLInputElement>('[data-clue]').forEach(c => { c.checked = false; c.disabled = m.id in done; c.closest('label')!.classList.remove('hit'); });
    app.querySelectorAll<HTMLButtonElement>('[data-verdict]').forEach(b => { b.disabled = m.id in done; });
    $('#ph-out').hidden = true;
  }
  $('#ph-hover').addEventListener('click', () => { const r = app.querySelector<HTMLElement>('.ph-lreal')!; r.hidden = !r.hidden; });
  app.querySelectorAll<HTMLButtonElement>('[data-verdict]').forEach(b => b.addEventListener('click', () => {
    const m = INBOX[cur]; if (m.id in done) return; const v = b.dataset.verdict === 'phish';
    const picked = Array.from(app.querySelectorAll<HTMLInputElement>('[data-clue]:checked')).map(c => c.dataset.clue!);
    const pts = score(m, v, picked); done[m.id] = pts;
    const out = $('#ph-out'); out.hidden = false; out.querySelector('strong')!.textContent = (v === m.phish ? 'Correct' : 'Not quite') + `: this is ${m.phish ? 'phishing' : 'legitimate'}. +${pts}`;
    out.querySelector('p')!.textContent = m.why + (m.phish ? ` Red flags: ${m.clues.join('; ')}.` : '');
    app.querySelectorAll<HTMLInputElement>('[data-clue]').forEach(c => { c.disabled = true; c.closest('label')!.classList.toggle('hit', m.clues.includes(c.dataset.clue!)); });
    app.querySelectorAll<HTMLButtonElement>('[data-verdict]').forEach(x => { x.disabled = true; });
    drawList(); try { localStorage.setItem('cyberhub:phish', JSON.stringify(done)); } catch { /* ignore */ }
    const nx = INBOX.findIndex(x => !(x.id in done)); $('#ph-next').hidden = nx < 0; $('#ph-done').hidden = nx >= 0;
  }));
  $('#ph-next').addEventListener('click', () => { const nx = INBOX.findIndex(x => !(x.id in done)); if (nx >= 0) open(nx); });
  const clues = $('#ph-clues'); clues.replaceChildren(...CLUES.map(c => { const l = el('label'); const i = el('input') as HTMLInputElement; i.type = 'checkbox'; i.dataset.clue = c; l.append(i, el('span', c)); return l; }));
  open(0);
}
