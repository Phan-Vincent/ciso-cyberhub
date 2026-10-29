"""Architectural drawings for the section hubs, in one visual language with the home elevation.

Two families, both black (or white) ink with red markup:
- Measured drawings (sections and elevations): clean lines, hatched poche where walls and slabs are
  cut, stippled concrete, level markers, scale figures and pencil trees.
- Sketches (diagrams): doubled, slightly wobbly strokes with dot, zigzag and starburst fills.

Red callouts are real links into the section. Output is deterministic (seeded) so builds are stable.
Everything draws in when it scrolls into view (app.ts adds .in); with reduced motion it is static.
"""
from __future__ import annotations

import html
import math
import random
import re

E = html.escape


# ------------------------------------------------------------------ shared
def _defs(p: str) -> str:
    rnd = random.Random(11)
    dots = ''.join(f'<circle cx="{rnd.uniform(0, 40):.1f}" cy="{rnd.uniform(0, 40):.1f}" r="{rnd.uniform(.35, .9):.2f}"/>' for _ in range(34))
    return (f'<defs><pattern id="{p}-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7"/></pattern>'
            f'<pattern id="{p}-stip" width="40" height="40" patternUnits="userSpaceOnUse">{dots}</pattern>'
            f'<pattern id="{p}-dots" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1"/><circle cx="6" cy="6" r="1.1"/></pattern>'
            f'<pattern id="{p}-grid" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0H0V16"/></pattern></defs>')


_DRAWN = re.compile(r'<(path|rect|circle) class="(dw-line|dw-thin|dw-ground|dw-sk|dw-sk-node|dw-contour|dw-contour-i|dw-river|dw-scribble|dw-branch)"')


def _figure(pid: str, w: int, h: int, label: str, inner: str, cls: str = '') -> str:
    inner = _DRAWN.sub(r'<\1 pathLength="1" class="\2"', inner)
    return (f'<figure class="dw {cls}" id="{pid}"><svg class="dw-svg" viewBox="0 0 {w} {h}" role="group" aria-label="{E(label)}">'
            f'{_defs(pid)}{inner}</svg></figure>')


def _sheet(x: float, y: float, w: float, title: str, sub: str, no: str) -> str:
    return (f'<g class="dw-sheet"><path class="dw-rule" d="M{x} {y}H{x + w}"/><text class="dw-title" x="{x}" y="{y + 26}">{E(title)}</text>'
            f'<text class="dw-sub" x="{x}" y="{y + 44}">{E(sub)}</text><text class="dw-no" x="{x + w}" y="{y + 30}">{E(no)}</text></g>')


def _call(x: float, y: float, tx: float, ty: float, text: str, href: str, anchor: str = 'start', sub: str = '') -> str:
    """A red redline callout: ring at the point, leader with an elbow, label that links somewhere."""
    elbow = f'L{tx - (14 if anchor == "start" else -14)} {ty}' if abs(ty - y) > 2 else ''
    label = f'<text class="dw-call-t {anchor}" x="{tx}" y="{ty + 4}">{E(text)}</text>'
    if sub:
        label += f'<text class="dw-call-s {anchor}" x="{tx}" y="{ty + 17}">{E(sub)}</text>'
    return (f'<a class="dw-call" href="{E(href)}"><circle class="dw-ring" cx="{x}" cy="{y}" r="9"/><circle class="dw-pin" cx="{x}" cy="{y}" r="2.4"/>'
            f'<path class="dw-lead" d="M{x} {y}{elbow}L{tx - (4 if anchor == "start" else -4)} {ty}"/>{label}</a>')


def _tree(rnd: random.Random, cx: float, base: float, r: float) -> str:
    """Pencil tree: trunk, a few branches and a scribbled canopy."""
    out = f'M{cx:.1f} {base:.1f}L{cx + rnd.uniform(-1, 1):.1f} {base - r * 1.25:.1f}'
    for _ in range(4):
        a = rnd.uniform(-2.3, -.8)
        sy = base - r * rnd.uniform(.55, 1.1)
        out += f'M{cx:.1f} {sy:.1f}l{math.cos(a) * r * .55:.1f} {math.sin(a) * r * .55:.1f}'
    cy = base - r * 1.55
    sc = ''
    n = 70
    for i in range(n):
        t = i / n * math.pi * 2 * 5
        rr = r * (.25 + .75 * rnd.random())
        sc += f'{"M" if i == 0 else "L"}{cx + math.cos(t) * rr:.1f} {cy + math.sin(t) * rr * .8:.1f}'
    return f'<path class="dw-branch" d="{out}"/><path class="dw-scribble" d="{sc}"/>'


def _person(x: float, base: float, s: float = 1.0, flip: bool = False) -> str:
    """A 1.75 m scale figure, as drawn on sections."""
    k = -1 if flip else 1
    h = 34 * s
    return (f'<g class="dw-fig"><circle cx="{x}" cy="{base - h + 3.5 * s:.1f}" r="{3.4 * s:.1f}"/>'
            f'<path d="M{x} {base - h + 7 * s:.1f}L{x + k * 1 * s:.1f} {base - h * .45:.1f}L{x - k * 3 * s:.1f} {base:.1f}M{x + k * 1 * s:.1f} {base - h * .45:.1f}L{x + k * 5 * s:.1f} {base:.1f}'
            f'M{x} {base - h + 11 * s:.1f}L{x + k * 6 * s:.1f} {base - h * .5:.1f}M{x} {base - h + 11 * s:.1f}L{x - k * 4 * s:.1f} {base - h * .52:.1f}"/></g>')


def _level(x: float, y: float, text: str, side: str = 'left') -> str:
    """Level marker: red triangle on the line with the elevation."""
    d = -1 if side == 'left' else 1
    return (f'<g class="dw-lvl"><path d="M{x} {y}h{d * 46}"/><path class="dw-tri" d="M{x + d * 8} {y}l-5 -8h10z"/>'
            f'<text class="{"end" if side == "left" else "start"}" x="{x + d * 50}" y="{y + 3.5}">{E(text)}</text></g>')


# ------------------------------------------------------------------ sketch kit
def _wob(rnd: random.Random, x1: float, y1: float, x2: float, y2: float, j: float = 1.4) -> str:
    mx, my = (x1 + x2) / 2 + rnd.uniform(-j, j), (y1 + y2) / 2 + rnd.uniform(-j, j)
    return f'M{x1 + rnd.uniform(-j, j):.1f} {y1 + rnd.uniform(-j, j):.1f}Q{mx:.1f} {my:.1f} {x2 + rnd.uniform(-j, j):.1f} {y2 + rnd.uniform(-j, j):.1f}'


def _rbox(rnd: random.Random, x: float, y: float, w: float, h: float) -> str:
    """Sketchy rectangle drawn twice, corners overshooting a little."""
    d = ''
    for _ in range(2):
        o = rnd.uniform(2, 5)
        d += _wob(rnd, x - o, y, x + w + o, y) + _wob(rnd, x + w, y - o, x + w, y + h + o) + _wob(rnd, x + w + o, y + h, x - o, y + h) + _wob(rnd, x, y + h + o, x, y - o)
    return d


def _rcircle(rnd: random.Random, cx: float, cy: float, r: float) -> str:
    d = ''
    for k in range(2):
        a0 = rnd.uniform(0, 6.28)
        pts = []
        for i in range(25):
            a = a0 + i / 22 * math.pi * 2
            rr = r + rnd.uniform(-1.5, 1.5) + k
            pts.append(f'{cx + math.cos(a) * rr:.1f} {cy + math.sin(a) * rr:.1f}')
        d += 'M' + 'L'.join(pts)
    return d


def _zig(x: float, y: float, w: float, h: float, step: float = 7) -> str:
    d = f'M{x} {y + h}'
    i = 0
    while x + (i + 1) * step <= x + w:
        i += 1
        d += f'L{x + i * step - step / 2:.1f} {y}L{x + i * step:.1f} {y + h}'
    return d


def _star(cx: float, cy: float, r: float, n: int = 14) -> str:
    return ''.join(f'M{cx:.1f} {cy:.1f}L{cx + math.cos(i / n * 6.283) * r:.1f} {cy + math.sin(i / n * 6.283) * r:.1f}' for i in range(n))


def _arrow(rnd: random.Random, x1: float, y1: float, x2: float, y2: float) -> str:
    a = math.atan2(y2 - y1, x2 - x1)
    head = f'M{x2 - math.cos(a - .45) * 11:.1f} {y2 - math.sin(a - .45) * 11:.1f}L{x2:.1f} {y2:.1f}L{x2 - math.cos(a + .45) * 11:.1f} {y2 - math.sin(a + .45) * 11:.1f}'
    return _wob(rnd, x1, y1, x2, y2, 2.2) + head


# ------------------------------------------------------------------ Learn: section through a learning center
def learn_drawing(base: str) -> str:
    rnd = random.Random(21)
    W, H, G = 1200, 620, 430
    x0, x1 = 300, 900
    floors = [G, G - 92, G - 184, G - 276]   # finished floor levels
    roof = G - 352
    s = f'<rect class="dw-stipple" x="0" y="{G}" width="{W}" height="{H - G - 70}" fill="url(#dw-learn-stip)"/>'
    s += f'<path class="dw-ground" d="M40 {G}H{W - 40}"/>'
    # basement box below ground
    s += f'<rect class="dw-void" x="{x0}" y="{G + 14}" width="{x1 - x0}" height="56"/>'
    s += f'<rect class="dw-poche" x="{x0 - 14}" y="{G}" width="{x1 - x0 + 28}" height="14" fill="url(#dw-learn-hatch)"/>'
    s += f'<rect class="dw-poche" x="{x0 - 14}" y="{G + 14}" width="14" height="56" fill="url(#dw-learn-hatch)"/><rect class="dw-poche" x="{x1}" y="{G + 14}" width="14" height="56" fill="url(#dw-learn-hatch)"/>'
    s += f'<rect class="dw-poche" x="{x0 - 14}" y="{G + 70}" width="{x1 - x0 + 28}" height="12" fill="url(#dw-learn-hatch)"/>'
    # cut slabs and walls with poche
    for f in floors[1:] + [roof]:
        s += f'<rect class="dw-poche" x="{x0 - 14}" y="{f}" width="{x1 - x0 + 28}" height="12" fill="url(#dw-learn-hatch)"/>'
    for f_lo, f_hi in zip(floors, floors[1:] + [roof]):
        top = f_hi + 12
        s += f'<rect class="dw-poche" x="{x0 - 14}" y="{top}" width="14" height="{f_lo - top}" fill="url(#dw-learn-hatch)"/>'
        # right facade is glass: mullions in elevation beyond
        s += f'<path class="dw-glass" d="M{x1} {top}V{f_lo}M{x1 + 6} {top}V{f_lo}"/>'
    # parapet + rooftop unit
    s += f'<rect class="dw-poche" x="{x0 - 14}" y="{roof - 18}" width="14" height="18" fill="url(#dw-learn-hatch)"/><rect class="dw-poche" x="{x1}" y="{roof - 18}" width="14" height="18" fill="url(#dw-learn-hatch)"/>'
    s += f'<rect class="dw-line" x="{x0 + 380}" y="{roof - 34}" width="90" height="34"/><path class="dw-thin" d="M{x0 + 390} {roof - 26}h70M{x0 + 390} {roof - 18}h70M{x0 + 390} {roof - 10}h70"/>'
    # beyond: back wall windows (elevation seen through the section)
    for f_lo, f_hi in zip(floors, floors[1:] + [roof]):
        top = f_hi + 12
        for k in range(5):
            wx = x0 + 40 + k * 104
            if k == 2:
                continue
            s += f'<rect class="dw-thin" x="{wx}" y="{top + 18}" width="64" height="{f_lo - top - 40}"/><path class="dw-hair" d="M{wx + 32} {top + 18}V{f_lo - 22}"/>'
    # stair core: zigzag flights between floors
    sx = x0 + 248
    for f_lo, f_hi in zip(floors, floors[1:]):
        mid = (f_lo + f_hi + 12) / 2
        d = f'M{sx} {f_lo}'
        for i in range(8):
            d += f'h7v-{(f_lo - mid) / 8:.1f}'
        d2 = f'M{sx + 56} {mid}'
        for i in range(8):
            d2 += f'h-7v-{(mid - f_hi - 12) / 8:.1f}'
        s += f'<path class="dw-line" d="{d}"/><path class="dw-line" d="{d2}"/><path class="dw-thin" d="M{sx + 56} {mid}h20"/>'
    # furniture per floor: tables and people
    for i, f in enumerate(floors):
        for k in range(3):
            tx = x0 + 40 + k * 70 + (i % 2) * 20
            s += f'<path class="dw-thin" d="M{tx} {f - 22}h44M{tx + 4} {f - 22}V{f}M{tx + 40} {f - 22}V{f}"/>'
        s += f'<path class="dw-thin" d="M{x0 + 360} {f - 26}h120M{x0 + 360} {f - 26}V{f}M{x0 + 480} {f - 26}V{f}"/>'
        s += _person(x0 + 340 + i * 37, f, 1, i % 2 == 0) + _person(x0 + 150 + i * 23, f, .95, i % 2 == 1)
    s += _person(x0 + 120, G + 70, .95) + f'<path class="dw-thin" d="M{x0 + 40} {G + 70}V{G + 30}h80V{G + 70}M{x0 + 160} {G + 70}V{G + 30}h80V{G + 70}"/>'
    # trees and ground figures
    s += _tree(rnd, 120, G, 40) + _tree(rnd, 1040, G, 52) + _tree(rnd, 1110, G, 32) + _person(230, G, 1) + _person(980, G, 1, True)
    # cast shadow on the right of the building
    s += f'<path class="dw-cast" d="M{x1 + 14} {roof - 18}L{x1 + 90} {G}H{x1 + 14}z" fill="url(#dw-learn-hatch)"/>'
    # levels
    for f, t in zip([G + 70] + floors + [roof], ['−3.60', '±0.00', '+4.20', '+8.40', '+12.60', '+16.00']):
        s += _level(x0 - 24, f, t, 'left')
    # dimension string (red) on the far right
    s += f'<g class="dw-dim"><path d="M{x1 + 120} {roof - 18}V{G}M{x1 + 114} {roof - 12}l12 -12M{x1 + 114} {G + 6}l12 -12M{x1 + 108} {roof - 18}h24M{x1 + 108} {G}h24"/>'
    s += f'<text transform="translate({x1 + 112} {(roof + G) / 2}) rotate(-90)">16.00 m</text></g>'
    # callouts: one per floor, each a link into Learn
    calls = [
        (x0 + 300, G - 40, 1000, G - 40, 'Start here', '/start/', 'Ground floor · Cyber 101'),
        (x0 + 200, floors[1] - 40, 1000, floors[1] - 46, 'Security+ Academy', '/academy/', 'Level 1 · 28 lessons'),
        (x0 + 420, floors[2] - 40, 1000, floors[2] - 52, 'IT track', '/it/', 'Level 2 · networking, Windows'),
        (x0 + 300, floors[3] - 40, 1000, floors[3] - 58, 'Readiness check', '/academy/readiness/', 'Level 3 · exam day'),
        (x0 + 140, G + 50, 250, G + 112, 'Cyber glossary', '/glossary/', 'Lower level · 134 terms'),
    ]
    for cx, cy, tx, ty, t, href, sub in calls:
        s += _call(cx, cy, tx, ty, t, base + href, 'end' if tx < cx else 'start', sub)
    s += _sheet(40, H - 62, W - 80, 'SECTION A–A · LEARNING CENTER', 'CYBERHUB · LEARN · SCALE 1:200 · CLICK A RED CALLOUT TO OPEN THAT FLOOR', 'A-301')
    return _figure('dw-learn', W, H, 'Section drawing of a four-story learning center. Each floor links to a part of Learn: Start here, Security+ Academy, IT track, Readiness check and the glossary.', s)


# ------------------------------------------------------------------ Practice: section through a training range (data hall)
def practice_drawing(base: str) -> str:
    rnd = random.Random(33)
    W, H, G = 1200, 520, 410
    x0, x1 = 170, 1030
    rf = G - 36            # raised floor surface
    ceil = G - 250
    roof = ceil - 30
    s = f'<rect class="dw-stipple" x="0" y="{G}" width="{W}" height="{H - G - 70}" fill="url(#dw-practice-stip)"/><path class="dw-ground" d="M30 {G}H{W - 30}"/>'
    # structure: slab on grade, walls, roof, all cut
    s += f'<rect class="dw-poche" x="{x0 - 16}" y="{G}" width="{x1 - x0 + 32}" height="16" fill="url(#dw-practice-hatch)"/>'
    s += f'<rect class="dw-poche" x="{x0 - 16}" y="{roof}" width="16" height="{G - roof}" fill="url(#dw-practice-hatch)"/><rect class="dw-poche" x="{x1}" y="{roof}" width="16" height="{G - roof}" fill="url(#dw-practice-hatch)"/>'
    s += f'<rect class="dw-poche" x="{x0 - 16}" y="{roof}" width="{x1 - x0 + 32}" height="16" fill="url(#dw-practice-hatch)"/>'
    s += f'<path class="dw-thin" d="M{x0} {ceil}H{x1}"/>'
    # raised floor with pedestals
    s += f'<path class="dw-line" d="M{x0} {rf}H{x1}M{x0} {rf + 4}H{x1}"/>'
    s += '<path class="dw-hair" d="' + ''.join(f'M{x} {rf + 4}V{G}' for x in range(x0 + 20, x1, 30)) + '"/>'
    # rack rows: 6 rows of racks seen in section (cut through the row)
    racks = []
    for i in range(6):
        rx = x0 + 70 + i * 132
        racks.append(rx)
        s += f'<rect class="dw-line" x="{rx}" y="{rf - 160}" width="46" height="160"/>'
        s += '<path class="dw-hair" d="' + ''.join(f'M{rx + 4} {rf - 160 + k * 10}h38' for k in range(1, 16)) + '"/>'
        s += f'<rect class="dw-led" x="{rx + 36}" y="{rf - 150}" width="4" height="3"/>'
        # cable tray above
        s += f'<path class="dw-thin" d="M{rx - 8} {rf - 186}h62M{rx - 8} {rf - 186}v-6M{rx + 54} {rf - 186}v-6M{rx + 23} {rf - 192}V{ceil}"/>'
    # cold air from the floor, hot air to the ceiling (red airflow)
    air = ''
    for i, rx in enumerate(racks):
        cold = rx - 40 if i % 2 == 0 else rx + 86
        air += _arrow(rnd, cold, rf + 2, cold, rf - 60)
    s += f'<path class="dw-air" d="{air}"/>'
    # cooling unit at the left, door at the right with a badge reader
    s += f'<rect class="dw-line" x="{x0 + 8}" y="{rf - 190}" width="36" height="190"/><path class="dw-thin" d="M{x0 + 14} {rf - 180}h24M{x0 + 14} {rf - 170}h24M{x0 + 14} {rf - 160}h24"/>'
    s += f'<rect class="dw-line" x="{x1 - 44}" y="{rf - 120}" width="36" height="120"/><circle class="dw-line" cx="{x1 - 14}" cy="{rf - 60}" r="2"/>'
    # people
    s += _person(racks[1] + 74, rf, 1) + _person(racks[3] + 70, rf, 1, True) + _person(racks[4] + 76, rf, .95)
    # outside: trees and fence
    s += _tree(rnd, 1120, G, 46)
    s += f'<path class="dw-thin" d="M{x1 + 60} {G}V{G - 70}M{x1 + 120} {G}V{G - 70}M{x1 + 60} {G - 66}H{x1 + 160}M{x1 + 60} {G - 40}H{x1 + 160}"/>'
    s += f'<path class="dw-cast" d="M{x0 - 16} {roof}L{x0 - 96} {G}H{x0 - 16}z" fill="url(#dw-practice-hatch)"/>'
    for y, t in [(G, '±0.00'), (rf, '+0.60'), (ceil, '+4.80'), (roof, '+5.70')]:
        s += _level(x0 - 30, y, t, 'left')
    calls = [
        (racks[0] + 23, rf - 120, racks[0] + 23, ceil - 66, 'Linux Lab', '/linux/', '36 levels'),
        (racks[1] + 23, rf - 120, racks[1] + 23, ceil - 66, 'Packet Lab', '/labs/packets/', 'read a capture'),
        (racks[2] + 23, rf - 120, racks[2] + 23, ceil - 66, 'SOC Simulator', '/labs/soc/', 'triage alerts'),
        (racks[3] + 23, rf - 120, racks[3] + 23, ceil - 66, 'Log Hunt', '/labs/logs/', 'trace a break-in'),
        (racks[4] + 23, rf - 120, racks[4] + 23, ceil - 66, 'Cloud Lab', '/labs/cloud/', 'misconfigurations'),
        (racks[5] + 23, rf - 120, racks[5] + 23, ceil - 66, 'Challenge board', '/challenges/', '16 flags'),
        (x1 - 14, rf - 60, x1 + 40, rf - 150, 'Lockdown Lab', '/labs/physical/', 'physical security'),
    ]
    for cx, cy, tx, ty, t, href, sub in calls:
        s += _call(cx, cy, tx, ty, t, base + href, 'start' if tx >= cx else 'end', sub)
    s += _sheet(30, H - 62, W - 60, 'SECTION B–B · TRAINING RANGE', 'CYBERHUB · PRACTICE · RAISED FLOOR, HOT AND COLD AISLES · SCALE 1:100', 'A-302')
    return _figure('dw-practice', W, H, 'Section drawing of a data hall used as a training range. Each rack links to a lab: Linux, Packet, SOC Simulator, Log Hunt, Cloud and the Challenge board. The door links to the Lockdown Lab.', s)


# ------------------------------------------------------------------ Careers: elevation of a tower, floor by floor
def careers_drawing(base: str) -> str:
    rnd = random.Random(45)
    W, H, G = 1200, 700, 610
    tx0, tx1 = 470, 730
    fh = 34
    n = 11
    top = G - n * fh
    s = f'<rect class="dw-stipple" x="0" y="{G}" width="{W}" height="{H - G - 70}" fill="url(#dw-careers-stip)"/><path class="dw-ground" d="M30 {G}H{W - 30}"/>'
    # concrete core on the left of the tower (stippled, formwork joints, tie holes)
    s += f'<rect class="dw-concrete" x="{tx0}" y="{top - 30}" width="70" height="{G - top + 30}" fill="url(#dw-careers-stip)"/><rect class="dw-line" x="{tx0}" y="{top - 30}" width="70" height="{G - top + 30}"/>'
    s += '<path class="dw-hair" d="' + ''.join(f'M{tx0} {y}h70' for y in range(top, G, 40)) + ''.join(f'M{tx0 + 35} {y}v40' for y in range(top - 30, G, 80)) + '"/>'
    s += '<g class="dw-ties">' + ''.join(f'<circle cx="{tx0 + 12 + (k % 3) * 23}" cy="{y + 20}" r="1.3"/>' for y in range(top - 30, G - 20, 40) for k in range(3)) + '</g>'
    # glazed floors with mullions and spandrels
    gx = tx0 + 70
    for i in range(n):
        y = G - (i + 1) * fh
        s += f'<path class="dw-line" d="M{gx} {y}H{tx1}"/><path class="dw-thin" d="M{gx} {y + 6}H{tx1}"/>'
        s += '<path class="dw-hair" d="' + ''.join(f'M{x} {y + 6}V{y + fh}' for x in range(gx + 19, tx1, 19)) + '"/>'
        if i % 3 == 1:
            s += f'<path class="dw-reflect" d="M{gx + 30 + i * 6} {y + fh - 4}l18 -22M{gx + 44 + i * 6} {y + fh - 4}l12 -14"/>'
    s += f'<rect class="dw-line" x="{tx0}" y="{top}" width="{tx1 - tx0}" height="{G - top}"/>'
    # fins on the right
    s += '<path class="dw-line" d="' + ''.join(f'M{tx1 + k * 9} {top}V{G}' for k in range(1, 3)) + '"/>'
    # crown and a tower crane: still building
    s += f'<path class="dw-line" d="M{tx0 + 10} {top - 30}h60v-20h-60z"/>'
    cx = tx0 + 150
    s += f'<path class="dw-line" d="M{cx} {top}V{top - 120}M{cx + 10} {top}V{top - 120}"/>'
    s += '<path class="dw-hair" d="' + ''.join(f'M{cx} {top - k * 12}l10 -12' for k in range(10)) + '"/>'
    s += f'<path class="dw-line" d="M{cx - 90} {top - 120}H{cx + 260}M{cx - 90} {top - 110}H{cx + 260}M{cx + 5} {top - 150}L{cx - 90} {top - 120}M{cx + 5} {top - 150}L{cx + 260} {top - 120}M{cx + 5} {top - 150}V{top - 120}"/>'
    s += '<path class="dw-hair" d="' + ''.join(f'M{cx + 20 + k * 20} {top - 120}l10 10' for k in range(12)) + '"/>'
    s += f'<rect class="dw-line" x="{cx - 86}" y="{top - 106}" width="34" height="22"/><path class="dw-thin" d="M{cx + 200} {top - 110}V{top - 60}"/><rect class="dw-red-fill" x="{cx + 192}" y="{top - 60}" width="16" height="10"/>'
    # podium and neighbors
    s += f'<rect class="dw-line" x="{tx0 - 140}" y="{G - 70}" width="140" height="70"/><path class="dw-hair" d="' + ''.join(f'M{x} {G - 64}V{G - 6}' for x in range(tx0 - 130, tx0, 20)) + '"/>'
    s += f'<rect class="dw-line" x="{tx1 + 20}" y="{G - 120}" width="150" height="120"/><path class="dw-hair" d="' + ''.join(f'M{tx1 + 20} {y}h150' for y in range(G - 110, G, 22)) + '"/>'
    s += _tree(rnd, 180, G, 46) + _tree(rnd, 250, G, 30) + _tree(rnd, 960, G, 50) + _person(380, G) + _person(905, G, 1, True) + _person(860, G, .95)
    s += f'<path class="dw-cast" d="M{tx1 + 18} {top}L{tx1 + 70} {G - 120}H{tx1 + 20}V{top}z" fill="url(#dw-careers-hatch)"/>'
    for i, t in [(0, '±0.00'), (3, '+12.60'), (6, '+25.20'), (9, '+37.80'), (n, '+46.20')]:
        s += _level(tx0 - 16, G - i * fh, t, 'left')
    calls = [
        (gx + 40, G - fh / 2, 860, G - 160, 'Internships', '/careers/internships/', 'Level 1 · get in the door'),
        (gx + 100, G - 3.5 * fh, 860, G - 230, 'Career roadmaps', '/careers/', 'Levels 2–5 · 12 roles'),
        (gx + 60, G - 6.5 * fh, 860, G - 300, 'Work roles', '/careers/roles/', 'Levels 6–8 · 15 roles mapped'),
        (gx + 120, G - 9.5 * fh, 860, top + 10, 'Which role are you?', '/careers/match/', 'Levels 9–11 · six questions'),
        (cx + 200, top - 55, 960, top - 120, 'Competitions', '/careers/competitions/', 'Under construction · keep building'),
        (tx0 - 70, G - 40, 300, G - 150, 'Resume tailor', '/careers/resume/', 'Podium · private, in your browser'),
    ]
    for cx_, cy_, tx_, ty_, t, href, sub in calls:
        s += _call(cx_, cy_, tx_, ty_, t, base + href, 'start' if tx_ >= cx_ else 'end', sub)
    s += _sheet(30, H - 62, W - 60, 'WEST ELEVATION · CAREER TOWER', 'CYBERHUB · CAREERS · EACH FLOOR IS A STEP · SCALE 1:400', 'A-201')
    return _figure('dw-careers', W, H, 'Elevation of an office tower under construction. The floors link to Careers pages: internships, roadmaps, work roles, the role quiz, competitions and the resume tailor.', s)


# ------------------------------------------------------------------ Resources: sketchy network graph
def resources_drawing(base: str) -> str:
    rnd = random.Random(57)
    W, H = 1200, 470
    nodes = [  # id, x, y, r, label, href, fill
        ('tools', 300, 160, 44, 'Tool explorer', '/tools/', 'dots'), ('tut', 150, 300, 34, 'Tutorials', '/tutorials/', 'zig'),
        ('trend', 470, 70, 28, 'Trending', '/tools/trending/', 'star'), ('ai', 640, 230, 52, 'AI guides', '/ai/', 'zig'),
        ('local', 820, 110, 30, 'Run AI locally', '/ai/local/', 'dots'), ('models', 900, 300, 32, 'AI leaderboard', '/ai/models/', 'star'),
        ('intel', 420, 330, 40, 'Intelligence desk', '/intelligence/', 'star'), ('vulns', 610, 380, 32, 'Vulnerabilities', '/vulnerabilities/', 'dots'),
        ('digest', 1050, 180, 28, 'Daily digest', '/archive/', 'zig'), ('search', 1040, 380, 26, 'Search', '/search/', 'dots'),
    ]
    at = {n[0]: n for n in nodes}
    edges = [('tools', 'tut'), ('tools', 'trend'), ('tools', 'ai'), ('ai', 'local'), ('ai', 'models'), ('tools', 'intel'), ('intel', 'vulns'),
             ('local', 'digest'), ('models', 'digest'), ('models', 'search'), ('vulns', 'search'), ('tut', 'intel'), ('trend', 'local')]
    hot = {('tools', 'intel'), ('intel', 'vulns'), ('vulns', 'search')}
    s = ''
    for a, b in edges:
        A, B = at[a], at[b]
        ang = math.atan2(B[2] - A[2], B[1] - A[1])
        x1, y1 = A[1] + math.cos(ang) * (A[3] + 6), A[2] + math.sin(ang) * (A[3] + 6)
        x2, y2 = B[1] - math.cos(ang) * (B[3] + 6), B[2] - math.sin(ang) * (B[3] + 6)
        cls = 'dw-sk-red' if (a, b) in hot else 'dw-sk'
        s += f'<path class="{cls}" d="{_wob(rnd, x1, y1, x2, y2, 3) + _wob(rnd, x1, y1, x2, y2, 2)}"/>'
    for nid, x, y, r, label, href, fill in nodes:
        clip = f'dw-resources-c-{nid}'
        inner = {'dots': f'<circle cx="{x}" cy="{y}" r="{r - 4}" fill="url(#dw-resources-dots)" class="dw-fill"/>',
                 'zig': f'<path class="dw-fill-l" d="{_zig(x - r, y - r * .35, 2 * r, r * .7, 8)}" clip-path="url(#{clip})"/>',
                 'star': f'<path class="dw-fill-l" d="{_star(x, y, r - 6, 18)}"/>'}[fill]
        red = nid in ('intel', 'vulns', 'tools', 'search')
        s += (f'<a class="dw-node{" red" if red else ""}" href="{E(base + href)}"><clipPath id="{clip}"><circle cx="{x}" cy="{y}" r="{r - 4}"/></clipPath>'
              f'{inner}<path class="dw-sk-node" d="{_rcircle(rnd, x, y, r)}"/>'
              f'<text class="dw-node-t" x="{x}" y="{y + r + 18}">{E(label)}</text></a>')
    s += f'<text class="dw-hand dw-red-t" x="500" y="452">a typical path: find a tool, read the intel, check the CVE, search the archive</text>'
    s += f'<path class="dw-sk-red" d="{_arrow(rnd, 480, 446, 430, 384)}"/>'
    return _figure('dw-resources', W, H, 'Hand-drawn network map of CyberHub resources: tool explorer, tutorials, trending, AI guides, running AI locally, the AI leaderboard, intelligence desk, vulnerabilities, daily digest and search. Each node is a link.', s, 'dw-sketch')


# ------------------------------------------------------------------ GIS: site plan with contours, buffers and coordinates
def gis_drawing(base: str) -> str:
    rnd = random.Random(69)
    W, H = 1200, 560
    mx0, my0, mx1, my1 = 60, 40, 1140, 470
    s = f'<rect class="dw-paper" x="{mx0}" y="{my0}" width="{mx1 - mx0}" height="{my1 - my0}"/>'
    s += f'<clipPath id="dw-gis-clip"><rect x="{mx0}" y="{my0}" width="{mx1 - mx0}" height="{my1 - my0}"/></clipPath><g clip-path="url(#dw-gis-clip)">'
    # contour lines around a hill (north-west)
    for k in range(1, 12):
        r = 30 + k * 34
        pts = []
        for i in range(48):
            a = i / 48 * math.pi * 2
            rr = r * (1 + .14 * math.sin(3 * a + k * .3) + .06 * math.sin(7 * a))
            pts.append(f'{260 + math.cos(a) * rr * 1.25:.1f} {170 + math.sin(a) * rr * .8:.1f}')
        s += f'<path class="{"dw-contour-i" if k % 5 == 0 else "dw-contour"}" d="M{"L".join(pts)}Z"/>'
    # river with flood zone hatch
    river = 'M60 400C220 380 330 440 480 420S760 330 880 360S1060 450 1140 430'
    s += f'<path class="dw-flood" d="{river}" fill="none" stroke="url(#dw-gis-hatch)" stroke-width="70"/><path class="dw-river" d="{river}"/><path class="dw-river" d="{river}" transform="translate(0 8)"/>'
    # roads and parcels
    s += '<path class="dw-road" d="M60 300H1140M700 40V470M60 300"/><path class="dw-road-c" d="M60 300H1140M700 40V470"/>'
    for x in range(720, 1140, 70):
        for y in range(60, 290, 56):
            s += f'<rect class="dw-parcel" x="{x + rnd.uniform(0, 4):.0f}" y="{y}" width="{60 - rnd.uniform(0, 8):.0f}" height="48"/>'
    for x in range(420, 690, 66):
        s += f'<rect class="dw-parcel" x="{x}" y="318" width="56" height="44"/>'
    # infrastructure points
    sub = (560, 210)
    dc = (900, 330)
    tower = (430, 120)
    s += f'<circle class="dw-buffer" cx="{sub[0]}" cy="{sub[1]}" r="120"/><circle class="dw-buffer" cx="{sub[0]}" cy="{sub[1]}" r="60"/>'
    s += f'<rect class="dw-site" x="{sub[0] - 22}" y="{sub[1] - 16}" width="44" height="32"/><path class="dw-thin" d="M{sub[0] - 14} {sub[1] - 8}h28M{sub[0] - 14} {sub[1]}h28M{sub[0] - 14} {sub[1] + 8}h28"/>'
    s += f'<rect class="dw-site" x="{dc[0] - 34}" y="{dc[1] - 22}" width="68" height="44"/><path class="dw-hair" d="' + ''.join(f'M{dc[0] - 26 + k * 10} {dc[1] - 16}v32' for k in range(6)) + '"/>'
    s += f'<path class="dw-line" d="M{tower[0]} {tower[1] - 18}L{tower[0] - 10} {tower[1] + 12}M{tower[0]} {tower[1] - 18}L{tower[0] + 10} {tower[1] + 12}M{tower[0] - 6} {tower[1]}h12"/>'
    s += f'<path class="dw-buffer" d="M{tower[0]} {tower[1]}m-150 0a150 150 0 1 0 300 0a150 150 0 1 0 -300 0"/>'
    # power line substation -> data center
    s += f'<path class="dw-power" d="M{sub[0]} {sub[1]}L{dc[0]} {dc[1]}"/>'
    s += '</g>'
    # graticule ticks and labels
    for i, lon in enumerate(['117°20′W', '117°18′W', '117°16′W', '117°14′W']):
        x = mx0 + 120 + i * 300
        s += f'<path class="dw-thin" d="M{x} {my0}v-8M{x} {my1}v8"/><text class="dw-coord" x="{x}" y="{my0 - 12}">{lon}</text>'
    for i, lat in enumerate(['34°11′N', '34°10′N', '34°09′N']):
        y = my0 + 90 + i * 140
        s += f'<path class="dw-thin" d="M{mx0} {y}h-8M{mx1} {y}h8"/><text class="dw-coord end" x="{mx0 - 12}" y="{y + 3}">{lat}</text>'
    s += f'<rect class="dw-frame" x="{mx0}" y="{my0}" width="{mx1 - mx0}" height="{my1 - my0}"/>'
    # north arrow and scale bar
    s += f'<g transform="translate({mx1 - 50} {my0 + 50})"><circle class="dw-thin" r="16"/><path class="dw-north" d="M0 -22L6 8L0 3L-6 8z"/><text class="dw-coord" y="-28">N</text></g>'
    s += f'<g class="dw-scale"><rect x="{mx0 + 20}" y="{my1 - 26}" width="60" height="6"/><rect class="w" x="{mx0 + 80}" y="{my1 - 26}" width="60" height="6"/><rect x="{mx0 + 140}" y="{my1 - 26}" width="60" height="6"/>'
    s += f'<text class="dw-coord" x="{mx0 + 20}" y="{my1 - 30}">0</text><text class="dw-coord" x="{mx0 + 200}" y="{my1 - 30}">1 km</text></g>'
    calls = [
        (sub[0], sub[1], 600, 70, 'Buffer analysis', '#buffer', 'what sits within 500 m of the substation?'),
        (dc[0], dc[1], 1000, 470 - 60, 'Flood exposure', '#layers', 'data center near the 100-year floodplain'),
        (tower[0], tower[1], 120, 90, 'Coverage', '#coords', 'cell tower range, a 1.5 km radius'),
        (700, 300, 760, 240, 'Coordinates', '#coords', 'every feature has a location'),
    ]
    for cx, cy, tx, ty, t, href, subt in calls:
        s += _call(cx, cy, tx, ty, t, href, 'start' if tx >= cx else 'end', subt)
    s += _sheet(60, H - 62, W - 120, 'SITE PLAN · CRITICAL INFRASTRUCTURE', 'CYBERHUB · GIS · ILLUSTRATIVE MAP, NOT SURVEY DATA · CONTOUR INTERVAL 10 m', 'G-101')
    return _figure('dw-gis', W, H, 'Hand-drafted site plan with contour lines, a river and its floodplain, roads, parcels, a substation with buffer rings, a data center and a cell tower with its coverage radius.', s)


# ------------------------------------------------------------------ Data: sketchy data-flow diagram
def data_drawing(base: str) -> str:
    rnd = random.Random(81)
    W, H = 1200, 430
    s = ''
    # external entities (squares), processes (circles), stores (open boxes)
    ents = [(40, 70, 'USGS feeds'), (40, 190, 'CISA KEV'), (40, 310, 'Sensor logs')]
    for x, y, t in ents:
        s += f'<path class="dw-sk-node" d="{_rbox(rnd, x, y, 130, 56)}"/><text class="dw-hand" x="{x + 65}" y="{y + 33}">{E(t)}</text>'
    procs = [(330, 190, 54, '1. Ingest', 'dots'), (560, 190, 54, '2. Clean', 'zig'), (790, 120, 50, '3. Join', 'star'), (790, 300, 50, '4. Analyze', 'dots')]
    for x, y, r, t, fill in procs:
        clip = f'dw-data-c{int(x)}{int(y)}'
        inner = {'dots': f'<circle cx="{x}" cy="{y}" r="{r - 5}" fill="url(#dw-data-dots)" class="dw-fill"/>',
                 'zig': f'<path class="dw-fill-l" d="{_zig(x - r, y - r * .3, 2 * r, r * .6, 8)}" clip-path="url(#{clip})"/>',
                 'star': f'<path class="dw-fill-l" d="{_star(x, y, r - 8, 16)}"/>'}[fill]
        s += f'<clipPath id="{clip}"><circle cx="{x}" cy="{y}" r="{r - 5}"/></clipPath>{inner}<path class="dw-sk-node" d="{_rcircle(rnd, x, y, r)}"/><text class="dw-hand dw-on" x="{x}" y="{y + r + 20}">{E(t)}</text>'
    # data store: open-ended box
    s += f'<path class="dw-sk-node" d="{_wob(rnd, 960, 190, 1120, 190) + _wob(rnd, 960, 236, 1120, 236) + _wob(rnd, 960, 190, 960, 236)}"/><text class="dw-hand" x="1040" y="218">D1  Tidy table</text>'
    s += f'<path class="dw-sk-node" d="{_rbox(rnd, 1000, 320, 150, 60)}"/><text class="dw-hand" x="1075" y="355">Map + chart</text>'
    arrows = [(172, 98, 280, 172), (172, 218, 274, 200), (172, 338, 280, 210), (386, 190, 504, 190), (612, 176, 740, 128), (612, 206, 740, 290),
              (842, 120, 958, 196), (842, 300, 958, 232), (1040, 240, 1060, 316)]
    s += '<path class="dw-sk" d="' + ''.join(_arrow(rnd, *a) for a in arrows) + '"/>'
    s += f'<path class="dw-sk-red" d="{_arrow(rnd, 612, 206, 740, 290)}"/>'
    s += f'<text class="dw-hand dw-red-t" x="560" y="300">drop duplicates,</text><text class="dw-hand dw-red-t" x="560" y="318">fix time zones</text>'
    s += f'<text class="dw-hand dw-red-t" x="880" y="78">join on location</text><path class="dw-sk-red" d="{_arrow(rnd, 880, 84, 830, 104)}"/>'
    return _figure('dw-data', W, H, 'Hand-drawn data-flow diagram: USGS feeds, CISA KEV and sensor logs flow into ingest, clean, join and analyze steps, then into a tidy table and a map and chart.', s, 'dw-sketch')
