"""Home hero: an original line drawing of a small organization's infrastructure (campus office,
data center, cell tower, substation) with clickable red markers for its vulnerabilities.
Everything is drawn here as SVG so it inherits the theme (currentColor) and stays crisp."""
from __future__ import annotations

import html
import math
import random
import re

E = html.escape
W, H, GROUND = 1200, 610, 500

# id, building, x, y (SVG units: the marker sits on the thing at fault), title, reference, attack, fix, lab link, lab name, redline note
FINDINGS = [
    ('phish', 'Campus office', 300, 238, 'Payroll phishing email', 'MITRE ATT&CK T1566', 'A lookalike "payroll" email asks staff to confirm bank details. One click hands over a password.', 'Report-phish button, DMARC on the domain, and phishing-resistant MFA.', '/labs/phishing/', 'Phishing lab', 'T1566 MAIL'),
    ('kerberoast', 'Campus office', 208, 236, 'Weak service account password', 'MITRE ATT&CK T1558.003', 'Any staff account can request a ticket for svc_backup and crack its password offline.', 'Long random passwords for service accounts (or gMSA) and AES-only Kerberos.', '/labs/active-directory/', 'Active Directory Lab', 'SVC ACCT'),
    ('tailgate', 'Campus office', 196, 462, 'Propped side door', 'Physical security', 'The badge door is propped open for deliveries. Anyone can walk in behind staff.', 'Door-held-open alarms, delivery procedures, and a culture of asking.', '/labs/physical/', 'Lockdown Lab', 'NO READER'),
    ('sqli', 'Campus office', 404, 262, 'Student portal SQL injection', 'CWE-89', 'The grade lookup pastes the student name into SQL, so a crafted name dumps the table.', 'Parameterized queries everywhere, including admin reports.', '/labs/code-review/', 'Secure Code Review', 'CWE-89'),
    ('ssh', 'Data center', 700, 398, 'SSH open to the internet', 'MITRE ATT&CK T1110', 'Bots guess passwords on port 22 all night. One weak deploy account gets in.', 'SSH only from the VPN or a bastion, keys instead of passwords.', '/labs/logs/', 'Log Hunt', 'PORT 22'),
    ('bucket', 'Data center', 790, 318, 'Public storage bucket', 'Cloud misconfiguration', 'The student-records bucket allows reads from anyone with the link.', 'Block public access at the account level; grant named roles only.', '/labs/cloud/', 'Cloud Security Lab', 'PUBLIC'),
    ('kev', 'Data center', 858, 446, 'Unpatched hypervisor', 'CISA Known Exploited Vulnerabilities', 'The virtualization host runs a version with a public exploit used in ransomware attacks.', 'Patch known-exploited bugs first, and isolate management networks.', '/vulnerabilities/', 'Exploited vulnerabilities', 'KEV'),
    ('eviltwin', 'Cell tower', 990, 168, 'Rogue Wi-Fi access point', 'MITRE ATT&CK T1557', 'A fake "ISU-Guest" network near the lot captures logins from phones that join it.', 'WPA3-Enterprise with certificate checks, and wireless intrusion detection.', '/labs/packets/', 'Packet Lab', 'EVIL TWIN'),
    ('modbus', 'Substation', 1112, 432, 'Controller with no authentication', 'MITRE ATT&CK for ICS T0855', 'The substation controller accepts Modbus commands from anyone on its network.', 'Segment OT from IT, allow-list who can talk to controllers, monitor commands.', '/defend/operational-technology/', 'Operational technology', 'MODBUS'),
]


def _tree(rnd: random.Random, x: float, base: float, h: float, depth: int = 7, faint: bool = False) -> str:
    """A bare winter tree: recursive branches, merged into one path per branch thickness."""
    levels: dict[int, list[str]] = {}
    def branch(x0, y0, ang, length, d):
        x1, y1 = x0 + math.cos(ang) * length, y0 - math.sin(ang) * length
        levels.setdefault(d, []).append(f'M{x0:.0f} {y0:.0f}L{x1:.0f} {y1:.0f}')
        if d <= 0:
            return
        n = 2 if d > 2 else rnd.choice((2, 2, 3))
        for k in range(n):
            spread = rnd.uniform(.28, .6) * (1 if k % 2 else -1)
            branch(x1, y1, ang + spread + rnd.uniform(-.1, .1), length * rnd.uniform(.68, .8), d - 1)
    branch(x, base, math.pi / 2 + rnd.uniform(-.05, .05), h * .3, depth)
    paths = ''.join(f'<path d="{"".join(segs)}" stroke-width="{max(.4, .4 + d * .32):.2f}"/>' for d, segs in sorted(levels.items()))
    return f'<g class="tree{" faint" if faint else ""}">{paths}</g>'


NOTE_AT = {'phish': (40, -78), 'kerberoast': (-40, -52), 'tailgate': (-48, -34), 'sqli': (52, -42), 'ssh': (-46, -40), 'bucket': (40, -44), 'kev': (46, -50), 'eviltwin': (-50, 6), 'modbus': (-56, -46)}


def _canopy(rnd: random.Random, cx: float, cy: float, rx: float, ry: float, n: int = 34) -> str:
    """Pencil-scribble tree mass: short zig-zag strokes packed inside an ellipse."""
    d = ''
    for _ in range(n):
        ang = rnd.uniform(0, math.tau); r = math.sqrt(rnd.random())
        x, y = cx + math.cos(ang) * rx * r, cy + math.sin(ang) * ry * r
        d += f'M{x:.0f} {y:.0f}'
        for _k in range(rnd.randint(5, 9)):
            x += rnd.uniform(-9, 9); y += rnd.uniform(-6, 6); d += f'L{x:.0f} {y:.0f}'
    return f'<path d="{d}" class="scribble"/>'


NOTE_AT = {'phish': (40, -78), 'kerberoast': (-40, -52), 'tailgate': (-48, -34), 'sqli': (52, -42), 'ssh': (-46, -40), 'bucket': (40, -44), 'kev': (46, -50), 'eviltwin': (-50, 6), 'modbus': (-56, -46)}


def _canopy(rnd: random.Random, cx: float, cy: float, rx: float, ry: float, n: int = 34) -> str:
    """Pencil-scribble tree mass: short zig-zag strokes packed inside an ellipse."""
    d = ''
    for _ in range(n):
        ang = rnd.uniform(0, math.tau); r = math.sqrt(rnd.random())
        x, y = cx + math.cos(ang) * rx * r, cy + math.sin(ang) * ry * r
        d += f'M{x:.0f} {y:.0f}'
        for _k in range(rnd.randint(5, 9)):
            x += rnd.uniform(-9, 9); y += rnd.uniform(-6, 6); d += f'L{x:.0f} {y:.0f}'
    return f'<path d="{d}" class="scribble"/>'


def _stipple(rnd: random.Random, pid: str, n: int, size: int = 46) -> str:
    dots = ''.join(f'<circle cx="{rnd.uniform(0, size):.1f}" cy="{rnd.uniform(0, size):.1f}" r="{rnd.uniform(.35, .75):.2f}"/>' for _ in range(n))
    return f'<pattern id="{pid}" width="{size}" height="{size}" patternUnits="userSpaceOnUse"><g class="dots">{dots}</g></pattern>'


def _concrete(x, y, w, h, shade=False, panel=(46, 30)):
    """A cast-concrete surface: stipple, formwork joints and tie holes."""
    out = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" class="mass"/><rect x="{x}" y="{y}" width="{w}" height="{h}" fill="url(#{"stip-d" if shade else "stip"})" class="tex"/>'
    pw, ph = panel
    xx = x + pw
    while xx < x + w - 4:
        out += f'<line x1="{xx}" y1="{y}" x2="{xx}" y2="{y + h}" class="joint"/>'; xx += pw
    yy = y + ph
    while yy < y + h - 4:
        out += f'<line x1="{x}" y1="{yy}" x2="{x + w}" y2="{yy}" class="joint"/>'; yy += ph
    holes = ''
    xx = x + pw / 4
    while xx < x + w:
        yy = y + ph / 3
        while yy < y + h:
            holes += f'M{xx:.0f} {yy:.0f}h.01'; yy += ph / 1.5
        xx += pw / 2
    return out + f'<path d="{holes}" class="ties"/>'


def _glass(x, y, w, h, cols, rows):
    out = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" class="glass-bg"/>'
    for c in range(1, cols):
        out += f'<line x1="{x + w * c / cols:.1f}" y1="{y}" x2="{x + w * c / cols:.1f}" y2="{y + h}" class="mullion"/>'
    for r in range(1, rows):
        out += f'<line x1="{x}" y1="{y + h * r / rows:.1f}" x2="{x + w}" y2="{y + h * r / rows:.1f}" class="transom"/>'
    for c in range(cols):  # reflections: a few diagonal streaks per pane column
        out += f'<line x1="{x + w * c / cols + 6:.1f}" y1="{y + h * .7:.1f}" x2="{x + w * (c + .6) / cols:.1f}" y2="{y + h * .2:.1f}" class="reflect"/>'
    return out + f'<rect x="{x}" y="{y}" width="{w}" height="{h}" class="frame"/>'


def drawing() -> str:
    rnd = random.Random(7)
    g: list[str] = []
    # Faint trees behind
    for cx, cy, rx, ry in [(90, 330, 90, 120), (230, 150, 120, 70), (610, 300, 80, 110), (560, 210, 70, 60), (930, 360, 70, 100), (1170, 360, 60, 110)]:
        g.append(_canopy(rnd, cx, cy, rx, ry, 30))
    # ---- Campus office: concrete side volumes, two-storey curtain wall, tall fins, cantilevered glass box
    g.append(_concrete(120, 410, 470, GROUND - 410, shade=False, panel=(58, 30)))           # plinth wall
    g.append(_concrete(170, 160, 82, 250, panel=(41, 36)))                                  # left volume
    g.append(f'<polygon points="170,160 252,160 252,290" fill="url(#stip-d)" class="cast"/>')  # cast shadow
    g.append(_glass(252, 182, 190, 104, 5, 2) + _glass(252, 300, 190, 108, 5, 2))
    g.append(f'<rect x="252" y="286" width="190" height="14" class="slab"/><rect x="252" y="170" width="190" height="12" class="slab"/>')
    g.append(_concrete(442, 160, 86, 250, shade=True, panel=(43, 36)))                      # right volume, in shade
    g.append(f'<polygon points="528,160 566,180 566,{GROUND} 528,{GROUND}" class="mass"/><polygon points="528,160 566,180 566,{GROUND} 528,{GROUND}" fill="url(#stip-d)" class="tex"/>')
    g.append(_glass(534, 230, 26, 70, 1, 2) + _glass(534, 330, 26, 70, 1, 2))               # side windows
    g.append(f'<rect x="300" y="336" width="128" height="88" class="mass"/>' + _glass(306, 342, 116, 76, 4, 1))  # cantilevered box
    g.append(f'<polygon points="300,424 428,424 410,440 300,440" fill="url(#stip-d)" class="cast"/>')
    for fx, top in [(158, 128), (246, 150), (366, 112), (436, 150), (522, 124)]:
        g.append(f'<rect x="{fx}" y="{top}" width="12" height="{GROUND - top}" class="fin"/><line x1="{fx + 9}" y1="{top + 4}" x2="{fx + 9}" y2="{GROUND}" class="fin-edge"/>')
    for s2 in range(8):
        g.append(f'<line x1="{60 + s2 * 8}" y1="{GROUND - 8 * s2 - 8}" x2="{120}" y2="{GROUND - 8 * s2 - 8}" class="thin"/>')
    g.append(f'<rect x="182" y="430" width="30" height="{GROUND - 430}" class="door"/>')
    g.append(f'<text x="345" y="100" class="tag">CAMPUS OFFICE</text>')
    # ---- Data center: low concrete block, louvers, rooftop plant
    dx, dy, dw, dh = 640, 330, 260, GROUND - 330
    g.append(_concrete(dx, dy, dw, dh, panel=(52, 34)))
    g.append(f'<polygon points="{dx + dw},{dy} {dx + dw + 30},{dy + 14} {dx + dw + 30},{GROUND} {dx + dw},{GROUND}" class="mass"/><polygon points="{dx + dw},{dy} {dx + dw + 30},{dy + 14} {dx + dw + 30},{GROUND} {dx + dw},{GROUND}" fill="url(#stip-d)" class="tex"/>')
    g.append(f'<rect x="{dx + 20}" y="{dy + 30}" width="120" height="96" class="glass-bg"/>' + ''.join(f'<line x1="{dx + 20}" y1="{dy + 34 + k * 6}" x2="{dx + 140}" y2="{dy + 34 + k * 6}" class="louver"/>' for k in range(16)))
    for k in range(3):
        g.append(f'<rect x="{dx + 26 + k * 78}" y="{dy - 30}" width="56" height="30" class="mass"/><circle cx="{dx + 54 + k * 78}" cy="{dy - 15}" r="10" class="thin-fill"/><line x1="{dx + 44 + k * 78}" y1="{dy - 15}" x2="{dx + 64 + k * 78}" y2="{dy - 15}" class="thin"/>')
    g.append(f'<rect x="{dx + 192}" y="{dy + 80}" width="48" height="{GROUND - dy - 80}" class="door"/>')
    g.append(f'<polygon points="{dx},{dy} {dx + 90},{dy} {dx},{dy + 70}" fill="url(#stip-d)" class="cast"/>')
    g.append(f'<text x="{dx + dw / 2}" y="{dy - 46}" class="tag">DATA CENTER</text>')
    # ---- Cell tower
    tx, ttop = 990, 140
    g.append(f'<path d="M{tx - 30} {GROUND}L{tx - 5} {ttop}M{tx + 30} {GROUND}L{tx + 5} {ttop}" class="mast"/>')
    y = GROUND
    while y > ttop + 20:
        w0 = 30 - (GROUND - y) / (GROUND - ttop) * 25; y2 = y - 30; w1 = 30 - (GROUND - y2) / (GROUND - ttop) * 25
        g.append(f'<path d="M{tx - w0:.1f} {y:.1f}L{tx + w1:.1f} {y2:.1f}M{tx + w0:.1f} {y:.1f}L{tx - w1:.1f} {y2:.1f}M{tx - w1:.1f} {y2:.1f}L{tx + w1:.1f} {y2:.1f}" class="thin"/>')
        y = y2
    for ax in (-18, -6, 6, 18):
        g.append(f'<rect x="{tx + ax - 3}" y="{ttop + 8}" width="6" height="30" class="mass"/>')
    for r in (30, 46, 62):
        g.append(f'<path d="M{tx + 16 + r * .2} {ttop - r * .35}A{r} {r} 0 0 1 {tx + 16 + r * .75} {ttop + 26}" class="wave"/>')
    g.append(f'<text x="{tx}" y="{ttop - 40}" class="tag">CELL TOWER</text>')
    # ---- Substation
    sx = 1070
    g.append(f'<line x1="{sx - 18}" y1="{GROUND - 56}" x2="{sx + 104}" y2="{GROUND - 56}" class="thin"/>' + ''.join(f'<line x1="{sx - 18 + k * 9}" y1="{GROUND - 56}" x2="{sx - 18 + k * 9}" y2="{GROUND}" class="thin"/>' for k in range(14)))
    for k in range(2):
        bx = sx + k * 50
        g.append(_concrete(bx, GROUND - 92, 38, 92, shade=bool(k), panel=(19, 23)))
        for i in range(3):
            g.append(f'<line x1="{bx + 7 + i * 12}" y1="{GROUND - 92}" x2="{bx + 7 + i * 12}" y2="{GROUND - 122}" class="mast"/><circle cx="{bx + 7 + i * 12}" cy="{GROUND - 125}" r="3" class="thin-fill"/>')
    g.append(f'<path d="M{sx + 7} {GROUND - 125}C{sx + 40} {GROUND - 148} {sx + 70} {GROUND - 148} {sx + 98} {GROUND - 125}" class="thin"/>')
    g.append(f'<text x="{sx + 44}" y="{GROUND - 160}" class="tag">SUBSTATION</text>')
    # Front trees, ground and paving
    for x, h in [(70, 250), (610, 210), (930, 170)]:
        g.append(_tree(rnd, x, GROUND, h, 7))
    g.append(f'<line x1="20" y1="{GROUND}" x2="{W - 20}" y2="{GROUND}" class="ground"/>')
    g.append(''.join(f'<line x1="{20 + k * 38}" y1="{GROUND + 6}" x2="{6 + k * 38}" y2="{GROUND + 26}" class="paving"/>' for k in range(31)))
    # Red redline layer: dimension strings and one callout per finding
    red = [f'<g class="redline dims"><line x1="120" y1="{GROUND + 44}" x2="566" y2="{GROUND + 44}"/><line x1="120" y1="{GROUND + 36}" x2="120" y2="{GROUND + 52}"/><line x1="566" y1="{GROUND + 36}" x2="566" y2="{GROUND + 52}"/>'
           f'<text x="343" y="{GROUND + 38}" class="note">112\'-0" · 3 ENTRANCES · 1 READER</text>'
           f'<line x1="640" y1="{GROUND + 44}" x2="930" y2="{GROUND + 44}"/><line x1="640" y1="{GROUND + 36}" x2="640" y2="{GROUND + 52}"/><line x1="930" y1="{GROUND + 36}" x2="930" y2="{GROUND + 52}"/>'
           f'<text x="785" y="{GROUND + 40}" class="note">72\'-6" · 0 CAMERAS ON EAST WALL</text></g>']
    for i, f in enumerate(FINDINGS):
        x, y, note = f[2], f[3], f[10]
        dx_, dy_ = NOTE_AT.get(f[0], (44, -46))
        side = 1 if dx_ > 0 else -1
        lx, ly = x + dx_, y + dy_
        red.append(f'<g class="redline call" id="call-{i}"><circle cx="{x}" cy="{y}" r="22" class="cloud"/><path d="M{x + side * 16} {y - 16}L{lx} {ly}h{side * 34}"/>'
                   f'<text x="{lx + side * 38}" y="{ly + 4}" class="note {"start" if side > 0 else "end"}">{E(note)}</text></g>')
    g.append(''.join(red))
    g.append(f'<text x="{W / 2}" y="{H - 8}" class="sheet">CAMPUS — NORTH ELEVATION · SECURITY REVIEW</text><line x1="{W / 2 - 190}" y1="{H - 2}" x2="{W / 2 + 190}" y2="{H - 2}" class="sheet-rule"/>')
    g.append(f'<text x="{W / 2}" y="{H - 8}" class="sheet">CAMPUS — NORTH ELEVATION · SECURITY REVIEW</text><line x1="{W / 2 - 190}" y1="{H - 2}" x2="{W / 2 + 190}" y2="{H - 2}" class="sheet-rule"/>')
    body = re.sub(r'<(path|line|rect|circle|polygon)\b(?![^>]*class="(?:tex|cast)")', r'<\1 pathLength="1"', ''.join(g))
    defs = ('<defs>' + _stipple(rnd, 'stip', 70) + _stipple(rnd, 'stip-d', 260) + '</defs>')
    return (f'<svg class="infra-svg" viewBox="0 0 {W} {H}" role="img" aria-labelledby="infra-title infra-desc"><title id="infra-title">A fictional college campus network</title>'
            f'<desc id="infra-desc">Architectural drawing of a campus office, a data center, a cell tower and a power substation, marked up in red with {len(FINDINGS)} vulnerabilities you can open.</desc>'
            + defs + body + '</svg>')


def infra_hero(site) -> str:
    b = site.base
    marks = ''.join(f'<button type="button" class="infra-mark" data-i="{i}" data-x="{x / W * 100:.2f}" data-y="{y / H * 100:.2f}" aria-label="Vulnerability {i + 1} of {len(FINDINGS)}: {E(t)} ({E(bld)})"><i></i></button>'
                    for i, (fid, bld, x, y, t, ref, atk, fix, url, lab, note) in enumerate(FINDINGS))
    cards = ''.join(f'<article class="infra-card" data-i="{i}" hidden><p class="label"><span>[{i + 1:02d}]</span> {E(bld)} · {E(ref)}</p><h3>{E(t)}</h3>'
                    f'<dl><dt>How it is abused</dt><dd>{E(atk)}</dd><dt>The fix</dt><dd>{E(fix)}</dd></dl>'
                    f'<p class="infra-go"><a class="button primary" href="{E(b + url)}">Practice it: {E(lab)}</a></p></article>'
                    for i, (fid, bld, x, y, t, ref, atk, fix, url, lab, note) in enumerate(FINDINGS))
    return ('<div class="infra" id="infra"><div class="infra-art">' + drawing() + marks + '</div>'
            f'<aside class="infra-panel" aria-live="polite"><div class="infra-head label"><span id="infra-found">0 of {len(FINDINGS)} found</span>'
            '<span class="infra-nav"><button type="button" id="infra-prev" aria-label="Previous vulnerability">←</button><button type="button" id="infra-next" aria-label="Next vulnerability">Next →</button></span></div>'
            '<div class="infra-empty" id="infra-empty"><h3>Find the weak spots</h3><p>This campus has nine vulnerabilities. Click a red marker, or press Next to walk through them.</p></div>'
            + cards + '</aside></div>')
