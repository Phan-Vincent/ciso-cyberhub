// CyberHub resume tailor. Everything runs in this browser tab: the resume and job posting are
// never uploaded. Optional "tailor with local AI" talks only to Ollama on the user's own computer.
// Pure analysis functions are exported for tests; UI code is guarded for non-browser use.

export type Analysis = { score: number; matched: string[]; missing: string[]; jobTerms: string[]; checks: { ok: boolean; text: string }[]; weak: string[]; words: number };

// Skill dictionary: canonical name -> alternative spellings. Matched on word boundaries.
const SKILLS: Record<string, string[]> = {
  'Python': ['python'], 'JavaScript': ['javascript', 'js', 'node.js', 'nodejs'], 'TypeScript': ['typescript'], 'Java': ['java'], 'C': ['c programming', 'c language'], 'C++': ['c++', 'cpp'], 'C#': ['c#', '.net', 'dotnet'],
  'Go': ['golang'], 'Rust': ['rust'], 'Bash': ['bash', 'shell scripting', 'shell script'], 'PowerShell': ['powershell'], 'SQL': ['sql', 'mysql', 'postgresql', 'postgres', 'sql server'],
  'HTML/CSS': ['html', 'css'], 'React': ['react', 'react.js'], 'REST APIs': ['rest api', 'restful', 'apis'], 'Git': ['git', 'github', 'gitlab', 'version control'],
  'Linux': ['linux', 'ubuntu', 'red hat', 'rhel', 'debian', 'unix'], 'Windows': ['windows server', 'windows 10', 'windows 11', 'windows'], 'Active Directory': ['active directory', 'entra id', 'azure ad', 'ldap', 'group policy'],
  'macOS': ['macos', 'mac os'], 'Networking': ['networking', 'tcp/ip', 'tcp', 'subnetting', 'routing', 'switching', 'vlan', 'dns', 'dhcp'], 'Firewalls': ['firewall', 'firewalls', 'palo alto', 'fortinet', 'pfsense'],
  'VPN': ['vpn'], 'Wireshark': ['wireshark', 'packet capture', 'pcap'], 'Nmap': ['nmap'], 'Burp Suite': ['burp suite', 'burp'], 'Metasploit': ['metasploit'], 'Kali Linux': ['kali'],
  'SIEM': ['siem', 'splunk', 'elastic', 'sentinel', 'qradar', 'wazuh'], 'Splunk': ['splunk'], 'EDR': ['edr', 'crowdstrike', 'defender for endpoint', 'sentinelone'], 'IDS/IPS': ['ids', 'ips', 'suricata', 'snort', 'zeek'],
  'Incident response': ['incident response', 'incident handling', 'ir'], 'Threat hunting': ['threat hunting'], 'Threat intelligence': ['threat intelligence', 'cti', 'mitre att&ck', 'att&ck'],
  'Vulnerability management': ['vulnerability management', 'vulnerability scanning', 'nessus', 'qualys', 'tenable', 'openvas'], 'Penetration testing': ['penetration testing', 'pentesting', 'pen testing', 'ethical hacking'],
  'Digital forensics': ['forensics', 'digital forensics', 'autopsy', 'volatility', 'ftk', 'encase'], 'Malware analysis': ['malware analysis', 'reverse engineering', 'ghidra', 'ida pro'],
  'Cryptography': ['cryptography', 'encryption', 'pki', 'tls', 'ssl'], 'IAM': ['iam', 'identity and access management', 'sso', 'mfa', 'okta', 'oauth', 'saml'],
  'Cloud security': ['cloud security'], 'AWS': ['aws', 'amazon web services', 'ec2', 's3'], 'Azure': ['azure', 'microsoft azure'], 'GCP': ['gcp', 'google cloud'],
  'Docker': ['docker', 'containers'], 'Kubernetes': ['kubernetes', 'k8s'], 'Terraform': ['terraform', 'infrastructure as code', 'iac'], 'CI/CD': ['ci/cd', 'github actions', 'jenkins', 'devops', 'devsecops'],
  'Application security': ['application security', 'appsec', 'secure code review', 'owasp', 'sast', 'dast'], 'Web security': ['web application security', 'xss', 'sql injection', 'owasp top 10'],
  'Risk management': ['risk management', 'risk assessment', 'risk analysis'], 'Compliance': ['compliance', 'nist', 'iso 27001', 'soc 2', 'hipaa', 'pci', 'pci dss', 'gdpr', 'fedramp', 'cmmc'],
  'GRC': ['grc', 'governance'], 'Policy writing': ['policy', 'policies', 'procedures'], 'Auditing': ['audit', 'auditing'],
  'Help desk': ['help desk', 'helpdesk', 'service desk', 'technical support', 'troubleshooting', 'ticketing'], 'ServiceNow': ['servicenow'], 'Microsoft 365': ['microsoft 365', 'office 365', 'o365', 'intune'],
  'Virtualization': ['vmware', 'virtualbox', 'hyper-v', 'virtualization', 'virtual machines'], 'Scripting/automation': ['automation', 'scripting', 'ansible'],
  'Data analysis': ['data analysis', 'excel', 'tableau', 'power bi', 'pandas'], 'Machine learning': ['machine learning', 'ml', 'deep learning', 'pytorch', 'tensorflow'], 'AI/LLMs': ['llm', 'llms', 'generative ai', 'prompt engineering', 'ai'],
  'Security+': ['security+', 'comptia security', 'sec+'], 'Network+': ['network+'], 'A+': ['a+', 'comptia a+'], 'CCNA': ['ccna'], 'CySA+': ['cysa+'], 'CISSP': ['cissp'],
  'Communication': ['communication', 'communicate', 'written and verbal'], 'Teamwork': ['teamwork', 'collaborate', 'collaboration', 'cross-functional'], 'Problem solving': ['problem solving', 'problem-solving', 'analytical'],
  'Documentation': ['documentation', 'document', 'technical writing', 'reports'], 'Customer service': ['customer service', 'customer-facing'], 'Project management': ['project management', 'agile', 'scrum', 'jira'],
  'CTF': ['ctf', 'capture the flag', 'ncl', 'ccdc', 'cptc', 'hack the box', 'tryhackme'],
};
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RE = Object.fromEntries(Object.entries(SKILLS).map(([k, alts]) => [k, new RegExp(`(^|[^a-z0-9+#])(${[k.toLowerCase(), ...alts].map(esc).join('|')})(?=$|[^a-z0-9+#])`, 'i')]));
const WEAK = /^(\s*[-•*]\s*)?(responsible for|helped|assisted|worked on|duties included|tasked with|participated in)\b/i;
const NUMBER = /\d|percent|%/;

export function skillsIn(text: string): string[] {
  const t = ' ' + text.toLowerCase() + ' ';
  return Object.keys(SKILLS).filter(k => RE[k].test(t));
}

export function analyse(resume: string, job: string): Analysis {
  const jobTerms = skillsIn(job), have = new Set(skillsIn(resume));
  const matched = jobTerms.filter(k => have.has(k)), missing = jobTerms.filter(k => !have.has(k));
  const lower = resume.toLowerCase(), words = resume.split(/\s+/).filter(Boolean).length;
  const bullets = resume.split('\n').map(l => l.trim()).filter(l => /^[-•*]/.test(l) || l.length > 40);
  const weak = bullets.filter(l => WEAK.test(l)).slice(0, 5);
  const quantified = bullets.filter(l => NUMBER.test(l)).length;
  const checks = [
    { ok: /@[a-z0-9-]+\.[a-z]{2,}/i.test(resume), text: 'Contact email is present' },
    { ok: /linkedin\.com|github\.com/i.test(resume), text: 'LinkedIn or GitHub link included' },
    { ok: /education|university|college|csusb|cal state/i.test(lower), text: 'Education section found' },
    { ok: /\bprojects?\b/i.test(lower), text: 'Projects section (big for internships with little experience)' },
    { ok: /\bskills\b/i.test(lower), text: 'Skills section for keyword scanners (ATS)' },
    { ok: bullets.length > 0 && quantified / Math.max(1, bullets.length) >= 0.3, text: 'At least a third of bullets include a number (impact, scale, time)' },
    { ok: words >= 250 && words <= 750, text: `One page is about 300 to 700 words (yours: ${words})` },
    { ok: weak.length === 0, text: 'Bullets start with strong action verbs, not "responsible for"' },
  ];
  const score = jobTerms.length ? Math.round(matched.length / jobTerms.length * 70 + checks.filter(c => c.ok).length / checks.length * 30) : Math.round(checks.filter(c => c.ok).length / checks.length * 100);
  return { score, matched, missing, jobTerms, checks, weak, words };
}

export function coverPrompt(resume: string, job: string, target: string, a: Analysis, name = ''): string {
  return `You are helping a university student write a cover letter for one internship.

TARGET: ${target || 'the internship described below'}

RULES (follow strictly):
- Use only facts from the resume below. Never invent experience, employers, dates, certifications, tools, results, or reasons for interest the student did not give.
- Do not claim skills from the "not found" list. If one matters, write one honest sentence about learning it (for example a project or course in progress) only if the resume shows that; otherwise leave it out and list it after the letter under "Gaps to address honestly".
- 250 to 350 words, four short paragraphs: why this role, two or three matching experiences with specifics, what the student will bring and learn, a polite close.
- Plain, confident language. No clichés like "I am writing to express my interest", no flattery, no exaggeration.
- Where a detail is unknown (hiring manager's name, why this company), leave a clearly marked [PLACEHOLDER] for the student to fill in rather than guessing.
- Sign it as ${name ? name : '[YOUR NAME]'}.

ALREADY MATCHING: ${a.matched.join(', ') || 'none detected'}
IN THE POSTING BUT NOT FOUND IN THE RESUME: ${a.missing.join(', ') || 'none detected'}

OUTPUT: the letter, then "Gaps to address honestly" (may be empty), then a checklist of every [PLACEHOLDER] the student must fill in.

JOB POSTING:
"""
${job.trim().slice(0, 12000)}
"""

RESUME:
"""
${resume.trim().slice(0, 12000)}
"""`;
}

export function tailorPrompt(resume: string, job: string, target: string, a: Analysis): string {
  return `You are helping a university student tailor their resume for one internship.

TARGET: ${target || 'the internship described below'}

RULES (follow strictly):
- Never invent experience, employers, dates, certifications, tools or results. Only rephrase, reorder and emphasise what is already in the resume.
- If a required skill is missing, do not add it. List it under "Gaps to address honestly" with a way to build it (a project, lab or course).
- Keep it to one page. Use strong action verbs and keep any numbers that are already there.
- Mirror the posting's wording only where the resume genuinely shows that skill.

ALREADY MATCHING: ${a.matched.join(', ') || 'none detected'}
IN THE POSTING BUT NOT FOUND IN THE RESUME: ${a.missing.join(', ') || 'none detected'}

OUTPUT, in this order:
1. A 2-3 line professional summary aimed at this internship.
2. A reordered Skills line (most relevant first).
3. Rewritten bullets for the most relevant experience and projects (same facts, sharper wording).
4. "Gaps to address honestly": missing skills and one concrete way to build each.

JOB POSTING:
"""
${job.trim().slice(0, 12000)}
"""

RESUME:
"""
${resume.trim().slice(0, 12000)}
"""`;
}

// Minimal .docx text extraction (zip + deflate-raw via DecompressionStream). No libraries.
export async function docxText(buf: ArrayBuffer): Promise<string> {
  const v = new DataView(buf); const u8 = new Uint8Array(buf);
  let eocd = -1; for (let i = u8.length - 22; i >= Math.max(0, u8.length - 70000); i--) if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('Not a .docx (zip) file');
  const count = v.getUint16(eocd + 10, true); let p = v.getUint32(eocd + 16, true);
  for (let n = 0; n < count; n++) {
    if (p > u8.length - 46) throw new Error('No document text found in this .docx');
    if (v.getUint32(p, true) !== 0x02014b50) break;
    const method = v.getUint16(p + 10, true), csize = v.getUint32(p + 20, true), nlen = v.getUint16(p + 28, true), elen = v.getUint16(p + 30, true), clen = v.getUint16(p + 32, true), off = v.getUint32(p + 42, true);
    if (p + 46 + nlen + elen + clen > u8.length) throw new Error('No document text found in this .docx');
    const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nlen));
    if (name === 'word/document.xml') {
      if (off > u8.length - 30) throw new Error('No document text found in this .docx');
      const ln = v.getUint16(off + 26, true), le = v.getUint16(off + 28, true), start = off + 30 + ln + le; const data = u8.subarray(start, start + csize);
      if (start + csize > u8.length) throw new Error('No document text found in this .docx');
      let xml: string;
      if (method === 0) xml = new TextDecoder().decode(data);
      else { const ds = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')); xml = await new Response(ds).text(); }
      return xml.replace(/<w:tab\/>/g, '\t').replace(/<\/w:p>/g, '\n').replace(/<w:br\/>/g, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/\n{3,}/g, '\n\n').trim();
    }
    p += 46 + nlen + elen + clen;
  }
  throw new Error('No document text found in this .docx');
}

/* ------------------------------------------------------------------ UI */
const root = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('#tailor');
if (root) {
  const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;
  const resumeEl = $<HTMLTextAreaElement>('#rt-resume'), jobEl = $<HTMLTextAreaElement>('#rt-job'), targetEl = $<HTMLInputElement>('#rt-target');
  const el = (tag: string, text = '', cls = '') => { const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; };
  const base = document.body.dataset.base || '';
  // Draft persistence is opt-in only (personal data).
  const remember = $<HTMLInputElement>('#rt-remember');
  try { const saved = localStorage.getItem('cyberhub:resume'); if (saved) { resumeEl.value = saved; remember.checked = true; } } catch { /* ignore */ }
  const persist = () => { try { if (remember.checked) localStorage.setItem('cyberhub:resume', resumeEl.value); else localStorage.removeItem('cyberhub:resume'); } catch { /* ignore */ } };
  remember.addEventListener('change', persist); resumeEl.addEventListener('input', () => { if (remember.checked) persist(); });

  // Prefill from the internship scanner (?job=<id>)
  (async () => {
    const id = new URLSearchParams(location.search).get('job'); if (!id) return;
    try {
      const list = await (await fetch(base + '/assets/internships.json')).json() as { id: string; company: string; title: string; url: string; city: string }[];
      const j = list.find(x => x.id === id); if (!j) return;
      targetEl.value = `${j.title} at ${j.company} (${j.city})`;
      const link = $<HTMLAnchorElement>('#rt-posting'); link.href = j.url; link.hidden = false; link.textContent = `Open the ${j.company} posting ↗ and copy its description into box 2`;
    } catch { /* offline: user can type */ }
  })();

  $<HTMLInputElement>('#rt-file').addEventListener('change', async e => {
    const f = (e.target as HTMLInputElement).files?.[0]; const st = $('#rt-file-status'); if (!f) return;
    try {
      if (f.size > 5_000_000) throw new Error('File is larger than 5 MB');
      if (/\.docx$/i.test(f.name)) resumeEl.value = await docxText(await f.arrayBuffer());
      else if (/\.(txt|md)$/i.test(f.name) || f.type.startsWith('text/')) resumeEl.value = await f.text();
      else throw new Error('Use .docx or .txt. For a PDF, open it, select all, copy and paste here.');
      st.textContent = `Loaded ${f.name} in your browser (not uploaded).`; persist();
    } catch (err) { st.textContent = (err as Error).message; }
  });

  let last = '', lastA: Analysis | null = null;
  const mode = () => (document.querySelector<HTMLInputElement>('input[name="rt-mode"]:checked')?.value || 'resume');
  const firstLine = () => (resumeEl.value.split('\n').map(l => l.trim()).find(Boolean) || '').slice(0, 60);
  const build = () => {
    if (!lastA) return; const r = resumeEl.value, j = jobEl.value; const cover = mode() === 'cover';
    last = cover ? coverPrompt(r, j, targetEl.value, lastA, /^[A-Za-z][A-Za-z .'-]{1,59}$/.test(firstLine()) ? firstLine() : '') : tailorPrompt(r, j, targetEl.value, lastA);
    $<HTMLElement>('#rt-prompt').textContent = last;
    $('#rt-mode-what').textContent = cover ? 'cover letter' : 'tailored resume';
    $('#rt-local-run').textContent = cover ? 'Write cover letter locally' : 'Tailor locally';
  };
  document.querySelectorAll<HTMLInputElement>('input[name="rt-mode"]').forEach(r => r.addEventListener('change', () => { build(); $('#rt-local-out').hidden = true; $('#rt-download').hidden = true; }));
  $('#rt-analyse').addEventListener('click', () => {
    const r = resumeEl.value, j = jobEl.value; const out = $('#rt-out');
    if (r.trim().length < 80 || j.trim().length < 80) { $('#rt-msg').textContent = 'Paste your full resume and the full job posting first.'; return; }
    $('#rt-msg').textContent = ''; const a = analyse(r, j); out.hidden = false;
    $('#rt-score').textContent = String(a.score); $('#rt-ring').style.setProperty('--p', String(a.score / 100));
    $('#rt-verdict').textContent = a.score >= 75 ? 'Strong match. Polish and apply.' : a.score >= 55 ? 'Good base. Tailor the wording and fill small gaps.' : 'Stretch role. Apply if it excites you, and build the gaps below.';
    const chips = (id: string, list: string[], cls: string, empty: string) => { const box = $(id); box.replaceChildren(...(list.length ? list.map(k => el('span', k, 'tag ' + cls)) : [el('span', empty, 'muted')])); };
    chips('#rt-matched', a.matched, 'sec', 'No posting keywords found in your resume yet.');
    chips('#rt-missing', a.missing, 'miss', 'Nothing obvious is missing.');
    $('#rt-checks').replaceChildren(...a.checks.map(c => { const li = el('li', c.text, c.ok ? 'ok' : 'no'); return li; }));
    const weak = $('#rt-weak'); weak.replaceChildren(...a.weak.map(w => el('li', w))); $('#rt-weak-box').hidden = !a.weak.length;
    lastA = a; build();
    out.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });
  $('#rt-copy').addEventListener('click', async e => { const b = e.currentTarget as HTMLElement; try { await navigator.clipboard.writeText(last); b.textContent = 'Copied'; } catch { b.textContent = 'Select the text below'; } setTimeout(() => { b.textContent = 'Copy prompt'; }, 1600); });

  // Local AI via Ollama on this computer only.
  const OLLAMA = 'http://localhost:11434';
  $('#rt-local-check').addEventListener('click', async () => {
    const st = $('#rt-local-status'), sel = $<HTMLSelectElement>('#rt-model');
    try {
      const r = await fetch(OLLAMA + '/api/tags'); const d = await r.json() as { models: { name: string }[] };
      sel.replaceChildren(...d.models.map(m => { const o = document.createElement('option'); o.value = o.textContent = m.name; return o; }));
      st.textContent = d.models.length ? `Connected to Ollama. ${d.models.length} model(s) available.` : 'Connected, but no models yet. Run: ollama pull gemma4:e4b';
      $<HTMLButtonElement>('#rt-local-run').disabled = !d.models.length;
    } catch { st.textContent = 'Could not reach Ollama on this computer. Follow the setup steps below, then try again.'; }
  });
  $('#rt-local-run').addEventListener('click', async e => {
    const btn = e.currentTarget as HTMLButtonElement, out = $<HTMLElement>('#rt-local-out'), st = $('#rt-local-status');
    if (!last) { st.textContent = 'Run the match first (step 3).'; return; }
    btn.disabled = true; st.textContent = (mode() === 'cover' ? 'Writing your cover letter' : 'Tailoring') + ' on your computer… this can take a minute on smaller machines.'; out.textContent = '';
    try {
      const r = await fetch(OLLAMA + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: $<HTMLSelectElement>('#rt-model').value, stream: false, messages: [{ role: 'user', content: last }] }) });
      const d = await r.json() as { message?: { content: string }; error?: string };
      if (d.error) throw new Error(d.error);
      out.textContent = d.message?.content || '(empty response)'; out.hidden = false; $('#rt-download').hidden = false; st.textContent = 'Done. Check every line is true before you use it.';
    } catch (err) { st.textContent = 'Ollama returned an error: ' + (err as Error).message; }
    btn.disabled = false;
  });
  $('#rt-download').addEventListener('click', () => {
    const blob = new Blob([$<HTMLElement>('#rt-local-out').textContent || ''], { type: 'text/markdown' }); const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = mode() === 'cover' ? 'cover-letter.md' : 'tailored-resume.md'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach(btn => btn.addEventListener('click', async () => { const t = document.querySelector(btn.dataset.copy || ''); try { await navigator.clipboard.writeText(t?.textContent || ''); btn.textContent = 'Copied'; } catch { btn.textContent = 'Select text'; } setTimeout(() => { btn.textContent = 'Copy'; }, 1600); }));
  $('#rt-clear').addEventListener('click', () => { resumeEl.value = ''; jobEl.value = ''; targetEl.value = ''; try { localStorage.removeItem('cyberhub:resume'); } catch { /* ignore */ } remember.checked = false; $('#rt-out').hidden = true; });
}
