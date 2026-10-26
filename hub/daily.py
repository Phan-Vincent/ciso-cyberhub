"""CyberHub Daily: name the weakness behind a real, actively exploited vulnerability.

Puzzles come from the CISA Known Exploited Vulnerabilities records already in
data/intelligence.json. Each record whose title names a clear weakness is mapped to one of
eight families. The browser picks the day's record deterministically from the list, so every
player gets the same puzzle on the same day, and the list refreshes with the data feed.
"""
from __future__ import annotations

import re
from html import escape as E

from .intel_art import BLUE, HI, INK, MUTED, _code_lines, _rng, _text

# id, label, title keywords, one-line hint, what it is, how defenders catch it, CyberHub links
FAMILIES = [
    ('injection', 'Injection', ['command injection', 'os command', 'code injection', 'sql injection', 'injection'],
     'Text the attacker typed ends up being run by the system, as a command or a query.',
     'Injection happens when untrusted input is glued into a command, query or script and the system runs it.',
     'Parameterized queries, never building shell commands from input, and static analysis that flags tainted data reaching a sink.',
     [('Understanding vulnerabilities', '/academy/understanding-vulnerabilities/'), ('Semgrep CE', '/tools/semgrep-ce/')]),
    ('memory', 'Memory safety', ['use-after-free', 'buffer overflow', 'memory corruption', 'out-of-bounds write', 'out-of-bounds read', 'type confusion', 'integer overflow', 'heap', 'stack-based', 'bounds of a memory buffer', 'race condition'],
     'The program reads or writes memory it should not, often in a browser or a kernel.',
     'Memory-safety bugs let crafted input overwrite or reuse memory, which attackers turn into code execution.',
     'Fast patching, exploit mitigations (ASLR, CFI), memory-safe languages and crash telemetry.',
     [('Understanding vulnerabilities', '/academy/understanding-vulnerabilities/'), ('Ghidra', '/tools/ghidra/')]),
    ('auth', 'Broken authentication', ['authentication bypass', 'improper authentication', 'missing authorization', 'hard-coded credentials', 'hard coded credentials', 'missing authentication', 'improper access control', 'session fixation', 'incorrect authorization'],
     'Someone gets in, or gets access, without proving who they are.',
     'Authentication and authorization flaws let an attacker skip the login or reach functions meant for someone else.',
     'Deny-by-default access checks on every request, MFA, removing default and hard-coded credentials, and alerting on admin actions from new sources.',
     [('Managing identities', '/academy/managing-identities-across-their-lifecycle/'), ('Trust and identity', '/academy/trust-identity-and-security-goals/')]),
    ('path', 'Path and file abuse', ['path traversal', 'directory traversal', 'file upload', 'external control of file name', 'files or directories accessible', 'arbitrary file'],
     'A crafted file name or upload reaches files and folders it should never touch.',
     'Path traversal and unsafe uploads let input like ../../ escape a folder, or drop a file the server will later run.',
     'Canonicalize paths before use, allow-list upload types, store uploads outside the web root, and watch for ../ in request logs.',
     [('Entry points and attack surfaces', '/academy/entry-points-and-attack-surfaces/'), ('OWASP ZAP', '/tools/zap/')]),
    ('deserial', 'Unsafe deserialization', ['deserialization', 'deserialization'],
     'Data that should only be read is rebuilt into live objects, and those objects run code.',
     'Unsafe deserialization turns attacker-supplied data back into program objects, which can trigger code during loading.',
     'Never deserialize untrusted input with native formats, use simple data formats with schemas, and patch the frameworks that do it for you.',
     [('Understanding vulnerabilities', '/academy/understanding-vulnerabilities/'), ('Trivy', '/tools/trivy/')]),
    ('privesc', 'Privilege escalation', ['privilege escalation', 'elevation of privilege', 'improper privilege management', 'privilege'],
     'The attacker is already on the machine. This bug turns a normal user into an administrator.',
     'Privilege escalation bugs take a foothold with few rights and turn it into full control of the system.',
     'Least privilege, prompt OS patching, and endpoint telemetry for unusual child processes and new admin tokens.',
     [('Secure baselines', '/academy/establishing-secure-baselines/'), ('osquery', '/tools/osquery/')]),
    ('webreq', 'Web request forgery and XSS', ['cross-site scripting', 'server-side request forgery', 'ssrf', 'cross-site request forgery', 'csrf', 'open redirect', 'encoded uri'],
     'The attack rides on a web request: the server or the victim\'s browser is tricked into doing it.',
     'XSS runs attacker script in another user\'s browser; SSRF makes the server fetch internal addresses for the attacker.',
     'Output encoding and a strict Content Security Policy for XSS; allow-listed outbound requests and blocked metadata IPs for SSRF.',
     [('Mitigations that reduce exposure', '/academy/mitigations-that-reduce-exposure/'), ('OWASP ZAP', '/tools/zap/')]),
    ('leak', 'Information disclosure', ['information disclosure', 'exposure of sensitive information', 'cleartext', 'sensitive information', 'information exposure'],
     'Nothing is broken into directly. Something sensitive is simply handed out.',
     'Information disclosure leaks secrets, memory contents or internal details that make the next attack easy.',
     'Data classification, secrets scanning, encrypting sensitive data at rest, and reviewing what error pages and APIs return.',
     [('Protecting data', '/academy/protecting-data-through-its-lifecycle/'), ('Gitleaks', '/tools/gitleaks/')]),
]
FAMILY_IDS = [f[0] for f in FAMILIES]


def family_of(title: str) -> str | None:
    t = title.lower()
    for fid, _label, words, *_ in FAMILIES:
        if any(w in t for w in words):
            return fid
    return None


def puzzles(vulns: list[dict], limit: int = 500) -> list[dict]:
    """Compact, eligible KEV records, newest first."""
    out = []
    for v in sorted(vulns, key=lambda v: (v.get('date_added') or '', v.get('id') or ''), reverse=True):
        fam = family_of(v.get('title') or '')
        if not fam or not re.fullmatch(r'CVE-\d{4}-\d{4,7}', v.get('id') or ''):
            continue
        cvss = (v.get('cvss') or {}).get('score')
        out.append({'id': v['id'], 'vendor': v.get('vendor') or '', 'product': v.get('product') or '', 'title': v.get('title') or '',
                    'added': v.get('date_added') or '', 'due': v.get('due_date') or '', 'cvss': cvss, 'epss': v.get('epss'), 'family': fam})
        if len(out) >= limit:
            break
    return out


def _motif(fid: str) -> str:
    r = _rng(fid)
    if fid == 'injection':
        return (f'<rect x="90" y="80" width="300" height="180" rx="14" fill="#0c0d10" stroke="rgba(255,255,255,.35)"/>'
                + _text(110, 116, '$ ping 10.0.0.1', 13, 'rgba(255,255,255,.7)') + _text(110, 146, '$ ping 10.0.0.1; cat /etc/passwd', 13, HI)
                + f'<rect x="232" y="132" width="10" height="20" fill="{HI}"/>' + _text(110, 176, "SELECT * FROM users WHERE id='1' OR '1'='1'", 11, 'rgba(255,255,255,.55)')
                + _code_lines(r, 110, 200, 240, 3))
    if fid == 'memory':
        cells = ''.join(f'<rect x="{100 + (i % 10) * 28}" y="{100 + (i // 10) * 28}" width="22" height="22" rx="3" fill="{BLUE if 22 <= i <= 34 else "#0c0d10"}" stroke="{HI if 22 <= i <= 34 else "rgba(255,255,255,.3)"}"/>' for i in range(50))
        return cells + f'<path d="M100 92 h168" stroke="rgba(255,255,255,.6)"/><path d="M100 88 v8 M268 88 v8" stroke="rgba(255,255,255,.6)"/>' + _text(184, 82, 'buffer[64]', 11, MUTED, 'middle') + _text(240, 262, 'write past the end', 11, HI, 'middle')
    if fid == 'auth':
        return (f'<rect x="130" y="76" width="220" height="190" rx="14" fill="#0c0d10" stroke="rgba(255,255,255,.35)"/>' + _text(150, 108, 'SIGN IN', 12, MUTED)
                + ''.join(f'<rect x="150" y="{124 + i * 44}" width="180" height="30" rx="8" fill="none" stroke="rgba(255,255,255,.35)"/>' for i in range(2))
                + f'<rect x="150" y="214" width="180" height="32" rx="8" fill="rgba(255,255,255,.12)"/>'
                + f'<path d="M60 230 C 120 300, 330 300, 400 150" fill="none" stroke="{HI}" stroke-width="3" stroke-dasharray="8 7"/><path d="M400 150 l-14 4 l8 12 z" fill="{HI}"/>'
                + _text(410, 140, 'admin', 12, HI, 'end'))
    if fid == 'path':
        rows = [('/var/www/uploads/', 0), ('  ../', 1), ('    ../', 2), ('      etc/', 3), ('        passwd', 4)]
        return (f'<rect x="100" y="76" width="280" height="190" rx="14" fill="#0c0d10" stroke="rgba(255,255,255,.35)"/>'
                + ''.join(_text(124, 112 + i * 32, t, 14, HI if i else 'rgba(255,255,255,.6)') for t, i in rows)
                + f'<path d="M340 116 V244" stroke="{HI}" stroke-width="2"/><path d="M334 236 l6 12 l6 -12" fill="none" stroke="{HI}" stroke-width="2"/>')
    if fid == 'deserial':
        return (f'<rect x="80" y="120" width="120" height="100" rx="12" fill="#0c0d10" stroke="rgba(255,255,255,.4)"/>' + _text(140, 176, '0xACED…', 13, MUTED, 'middle')
                + f'<path d="M206 170 h60" stroke="{HI}" stroke-width="2"/><path d="M258 162 l10 8 l-10 8" fill="none" stroke="{HI}" stroke-width="2"/>'
                + f'<rect x="276" y="96" width="124" height="148" rx="12" fill="{BLUE}" stroke="#fff"/>'
                + ''.join(_text(292, 126 + i * 26, t, 12, '#fff') for i, t in enumerate(['class User', ' name', ' role', ' readObject()', '  → exec()'])))
    if fid == 'privesc':
        steps = ''.join(f'<rect x="{110 + i * 64}" y="{240 - i * 40}" width="64" height="{20 + i * 40}" fill="{BLUE if i == 3 else "#0c0d10"}" stroke="rgba(255,255,255,.4)"/>' for i in range(4))
        return steps + _text(142, 230, 'user', 11, MUTED, 'middle') + _text(334, 108, 'root', 12, '#fff', 'middle', 700) + f'<path d="M140 200 C 200 120, 260 100, 320 92" fill="none" stroke="{HI}" stroke-width="3" stroke-dasharray="6 6"/>'
    if fid == 'webreq':
        return (f'<rect x="70" y="100" width="150" height="120" rx="12" fill="#0c0d10" stroke="rgba(255,255,255,.4)"/>' + _text(145, 130, 'BROWSER', 11, MUTED, 'middle')
                + _text(145, 170, '<script>', 13, HI, 'middle') + f'<rect x="270" y="80" width="140" height="70" rx="12" fill="#0c0d10" stroke="rgba(255,255,255,.4)"/>' + _text(340, 120, 'SERVER', 11, MUTED, 'middle')
                + f'<rect x="270" y="190" width="140" height="70" rx="12" fill="{BLUE}" stroke="#fff"/>' + _text(340, 230, '169.254.169.254', 11, '#fff', 'middle')
                + f'<path d="M220 150 L270 120" stroke="{HI}" stroke-width="2"/><path d="M340 150 V190" stroke="{HI}" stroke-width="2" stroke-dasharray="5 5"/>')
    return (f'<rect x="130" y="70" width="190" height="210" rx="12" fill="#0c0d10" stroke="rgba(255,255,255,.4)"/>' + _code_lines(r, 150, 96, 150, 8, 18)
            + ''.join(f'<rect x="{330 + i * 18}" y="{150 + (i % 3) * 22}" width="12" height="8" rx="2" fill="{HI if i % 2 else BLUE}"/>' for i in range(5))
            + _text(150, 266, 'API_KEY=sk_live_…', 11, HI))


def figure(fid: str) -> str:
    grid = ''.join(f'<line x1="{x}" y1="0" x2="{x}" y2="340" stroke="rgba(255,255,255,.05)"/>' for x in range(20, 480, 20))
    return (f'<svg viewBox="0 0 480 340" role="img" aria-label="Clue figure for today\'s weakness" xmlns="http://www.w3.org/2000/svg">'
            f'<rect width="480" height="340" rx="18" fill="{INK}"/>{grid}{_motif(fid)}{_text(24, 32, "FIG. / CLUE", 11, HI)}</svg>')


def options_html() -> str:
    return ''.join(f'<li><button type="button" class="opt" data-family="{fid}"><span class="label">{i + 1:02d}</span>{E(label)}</button></li>' for i, (fid, label, *_) in enumerate(FAMILIES))


def families_json() -> list[dict]:
    return [{'id': f[0], 'label': f[1], 'hint': f[3], 'what': f[4], 'defend': f[5], 'links': [{'title': t, 'path': p} for t, p in f[6]]} for f in FAMILIES]
