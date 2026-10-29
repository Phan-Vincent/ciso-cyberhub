"""Lab briefings: one consistent strip under each lab's heading.

Each says what you will be able to do afterwards, which jobs do this work, and the free real-world
tool to practice on next, so a lab connects to a skill and a career instead of standing alone.
"""
from __future__ import annotations

import html

E = html.escape

# path: (outcomes, roles, (tool name, tool url, what to do with it))
BRIEFS: dict[str, tuple[list[str], list[str], tuple[str, str, str]]] = {
    '/linux/': (['Move around a Linux system and find files fast', 'Read permissions and spot dangerous ones', 'Chain commands with pipes to search logs'],
                ['SOC analyst', 'Systems administrator', 'Penetration tester'],
                ('OverTheWire Bandit', 'https://overthewire.org/wargames/bandit/', 'a free wargame played over real SSH')),
    '/linux/network/': (['Read an IP address and subnet in your head', 'Trace a name lookup through DNS', 'Tell open, closed and filtered ports apart'],
                        ['Network engineer', 'SOC analyst', 'Penetration tester'],
                        ('Nmap', 'https://nmap.org/book/man.html', 'scan only machines you own, such as a home lab VM')),
    '/linux/powershell/': (['Query Windows processes, services and users', 'Filter event logs for logons and failures', 'Find persistence such as run keys and scheduled tasks'],
                           ['Incident responder', 'Windows administrator', 'SOC analyst'],
                           ('PowerShell', 'https://learn.microsoft.com/powershell/scripting/overview', 'runs free on Windows, macOS and Linux')),
    '/labs/soc/': (['Triage an alert queue by severity and evidence', 'Decide malicious, benign or escalate, and say why', 'Pick the response that fits the threat'],
                   ['SOC analyst (tier 1)', 'Incident responder'],
                   ('Security Onion', 'https://securityonionsolutions.com/', 'a free, open SOC platform you can run in a VM')),
    '/labs/phishing/': (['Read sender, reply-to and authentication results', 'Check where a link really goes before clicking', 'Explain to a user why an email is or is not safe'],
                        ['SOC analyst', 'Security awareness lead'],
                        ('Google Admin Toolbox Messageheader', 'https://toolbox.googleapps.com/apps/messageheader/', 'paste a real header to read SPF, DKIM and DMARC')),
    '/labs/packets/': (['Filter a capture down to the conversation that matters', 'Recognize cleartext credentials, scans and beacons', 'Read DNS, HTTP and TLS at the packet level'],
                       ['Network security analyst', 'Incident responder', 'Threat hunter'],
                       ('Wireshark', 'https://www.wireshark.org/', 'open the free sample captures on the Wireshark wiki')),
    '/labs/logs/': (['Search server logs with a SIEM-style query', 'Follow an attacker from first probe to backdoor', 'Build a timeline an incident report can use'],
                    ['SOC analyst', 'Threat hunter', 'Incident responder'],
                    ('Sigma rules', 'https://github.com/SigmaHQ/sigma', 'read real detection rules and the attacks they catch')),
    '/labs/crypto/': (['Recognize Base64, hex, URL encoding and XOR', 'Build a decoding recipe for layered payloads', 'Verify a file or message with a SHA-256 hash'],
                      ['Malware analyst', 'SOC analyst', 'CTF player'],
                      ('CyberChef', 'https://gchq.github.io/CyberChef/', 'the free tool this lab is modeled on')),
    '/labs/code-review/': (['Spot injection, broken access control and secrets in code', 'Choose the fix that removes the bug class, not one input', 'Map each bug to its CWE'],
                           ['Application security engineer', 'Software developer'],
                           ('Semgrep', 'https://semgrep.dev/docs/', 'free static analysis that finds the same bug patterns')),
    '/labs/cloud/': (['Read IAM policies and bucket settings for exposure', 'Spot over-broad roles and public resources', 'Pick the least-privilege fix'],
                     ['Cloud security engineer', 'DevSecOps engineer'],
                     ('Prowler', 'https://github.com/prowler-cloud/prowler', 'free cloud posture checks for AWS, Azure and Google Cloud')),
    '/labs/active-directory/': (['Read Windows security events from a domain', 'Trace Kerberoasting, password spraying and privilege escalation', 'Explain the path from one user to domain admin'],
                                ['Incident responder', 'Penetration tester', 'Identity engineer'],
                                ('BloodHound Community Edition', 'https://github.com/SpecterOps/BloodHound', 'graphs attack paths in a lab domain you build')),
    '/labs/physical/': (['Lay out detection, delay and response on a floor plan', 'Find the critical detection point on an intruder\'s route', 'Harden the computers an intruder could reach'],
                        ['Physical security specialist', 'Security architect', 'Red team operator'],
                        ('CISA physical security resources', 'https://www.cisa.gov/topics/physical-security', 'guides used by real facility security teams')),
    '/labs/gis/': (['Convert and check coordinates without sign errors', 'Calculate distances and catch impossible travel', 'Run buffers and geofences like a GIS analyst'],
                   ['GIS analyst', 'Threat intelligence analyst', 'SOC analyst'],
                   ('QGIS', 'https://qgis.org/', 'free desktop GIS: open Natural Earth layers and try a buffer')),
    '/labs/data/': (['Filter, group and summarize a real security dataset', 'Spot missing data and misleading charts', 'Prioritize vulnerabilities with KEV, CVSS and EPSS'],
                    ['Data analyst', 'Vulnerability management analyst', 'Threat intelligence analyst'],
                    ('DuckDB', 'https://duckdb.org/docs/', 'run SQL on the CSV this lab lets you download')),
    '/ai/red-team/': (['Recognize direct and indirect prompt injection', 'See why each defense layer fails on its own', 'Design defenses that hold together'],
                      ['AI security engineer', 'Penetration tester'],
                      ('OWASP Top 10 for LLM applications', 'https://genai.owasp.org/', 'the industry list of LLM risks')),
    '/challenges/': (['Solve unguided problems across web, network, crypto, forensics and cloud', 'Decide which tool fits an unknown artifact', 'Work under the pressure of a score'],
                     ['CTF competitor', 'Penetration tester', 'SOC analyst'],
                     ('picoCTF', 'https://picoctf.org/', 'free, beginner-friendly competitions all year')),
}


def brief(site, path: str) -> str:
    b = BRIEFS.get(path)
    if not b:
        return ''
    outcomes, roles, (tool, url, note) = b
    return ('<aside class="brief" aria-label="What this lab teaches"><div><p class="label">After this lab you can</p><ul>'
            + ''.join(f'<li>{E(o)}</li>' for o in outcomes) + '</ul></div>'
            + f'<div><p class="label">Who does this work</p><p class="brief-roles">{" · ".join(E(r) for r in roles)}</p>'
            + f'<p class="brief-more"><a href="{E(site.base)}/careers/roles/">See the work roles</a></p></div>'
            + f'<div><p class="label">Then try the real tool</p><p><a href="{E(url)}" rel="noopener"><b>{E(tool)}</b></a></p><p class="brief-note">{E(note)}</p></div></aside>')
