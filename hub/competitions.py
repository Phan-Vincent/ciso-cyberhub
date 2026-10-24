"""Competitions page (/careers/competitions/): what each major student cyber competition is,
when it runs, team rules, how to prepare with CyberHub, and how to form a team through CISO.
Dates come from the organisers' own sites (checked 2026-10-24); the page marks each event as
upcoming or past at build time, so the nightly rebuild keeps it current.
"""
from __future__ import annotations

from datetime import date
from html import escape as E

from .guides import _sources

CHECKED = '24 October 2026'

# Dated events this season (start, end, competition id, label)
EVENTS = [
    (date(2026, 10, 23), date(2026, 10, 25), 'ncl', 'NCL Fall: Individual Game'),
    (date(2026, 11, 6), date(2026, 11, 8), 'ncl', 'NCL Fall: Team Game'),
    (date(2026, 11, 13), date(2026, 11, 14), 'cyberforce', 'CyberForce Competition, Tinley Park, Illinois'),
    (date(2026, 12, 11), date(2026, 12, 11), 'ncl', 'NCL Gymnasium closes for the fall'),
]
# Recurring windows without confirmed dates yet: month label, competition id, label
WINDOWS = [
    ('January', 'cptc', 'CPTC Global Finals (Rochester, NY), for teams that win a regional'),
    ('Winter', 'ccdc', 'WRCCDC invitationals and online qualifier (2025 qualifier: 8 February)'),
    ('Jan – Apr', 'ncl', 'NCL Spring season (check the NCL site for dates)'),
    ('March', 'pico', 'picoCTF (2026 ran 9–19 March; the 2027 dates are not out yet)'),
    ('Spring', 'ccdc', 'WRCCDC regional (2025: 28–30 March), then the national championship in San Antonio'),
    ('Next fall', 'cptc', 'CPTC online qualifier (from September) and regionals (2025: SoCal 1–2 Nov, West 8–9 Nov)'),
]

COMPS = [
    {'id': 'ncl', 'name': 'National Cyber League (NCL)', 'kind': 'Capture the flag · individual and team', 'level': 'Beginner to advanced', 'fit': 'Your first competition',
     'what': 'An online season of puzzle-style challenges across ten areas: open-source intelligence, cryptography, password cracking, log analysis, network traffic, forensics, scanning, web and enumeration and exploitation. You get a personal Scouting Report that ranks you nationally, which you can share with employers.',
     'team': 'Individual Game alone; Team Game with classmates from your school.', 'cost': '$45 per season ($55 late); many colleges sponsor students.',
     'when': 'Two seasons a year. Fall 2026: practice game 12–18 Oct, Individual Game 23–25 Oct, Team Game 6–8 Nov. A spring season runs in the new year.',
     'prep': ['Week 1: Linux Lab modules 1–6 (files, grep, pipes).', 'Week 2: Networking Lab and the packet-analysis lab (Wireshark).', 'Week 3: Flashcards for cryptography and the password-cracking basics; hashing on Bench 01.', 'Week 4: Old challenges in the NCL Gymnasium and picoGym; write down what you learned from each.'],
     'links': [('Linux Lab', '/linux/'), ('Networking Lab', '/linux/network/'), ('Packet analysis lab', '/labs/packet-analysis/')], 'url': 'https://nationalcyberleague.org/'},
    {'id': 'ccdc', 'name': 'Collegiate Cyber Defense Competition (CCDC)', 'kind': 'Blue team defence · team', 'level': 'Intermediate', 'fit': 'Future SOC analysts and sysadmins',
     'what': 'Your team inherits a small company\'s network, full of misconfigurations, and must keep its services running while professional red teamers attack it. At the same time, "injects" arrive: business tasks such as writing a policy, adding users or deploying logging. Scoring is roughly half services up and half inject quality. California schools compete in the Western Regional (WRCCDC); regional winners go to the national championship near San Antonio.',
     'team': 'Up to 8 competitors per event (no more than 2 graduate students) from a roster of up to 12, plus a faculty or staff coach. Competitors must be full-time students at a US institution.', 'cost': 'Set by the region; ask the WRCCDC director. Travel to in-person rounds is usually funded by the school.',
     'when': 'Invitationals in the fall and winter, a qualifier around February, the regional in spring and nationals after that. In 2025 the WRCCDC qualifier was 8 February and the regional 28–30 March; UC Irvine won both the Western regional and the 2025 national title.',
     'prep': ['Split roles: Linux, Windows/Active Directory, firewall/network, injects/communications, captain.', 'Practise first-15-minutes checklists: change passwords, list users, find listening ports, take backups.', 'Run the Linux hardening, Windows event logs and incident response labs as a team.', 'Write injects under time pressure: a one-page policy in 30 minutes.'],
     'links': [('Linux hardening lab', '/labs/linux-hardening/'), ('Windows event logs lab', '/labs/windows-events/'), ('Incident response lab', '/labs/incident-response/'), ('Networking Lab: ports', '/linux/network/ports/')], 'url': 'https://www.nationalccdc.org/'},
    {'id': 'cptc', 'name': 'Collegiate Penetration Testing Competition (CPTC)', 'kind': 'Offensive security · team', 'level': 'Intermediate to advanced', 'fit': 'Future penetration testers and consultants',
     'what': 'Your team acts as a security consulting firm hired by a fictional company. You test its network and applications, then write a professional report and brief the "client". Teams are scored on findings and on professionalism and communication, the way real consulting work is judged.',
     'team': '3 to 6 competitors plus up to 2 alternates, and 1 to 2 coaches (at least one travels with the team).', 'cost': 'Check the current season\'s rules; travel to regionals and finals is usually funded by the school.',
     'when': 'An online qualifier (a vendor security assessment) opens in September, regionals run in October and November, and the Global Finals are in January at Rochester Institute of Technology.',
     'prep': ['Learn the method: scoping, reconnaissance, exploitation, reporting.', 'Practise Nmap, OWASP ZAP and the web basics; know the OWASP Top 10.', 'Write a sample finding: title, severity, evidence, business impact and fix.', 'Practise a 10-minute executive briefing with no jargon.'],
     'links': [('Nmap tutorial', '/tutorials/nmap/'), ('OWASP ZAP tutorial', '/tutorials/zap/'), ('Vulnerability feed', '/vulnerabilities/')], 'url': 'https://cp.tc/'},
    {'id': 'cyberforce', 'name': 'DOE CyberForce Competition', 'kind': 'Blue team defence of energy systems · team', 'level': 'Beginner to intermediate', 'fit': 'Anyone curious about OT and the power grid',
     'what': 'Run by the US Department of Energy with Argonne National Laboratory. Teams defend simulated energy infrastructure, including virtual cyber-physical devices, against a red team while keeping it usable for end users. Low-cost, creative defences score well. The 2026 scenario focuses on electricity and critical defense facilities.',
     'team': 'College teams; check the official rules for team size and eligibility.', 'cost': 'See the official page.',
     'when': '2026: 13–14 November, in person only, at the Tinley Park Convention Center near Chicago.',
     'prep': ['Read the operational technology guide on CyberHub.', 'Learn the Purdue model and why OT puts safety and availability first.', 'Harden a Linux box and practise segmentation thinking.', 'Prepare a plan for handling end-user requests while under attack.'],
     'links': [('What you will defend: OT', '/defend/operational-technology/'), ('Linux hardening lab', '/labs/linux-hardening/'), ('Networking Lab', '/linux/network/')], 'url': 'https://cyberforce.energy.gov/cyberforce-competition/'},
    {'id': 'pico', 'name': 'picoCTF', 'kind': 'Capture the flag · solo or team', 'level': 'Beginner', 'fit': 'Absolute beginners; your first flag',
     'what': 'A free CTF from Carnegie Mellon University with challenges in web, cryptography, forensics, reverse engineering and binary exploitation. Prizes are limited to certain student groups, but anyone can play for fun. The picoGym keeps hundreds of past challenges open all year.',
     'team': 'Alone or in a team of up to 5.', 'cost': 'Free.',
     'when': 'Each spring, over about ten days (2026: 9–19 March). picoGym is open year-round.',
     'prep': ['Do the Linux Lab first; most beginner challenges start with the command line.', 'Learn to read Python scripts and decode Base64 and hex.', 'Solve 10 picoGym challenges across categories before the event.'],
     'links': [('Linux Lab', '/linux/'), ('CyberHub Daily', '/daily/'), ('Flashcards', '/academy/flashcards/')], 'url': 'https://picoctf.org/'},
    {'id': 'nine12', 'name': 'Cyber 9/12 Strategy Challenge', 'kind': 'Cyber policy · team', 'level': 'Any major', 'fit': 'Political science, law, business and criminal justice students',
     'what': 'Run by the Atlantic Council. Teams receive a fictional cyber crisis through a series of intelligence reports and must recommend what governments should do: a one-page written brief, then 10-minute oral briefings to a panel of judges, with the scenario changing between rounds. No hacking; it rewards clear thinking and communication.',
     'team': 'Four students and a faculty coach.', 'cost': 'No registration fee is listed; travel is not covered.',
     'when': 'Several events a year in the US and abroad; check the Atlantic Council for the current calendar.',
     'prep': ['Read the Cyber history page for real crises and how governments responded.', 'Practise one-page briefs: situation, options, recommendation, risks.', 'Rehearse answering judges\' questions without slides.'],
     'links': [('Cyber history', '/history/'), ('Intelligence desk', '/intelligence/')], 'url': 'https://www.atlanticcouncil.org/programs/scowcroft-center-for-strategy-and-security/cyber-statecraft-initiative/cyber-912/'},
]

SOURCES = [
    ('National Cyber League: Fall 2026 dates (May 2026 newsletter)', 'https://nationalcyberleague.org/36c78798f2f680f7b7d3c3f48108ace1', CHECKED),
    ('National CCDC: regional competitions', 'https://nationalccdc.org/index.php/competition/regionals', CHECKED),
    ('Collegiate Cyber Defense Competition (team rules and format summary)', 'https://en.wikipedia.org/wiki/Collegiate_Cyber_Defense_Competition', CHECKED),
    ('UCI News: UCI advances to nationals after regionals win', 'https://ics.uci.edu/?p=10053', '2025'),
    ('CPTC overview', 'https://cp.tc/overview', CHECKED),
    ('DOE CyberForce: 2026 competition', 'https://cyberforce.energy.gov/events/2026-11-13/', CHECKED),
    ('picoCTF 2026', 'https://picoctf.org/competitions/2026-spring.html', CHECKED),
    ('Atlantic Council: Cyber 9/12 FAQ', 'https://www.atlanticcouncil.org/resources/cyber-9-12-student-challenge-frequently-asked-questions/', CHECKED),
]


def _fmt(a: date, b: date) -> str:
    if a == b:
        return f'{a.day} {a:%b %Y}'
    if a.month == b.month:
        return f'{a.day}–{b.day} {a:%b %Y}'
    return f'{a.day} {a:%b} – {b.day} {b:%b %Y}'


def competitions_page(site, today: date | None = None) -> str:
    today = today or date.today()
    a = site.a
    names = {c['id']: c['name'] for c in COMPS}
    body = site.heading('Competitions', 'Competitions are the fastest way to get hands-on experience you can put on a resume, and the fastest way to make friends in the field. Here is what each one is, when it runs and how to prepare.', 'Careers / Competitions')
    body += f'<p class="guide-meta label"><span class="dot" aria-hidden="true"></span>Dates checked {CHECKED} from each organiser. Always confirm on the official site before you register.</p>'

    # season timeline
    body += '<section class="cx-season"><h2>This season</h2><ol class="cx-timeline">'
    for start, end, cid, label in EVENTS:
        state = 'past' if end < today else 'now' if start <= today <= end else 'next'
        tag = {'past': 'Done', 'now': 'Happening now', 'next': 'Upcoming'}[state]
        body += (f'<li class="cx-ev cx-{state}"><span class="cx-date label">{E(_fmt(start, end))}</span><div><strong>{E(label)}</strong>'
                 f'<a class="cx-jump" href="#{cid}">{E(names[cid])}</a></div><span class="cx-tag label">{tag}</span></li>')
    body += '<li class="cx-sub label">Later in the school year · exact dates announced by each organiser</li>'
    for when, cid, label in WINDOWS:
        body += f'<li class="cx-ev cx-window"><span class="cx-date label">{E(when)}</span><div><strong>{E(label)}</strong><a class="cx-jump" href="#{cid}">{E(names[cid])}</a></div><span class="cx-tag label">Every year</span></li>'
    body += '</ol></section>'

    # chooser
    body += '<section class="cx-pick"><h2>Which one is for you?</h2><div class="flags">'
    for c in COMPS:
        body += f'<a class="flag cx-fit" href="#{c["id"]}"><span class="label">{E(c["fit"])}</span><b>{E(c["name"])}</b><p>{E(c["kind"])} · {E(c["level"])}</p></a>'
    body += '</div></section>'

    # each competition
    for i, c in enumerate(COMPS):
        prep = ''.join(f'<li>{E(p)}</li>' for p in c['prep'])
        links = ''.join(a(f'{t} →', u, 'button') for t, u in c['links'])
        body += (f'<section class="cx-comp" id="{c["id"]}"><p class="label">{i + 1:02d} / {E(c["kind"])}</p><h2>{E(c["name"])}</h2><p>{E(c["what"])}</p>'
                 f'<dl class="cx-facts"><div><dt>Team</dt><dd>{E(c["team"])}</dd></div><div><dt>Cost</dt><dd>{E(c["cost"])}</dd></div><div><dt>When</dt><dd>{E(c["when"])}</dd></div><div><dt>Level</dt><dd>{E(c["level"])}</dd></div></dl>'
                 f'<h3>How to prepare</h3><ol class="steps">{prep}</ol><div class="df-links">{links}<a class="button primary" href="{E(c["url"])}" rel="noopener">Official site ↗</a></div></section>')

    # join through CISO
    body += ('<section class="cx-join"><h2>Compete with CISO</h2><p>Most team competitions need students from the same school and a faculty coach. CISO is where CSUSB students find teammates, practise together and organise registration.</p>'
             '<ol class="steps"><li><b>Come to a CISO meeting</b> and say which competition you want to try. Beginners are welcome; NCL and picoCTF are built for first-timers.</li>'
             '<li><b>Pick a role early.</b> Linux, Windows, networking, web, reporting or communications. Teams win by covering every role, not by having one expert.</li>'
             '<li><b>Practise weekly</b> with the CyberHub labs and past challenges, and keep a shared notes file of commands and fixes.</li>'
             '<li><b>Put it on your resume.</b> Your NCL Scouting Report, CCDC or CPTC placement and team role are real experience. '
             + a('Add it with the resume tailor →', '/careers/resume/') + '</li></ol>'
             f'<p><a class="button primary" href="https://www.ciso-csusb.org/" rel="noopener">CISO club site ↗</a> {a("Internships near CSUSB →", "/careers/internships/", "button")}</p></section>')
    body += _sources(SOURCES)
    return body


def build_competitions(site) -> None:
    site.page('/careers/competitions/', 'Cyber competitions', competitions_page(site),
              'NCL, CCDC, CPTC, CyberForce, picoCTF and Cyber 9/12: what each competition is, this season\'s dates, team rules and how to prepare.', 'Careers')
