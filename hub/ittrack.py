"""IT track: landing page (/it/) and IT flashcards (/it/flashcards/) for Network+ and A+ topics."""
from __future__ import annotations

import json

from .common import ROOT, read_json


def flashcards_page(site, data) -> str:
    n = len(data['cards'])
    body = site.heading('IT flashcards', f'{n} cards on networking and IT support, the topics behind CompTIA Network+ and A+. Flip, then say whether you knew it: cards you miss come back sooner.', 'IT track / Flashcards')
    body += ('<div class="itcards" id="itcards"><div class="ic-decks" role="group" aria-label="Deck"><button type="button" data-deck="all" aria-pressed="true">All</button>'
             + ''.join(f'<button type="button" data-deck="{k}" aria-pressed="false">{v}</button>' for k, v in data['decks'].items())
             + '</div><div class="ic-progress"><span class="label" id="ic-stats" aria-live="polite"></span><span class="ic-bar" aria-hidden="true"><i id="ic-bar"></i></span></div>'
             '<div class="ic-card"><p class="label" id="ic-topic"></p><button type="button" class="ic-face" id="ic-face" aria-pressed="false" aria-describedby="ic-side">Loading cards…</button><p class="label" id="ic-side"></p>'
             '<div class="rt-actions" id="ic-grade" hidden><button type="button" id="ic-again">Review again <kbd>1</kbd></button><button type="button" class="primary" id="ic-knew">I knew it <kbd>2</kbd></button></div></div>'
             '<p><button type="button" id="ic-shuffle">Shuffle</button> <button type="button" id="ic-reset">Reset progress</button></p>'
             '<p class="muted">Card topics follow the public CompTIA exam objectives; the wording is original to CyberHub and not affiliated with CompTIA. Progress stays in this browser.</p></div>')
    return body


def track_page(site) -> str:
    a = site.a
    body = site.heading('IT track', 'The foundation every security job sits on: networking, Windows, Linux and IT support. Most people in cyber start in IT, and these skills get you hired there first.', 'Learn / IT track')
    steps = [('01', 'Networking Lab', 'IP addresses, routes, DNS, ports and subnetting on a simulated network.', '/linux/network/'),
             ('02', 'PowerShell Lab', 'Investigate a Windows PC: processes, services, accounts and event logs.', '/linux/powershell/'),
             ('03', 'Linux Lab', '36 levels of the Linux command line, framed as security work.', '/linux/'),
             ('04', 'IT flashcards', 'Network+ and A+ topics with spaced repetition.', '/it/flashcards/'),
             ('05', 'Cyber Duel: IT topics', 'Pick "Networking (Network+)" or "IT support (A+)" as the topic.', '/duel/'),
             ('06', 'Plan your weeks', 'Turn a goal and a few hours a week into a schedule.', '/plan/')]
    body += '<ol class="it-steps">' + ''.join(f'<li><a href="{site.base}{u}"><span class="label">{i}</span><strong>{t}</strong><span>{d}</span></a></li>' for i, t, d, u in steps) + '</ol>'
    body += ('<section><h2>Jobs this track leads to</h2><div class="flags">'
             '<div class="flag"><b>Help desk / IT support</b><p>The most common first job in tech. Troubleshooting, accounts, devices and tickets. CompTIA A+ is the usual first certification.</p></div>'
             '<div class="flag"><b>Network technician</b><p>Cabling, switches, Wi-Fi and connectivity problems. Network+ is the usual next step.</p></div>'
             '<div class="flag"><b>Systems administrator</b><p>Runs servers, identities and backups, Windows and Linux. A common stepping stone to security engineering.</p></div></div>'
             f'<p>{a("See all work roles →", "/careers/roles/", "button")} {a("Internships near CSUSB →", "/careers/internships/", "button")}</p></section>')
    return body


def build_ittrack(site) -> None:
    data = read_json(ROOT / 'data/it_cards.json')
    (site.out / 'assets/it_cards.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
    site.page('/it/', 'IT track', track_page(site), 'Networking, Windows, Linux and IT support: the labs, flashcards and plan that lead to help desk, network and sysadmin jobs.', 'Learn')
    site.page('/it/flashcards/', 'IT flashcards', flashcards_page(site, data), 'Flashcards for networking and IT support topics (Network+ and A+) with spaced repetition.', 'Learn', module='cards')
