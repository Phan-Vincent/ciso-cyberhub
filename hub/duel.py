"""Cyber Duel (/duel/): a head-to-head speed quiz. Face-off on one screen, against a bot, or
by challenge link (the friend races your recorded run). Runs in the browser (web/duel.ts);
no server, no accounts. Questions: data/duel.json (original) plus the Academy questions.
"""
from __future__ import annotations

import json

from .common import ROOT, read_json


def write_assets(site) -> dict:
    bank = read_json(ROOT / 'data/duel.json')
    (site.out / 'assets/duel.json').write_text(json.dumps(bank, ensure_ascii=False, separators=(',', ':')))
    return bank


def duel_page(site, bank: dict) -> str:
    n = len(bank['questions'])
    body = site.heading('Cyber Duel', f'Go head to head on cybersecurity. {n} questions from "what is phishing?" to SOC, AI security and Security+. Faster correct answers score more.', 'Play / Cyber Duel')
    body += ('<div class="duel" id="duel">'
             '<p class="label duel-stats" id="duel-stats" aria-live="polite"></p>'
             '<div class="duel-incoming" id="duel-incoming" hidden><span class="label">Challenge</span><strong></strong><p></p><button type="button" class="primary">Accept the challenge</button></div>'
             '<section class="duel-setup" id="duel-setup" aria-labelledby="duel-setup-h"><h2 id="duel-setup-h" class="sr-only">Set up a duel</h2>'
             '<div class="duel-tabs" role="tablist" aria-label="How do you want to play?">'
             '<button type="button" role="tab" data-mode="faceoff" aria-selected="true"><b>Face-off</b><span>2 players · 1 screen</span></button>'
             '<button type="button" role="tab" data-mode="bot" aria-selected="false" tabindex="-1"><b>vs Bot</b><span>Solo practice</span></button>'
             '<button type="button" role="tab" data-mode="challenge" aria-selected="false" tabindex="-1"><b>Challenge a friend</b><span>Play, then send a link</span></button>'
             '<button type="button" role="tab" data-mode="tour" aria-selected="false" tabindex="-1"><b>Tournament</b><span>Bracket for 2–16 players</span></button></div>'
             '<p class="duel-explain" data-for="faceoff">Two players share one keyboard or screen. Player 1 answers with <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> <kbd>F</kbd>, Player 2 with <kbd>H</kbd> <kbd>J</kbd> <kbd>K</kbd> <kbd>L</kbd>, or tap your own side. Perfect on a projector at a club meeting.</p>'
             '<p class="duel-explain" data-for="bot" hidden>Race a computer opponent. Pick its skill: Rookie, Analyst or Elite. Answer with <kbd>1</kbd>–<kbd>4</kbd> or tap.</p>'
             '<div class="duel-explain" data-for="tour" hidden><p>Run a knockout tournament on one screen. Enter player names, one per line. CyberHub seeds a bracket, each match is a Face-off, and winners advance automatically until there is a champion. Ties go to the most correct answers, then a rematch.</p>'
             '<label class="sr-only" for="d-names">Player names</label><textarea id="d-names" rows="6" placeholder="Ana&#10;Ben&#10;Carla&#10;Dev"></textarea>'
             '<p><button type="button" class="primary" id="d-tour">Create bracket</button></p></div>'
             '<p class="duel-explain" data-for="challenge" hidden>Play a round on your own, then share the link. Your friend gets the same questions and races your recorded answers in real time, from any phone or laptop, anywhere.</p>'
             '<div class="duel-form">'
             '<label data-for="faceoff bot challenge"><span class="label">Your name (optional)</span><input id="d-p1" type="text" maxlength="20" placeholder="Player 1" autocomplete="nickname"></label>'
             '<label data-for="faceoff"><span class="label">Player 2</span><input id="d-p2" type="text" maxlength="20" placeholder="Player 2"></label>'
             '<label data-for="bot" hidden><span class="label">Opponent</span><select id="d-bot"><option value="rookie">Rookie bot</option><option value="analyst" selected>Analyst bot</option><option value="elite">Elite bot</option></select></label>'
             '<label><span class="label">Topic</span><select id="d-cat"><option value="all">All topics</option></select></label>'
             '<label><span class="label">Level</span><select id="d-diff"><option value="1">Beginner (never studied cyber)</option><option value="2">Student</option><option value="3">Pro</option><option value="mix" selected>Mixed</option></select></label>'
             '<label><span class="label">Questions</span><select id="d-rounds"><option>5</option><option selected>10</option><option>15</option></select></label></div>'
             '<div class="rt-actions" data-for="faceoff bot challenge"><button type="button" class="primary duel-go" id="d-start" disabled>Start duel</button><span class="label" id="d-status" role="status">Loading questions…</span></div>'
             '<p class="muted">Scoring: 100 points for a correct answer plus up to 100 for speed. Each player answers once per question, so think fast but not too fast. Names stay on this device; challenge links carry only the name you type, the settings and your answers.</p></section>'
             '<section class="duel-bracket" id="duel-bracket" hidden aria-labelledby="br-h"><h2 id="br-h">Tournament bracket</h2><p class="br-next" id="br-next" aria-live="polite"></p><div class="br-grid" id="br-grid"></div>'
             '<p><button type="button" class="primary" id="br-play">Play next match</button> <button type="button" id="br-reset">Reset tournament</button></p></section>'
             '<section class="duel-arena" id="duel-arena" hidden aria-label="Duel">'
             '<div class="duel-top"><span class="label" id="duel-cat"></span><button type="button" id="duel-quit">Quit</button></div>'
             '<div class="duel-bar" aria-hidden="true"><i id="duel-bar"></i></div>'
             '<p class="duel-q" id="duel-q" aria-live="polite"></p>'
             '<div class="duel-players">'
             + ''.join(f'<div class="dp dp-{i}" data-player="{i}"><div class="dp-head"><strong class="dp-name"></strong><span class="dp-score">0</span></div>'
                       f'<p class="dp-keys label">Keys: {"A S D F" if i == 0 else "H J K L"}</p><div class="dp-choices"></div><p class="dp-state label" aria-live="polite"></p></div>' for i in (0, 1))
             + '</div><p class="duel-why" id="duel-why" hidden></p><button type="button" class="primary" id="duel-next" hidden>Next</button></section>'
             '<section class="duel-result" id="duel-result" hidden aria-labelledby="duel-winner"><p class="label">Final score</p><h2 id="duel-winner"></h2><p class="duel-tour-msg" id="duel-tour-msg" hidden></p><ol class="duel-board" id="duel-board"></ol>'
             '<div class="duel-share" id="duel-share"><h3>Challenge someone</h3><p id="duel-share-msg"></p>'
             '<div class="rt-actions"><label class="sr-only" for="duel-link">Challenge link</label><input id="duel-link" type="text" readonly>'
             '<button type="button" class="primary" id="duel-copy">Copy link</button><button type="button" id="duel-native">Share</button></div></div>'
             '<details class="duel-rev"><summary>Review the questions</summary><ol class="duel-review" id="duel-review"></ol></details>'
             '<p><button type="button" class="primary" id="duel-again">Play again</button> ' + site.a('Learn the topics in the Academy →', '/academy/', 'button') + '</p></section>'
             '<noscript><p class="notice">Cyber Duel needs JavaScript.</p></noscript></div>')
    body += ('<section class="duel-host"><h2>Hosting a duel night</h2><div class="flags">'
             '<div class="flag"><b>Projector bracket</b><p>Put Face-off on the big screen. Winners stay on, challengers rotate. Ten questions take about four minutes.</p></div>'
             '<div class="flag"><b>Class-wide challenge</b><p>An officer plays one round in Challenge mode and posts the link in the group chat. Everyone races the same run; post your scores.</p></div>'
             '<div class="flag"><b>Pick the level</b><p>Beginner for open houses and new members, Mixed for meetings, Pro for competition practice.</p></div></div></section>')
    return body


def build_duel(site) -> None:
    bank = write_assets(site)
    site.page('/duel/', 'Cyber Duel', duel_page(site, bank), 'Head-to-head cybersecurity quiz: face off on one screen, race a bot, or challenge a friend by link. Beginner to pro.', 'Play', module='duel')
