"""Work roles map (/careers/roles/): cyber work roles grouped by NICE Framework category,
each linked to the CyberHub labs, tools and duel topics that practise it."""
from __future__ import annotations

from html import escape as E

# (NICE category, [(role, what they do, entry route, [(practice, path)], [tool ids])])
ROLES = [
    ('Protection and Defense', [
        ('SOC analyst', 'Watches alerts, investigates, and escalates real attacks. The most common first security job.', 'Help desk or IT support, Security+, home lab, CCDC or NCL', [('SOC Simulator', '/labs/soc/'), ('Windows event logs lab', '/labs/windows-events/'), ('Linux Lab', '/linux/')], ['wazuh', 'security-onion', 'hayabusa']),
        ('Incident responder', 'Leads the response when an attack is confirmed: contain, investigate, recover and report.', 'SOC analyst, then incident response training', [('Incident response lab', '/labs/incident-response/'), ('A day defending infrastructure', '/defend/infrastructure/#day')], ['velociraptor', 'volatility-3', 'yara']),
        ('Detection engineer', 'Writes and tests the rules that turn logs into alerts, mapped to MITRE ATT&CK.', 'SOC analyst who likes building', [('Detection engineering lab', '/labs/detection-engineering/'), ('SOC Simulator', '/labs/soc/')], ['sigma', 'suricata', 'zeek']),
        ('Network security engineer', 'Designs and runs firewalls, segmentation, VPNs and network monitoring.', 'Network support, Network+, Security+', [('Networking Lab', '/linux/network/'), ('Packet analysis lab', '/labs/packet-analysis/')], ['wireshark', 'snort3', 'arkime']),
        ('Vulnerability management analyst', 'Finds, prioritises and tracks fixes for vulnerabilities across the organisation.', 'IT or sysadmin experience, Security+', [('Vulnerability feed', '/vulnerabilities/'), ('Legacy systems guide', '/defend/legacy-systems/')], ['openvas', 'nuclei', 'trivy']),
    ]),
    ('Investigation', [
        ('Digital forensics analyst', 'Recovers and analyses evidence from computers and phones, with careful chain of custody.', 'Criminal justice or IT degree, forensics courses', [('Incident response lab', '/labs/incident-response/'), ('Linux Lab: finding things', '/linux/finding/')], ['autopsy', 'sleuthkit', 'volatility-3']),
        ('Malware analyst', 'Takes malicious software apart to understand what it does and how to detect it.', 'Programming and OS internals, then reverse engineering', [('Phishing lab', '/labs/phishing/'), ('YARA tutorial', '/tutorials/yara/')], ['ghidra', 'capev2', 'radare2']),
    ]),
    ('Cyberspace Intelligence', [
        ('Threat intelligence analyst', 'Tracks attacker groups and campaigns and turns them into guidance defenders can use.', 'Political science, international relations or IT plus security basics', [('Intelligence desk', '/intelligence/'), ('Cyber history', '/history/')], ['misp', 'opencti', 'cyberchef']),
    ]),
    ('Design and Development', [
        ('Application security engineer', 'Helps developers build secure software: code review, testing and secure design.', 'Software development plus OWASP knowledge', [('Secure AI coding', '/ai/vibe-coding/'), ('OWASP ZAP tutorial', '/tutorials/zap/')], ['zap', 'semgrep-ce', 'gitleaks']),
        ('Cloud security engineer', 'Secures cloud accounts, identities, storage and containers.', 'Cloud fundamentals, then a cloud security certification', [('Infrastructure guide', '/defend/infrastructure/'), ('Trivy tutorial', '/tutorials/trivy/')], ['prowler', 'checkov', 'kubescape']),
        ('AI security engineer', 'Secures AI features and models: threat models, injection defences, testing and data controls.', 'Software or ML background plus security', [('AI Red Team Lab', '/ai/red-team/'), ('Prompt testing', '/ai/prompt-testing/')], ['promptfoo', 'garak', 'pyrit']),
    ]),
    ('Cyberspace Effects and Testing', [
        ('Penetration tester', 'Attacks systems with written permission to find weaknesses before criminals do, then writes the report.', 'Networking and Linux, CTFs, CPTC, then offensive certifications', [('Networking Lab: ports', '/linux/network/ports/'), ('Nmap tutorial', '/tutorials/nmap/'), ('Competitions: CPTC', '/careers/competitions/#cptc')], ['nmap', 'zap', 'mitmproxy']),
        ('AI red teamer', 'Tests AI systems for harmful or unsafe behaviour with permission.', 'Security testing plus AI fundamentals', [('AI Red Team Lab', '/ai/red-team/'), ('Run AI locally', '/ai/local/')], ['garak', 'pyrit', 'inspect-ai']),
    ]),
    ('Oversight and Governance', [
        ('GRC analyst', 'Governance, risk and compliance: policies, audits and risk assessments that connect security to business decisions.', 'Business, law or IT; Security+; a great path for non-coders', [('Competitions: Cyber 9/12', '/careers/competitions/#nine12'), ('Security+ Academy', '/academy/')], ['openssf-scorecard', 'lynis']),
        ('Security awareness lead', 'Teaches people to spot phishing and build safe habits, and measures whether it works.', 'Communication, teaching or marketing plus security basics', [('Start here', '/start/'), ('Phishing lab', '/labs/phishing/')], ['keepassxc', 'pi-hole']),
    ]),
]


def roles_page(site) -> str:
    names = {t['id']: t['name'] for t in site.tools}
    body = site.heading('Work roles', 'Cybersecurity is many jobs, not one. Find the roles that fit you, then practise each one with CyberHub labs and the open-source tools professionals use.', 'Careers / Work roles')
    body += '<p class="notice">Grouped by category of the NICE Workforce Framework for Cybersecurity, the US standard for describing cyber work. ' + site.a('Not sure where you fit? Take the role quiz →', '/careers/match/') + '</p>'
    body += '<nav class="dir-jump" aria-label="Categories">' + ''.join(f'<a href="#cat-{i}">{E(c)}</a>' for i, (c, _r) in enumerate(ROLES)) + '</nav>'
    for i, (cat, roles) in enumerate(ROLES):
        body += f'<section class="dir-section" id="cat-{i}"><h2>{E(cat)}</h2><div class="wr-grid">'
        for name, what, entry, practice, tools in roles:
            tl = ' · '.join(site.a(names[t], f'/tools/{t}/') for t in tools if t in names)
            body += (f'<article class="wr-card"><h3>{E(name)}</h3><p>{E(what)}</p><dl><div><dt>Way in</dt><dd>{E(entry)}</dd></div>'
                     f'<div><dt>Practise</dt><dd>{" · ".join(site.a(t, u) for t, u in practice)}</dd></div><div><dt>Tools</dt><dd>{tl}</dd></div></dl></article>')
        body += '</div></section>'
    body += '<p class="muted">Source for categories: NIST NICE Workforce Framework for Cybersecurity (SP 800-181 Rev. 1 and the NICE Framework components).</p>'
    return body


def build_roles(site) -> None:
    site.page('/careers/roles/', 'Cyber work roles', roles_page(site), 'Cyber work roles grouped by the NICE Framework, each linked to CyberHub labs and open-source tools to practise it.', 'Careers')
