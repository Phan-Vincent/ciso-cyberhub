"""Lockdown Lab (/labs/physical/): physical security on architectural floor plans. Place cameras,
sensors, locks and guards within a budget, harden the IT, then watch simulated intruders pick the
best route. Three tiers: Ground Floor, Secure Wing and Black Site. The engine is web/physlab.ts."""
from __future__ import annotations

import html

E = html.escape

ITEMS = [  # id, name, cost, short line (kept in sync with ITEMS in web/physlab.ts by a test)
    ('cam', 'Camera', 250, 'Floor, 6 squares'), ('ircam', 'Night camera', 420, 'Sees in the dark'), ('motion', 'Motion sensor', 140, 'Indoors, night'),
    ('light', 'Exterior light', 80, 'Outside'), ('guard', 'Guard post', 1400, 'Response 60 s'), ('reader', 'Badge reader', 300, 'Door or gate'),
    ('lock', 'High-security lock', 220, 'Door, +90 s'), ('contact', 'Door/window sensor', 60, 'Opening'), ('glass', 'Glass-break sensor', 90, 'Window'),
    ('bars', 'Window bars', 180, 'Window, +180 s'), ('mantrap', 'Mantrap', 900, 'Main entrance'), ('cage', 'Locked rack cage', 260, 'Equipment, +150 s'),
]
CONTROLS = [
    ('fde', 'Full-disk encryption', 3, 'A stolen drive is unreadable.'), ('secboot', 'BIOS password + Secure Boot', 2, 'Nobody boots the server from their own USB stick.'),
    ('nac', '802.1X network access control', 3, 'A rogue device plugged into a switch gets no network.'), ('screen', 'Screen lock + auto log-off', 1, 'An unattended session locks itself.'),
    ('usb', 'USB device control', 2, 'Keystroke-injection and storage USBs are blocked.'), ('cleandesk', 'Clean desk + password manager', 1, 'No passwords on sticky notes.'),
    ('camnet', 'Isolated camera network', 2, 'No default passwords, so nobody can switch the recorder off.'), ('siem', 'Central logging and alerts', 2, 'The first suspicious action on a system raises an alarm.'),
    ('otseg', 'OT segmentation + HMI passwords', 2, 'The generator controller cannot be changed from a walk-up session.'),
]
TIERS = [('ground', 'A-101', 'Ground Floor', 'Beginner', '$1,500'), ('wing', 'A-201', 'Secure Wing', 'Intermediate', '$3,500'), ('black', 'A-301', 'Black Site', 'Expert', '$5,500')]


def _ddr() -> str:
    """Hand-drawn detect / delay / respond diagram."""
    return ('<svg class="pl-ddr sketch" viewBox="0 0 720 150" role="img" aria-label="Detect, delay, respond: the attacker must be detected early enough that delay holds them until the response arrives.">'
            '<path class="sk" d="M20 96 C140 94 260 98 380 95 S600 97 700 96"/><path class="sk" d="M690 90l12 6l-12 6"/>'
            '<g class="sk-box"><path d="M40 40 L200 38 L202 72 L42 74 Z"/><text x="121" y="61">DETECT</text></g>'
            '<g class="sk-box sk-red"><path d="M260 39 L440 41 L438 73 L259 72 Z"/><text x="349" y="61">DELAY</text></g>'
            '<g class="sk-box"><path d="M500 40 L680 38 L681 73 L499 74 Z"/><text x="590" y="61">RESPOND</text></g>'
            '<path class="sk-zig" d="M262 80 l8 10 l8 -10 l8 10 l8 -10 l8 10 l8 -10 l8 10 l8 -10 l8 10 l8 -10 l8 10 l8 -10 l8 10 l8 -10 l8 10 l8 -10 l8 10 l8 -10 l8 10 l8 -10 l8 10 l8 -10"/>'
            '<text class="sk-note" x="121" y="124">sensors, cameras, guards</text><text class="sk-note" x="349" y="124">locks, bars, cages, distance</text>'
            '<text class="sk-note" x="590" y="124">someone arrives in time</text><text class="sk-note sk-red" x="360" y="20">detection time + delay &gt; response time</text></svg>')


def build_physlab(site) -> None:
    tiers = ''.join(f'<button type="button" class="pl-tier" data-tier="{t}" aria-pressed="false"><span class="label">{sheet} · {lvl}</span><b>{name}</b>'
                    f'<span class="pl-tier-m"><span class="pl-stars">☆☆☆</span><small>Budget {bud}</small></span></button>' for t, sheet, name, lvl, bud in TIERS)
    tools = ''.join(f'<button type="button" class="pl-tool" data-tool="{i}" aria-pressed="false"><b>{E(n)}</b><span>${c:,}</span><small>{E(s)}</small></button>' for i, n, c, s in ITEMS)
    tools += '<button type="button" class="pl-tool pl-erase" data-tool="erase" aria-pressed="false"><b>Remove</b><span>Refund</span><small>Click a placed item</small></button>'
    ctls = ''.join(f'<label class="pl-ctl" data-ctl-row="{i}"><input type="checkbox" data-ctl="{i}"><span><b>{E(n)}</b><small>{E(w)}</small></span><em>{p} pt{"s" if p > 1 else ""}</em></label>' for i, n, p, w in CONTROLS)
    dirs = ''.join(f'<button type="button" class="chip" data-dir="{k}" aria-pressed="{"true" if k == 0 else "false"}" aria-label="Face {d}">{a}</button>' for k, (a, d) in enumerate([('→', 'east'), ('↓', 'south'), ('←', 'west'), ('↑', 'north')]))
    body = site.heading('Lockdown Lab', 'Secure a building against a physical break-in. Place cameras, sensors and locks within a budget, harden the computers inside, then watch intruders try their best route.', 'Practice / Physical security')
    body += f'''<div class="phys" id="phys">
<div class="pl-tiers" role="group" aria-label="Choose a building">{tiers}</div>
<div class="pl-brief"><p id="pl-brief"></p><dl><div><dt class="label">Protect</dt><dd id="pl-assets"></dd></div><div><dt class="label">Response time</dt><dd id="pl-resp"></dd></div></dl><ul class="pl-threats" id="pl-threats"></ul></div>
<div class="pl-work">
  <figure class="pl-plan">
    <svg id="pl-svg" class="pl-svg" tabindex="0" role="application" aria-label="Floor plan. Arrow keys move the cursor, Enter places the selected item, Delete removes, R rotates a camera." aria-describedby="pl-info">
      <g id="pl-base"></g><g id="pl-cover"></g><g id="pl-items"></g><g id="pl-run"></g><rect id="pl-cursor" class="pl-cursor" width="24" height="24"/></svg>
    <figcaption id="pl-info" class="pl-info"></figcaption>
  </figure>
  <div class="pl-side">
    <div class="pl-meters">
      <div id="pl-money-wrap" class="pl-meter"><span class="label">Security budget</span><b id="pl-money"></b><i id="pl-money-bar"></i></div>
      <div id="pl-it-wrap" class="pl-meter"><span class="label">IT budget</span><b id="pl-it"></b><i id="pl-it-bar"></i></div>
    </div>
    <div class="pl-tabs" role="tablist" aria-label="Steps">
      <button type="button" role="tab" data-phase="defend" aria-controls="pl-p1" aria-selected="true"><span>1</span> Defend</button>
      <button type="button" role="tab" data-phase="harden" aria-controls="pl-p2" aria-selected="false" tabindex="-1"><span>2</span> Harden</button>
      <button type="button" role="tab" data-phase="attack" aria-controls="pl-p3" aria-selected="false" tabindex="-1"><span>3</span> Attack</button>
    </div>
    <div class="pl-pane" id="pl-p1" role="tabpanel" data-pane="defend">
      <p class="pl-hint">Pick an item, then click the plan. Red squares are what the intruders want.</p>
      <div class="pl-tools">{tools}</div>
      <div id="pl-dir" class="pl-dir" role="group" aria-label="New cameras face"><span class="label">New cameras face</span>{dirs}<small>Click a placed camera to turn it.</small></div>
      <p class="pl-what" id="pl-what"></p>
      <div class="pl-row"><button type="button" class="ghost" id="pl-clear">Clear plan</button><button type="button" class="primary" data-goto="harden">Next: harden the IT</button></div>
    </div>
    <div class="pl-pane" id="pl-p2" role="tabpanel" data-pane="harden" hidden>
      <p class="pl-hint">Doors only buy time. If someone does reach a keyboard or a rack, these decide what they can do there.</p>
      <div class="pl-ctls">{ctls}</div>
      <div class="pl-row"><button type="button" class="ghost" data-goto="defend">Back to the plan</button><button type="button" class="primary" id="pl-go">Run the attack</button></div>
      <p class="pl-note" id="pl-go-note" role="status"></p>
    </div>
    <div class="pl-pane" id="pl-p3" role="tabpanel" data-pane="attack" hidden>
      <p class="pl-hint" id="pl-empty">Set up your defenses, then run the attack from step 2.</p>
      <div id="pl-result" hidden>
        <div class="pl-score" id="pl-score"></div>
        <div class="pl-attacks" id="pl-attacks" role="group" aria-label="Watch an attacker"></div>
        <div class="pl-play"><span class="pl-clock" id="pl-clock">T+00:00</span><button type="button" class="ghost" id="pl-replay">Replay</button></div>
        <div class="pl-detail" id="pl-detail"></div>
        <ol class="pl-log" id="pl-log" aria-label="What happened"></ol>
        <div class="pl-row"><button type="button" class="primary" data-goto="defend">Adjust the plan</button><button type="button" class="ghost" id="pl-solution" hidden>Show a solution</button></div>
      </div>
    </div>
  </div>
</div>
<p class="sr-only" id="pl-live" aria-live="polite"></p>
<section class="pl-learn">
  <h2>How physical security is designed</h2>
  {_ddr()}
  <div class="pl-cols">
    <div><h3>Detect, delay, respond</h3><p>Security engineers model protection as a race. Sensors and people <b>detect</b> an intrusion, barriers <b>delay</b> the intruder, and a guard or police unit <b>responds</b>. The system works only if detection happens early enough that the remaining delay is longer than the response time. A camera that records a theft but alerts nobody detects too late.</p></div>
    <div><h3>The critical detection point</h3><p>After each run the plan marks a red ✕ on the intruder&#39;s route: the last place where detecting them still gives the response time to arrive. Detection after that point only tells you what happened. Move sensors outward, toward the perimeter, or add delay so the point moves inward.</p></div>
    <div><h3>Defense in depth</h3><p>Layers matter more than any single device: fence, lit grounds, locked and alarmed doors, badge-controlled interior doors, caged equipment and hardened computers. Attackers go around a strong layer, so the weakest window or the loading dock usually decides the outcome.</p></div>
    <div><h3>Where physical meets IT</h3><p>Once inside, an intruder works fast: a rogue Wi-Fi bridge in a switch port, a USB stick that types commands, a drive pulled from a server, a password on a sticky note. Controls like 802.1X, USB device control and full-disk encryption make physical access worth much less.</p></div>
  </div>
  <p class="muted">The timings are teaching values, not ratings for real products. To go further, look up CPTED (crime prevention through environmental design) and the physical security sections of NIST SP 800-53 (the PE control family).</p>
</section>
</div>'''
    site.page('/labs/physical/', 'Lockdown Lab', body, 'Physical security lab: place cameras, sensors and locks on a floor plan within a budget, harden the IT, then watch simulated intruders try to break in.', 'Practice', module='physlab')
