"""About page (/about/), laid out like an architecture studio's about page: a spec sheet, a statement
hero, the story, the team, the open data the site stands on, a call to action and the fine print."""
from __future__ import annotations

import html

from .common import ROOT, read_json
from .drawings import _person
from .infra import drawing

E = html.escape

SPEC = [('Type', 'Free cybersecurity learning site'), ('Founded', '2026'), ('Focus', 'Hands-on security skills'),
        ('Location', 'San Bernardino, California'), ('Built by', 'Students'), ('Cost', '$0, no account required')]
MISSION = ['Make hands-on security practice free for every student.', 'Teach the skills employers test for, not trivia.',
           'Keep it private: no tracking, and no account needed.', 'Stay open: open-source code, open data, open to contributions.']
STACK = ['CISA KEV', 'NIST NVD', 'FIRST EPSS', 'USGS', 'Natural Earth', 'OpenStreetMap', 'MITRE ATT&CK', 'Supabase', 'GitHub Pages', 'IBM Plex']


def _words(text: str) -> str:
    return ''.join(f'<span class="w" aria-hidden="true"><span>{E(w)}</span></span> ' for w in text.split())


def _figure(i: int) -> str:
    """Small section-drawing vignette per role: podium, desk and monitor, phone in hand, open door."""
    G = 104
    scene = [
        f'<path d="M96 {G}V70h44v{G - 70}M90 70h56M104 62h28"/><path class="tm-thin" d="M118 70V{G}"/>',             # podium
        f'<path d="M86 {G}V78h66v{G - 78}M86 78h66"/><rect x="104" y="48" width="38" height="26"/><path d="M123 74v4"/><path class="tm-thin" d="M108 54h22M108 60h28M108 66h16"/>',  # desk
        f'<rect x="84" y="56" width="11" height="19" rx="2"/><path class="tm-thin" d="M87 60h5M87 64h5"/><path d="M120 {G}V46h34v{G - 46}"/><path class="tm-thin" d="M126 54h22M126 62h22M126 70h22"/>',  # phone + board
        f'<path d="M110 {G}V30h40v{G - 30}"/><path d="M110 30L132 38V{G + 4}L110 {G}"/><circle cx="127" cy="70" r="1.6"/>',  # open door
    ][i % 4]
    stip = ''.join(f'<circle cx="{(k * 37) % 170 + 4}" cy="{G + 4 + (k * 13) % 12}" r=".7"/>' for k in range(22))
    return (f'<svg class="tm-fig" viewBox="0 0 180 130" aria-hidden="true"><rect class="tm-bg" x="0" y="0" width="180" height="130"/>'
            f'<g class="tm-ink"><path d="M10 {G}H170"/>{scene}{_person(64, G, 1.45, i % 2 == 1)}</g><g class="tm-dots">{stip}</g>'
            f'<g class="tm-red"><circle cx="64" cy="{G - 30}" r="30"/><path d="M86 {G - 52}l20 -16h40"/><text x="108" y="{G - 72}">[{i + 1:02d}]</text></g></svg>')


def about_page(site) -> str:
    b = site.base
    team = read_json(ROOT / 'data/team.json')['team']
    s = '<div class="ab">'
    s += ('<section class="ab-spec"><p class="label ab-boot">Welcome to CyberHub.</p><dl>' + ''.join(
        f'<div class="ab-row"><dt>{E(k)}:</dt><dd>{E(v)}</dd></div>' for k, v in SPEC) + '</dl></section>')
    s += ('<section class="ab-hero"><p class="label">Tired of watching instead of doing?</p>'
          f'<h1 class="ab-h1 wr">{_words("We are students building the security lab we always wanted.")}</h1>'
          '<div class="ab-intro"><p>Most security courses are videos and slides. The skills that get people hired are hands-on: reading a packet capture, triaging an alert, locking down a building. '
          'CyberHub puts that practice in your browser, free, with no account required.</p><p class="label ab-fix">So we built it</p></div>'
          f'<figure class="ab-art clip">{drawing()}</figure></section>')
    s += ('<section class="ab-story"><div class="ab-side"><p class="label">Our story</p><h2 class="wr">' + _words('Why CyberHub?') + '</h2></div><div class="ab-body">'
          '<p>The first question people learning security ask is always the same: where do I practice? Paid platforms cost money, free ones assume you already know Linux, and real networks are off limits.</p>'
          '<p>So the labs run entirely in the browser on synthetic evidence: a practice shell, a packet viewer, a SIEM-style log search, a SOC queue, a building to lock down, maps and real vulnerability data. '
          'Every lab teaches one skill, checks your answer and explains why it matters on the job.</p>'
          '<p>The code is open source and the data is open: CISA, NIST, FIRST and USGS. That keeps CyberHub free to run, free to use and easy to check.</p>'
          '<ul class="ab-mission">' + ''.join(f'<li><span>[{i + 1:02d}]</span>{E(m)}</li>' for i, m in enumerate(MISSION)) + '</ul></div></section>')
    s += ('<section class="ab-team"><div class="ab-side"><p class="label">Our team</p><h2 class="wr">' + _words('Built by students, powered by open source.') + '</h2></div><div class="ab-grid">')
    for i, t in enumerate(team):
        who = t.get('name') or t['role']
        link = f'<a class="ab-join" href="{E(b)}/contribute/">How to contribute</a>' if t['role'] == 'You' else ''
        s += (f'<article class="ab-card clip">{_figure(i)}<h3>{E(who)}</h3><p class="label">{E(t.get("title", ""))}</p><p>{E(t["bio"])}</p>{link}</article>')
    s += '</div></section>'
    loop = ''.join(f'<span>{E(x)}</span>' for x in STACK)
    s += (f'<section class="ab-stack"><p class="label">Built on open data and open tools</p><div class="ab-marquee" aria-label="{E(", ".join(STACK))}">'
          f'<div class="ab-track" aria-hidden="true">{loop}{loop}</div></div></section>')
    s += ('<section class="ab-cta"><h2 class="wr">' + _words('See what CyberHub can do for your career.') + '</h2>'
          '<p>Start with Cyber 101, pick a path, and finish your first lab today.</p>'
          f'<div class="ab-go"><a class="button primary" href="{E(b)}/start/">Start here</a><a class="button" href="{E(b)}/labs/">Browse the labs</a></div></section>')
    s += ('<section class="ab-fine"><p class="label">The fine print</p><div class="ab-fine-grid">'
          '<article><h3>Privacy</h3><p>No analytics or advertising scripts. Progress is stored in your browser, so everything works without an account. Accounts are optional and for people 13 or older: '
          'if you sign in, only your email address and your CyberHub progress are stored with our database provider (Supabase) so progress can sync between devices. '
          'Resumes and anything you type into the resume tool are never uploaded. You can download, import or delete your progress, and delete your account, on the '
          f'<a href="{E(b)}/account/">Account page</a>. The hosting provider may record ordinary access logs; external links follow those sites’ policies.</p></article>'
          '<article><h3>Accessibility</h3><p>Core content is server-rendered and readable without JavaScript. Keyboard navigation, skip links, labeled controls and visible focus are built in, '
          'light and dark themes follow your system setting, and motion switches off when your system asks for reduced motion. Automated checks are limited; screen-reader and user testing still matter.</p></article>'
          '<article><h3>Independence</h3><p>Certification names identify study topics. CyberHub is not affiliated with certification providers and does not reproduce exam questions. '
          'CyberHub is an independent student project and is not affiliated with any university or club.</p></article></div></section>')
    return s + '</div>'


def build_about(site) -> None:
    site.page('/about/', 'About CyberHub', about_page(site), 'About CyberHub: a free, hands-on cybersecurity learning site built by students, plus privacy and accessibility.', '')
