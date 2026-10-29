"""Progress and badges (/progress/): reads what this browser has completed across CyberHub
(web/journey.ts) and offers a printable completion card. Nothing is uploaded or stored by
CyberHub; the student types their name only for printing and it is never saved.
"""
from __future__ import annotations

from html import escape as E

# id (must match BADGES in web/journey.ts), title, how to earn, link
BADGES = [
    ('first-flag', 'First flag', 'Complete your first Linux Lab level.', '/linux/'),
    ('shell-analyst', 'Shell analyst', 'Complete 10 Linux Lab levels.', '/linux/'),
    ('root', 'Root', 'Complete all 36 Linux Lab levels.', '/linux/'),
    ('connected', 'Connected', 'Complete 6 Networking Lab levels.', '/linux/network/'),
    ('network-engineer', 'Network engineer', 'Complete all 17 Networking Lab levels.', '/linux/network/'),
    ('field-guide', 'Field guide', 'Read all five "What you will defend" guides.', '/defend/'),
    ('night-shift', 'Night shift', 'Play the shift on all five guides.', '/defend/'),
    ('cool-head', 'Cool head', 'Score a perfect shift.', '/defend/'),
    ('halfway', 'Halfway to Security+', 'Mark 14 Academy lessons complete.', '/academy/'),
    ('all-lessons', 'Security+ scholar', 'Mark all 28 Academy lessons complete.', '/academy/'),
    ('exam-ready', 'Exam ready', 'Score 80% or more on the readiness check.', '/academy/readiness/'),
    ('streak', 'On a streak', 'Solve CyberHub Daily five days in a row.', '/daily/'),
    ('role-found', 'Found my role', 'Take the "Which role are you?" quiz.', '/careers/match/'),
    ('duelist', 'Duelist', 'Win a Cyber Duel.', '/duel/'),
    ('windows-ready', 'Windows ready', 'Complete 10 PowerShell Lab levels.', '/linux/powershell/'),
    ('on-duty', 'Analyst on duty', 'Score 90 or more on a SOC Simulator shift.', '/labs/soc/'),
    ('phish-spotter', 'Phish spotter', 'Investigate all eight emails in the Phishing lab.', '/labs/phishing/'),
    ('prompt-breaker', 'Prompt breaker', 'Beat the first five AI Red Team levels.', '/ai/red-team/'),
    ('packet-sniffer', 'Packet sniffer', 'Solve all eight Packet Lab levels.', '/labs/packets/'),
    ('threat-hunter', 'Threat hunter', 'Solve all nine Log Hunt levels.', '/labs/logs/'),
    ('decoder', 'Decoder', 'Solve all nine Crypto & Encoding levels.', '/labs/crypto/'),
    ('code-guardian', 'Code guardian', 'Fix eight vulnerable snippets in Secure Code Review.', '/labs/code-review/'),
    ('cloud-guard', 'Cloud guard', 'Fix eight misconfigurations in the Cloud Security Lab.', '/labs/cloud/'),
    ('domain-defender', 'Domain defender', 'Solve all eight Active Directory Lab levels.', '/labs/active-directory/'),
    ('deep-diver', 'Deep diver', 'Solve ten Advanced levels across the labs.', '/labs/'),
    ('mapmaker', 'Mapmaker', 'Solve all ten GIS Lab levels.', '/labs/gis/'),
    ('data-detective', 'Data detective', 'Solve all ten Data Lab levels.', '/labs/data/'),
    ('locked-down', 'Locked down', 'Earn three stars on all three Lockdown Lab buildings.', '/labs/physical/'),
    ('flag-hunter', 'Flag hunter', 'Score 1,000 points on the challenge board.', '/challenges/'),
]


def progress_page(site) -> str:
    b = site.base
    body = site.heading('Your progress', 'Badges for what you have done across CyberHub: labs, guides, shifts, the Academy and the Daily. Earn them, then print a completion card to show at club meetings and career fairs.', 'Learn / Progress')
    body += ('<p class="guide-meta label"><span class="dot" aria-hidden="true"></span>Private: progress is saved in this browser. '
             f'To keep it across devices, <a href="{E(b)}/account/">sign in (optional)</a> and it syncs.</p>')
    body += '<p class="label bd-sum" id="badge-sum" aria-live="polite">Badges need JavaScript to load from this browser.</p><ol class="bd-grid" id="badges">'
    for i, (bid, title, how, link) in enumerate(BADGES):
        body += (f'<li class="bd" data-badge="{bid}"><span class="bd-medal" aria-hidden="true">{i + 1:02d}</span><div><strong>{E(title)}</strong><p>{E(how)}</p>'
                 f'<span class="bd-prog label">Not started</span> <a class="bd-go" href="{E(b + link)}">Go →</a></div></li>')
    body += '</ol>'
    body += ('<section class="bd-print"><h2>Completion card</h2><p>Type your name (it is not saved), check the card, then print it or save it as a PDF.</p>'
             '<div class="rt-actions"><label class="sr-only" for="card-name">Your name</label><input id="card-name" type="text" maxlength="60" placeholder="Your name" autocomplete="name">'
             '<button type="button" class="primary" id="card-print">Print card</button></div>'
             '<article class="bd-card" id="bd-card" aria-label="Completion card preview"><header><span class="label">CyberHub</span><span class="label" id="card-date"></span></header>'
             '<p class="label">This certifies that</p><h3 id="card-name-out">Your name</h3><p>has earned the following CyberHub badges through hands-on practice:</p>'
             '<ul class="bd-card-list">' + ''.join(f'<li data-card-badge="{bid}" hidden><b>{E(t)}</b> · {E(h)}</li>' for bid, t, h, _ in BADGES) + '</ul>'
             '<p class="muted" id="card-none">No badges yet. Start with the Linux Lab.</p>'
             '<footer class="label">Self-reported from the student\'s browser · not an official CSUSB credential</footer></article>'
             '<p><button type="button" id="badge-reset">Reset shift and guide progress</button></p></section>')
    return body


def build_badges(site) -> None:
    site.page('/progress/', 'Your progress', progress_page(site), 'Badges for CyberHub labs, guides, shifts, the Academy and the Daily, plus a printable completion card. Stored only in your browser.', 'Learn', module='journey')
