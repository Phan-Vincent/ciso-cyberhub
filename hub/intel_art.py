"""Generated artwork for the latest intelligence headline.

Each build reads the newest headline, picks a motif that matches what the report is about
(web vulnerability, ransomware, phishing, network edge, cloud, supply chain, patch release,
data breach, AI, or a general vulnerability) and draws it as inline SVG. Nothing is fetched:
the art is built from the headline text, so it changes whenever the feed does and stays
inside the site's strict Content Security Policy (no style attributes, no external files).
"""
from __future__ import annotations

import hashlib
import re
from html import escape as E

BLUE, HI, INK, PAPER, MUTED = '#0068bc', '#3b93ff', '#050505', '#edeff2', '#8d929c'

# (motif, label, keywords). First match wins, so specific motifs come before general ones.
TOPICS = [
    ('ransom', 'Ransomware', ['ransom', 'extortion', 'encryptor', 'lockbit', 'akira', 'blackcat']),
    ('phish', 'Phishing', ['phish', 'smish', 'lure', 'credential harvest', 'email', 'business email']),
    ('supply', 'Supply chain', ['supply chain', 'npm', 'pypi', 'package', 'dependency', 'github', 'malicious extension']),
    ('ai', 'AI systems', [' ai ', 'ai-', 'llm', 'model', 'prompt injection', 'chatbot', 'agentic']),
    ('cloud', 'Cloud', ['cloud', 'aws', 'azure', 'gcp', 'kubernetes', 'container', 'docker', 's3 bucket']),
    ('web', 'Web application', ['php', 'wordpress', 'plugin', 'apache', 'nginx', 'web', 'sql injection', 'xss', 'cms', 'drupal', 'joomla', 'tomcat']),
    ('edge', 'Network edge', ['router', 'firewall', 'vpn', 'fortinet', 'fortigate', 'cisco', 'ivanti', 'citrix', 'palo alto', 'gateway', 'ddos', 'botnet', 'dns']),
    ('patch', 'Patch release', ['patch', 'update', 'tuesday', 'advisory', 'fixes', 'security release']),
    ('breach', 'Data breach', ['breach', 'leak', 'exposed', 'stolen data', 'records', 'compromised accounts']),
]


def classify(title: str) -> tuple[str, str]:
    t = f' {title.lower()} '
    for motif, label, words in TOPICS:
        if any(w in t for w in words):
            return motif, label
    return 'vuln', 'Vulnerability'


def _rng(seed: str):
    state = int(hashlib.sha256(seed.encode('utf-8')).hexdigest()[:12], 16) or 1
    def nxt() -> float:
        nonlocal state
        state = (state * 16807) % 2147483647
        return state / 2147483647
    return nxt


def _text(x, y, s, size=11, fill=MUTED, anchor='start', weight=400, family='Martian Mono, monospace'):
    return (f'<text x="{x:.1f}" y="{y:.1f}" font-family="{family}" font-size="{size}" font-weight="{weight}" '
            f'fill="{fill}" text-anchor="{anchor}" letter-spacing=".6">{E(s)}</text>')


def _code_lines(r, x, y, w, rows, gap=16, hot=None):
    out = []
    for i in range(rows):
        indent = (i % 3) * 14
        ln = w * (0.35 + r() * 0.55) - indent
        col = HI if i == hot else 'rgba(255,255,255,.28)'
        out.append(f'<rect x="{x + indent:.1f}" y="{y + i * gap:.1f}" width="{ln:.1f}" height="5" rx="2.5" fill="{col}"/>')
    return ''.join(out)


def _motif(kind: str, r) -> str:
    cx, cy = 240, 172
    if kind == 'web':  # browser window, code, a crack through the request path
        return (f'<rect x="96" y="70" width="288" height="200" rx="14" fill="#0c0d10" stroke="rgba(255,255,255,.35)"/>'
                f'<line x1="96" y1="98" x2="384" y2="98" stroke="rgba(255,255,255,.2)"/>'
                + ''.join(f'<circle cx="{114 + i * 14}" cy="84" r="4" fill="{"rgba(255,255,255,.35)" if i else HI}"/>' for i in range(3))
                + f'<rect x="160" y="78" width="200" height="12" rx="6" fill="rgba(255,255,255,.08)"/>'
                + _code_lines(r, 118, 116, 240, 8, hot=4)
                + f'<path d="M300 98 L284 150 L304 168 L278 222 L296 238 L282 270" fill="none" stroke="{HI}" stroke-width="3" stroke-linejoin="round"/>'
                + _text(118, 260, '<?php  eval($_GET[...])', 10, HI))
    if kind == 'ransom':  # files locked in a grid, one padlock-free key mark
        cells = ''.join(f'<rect x="{110 + (i % 5) * 54}" y="{78 + (i // 5) * 64}" width="40" height="50" rx="6" fill="{BLUE if r() > .62 else "#0c0d10"}" stroke="rgba(255,255,255,.35)"/>' for i in range(15))
        return cells + f'<rect x="196" y="140" width="88" height="66" rx="10" fill="{INK}" stroke="{HI}" stroke-width="2"/><path d="M216 140 v-18 a24 24 0 0 1 48 0 v18" fill="none" stroke="{HI}" stroke-width="3"/><circle cx="240" cy="170" r="7" fill="{HI}"/>'
    if kind == 'phish':  # envelope with a hook through the link
        return (f'<rect x="120" y="96" width="240" height="152" rx="12" fill="#0c0d10" stroke="rgba(255,255,255,.4)"/>'
                f'<path d="M120 104 L240 186 L360 104" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="1.5"/>'
                f'<rect x="168" y="208" width="144" height="16" rx="8" fill="{BLUE}"/>'
                + _text(240, 220, 'VERIFY ACCOUNT', 9, '#fff', 'middle')
                + f'<path d="M318 40 V150 a26 26 0 1 1 -52 0 v-10" fill="none" stroke="{HI}" stroke-width="3" stroke-linecap="round"/><path d="M266 140 l-8 14 h16 z" fill="{HI}"/>')
    if kind == 'edge':  # perimeter device between internet and network
        nodes = [(110 + r() * 40, 90 + i * 46) for i in range(4)] + [(330 + r() * 40, 90 + i * 46) for i in range(4)]
        lines = ''.join(f'<line x1="{x:.0f}" y1="{y:.0f}" x2="{cx}" y2="{cy}" stroke="{HI if i in (1, 6) else "rgba(255,255,255,.22)"}" stroke-width="{2 if i in (1, 6) else 1}"/>' for i, (x, y) in enumerate(nodes))
        dots = ''.join(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="6" fill="{INK}" stroke="rgba(255,255,255,.6)"/>' for x, y in nodes)
        return (lines + dots + f'<rect x="196" y="140" width="88" height="64" rx="10" fill="{BLUE}" stroke="#fff"/>'
                + ''.join(f'<circle cx="{212 + i * 14}" cy="190" r="3" fill="{"#fff" if i != 2 else INK}"/>' for i in range(5))
                + _text(240, 166, 'EDGE', 12, '#fff', 'middle', 700, 'Archivo, sans-serif'))
    if kind == 'cloud':
        return (f'<path d="M150 210 a44 44 0 0 1 10 -86 a62 62 0 0 1 118 -14 a46 46 0 0 1 52 100 z" fill="#0c0d10" stroke="rgba(255,255,255,.45)" stroke-width="1.5"/>'
                + ''.join(f'<rect x="{186 + i * 38}" y="150" width="28" height="28" rx="5" fill="{BLUE if i == 1 else "none"}" stroke="{HI}"/>' for i in range(3))
                + f'<path d="M248 178 v58" stroke="{HI}" stroke-width="2" stroke-dasharray="4 5"/><circle cx="248" cy="244" r="6" fill="{HI}"/>')
    if kind == 'supply':  # dependency tree with one poisoned node
        pts = [(240, 74), (160, 140), (320, 140), (110, 214), (200, 214), (280, 214), (370, 214)]
        edges = [(0, 1), (0, 2), (1, 3), (1, 4), (2, 5), (2, 6)]
        bad = 4
        return (''.join(f'<line x1="{pts[a][0]}" y1="{pts[a][1]}" x2="{pts[b][0]}" y2="{pts[b][1]}" stroke="{HI if b == bad or a == 1 and b == bad else "rgba(255,255,255,.3)"}" stroke-width="1.5"/>' for a, b in edges)
                + ''.join(f'<rect x="{x - 30}" y="{y - 16}" width="60" height="32" rx="8" fill="{BLUE if i == bad else "#0c0d10"}" stroke="{"#fff" if i == bad else "rgba(255,255,255,.45)"}"/>' for i, (x, y) in enumerate(pts))
                + _text(240, 260, 'pkg@latest  → install script', 10, HI, 'middle'))
    if kind == 'patch':  # update bar with a bandage over a code block
        return (f'<rect x="110" y="86" width="260" height="150" rx="12" fill="#0c0d10" stroke="rgba(255,255,255,.35)"/>' + _code_lines(r, 130, 108, 220, 6)
                + f'<g transform="rotate(-18 240 160)"><rect x="170" y="142" width="140" height="36" rx="18" fill="{BLUE}" stroke="#fff"/>'
                + ''.join(f'<circle cx="{224 + (i % 3) * 16}" cy="{152 + (i // 3) * 16}" r="2.5" fill="#fff"/>' for i in range(6)) + '</g>'
                + f'<rect x="110" y="252" width="260" height="8" rx="4" fill="rgba(255,255,255,.12)"/><rect x="110" y="252" width="{150 + r() * 90:.0f}" height="8" rx="4" fill="{HI}"/>')
    if kind == 'breach':  # records spilling out of a container
        rows = ''.join(f'<rect x="{150 + r() * 10:.0f}" y="{92 + i * 16}" width="{120 + r() * 60:.0f}" height="8" rx="4" fill="rgba(255,255,255,.3)"/>' for i in range(6))
        spill = ''.join(f'<rect x="{250 + i * 22 + r() * 8:.0f}" y="{196 + (i % 3) * 18 + r() * 6:.0f}" width="16" height="10" rx="3" fill="{HI if i % 2 else BLUE}"/>' for i in range(6))
        return f'<rect x="130" y="76" width="200" height="120" rx="12" fill="#0c0d10" stroke="rgba(255,255,255,.4)"/>{rows}<path d="M330 150 l40 40" stroke="{HI}" stroke-width="2"/>{spill}'
    if kind == 'ai':
        ring = ''.join(f'<circle cx="{cx + 92 * __import__("math").cos(i / 10 * 6.283):.1f}" cy="{cy + 92 * __import__("math").sin(i / 10 * 6.283):.1f}" r="5" fill="{HI if i in (2, 7) else "rgba(255,255,255,.5)"}"/>' for i in range(10))
        return (f'<circle cx="{cx}" cy="{cy}" r="92" fill="none" stroke="rgba(255,255,255,.18)"/>{ring}'
                f'<rect x="196" y="140" width="88" height="64" rx="12" fill="{BLUE}"/>' + _text(cx, 178, 'MODEL', 12, '#fff', 'middle', 700, 'Archivo, sans-serif')
                + f'<path d="M150 260 h180" stroke="{HI}" stroke-width="2" stroke-dasharray="6 6"/>' + _text(cx, 284, 'ignore previous instructions…', 10, HI, 'middle'))
    # general vulnerability: a chip with a crack through it
    pins = ''.join(f'<rect x="{168 + i * 20}" y="78" width="6" height="18" fill="rgba(255,255,255,.4)"/><rect x="{168 + i * 20}" y="248" width="6" height="18" fill="rgba(255,255,255,.4)"/>' for i in range(8))
    return (pins + f'<rect x="150" y="96" width="180" height="152" rx="14" fill="#0c0d10" stroke="rgba(255,255,255,.5)"/>'
            f'<rect x="196" y="140" width="88" height="64" rx="8" fill="{BLUE}"/>'
            f'<path d="M262 96 L246 140 L270 172 L236 204 L252 248" fill="none" stroke="{HI}" stroke-width="3" stroke-linejoin="round"/>')


def intel_art(item: dict) -> str:
    title = item.get('title') or ''
    kind, label = classify(title)
    r = _rng(title)
    cves = re.findall(r'CVE-\d{4}-\d{4,7}', title, flags=re.I)[:2]
    severity = 'CRITICAL' if re.search(r'\bcritical\b', title, re.I) else ('ACTIVELY EXPLOITED' if re.search(r'exploit', title, re.I) else '')
    grid = ''.join(f'<line x1="{x}" y1="0" x2="{x}" y2="340" stroke="rgba(255,255,255,.05)"/>' for x in range(20, 480, 20)) + \
           ''.join(f'<line x1="0" y1="{y}" x2="480" y2="{y}" stroke="rgba(255,255,255,.05)"/>' for y in range(20, 340, 20))
    head = _text(24, 32, f'FIG. / {label.upper()}', 11, HI)
    sev = (f'<rect x="{456 - len(severity) * 8.2 - 16:.0f}" y="18" width="{len(severity) * 8.2 + 16:.0f}" height="22" rx="11" fill="{BLUE}"/>'
           + _text(448, 33, severity, 10, '#fff', 'end')) if severity else ''
    foot = _text(24, 320, '  ·  '.join(c.upper() for c in cves) or (item.get('source') or '').upper(), 10, MUTED)
    alt = f'Illustration for the latest report: {label.lower()}' + (f', {", ".join(c.upper() for c in cves)}' if cves else '')
    return (f'<figure class="intel-art" data-topic="{kind}"><svg viewBox="0 0 480 340" role="img" aria-label="{E(alt)}" xmlns="http://www.w3.org/2000/svg">'
            f'<rect width="480" height="340" rx="18" fill="{INK}"/>{grid}{_motif(kind, r)}{head}{sev}{foot}</svg>'
            f'<figcaption class="label">Generated from the headline / {E(label)}</figcaption></figure>')
