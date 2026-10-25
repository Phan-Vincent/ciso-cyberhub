"""Cyber Duel Live rooms (/duel/live/): host on a projector, players join on phones with a
5-letter code. Runs over Supabase Realtime broadcast when site.json has the Supabase settings;
otherwise the page explains the one-time setup. Logic: web/live.ts."""
from __future__ import annotations


def live_page(site) -> str:
    body = site.heading('Cyber Duel: Live room', 'Run a class-wide quiz: put the room code on the projector, everyone joins on their phone with a nickname, and the leaderboard updates after every question.', 'Play / Live room')
    s = lambda i, inner, hidden=True: f'<section class="lv-screen" id="{i}"{" hidden" if hidden else ""}>{inner}</section>'
    st = '<p class="lv-status label" aria-live="polite"></p>'
    body += '<div class="live" id="live">'
    body += s('lv-off', '<div class="ac-card"><h2>Live rooms are almost ready</h2><p>Live rooms need a free realtime service that an officer sets up once (about 10 minutes). Until then, use Face-off or Tournament mode on one screen, or Challenge links.</p>'
              f'<p>{site.a("Play Cyber Duel →", "/duel/", "button primary")}</p><p class="muted">Setup guide for officers: docs/ACCOUNTS.md in the CyberHub repository.</p></div>', hidden=False)
    body += s('lv-choose', '<div class="lv-pick"><button type="button" class="lv-big" id="lv-host"><b>Host a room</b><span>On the projector or the teacher\'s laptop</span></button>'
              '<button type="button" class="lv-big" id="lv-join-btn"><b>Join a room</b><span>On your phone, with the room code</span></button></div>')
    body += s('lv-setup', '<h2>New room</h2><div class="duel-form"><label><span class="label">Topic</span><select id="lv-cat"><option value="all">All topics</option></select></label>'
              '<label><span class="label">Level</span><select id="lv-diff"><option value="1">Beginner</option><option value="2">Student</option><option value="3">Pro</option><option value="mix" selected>Mixed</option></select></label>'
              '<label><span class="label">Questions</span><select id="lv-n"><option>5</option><option selected>10</option><option>15</option><option>20</option></select></label></div>'
              '<p><button type="button" class="primary duel-go" id="lv-create">Create room</button></p>')
    body += s('lv-lobby', f'{st}<p class="label">Join at</p><p class="lv-url" id="lv-url"></p><p class="label">Room code</p><p class="lv-code" id="lv-code" aria-live="polite"></p>'
              '<p class="lv-count" id="lv-count" aria-live="polite">0 players</p><div class="lv-players" id="lv-players"></div><p class="muted">Click a name to remove it.</p>'
              '<p><button type="button" class="primary duel-go" id="lv-start" disabled>Start game</button></p>')
    body += s('lv-hq', f'{st}<p class="label" id="lv-qn"></p><div class="duel-bar" aria-hidden="true"><i id="lv-bar"></i></div><p class="lv-qtext" id="lv-qtext"></p><ol class="lv-choices" id="lv-qchoices"></ol>'
              '<p class="lv-count" id="lv-answered" aria-live="polite"></p><p><button type="button" id="lv-skip">Reveal now</button></p>')
    body += s('lv-hr', f'{st}<p class="label">Answer</p><p class="lv-ans" id="lv-ans"></p><p id="lv-why"></p><h3>Leaderboard</h3><ol class="lv-board" id="lv-board"></ol><p><button type="button" class="primary duel-go" id="lv-next">Next question →</button></p>')
    body += s('lv-hend', '<h2>Final results</h2><ol class="lv-board lv-podium" id="lv-podium"></ol><p><button type="button" class="primary" id="lv-again">Play again with the same room</button></p>')
    body += s('lv-join', f'{st}<h2>Join a room</h2><form class="ac-form" id="lv-jform" autocomplete="off"><label for="lv-jcode" class="label">Room code</label><input id="lv-jcode" class="lv-in" type="text" maxlength="5" inputmode="text" autocapitalize="characters" placeholder="K7QPX">'
              '<label for="lv-jname" class="label">Nickname</label><input id="lv-jname" class="lv-in" type="text" maxlength="20" placeholder="Pick a fun nickname"><p class="muted">Use a nickname, not your full name. Nothing is saved.</p>'
              '<button type="submit" class="primary duel-go">Join</button><p class="label" id="lv-jmsg" role="status"></p></form>')
    body += s('lv-wait', f'{st}<p class="lv-big-msg">You are in!</p><p class="lv-count" id="lv-wcount"></p><p>Watch the big screen. The game starts when the host is ready.</p>')
    body += s('lv-pq', '<p class="label" id="lv-pqn"></p><p class="lv-pqtext" id="lv-pqtext"></p><div class="lv-pbtns" id="lv-pbtns"></div>')
    body += s('lv-locked', '<p class="lv-big-msg">Locked in</p><p>Waiting for everyone else…</p>')
    body += s('lv-pr', '<p class="lv-big-msg" id="lv-pres"></p><p class="lv-count" id="lv-prank"></p>')
    body += s('lv-pend', '<p class="lv-big-msg">Game over</p><p class="lv-count" id="lv-pfinal"></p>' + f'<p>{site.a("Keep practising →", "/duel/", "button")}</p>')
    body += '</div>'
    body += ('<section class="duel-host"><h2>Running it in class</h2><ol class="steps"><li><b>Host:</b> open this page on the projector laptop, choose Host a room, pick the topic and level, and create the room.</li>'
             '<li><b>Students:</b> open the address shown on screen on their phone (or go to Cyber Duel → Live room → Join), then enter the code and a nickname.</li>'
             '<li>When everyone is in, press <b>Start game</b>. Each question lasts 15 seconds; faster correct answers score more.</li>'
             '<li>After each question the projector shows the answer, why it is right, and the top 10.</li></ol>'
             '<p class="muted">Only nicknames and answers travel through the room, and nothing is stored. Rooms end when the host closes the page.</p></section>')
    return body


def build_live(site) -> None:
    site.page('/duel/live/', 'Cyber Duel: Live room', live_page(site), 'Run a class-wide cyber quiz: room code on the projector, students join on their phones, live leaderboard.', 'Play', module='live')
