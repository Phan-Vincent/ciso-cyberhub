"""Shareable, replayable pages: CyberHub Daily, the Security+ readiness check and the role match.

Everything is static. Server-rendered markup holds all content (no innerHTML on the client);
web/play.ts only shows, hides and scores. Progress lives in the visitor's own browser.
"""
from __future__ import annotations

import json
from html import escape as E

from .daily import FAMILIES, families_json, figure, options_html, puzzles

DAILY_START = '2026-10-23'  # puzzle #1

ROLES = {
    'soc-analyst': 'You like signals, patterns and the moment an alert turns into a real finding.',
    'penetration-tester': 'You want to know how things break, and you enjoy proving it with permission.',
    'cloud-security-engineer': 'You think in identities, configs and infrastructure you can rebuild from code.',
    'grc-analyst': 'You turn messy risk into clear decisions people can actually follow.',
    'digital-forensics-analyst': 'You care about what really happened, and you can show your evidence.',
    'application-security-engineer': 'You would rather fix the bug in the code than chase it in production.',
    'threat-intelligence-analyst': 'You read everything, connect the dots and explain who is doing what.',
    'incident-responder': 'You stay calm when it is on fire and like coordinating the way out.',
}

# Six questions. Each answer adds weight to roles.
MATCH = [
    ('A free Saturday with a laptop. You would rather…', [
        ('Break into a practice box on a legal CTF', {'penetration-tester': 3, 'application-security-engineer': 1}),
        ('Spin up a cloud lab and lock it down properly', {'cloud-security-engineer': 3}),
        ('Read a fresh breach write-up and map the attacker', {'threat-intelligence-analyst': 3, 'incident-responder': 1}),
        ('Recover deleted files from an old USB stick', {'digital-forensics-analyst': 3}),
    ]),
    ('An alert fires at 2 a.m. Your first move?', [
        ('Pull the logs and check whether it is real', {'soc-analyst': 3}),
        ('Get the right people on a call and contain it', {'incident-responder': 3}),
        ('Snapshot the machine before anything changes', {'digital-forensics-analyst': 2, 'incident-responder': 1}),
        ('Ask which control should have stopped it', {'grc-analyst': 2, 'cloud-security-engineer': 1}),
    ]),
    ('Pick the tool you would master first.', [
        ('Wireshark', {'soc-analyst': 2, 'incident-responder': 1}),
        ('Burp or OWASP ZAP', {'penetration-tester': 2, 'application-security-engineer': 2}),
        ('Terraform plus a cloud scanner', {'cloud-security-engineer': 3}),
        ('A spreadsheet and a risk register', {'grc-analyst': 3}),
    ]),
    ('Which sentence sounds most like you?', [
        ('"Show me the evidence."', {'digital-forensics-analyst': 2, 'soc-analyst': 1}),
        ('"I bet I can get around that."', {'penetration-tester': 3}),
        ('"Let\'s fix it at the source."', {'application-security-engineer': 3}),
        ('"Who is behind this, and why?"', {'threat-intelligence-analyst': 3}),
    ]),
    ('A teammate wrote insecure code. You…', [
        ('Pair with them and fix it together', {'application-security-engineer': 3}),
        ('Write a detection in case it is exploited', {'soc-analyst': 2}),
        ('Show the impact with a quick proof of concept', {'penetration-tester': 2}),
        ('Add a review step so it does not ship again', {'grc-analyst': 2, 'cloud-security-engineer': 1}),
    ]),
    ('The best part of a security job would be…', [
        ('Being the calm one in a crisis', {'incident-responder': 3}),
        ('Building systems that are secure by default', {'cloud-security-engineer': 2, 'application-security-engineer': 1}),
        ('Briefing people on threats before they hit', {'threat-intelligence-analyst': 2, 'grc-analyst': 1}),
        ('Solving a mystery nobody else could', {'digital-forensics-analyst': 2, 'soc-analyst': 1}),
    ]),
]


def daily_page(site) -> str:
    data = {'start': DAILY_START, 'families': families_json(), 'puzzles': puzzles(site.intel['vulnerabilities'])}
    (site.out / 'assets' / 'daily.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
    figs = ''.join(f'<div class="fig" data-fig="{fid}" hidden>{figure(fid)}</div>' for fid, *_ in FAMILIES)
    facts = ''.join(f'<div><dt class="label">{lab}</dt><dd id="d-{k}">—</dd></div>' for k, lab in [('vendor', 'Vendor'), ('product', 'Product'), ('added', 'Added to CISA KEV'), ('due', 'Federal fix deadline'), ('cvss', 'CVSS severity'), ('epss', 'Chance of exploitation')])
    pips = ''.join('<i></i>' for _ in range(4))
    dist = ''.join(f'<li><span class="label">{n}</span><span class="bar"><i id="d-dist-{n}"></i></span><b id="d-distn-{n}">0</b></li>' for n in (1, 2, 3, 4))
    badges = ''.join(f'<li class="badge-item" data-badge="{k}"><span class="badge-mark" aria-hidden="true">{m}</span><span><b>{E(t)}</b><span class="label">{E(d)}</span></span></li>' for k, m, t, d in [
        ('first', '01', 'First catch', 'Solve one puzzle'), ('sharp', '1/4', 'Sharpshooter', 'Solve on the first try'),
        ('streak3', '03', 'On shift', '3-day streak'), ('streak7', '07', 'Threat hunter', '7-day streak'),
        ('wins10', '10', 'Defender', '10 solves'), ('all8', '08', 'Full spectrum', 'Solve every weakness family')])
    body = site.heading('CyberHub Daily', 'A real vulnerability attackers are exploiting right now. Name the weakness behind it in four tries.', 'Daily / Name the weakness')
    body += ('<div class="daily" id="daily"><section class="daily-board" aria-labelledby="d-q">'
             '<div class="daily-top label"><span>Puzzle <b id="d-num">#—</b></span><span id="d-date"></span><span class="pips" id="d-pips" role="img" aria-label="Tries used, out of four">' + pips + '</span></div>'
             f'<div class="daily-case"><div class="daily-fig blur-3" id="d-fig">{figs}<span class="fig-note label" id="d-fignote">Clue sharpens with each miss</span></div>'
             f'<div class="daily-facts"><p class="label daily-cve">Known exploited · <span id="d-cve">CVE hidden</span></p><dl>{facts}</dl>'
             '<p class="daily-hint" id="d-hint" hidden></p></div></div>'
             '<h2 class="daily-q" id="d-q">Which weakness is behind it?</h2>'
             f'<ol class="daily-opts" id="d-opts">{options_html()}</ol>'
             '<div class="daily-result" id="d-result" hidden><p class="label" id="d-verdict-label"></p><h3 id="d-verdict"></h3>'
             '<p class="daily-title"><a id="d-link" href="#">—</a></p><p id="d-what"></p><p class="daily-defend"><b>How defenders catch it.</b> <span id="d-defend"></span></p>'
             '<p class="daily-learn label" id="d-learn"></p>'
             '<div class="daily-share"><button type="button" class="primary" id="d-share">Share result</button><button type="button" id="d-copy">Copy grid</button>'
             '<span class="label" id="d-next"></span></div><pre class="share-preview" id="d-preview" aria-label="Your result grid"></pre></div>'
             '<noscript><p class="notice">CyberHub Daily needs JavaScript to pick today\'s puzzle. Everything else on CyberHub works without it.</p></noscript>'
             '</section><aside class="daily-side" aria-label="Your stats">'
             '<div class="stat-row"><div><strong id="d-played">0</strong><span class="label">Played</span></div><div><strong id="d-winp">0</strong><span class="label">Win %</span></div>'
             '<div><strong id="d-streak">0</strong><span class="label">Streak</span></div><div><strong id="d-best">0</strong><span class="label">Best</span></div></div>'
             f'<h2 class="label side-h">Solved in</h2><ol class="dist">{dist}</ol><h2 class="label side-h">Badges</h2><ul class="badges">{badges}</ul>'
             '<p class="side-note">Stats stay in this browser. No account, nothing sent.</p>'
             '<h2 class="label side-h">How to play</h2><ol class="how"><li>Read the case: vendor, product, how severe and how likely it is to be exploited.</li>'
             '<li>Pick the weakness family. Each miss sharpens the clue figure, then adds a hint, then narrows it to three.</li><li>Learn how defenders catch it, then share your grid.</li></ol>'
             '</aside></div>')
    return body


def readiness_page(site) -> str:
    doms = site.academy['domains']
    body = site.heading('Readiness check', 'Fifteen exam-style questions across the five Security+ SY0-701 domains. About five minutes. Get a score by domain and a card to share.', 'Academy / Security+ readiness')
    bars = ''.join(f'<li data-domain="{E(d["id"])}"><span class="label">{E(d["id"])}</span><span class="nm">{E(d["title"])}</span><span class="bar"><i></i></span><b>—</b></li>' for d in doms)
    body += ('<div class="check" id="check"><section class="check-board">'
             '<div class="check-intro" id="c-intro"><ul class="check-facts label"><li><b>15</b> questions</li><li><b>5</b> domains</li><li><b>~5</b> minutes</li></ul>'
             '<button type="button" class="primary" id="c-start">Start the check →</button><p class="label" id="c-best"></p></div>'
             '<div class="qcard check-q" id="c-q" hidden><div class="label"><span>Objective <span id="c-obj"></span></span><span id="c-num"></span><span id="c-time">0:00</span></div>'
             '<div class="check-progress"><i id="c-prog"></i></div><h2 class="sr-only">Question</h2><h3 id="c-prompt"></h3><ol id="c-choices"></ol><p class="why" id="c-why"></p>'
             '<div class="q-foot"><span class="label" id="c-score"></span><button type="button" id="c-next" disabled>Next</button></div></div>'
             '<div class="check-result" id="c-result" hidden><p class="label">Your readiness</p><p class="big-score"><span id="c-pct">0</span><small>%</small></p>'
             '<h3 id="c-band"></h3><p id="c-band-text"></p>'
             f'<ol class="domain-bars" id="c-domains">{bars}</ol>'
             '<p class="label" id="c-review-h">Review next</p><ul class="check-review" id="c-review"></ul>'
             '<div class="daily-share"><button type="button" class="primary" id="c-share">Share result</button><button type="button" id="c-copy">Copy</button><button type="button" id="c-again">Try again</button></div>'
             '<pre class="share-preview" id="c-preview"></pre></div>'
             '<noscript><p class="notice">The readiness check needs JavaScript. All lessons and practice questions are available in the academy without it.</p></noscript>'
             '</section></div>')
    return body


def match_page(site) -> str:
    docs = {d['id']: d for d in site.docs if d['section'] == 'careers'}
    body = site.heading('Which role are you?', 'Six quick questions. One security career that fits how you think, with the roadmap to get there.', 'Careers / Match')
    qs = ''.join(f'<fieldset class="match-q" data-q="{i}"{" hidden" if i else ""}><legend><span class="label">{i + 1:02d} / {len(MATCH):02d}</span>{E(q)}</legend><ol>'
                 + ''.join(f'<li><button type="button" class="opt" data-w=\'{E(json.dumps(w))}\'><span class="label">{"ABCD"[j]}</span>{E(a)}</button></li>' for j, (a, w) in enumerate(ans))
                 + '</ol></fieldset>' for i, (q, ans) in enumerate(MATCH))
    roles = ''.join(f'<article class="role-card" data-role="{rid}" hidden><p class="label">Your match</p><h2 class="sr-only">Your matched role</h2><h3>{E(docs[rid]["title"])}</h3><p class="role-line">{E(line)}</p>'
                    f'<p>{E(docs[rid]["description"])}</p>{site.a("Open the " + docs[rid]["title"] + " roadmap →", f"/careers/{rid}/", "button primary")}</article>'
                    for rid, line in ROLES.items() if rid in docs)
    body += ('<div class="match" id="match"><section class="match-board"><div class="check-progress"><i id="m-prog"></i></div>'
             f'{qs}<div class="match-result" id="m-result" hidden>{roles}<p class="label" id="m-runner"></p>'
             '<div class="daily-share"><button type="button" class="primary" id="m-share">Share my match</button><button type="button" id="m-copy">Copy</button><button type="button" id="m-again">Retake</button></div>'
             '<pre class="share-preview" id="m-preview"></pre></div>'
             '<noscript><p class="notice">The match quiz needs JavaScript. Browse every roadmap on the careers page.</p></noscript>'
             f'</section><aside class="match-side"><p class="label">All roadmaps</p>{"".join(site.a(d["title"], f"/careers/{k}/") for k, d in docs.items())}</aside></div>')
    return body


def build_play(site) -> None:
    site.page('/daily/', 'CyberHub Daily', daily_page(site), 'Name the weakness behind a real, actively exploited vulnerability in four tries. A new puzzle every day.', 'Daily', module='play')
    site.page('/academy/readiness/', 'Security+ readiness check', readiness_page(site), 'Fifteen Security+ SY0-701 questions, a score by domain and a card to share.', 'Academy', module='play')
    site.page('/careers/match/', 'Which security role are you?', match_page(site), 'Six questions to match you with a cybersecurity career and its roadmap.', 'Careers', module='play')
