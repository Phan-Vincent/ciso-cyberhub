"""Interactive practice labs: SOC Simulator (/labs/soc/) and Phishing lab (/labs/phishing/).
Synthetic data only; logic in web/soc.ts and web/phish.ts.
"""
from __future__ import annotations


def soc_page(site) -> str:
    body = site.heading('SOC Simulator', 'Work a shift as a Tier 1 security analyst. Alerts arrive in a queue: read the evidence, decide malicious or benign, and choose the right response. Every call is explained.', 'Labs / SOC Simulator')
    body += ('<div class="soc" id="soc">'
             '<section id="soc-intro" class="soc-intro"><div class="flags">'
             '<div class="flag"><b>The job</b><p>A SOC (Security Operations Center) watches alerts from tools like a SIEM, EDR and the firewall. Most alerts are harmless; a few are real attacks. Telling them apart quickly is the skill.</p></div>'
             '<div class="flag"><b>How to score</b><p>+10 for the right verdict, +5 more for the best response. Missing a real attack hurts most, but false alarms waste the team\'s time too.</p></div>'
             '<div class="flag"><b>What you learn</b><p>Brute force, malicious macros, MFA fatigue, data theft, persistence, log clearing, beaconing, and how benign activity can look scary.</p></div></div>'
             '<p><button type="button" class="primary duel-go" id="soc-start">Start shift (8 alerts)</button></p></section>'
             '<section id="soc-work" class="soc-work" hidden><div class="soc-grid"><aside><p class="label" id="soc-count"></p><ol class="soc-queue" id="soc-queue"></ol></aside>'
             '<article class="soc-alert"><div class="soc-head"><span id="soc-sev" class="sev"></span><span class="label" id="soc-src"></span></div><h2 id="soc-title"></h2>'
             '<h3>Evidence</h3><ul class="soc-ev" id="soc-ev"></ul>'
             '<h3>1. Verdict</h3><div class="rt-actions"><button type="button" data-v="bad" class="soc-v bad">Malicious</button><button type="button" data-v="ok" class="soc-v ok">Benign</button></div>'
             '<div id="soc-step2" hidden><h3>2. Response</h3><div class="soc-acts" id="soc-acts"></div></div>'
             '<div class="soc-result" id="soc-result" hidden><strong></strong><p></p><button type="button" class="primary" id="soc-next">Next alert →</button></div></article></div></section>'
             '<section id="soc-end" class="soc-end" hidden><p class="label">Shift report</p><h2></h2><div class="stat-row" id="soc-metrics"></div><h3>Every alert</h3><ul class="soc-review" id="soc-review"></ul>'
             f'<p><button type="button" class="primary" id="soc-again">New shift</button> {site.a("Next: Windows event logs lab →", "/labs/windows-events/", "button")} {site.a("Detection engineering lab →", "/labs/detection-engineering/", "button")}</p></section>'
             '<noscript><p class="notice">The simulator needs JavaScript.</p></noscript></div>')
    return body


def phishing_page(site) -> str:
    body = site.heading('Phishing lab', 'Investigate an inbox like an email security analyst. Check the sender, the reply address, where links really go and the authentication results, then decide: phishing or legitimate?', 'Labs / Phishing')
    body += ('<div class="phish" id="phish"><p class="label" id="ph-total"></p><div class="ph-grid"><nav class="ph-list" id="ph-list" aria-label="Inbox"></nav>'
             '<article class="ph-mail"><p class="ph-from" id="ph-from"></p><p class="ph-reply label" id="ph-reply" hidden></p><h2 id="ph-subj"></h2><div class="ph-body" id="ph-body"></div>'
             '<div class="ph-link" id="ph-link" hidden><span class="ph-ltext"></span> <button type="button" id="ph-hover">Inspect link</button><code class="ph-lreal" hidden></code></div>'
             '<p class="ph-att" id="ph-att" hidden></p>'
             '<details id="ph-hdrbox"><summary>View headers</summary><ul class="ph-hdr" id="ph-hdr"></ul><p class="muted">SPF checks the sending server, DKIM checks a signature, and DMARC checks that they line up with the From domain. Passing proves only that the domain sent it, not that the domain is honest.</p></details>'
             '<h3>Red flags you found</h3><div class="ph-clues" id="ph-clues"></div>'
             '<div class="rt-actions"><button type="button" class="soc-v bad" data-verdict="phish">Phishing</button><button type="button" class="soc-v ok" data-verdict="legit">Legitimate</button></div>'
             '<div class="soc-result" id="ph-out" hidden><strong></strong><p></p><button type="button" class="primary" id="ph-next">Next email →</button><p id="ph-done" hidden>Inbox cleared. ' + site.a('Try the SOC Simulator →', '/labs/soc/') + '</p></div></article></div>'
             '<p class="muted">All emails are fictional, for Inland State University on reserved example domains. Nothing here sends or loads anything.</p></div>')
    return body


LAB_TRACKS = [
    ('Command line', 'Type real commands in a safe practice shell.', [
        ('Linux Lab', '36 levels: files, pipes, permissions, processes', '/linux/'), ('Networking Lab', '17 levels: IP, DNS, ports, subnetting', '/linux/network/'),
        ('PowerShell Lab', '15 Windows investigation levels', '/linux/powershell/')]),
    ('Investigate', 'Work the evidence like a SOC analyst.', [
        ('SOC Simulator', 'Triage a shift of alerts', '/labs/soc/'), ('Phishing lab', 'Investigate a suspicious inbox', '/labs/phishing/'),
        ('Packet Lab', 'Filter a capture, Wireshark-style', '/labs/packets/'), ('Log Hunt', 'Trace a break-in through server logs', '/labs/logs/')]),
    ('Build securely', 'Spot and fix the bugs attackers look for.', [
        ('Secure Code Review', 'Find the vulnerable line, pick the fix', '/labs/code-review/'), ('Crypto & Encoding Lab', 'Decode flags, CyberChef-style', '/labs/crypto/')]),
    ('AI security', 'Break a guarded AI, then learn the defense.', [
        ('AI Red Team Lab', 'Six levels of prompt-injection defenses', '/ai/red-team/')]),
]


def interactive_cards(site) -> str:
    out = '<div class="lab-tracks">'
    for name, line, labs in LAB_TRACKS:
        out += (f'<section class="lab-track"><div class="lab-track-head"><h2>{name}</h2><p>{line}</p></div><div class="dir-grid">'
                + ''.join(f'<a class="dir-card" href="{site.base}{u}"><b>{t}</b><span>{d}</span><i aria-hidden="true">→</i></a>' for t, d, u in labs) + '</div></section>')
    return out + '</div><h2 class="lab-sub" id="guided">Guided labs on evidence files</h2>'


def build_practice(site) -> None:
    site.page('/labs/soc/', 'SOC Simulator', soc_page(site), 'Work a SOC analyst shift: triage realistic alerts, decide malicious or benign, and pick the right response.', 'Labs', module='soc')
    site.page('/labs/phishing/', 'Phishing lab', phishing_page(site), 'Investigate an inbox: sender domains, reply-to, links and SPF/DKIM/DMARC. Decide phishing or legitimate.', 'Labs', module='phish')
