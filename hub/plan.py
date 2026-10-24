"""Study planner (/plan/): turns a goal and hours per week into a week-by-week plan of
CyberHub activities (web/plan.ts). Task lists are built here from real site paths so links
never go stale; assets/plan.json feeds the browser."""
from __future__ import annotations

import json

from .common import ROOT, read_json
from .linux import MODULES as LINUX
from .netlab import MODULES as NET
from .pslab import MODULES as PS


def goals(site) -> dict:
    acad = read_json(ROOT / 'data/academy.json')['objectives']
    lx = [(f'Linux Lab: {t}', f'/linux/{m}/', 40) for m, t, _d, _l in LINUX]
    nt = [(f'Networking Lab: {t}', f'/linux/network/{m}/', 45) for m, t, _d, _l in NET]
    ps = [(f'PowerShell Lab: {t}', f'/linux/powershell/{m}/', 45) for m, t, _d, _l in PS]
    defend = [(f'What you will defend: {t}', f'/defend/{s}/', 25) for s, t in [('infrastructure', 'Infrastructure'), ('operational-technology', 'Operational technology'), ('hardware', 'Hardware'), ('networks', 'Networks'), ('legacy-systems', 'Legacy systems')]]
    sec = []
    for i, o in enumerate(acad):
        sec.append((f'Security+ {o["id"]}: {o["title"]}', f'/academy/{o["lesson"]}/', 35))
        if i % 6 == 5: sec.append(('Flashcards review session', '/academy/flashcards/', 20))
        if i == 13: sec.append(('Readiness check (midpoint)', '/academy/readiness/', 25))
    sec += [('Practice questions', '/academy/practice/', 30), ('Readiness check (final)', '/academy/readiness/', 25), ('Cyber Duel: Security+ topic, Pro level', '/duel/', 15)]
    G = {
        'explore': ('Explore cybersecurity (total beginner)', [('Start here: Cyber 101 lessons', '/start/', 30), ('Protect yourself today checklist', '/start/#safe', 20), ('Cyber Duel on Beginner level', '/duel/', 15),
                     *defend, ('Phishing lab', '/labs/phishing/', 30), ('CyberHub Daily puzzle (do it 3 days in a row)', '/daily/', 15), ('Which role are you?', '/careers/match/', 10),
                     ('Cyber history highlights', '/history/', 30), ('SOC Simulator: first shift', '/labs/soc/', 25), ('Work roles', '/careers/roles/', 20), ('Competitions to try', '/careers/competitions/', 15)]),
        'secplus': ('Pass CompTIA Security+', sec),
        'it': ('IT fundamentals (Network+ and A+ topics)', [*nt, ('IT flashcards: networking deck', '/it/flashcards/', 20), *ps, ('IT flashcards: IT support deck', '/it/flashcards/', 20),
                *lx[:6], ('Cyber Duel: Network+ topic', '/duel/', 15), ('IT flashcards: mixed review', '/it/flashcards/', 20), ('Cyber Duel: A+ topic', '/duel/', 15), ('IT track and job paths', '/it/', 15)]),
        'soc': ('Land a first SOC analyst job', [*lx, ('Windows event logs lab', '/labs/windows-events/', 45), *ps, ('SOC Simulator: shift 1', '/labs/soc/', 25), ('Phishing lab', '/labs/phishing/', 30),
                 ('Detection engineering lab', '/labs/detection-engineering/', 45), ('Incident response lab', '/labs/incident-response/', 45), ('Infrastructure guide and night shift', '/defend/infrastructure/', 30),
                 ('SOC Simulator: score 90+', '/labs/soc/', 25), ('Work roles: SOC analyst path', '/careers/roles/', 15), ('Find internships near CSUSB', '/careers/internships/', 20), ('Tailor your resume and cover letter', '/careers/resume/', 45)]),
        'comp': ('Prepare for a competition (NCL, CCDC)', [('Competitions: pick yours and register', '/careers/competitions/', 20), *lx[:7], *nt[:4], ('Packet analysis lab', '/labs/packet-analysis/', 45),
                  ('Linux hardening lab', '/labs/linux-hardening/', 45), ('Cyber Duel: Cryptography, Pro level', '/duel/', 15), ('Cyber Duel: Web security', '/duel/', 15), ('Incident response lab', '/labs/incident-response/', 45),
                  ('Cyber Duel tournament with your team', '/duel/', 30)]),
        'ai': ('AI security', [('AI and cyber jobs', '/ai/jobs/', 15), ('Secure AI coding cheat sheet', '/ai/vibe-coding/', 40), ('Working with AI: skills and context', '/ai/workflow/', 40),
                ('AI Red Team Lab: levels 1–3', '/ai/red-team/', 30), ('AI Red Team Lab: levels 4–6', '/ai/red-team/', 30), ('Prompt testing guide', '/ai/prompt-testing/', 45), ('Run AI on your own computer', '/ai/local/', 60),
                ('Meta-prompting guide', '/ai/meta-prompting/', 40), ('Cyber Duel: AI security topic', '/duel/', 15), ('Work roles: AI security engineer', '/careers/roles/', 15)]),
    }
    return {k: {'name': n, 'tasks': [{'t': t, 'u': u, 'm': m} for t, u, m in tasks]} for k, (n, tasks) in G.items()}


def plan_page(site) -> str:
    body = site.heading('Study planner', 'Pick a goal and how much time you have. CyberHub builds a week-by-week plan from its labs and lessons, tracks your ticks, and can add it to your calendar.', 'Learn / Study planner')
    body += ('<div class="planner" id="planner"><form class="pl-form" id="pl-form"><label><span class="label">Goal</span><select id="pl-goal"></select></label>'
             '<label><span class="label">Hours per week</span><select id="pl-hours"><option>2</option><option selected>4</option><option>6</option><option>8</option><option>10</option><option>15</option></select></label>'
             '<label><span class="label">Start date</span><input id="pl-start" type="date"></label>'
             '<label><span class="label">Study day and time (for the calendar)</span><span class="pl-when"><select id="pl-day"><option value="1">Monday</option><option value="2">Tuesday</option><option value="3">Wednesday</option><option value="4">Thursday</option><option value="5">Friday</option><option value="6" selected>Saturday</option><option value="0">Sunday</option></select><input id="pl-time" type="time" value="10:00"></span></label>'
             '<p><button type="submit" class="primary">Build my plan</button></p></form>'
             '<section class="pl-out" id="pl-out" hidden aria-live="polite"><div class="pl-head"><h2 id="pl-title"></h2><p class="label" id="pl-sum"></p><span class="ic-bar" aria-hidden="true"><i id="pl-bar"></i></span></div>'
             '<div class="rt-actions"><button type="button" id="pl-ics">Add to my calendar (.ics)</button><button type="button" id="pl-print">Print plan</button><button type="button" id="pl-clear">Start over</button></div>'
             '<ol class="pl-weeks" id="pl-weeks"></ol></section>'
             '<p class="muted">Your plan and ticks are saved only in this browser (and in your account backup if you sign in).</p></div>')
    return body


def build_plan(site) -> None:
    (site.out / 'assets/plan.json').write_text(json.dumps(goals(site), ensure_ascii=False, separators=(',', ':')))
    site.page('/plan/', 'Study planner', plan_page(site), 'Turn a goal and a few hours a week into a week-by-week CyberHub study plan you can add to your calendar.', 'Learn', module='plan')
