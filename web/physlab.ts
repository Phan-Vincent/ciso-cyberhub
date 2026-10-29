// Lockdown Lab: physical security. Place defenses on a floor plan within a budget, harden the IT
// systems, then watch simulated intruders try their best path. Scored on detect / delay / respond.
// The engine (plans, coverage, paths, simulation) is pure and exported for tests; the UI is below.

/* ------------------------------------------------------------------ plans */
// Cells: '#' wall, '.' floor, ',' outside, '%' fence, 'G' gate, 'E' main entrance, 'B' service door,
// 'D' interior door, 'W' window, '1' server rack, '2' workstation, '3' OT controller.
export type Pt = { x: number; y: number };
export type Room = { name: string; x0: number; y0: number; x1: number; y1: number; restricted?: boolean; furniture?: string };
export type Attack = { id: string; name: string; brief: string; phase: 'night' | 'day'; start: 'edge' | Pt; mode: 'fast' | 'scout' | 'stealth'; targets: string[];
  tailgate?: boolean; delivery?: boolean; insider?: boolean };
export type Tier = { id: string; name: string; level: string; blurb: string; budget: number; it: number; response: number; w: number; h: number; grid: string[][]; rooms: Room[];
  assets: Record<string, { name: string; kind: 'rack' | 'ws' | 'ot'; label?: string }>; attacks: Attack[]; model: Placement[]; modelIt: string[] };

function plan(w: number, h: number) {
  const g: string[][] = Array.from({ length: h }, () => Array(w).fill(','));
  const api = {
    g,
    box(x0: number, y0: number, x1: number, y1: number, wall = '#', floor = '.') { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = (x === x0 || x === x1 || y === y0 || y === y1) ? wall : floor; return api; },
    h(y: number, x0: number, x1: number, c = '#') { for (let x = x0; x <= x1; x++) g[y][x] = c; return api; },
    v(x: number, y0: number, y1: number, c = '#') { for (let y = y0; y <= y1; y++) g[y][x] = c; return api; },
    set(x: number, y: number, c: string) { g[y][x] = c; return api; },
  };
  return api;
}

export const TIERS: Tier[] = (() => {
  // Ground Floor: a small office. One way to the server closet is much easier than the rest.
  const p1 = plan(24, 12).box(2, 1, 21, 10).v(12, 1, 10).h(6, 12, 21)
    .set(2, 4, 'E').set(12, 4, 'D').set(16, 6, 'D').set(21, 8, 'B')
    .set(7, 1, 'W').set(14, 1, 'W').set(21, 3, 'W').set(2, 7, 'W').set(18, 8, '1');
  // Secure Wing: lobby, open office, HR records, server room, loading dock and storage.
  const p2 = plan(32, 16).box(2, 1, 29, 14).v(9, 1, 14).h(8, 2, 9).h(9, 9, 29).v(21, 1, 14)
    .set(2, 4, 'E').set(9, 4, 'D').set(2, 11, 'B').set(9, 11, 'D').set(15, 9, 'D').set(21, 5, 'D').set(21, 11, 'D')
    .set(5, 1, 'W').set(14, 1, 'W').set(18, 1, 'W').set(25, 1, 'W').set(29, 5, 'W').set(2, 6, 'W').set(12, 14, 'W').set(17, 14, 'W')
    .set(26, 12, '1').set(26, 4, '2');
  // Black Site: fenced data center with a generator yard. Gate in the south fence.
  const p3 = plan(38, 22).box(1, 1, 36, 20, '%', ',').box(6, 4, 29, 16).v(20, 4, 12).h(12, 6, 29).v(13, 12, 16).v(22, 12, 16)
    .set(18, 20, 'G').set(17, 16, 'E').set(29, 14, 'B').set(20, 8, 'D').set(16, 12, 'D').set(25, 12, 'D').set(13, 14, 'D').set(22, 14, 'D')
    .set(6, 8, 'W').set(29, 6, 'W').set(10, 16, 'W').set(26, 16, 'W')
    .set(12, 7, '1').set(25, 7, '2').set(33, 9, '3');
  p3.h(6, 31, 35, '%').h(12, 31, 35, '%').v(31, 6, 12, '%').set(31, 9, 'G');
  const T = (o: Omit<Tier, 'grid'> & { grid: string[][] }) => o as Tier;
  return [
    T({ id: 'ground', name: 'Ground Floor', level: 'Beginner', blurb: 'A small office with one server closet. One night-time burglar. Learn detect, delay and respond.', budget: 1500, it: 5, response: 180, w: 24, h: 12, grid: p1.g,
      rooms: [{ name: 'Lobby', x0: 3, y0: 2, x1: 11, y1: 9, furniture: 'lobby' }, { name: 'Office', x0: 13, y0: 2, x1: 20, y1: 5, furniture: 'desks' }, { name: 'Server closet', x0: 13, y0: 7, x1: 20, y1: 9, restricted: true, furniture: 'racks' }],
      assets: { '1': { name: 'Server rack', kind: 'rack' } },
      attacks: [{ id: 'burglar', name: 'Night burglar', brief: 'Arrives at 2 a.m., tries the quickest way to the server closet.', phase: 'night', start: 'edge', mode: 'fast', targets: ['1'] }],
      model: [{ item: 'lock', x: 21, y: 8 }, { item: 'contact', x: 21, y: 8 }, { item: 'contact', x: 2, y: 4 }, { item: 'glass', x: 7, y: 1 }, { item: 'glass', x: 14, y: 1 }, { item: 'glass', x: 21, y: 3 }, { item: 'glass', x: 2, y: 7 },
        { item: 'reader', x: 16, y: 6 }, { item: 'motion', x: 17, y: 8 }, { item: 'cage', x: 18, y: 8 }],
      modelIt: ['fde', 'secboot'] }),
    T({ id: 'wing', name: 'Secure Wing', level: 'Intermediate', blurb: 'A full office: lobby, HR records, server room and a loading dock. Three attackers, day and night.', budget: 3500, it: 8, response: 210, w: 32, h: 16, grid: p2.g,
      rooms: [{ name: 'Lobby', x0: 3, y0: 2, x1: 8, y1: 7, furniture: 'lobby' }, { name: 'Loading dock', x0: 3, y0: 9, x1: 8, y1: 13, furniture: 'dock' }, { name: 'Open office', x0: 10, y0: 2, x1: 20, y1: 8, furniture: 'desks' },
        { name: 'Storage', x0: 10, y0: 10, x1: 20, y1: 13, furniture: 'shelves' }, { name: 'HR records', x0: 22, y0: 2, x1: 28, y1: 8, restricted: true, furniture: 'desk' }, { name: 'Server room', x0: 22, y0: 10, x1: 28, y1: 13, restricted: true, furniture: 'racks' }],
      assets: { '1': { name: 'Server rack', kind: 'rack' }, '2': { name: 'HR workstation', kind: 'ws' } },
      attacks: [
        { id: 'night', name: 'Night intruder', brief: 'Scouts every door and window, then takes whichever route works best.', phase: 'night', start: 'edge', mode: 'scout', targets: ['1', '2'] },
        { id: 'tailgate', name: 'Daytime tailgater', brief: 'Walks in behind staff in the morning rush and heads for HR.', phase: 'day', start: 'edge', mode: 'fast', targets: ['2'], tailgate: true },
        { id: 'delivery', name: 'Fake delivery driver', brief: 'Hi-vis vest, a clipboard and a box. Comes in through the loading dock.', phase: 'day', start: { x: 0, y: 11 }, mode: 'fast', targets: ['1'], delivery: true }],
      model: [{ item: 'reader', x: 9, y: 4 }, { item: 'reader', x: 2, y: 11 }, { item: 'reader', x: 21, y: 5 }, { item: 'reader', x: 21, y: 11 }, { item: 'cam', x: 27, y: 10, dir: 1 }, { item: 'cam', x: 27, y: 7, dir: 3 },
        { item: 'motion', x: 25, y: 11 }, { item: 'motion', x: 25, y: 4 }, { item: 'glass', x: 25, y: 1 }, { item: 'glass', x: 29, y: 5 }, { item: 'cage', x: 26, y: 12 }, { item: 'cam', x: 3, y: 2, dir: 1 }, { item: 'cam', x: 3, y: 9, dir: 0 },
        { item: 'glass', x: 12, y: 14 }, { item: 'glass', x: 17, y: 14 }, { item: 'glass', x: 14, y: 1 }, { item: 'glass', x: 18, y: 1 }, { item: 'glass', x: 5, y: 1 }, { item: 'glass', x: 2, y: 6 }],
      modelIt: ['screen', 'usb', 'cleandesk', 'nac'] }),
    T({ id: 'black', name: 'Black Site', level: 'Expert', blurb: 'A fenced data center with a generator yard. Attackers avoid your sensors, and one of them works here.', budget: 5500, it: 10, response: 300, w: 38, h: 22, grid: p3.g,
      rooms: [{ name: 'Data hall', x0: 7, y0: 5, x1: 19, y1: 11, restricted: true, furniture: 'racks' }, { name: 'NOC', x0: 21, y0: 5, x1: 28, y1: 11, restricted: true, furniture: 'desks' }, { name: 'Lobby', x0: 14, y0: 13, x1: 21, y1: 15, furniture: 'lobby' },
        { name: 'Staging', x0: 7, y0: 13, x1: 12, y1: 15, furniture: 'shelves' }, { name: 'Dock', x0: 23, y0: 13, x1: 28, y1: 15, furniture: 'dock' }, { name: 'Gen yard', x0: 32, y0: 7, x1: 35, y1: 11, restricted: true, furniture: 'gens' }],
      assets: { '1': { name: 'Customer racks', kind: 'rack' }, '2': { name: 'NOC console', kind: 'ws' }, '3': { name: 'Generator controller', kind: 'ot', label: 'Gen control' } },
      attacks: [
        { id: 'crew', name: 'Night crew', brief: 'Professionals. They study your sensors and take the quietest route, over the fence if needed.', phase: 'night', start: 'edge', mode: 'stealth', targets: ['1', '3'] },
        { id: 'insider', name: 'Insider', brief: 'A contractor with a valid badge, already in the lobby. Cameras are the only witness.', phase: 'day', start: { x: 17, y: 14 }, mode: 'fast', targets: ['2', '1'], insider: true },
        { id: 'social', name: 'Social engineer', brief: 'Shows up at the gate as "HVAC maintenance" and talks their way in.', phase: 'day', start: { x: 18, y: 21 }, mode: 'scout', targets: ['1'], tailgate: true }],
      model: [{ item: 'guard', x: 18, y: 17 }, { item: 'mantrap', x: 17, y: 16 }, { item: 'ircam', x: 7, y: 5, dir: 0 }, { item: 'ircam', x: 19, y: 11, dir: 2 }, { item: 'ircam', x: 28, y: 5, dir: 2 }, { item: 'ircam', x: 32, y: 7, dir: 1 },
        { item: 'reader', x: 16, y: 12 }, { item: 'reader', x: 25, y: 12 }, { item: 'reader', x: 31, y: 9 }, { item: 'cage', x: 12, y: 7 }, { item: 'motion', x: 12, y: 9 }, { item: 'light', x: 30, y: 18 }, { item: 'light', x: 8, y: 18 }],
      modelIt: ['camnet', 'screen', 'usb', 'siem', 'otseg', 'cleandesk'] }),
  ];
})();

/* ------------------------------------------------------------------ defenses */
export type ItemId = 'cam' | 'ircam' | 'motion' | 'light' | 'guard' | 'reader' | 'lock' | 'contact' | 'glass' | 'bars' | 'mantrap' | 'cage';
export type Placement = { item: ItemId; x: number; y: number; dir?: number };
export const ITEMS: Record<ItemId, { name: string; cost: number; on: 'inside' | 'outside' | 'floor' | 'door' | 'opening' | 'window' | 'entrance' | 'asset'; what: string }> = {
  cam: { name: 'Camera', cost: 250, on: 'floor', what: 'Sees 6 squares in a 90° cone. Walls and closed doors block it. Outside at night it needs a light.' },
  ircam: { name: 'Night camera (IR)', cost: 420, on: 'floor', what: 'Like a camera, 7 squares, and sees in the dark.' },
  motion: { name: 'Motion sensor', cost: 140, on: 'inside', what: 'Armed at night. Detects movement within 3 squares indoors.' },
  light: { name: 'Exterior light', cost: 80, on: 'outside', what: 'Lights 4 squares outside so normal cameras can see at night.' },
  guard: { name: 'Guard post', cost: 1400, on: 'floor', what: 'Sees 4 squares day and night, challenges visitors, and cuts response time to 60 s.' },
  reader: { name: 'Badge reader', cost: 300, on: 'door', what: 'Locks the door to badge holders. Tailgaters wait to slip in. Logs a forced door at night.' },
  lock: { name: 'High-security lock', cost: 220, on: 'door', what: 'Adds 90 s to force the door. No alarm on its own.' },
  contact: { name: 'Door/window sensor', cost: 60, on: 'opening', what: 'Alarms when the door or window opens at night.' },
  glass: { name: 'Glass-break sensor', cost: 90, on: 'window', what: 'Alarms when a window is broken.' },
  bars: { name: 'Window bars', cost: 180, on: 'window', what: 'Adds 180 s to get through a window.' },
  mantrap: { name: 'Mantrap', cost: 900, on: 'entrance', what: 'Two-door vestibule: one badge, one person. Stops tailgating at the main entrance.' },
  cage: { name: 'Locked rack cage', cost: 260, on: 'asset', what: 'Adds 150 s before anyone can touch the equipment.' },
};
export const CONTROLS: Record<string, { name: string; pts: number; what: string }> = {
  fde: { name: 'Full-disk encryption', pts: 3, what: 'A stolen drive is unreadable.' },
  secboot: { name: 'BIOS password + Secure Boot', pts: 2, what: 'Nobody boots the server from their own USB stick.' },
  nac: { name: '802.1X network access control', pts: 3, what: 'A rogue device plugged into a switch gets no network.' },
  screen: { name: 'Screen lock + auto log-off', pts: 1, what: 'An unattended session locks itself.' },
  usb: { name: 'USB device control', pts: 2, what: 'Keystroke-injection and storage USBs are blocked.' },
  cleandesk: { name: 'Clean desk + password manager', pts: 1, what: 'No passwords on sticky notes.' },
  camnet: { name: 'Isolated camera network, no default passwords', pts: 2, what: 'Nobody can log in to the camera recorder and switch it off.' },
  siem: { name: 'Central logging and alerts', pts: 2, what: 'The first suspicious action on a system raises an alarm.' },
  otseg: { name: 'OT segmentation + HMI passwords', pts: 2, what: 'The generator controller cannot be changed from a walk-up session.' },
};
type Step = { id: string; text: string; t: number; by: string };
export const STEPS: Record<'rack' | 'ws' | 'ot', Step[]> = {
  rack: [{ id: 'rogue', text: 'Plugs a rogue Wi-Fi bridge into the switch', t: 25, by: 'nac' }, { id: 'usbboot', text: 'Boots the server from a USB stick to reset the admin password', t: 45, by: 'secboot' }, { id: 'drive', text: 'Pulls a drive to read later', t: 35, by: 'fde' }],
  ws: [{ id: 'session', text: 'Uses the logged-in session', t: 15, by: 'screen' }, { id: 'ducky', text: 'Plugs in a keystroke-injection USB', t: 20, by: 'usb' }, { id: 'note', text: 'Reads a password from a sticky note', t: 10, by: 'cleandesk' }],
  ot: [{ id: 'hmi', text: 'Logs in to the controller with the default password', t: 20, by: 'otseg' }, { id: 'setpoint', text: 'Changes generator setpoints', t: 25, by: 'otseg' }],
};
export const NVR_STEP: Step = { id: 'nvr', text: 'Logs in to the camera recorder with the default password and turns recording off', t: 0, by: 'camnet' };

/* ------------------------------------------------------------------ geometry */
const at = (T: Tier, x: number, y: number) => (y >= 0 && y < T.h && x >= 0 && x < T.w ? T.grid[y][x] : '#');
const isOutside = (c: string) => c === ',' || c === '%' || c === 'G';
export const roomAt = (T: Tier, x: number, y: number) => T.rooms.find(r => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1);
const blocksSight = (c: string) => c === '#' || c === 'D' || c === 'E' || c === 'B' || c === 'G';
export function los(T: Tier, a: Pt, b: Pt): boolean {
  let x0 = a.x, y0 = a.y; const dx = Math.abs(b.x - x0), dy = -Math.abs(b.y - y0), sx = x0 < b.x ? 1 : -1, sy = y0 < b.y ? 1 : -1; let err = dx + dy;
  while (!(x0 === b.x && y0 === b.y)) { const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } if (x0 === b.x && y0 === b.y) break; if (blocksSight(at(T, x0, y0))) return false; }
  return true;
}
export function canPlace(T: Tier, P: Placement[], item: ItemId, x: number, y: number): string | null {
  const c = at(T, x, y), on = ITEMS[item].on;
  const ok = on === 'floor' ? (c === '.' || c === ',') : on === 'inside' ? c === '.' : on === 'outside' ? c === ',' : on === 'door' ? 'DEBG'.includes(c) : on === 'opening' ? 'DEBGW'.includes(c) :
    on === 'window' ? c === 'W' : on === 'entrance' ? c === 'E' : '123'.includes(c);
  if (!ok) return { floor: 'Place it on an open floor or ground square.', inside: 'Motion sensors go inside the building.', outside: 'Lights go outside.', door: 'Put it on a door or gate.', opening: 'Put it on a door, gate or window.',
    window: 'Put it on a window.', entrance: 'A mantrap goes on the main entrance.', asset: 'A cage goes around equipment (the red squares).' }[on];
  if (P.some(p => p.item === item && p.x === x && p.y === y)) return 'There is already one here.';
  if ((on === 'floor' || on === 'inside' || on === 'outside') && P.some(p => p.x === x && p.y === y && ['floor', 'inside', 'outside'].includes(ITEMS[p.item].on))) return 'That square is taken.';
  return null;
}
export const spent = (P: Placement[]) => P.reduce((n, p) => n + ITEMS[p.item].cost, 0);
export const itSpent = (C: string[]) => C.reduce((n, c) => n + (CONTROLS[c]?.pts || 0), 0);
export function cameraCells(T: Tier, P: Placement[], cam: Placement): Pt[] {
  const R = cam.item === 'ircam' ? 7 : 6, d = [[1, 0], [0, 1], [-1, 0], [0, -1]][cam.dir ?? 0], out: Pt[] = [];
  for (let y = cam.y - R; y <= cam.y + R; y++) for (let x = cam.x - R; x <= cam.x + R; x++) {
    const c = at(T, x, y); if (c === '#') continue; const vx = x - cam.x, vy = y - cam.y, dist = Math.hypot(vx, vy);
    if (dist > R + .01) continue; if (dist > 0 && (vx * d[0] + vy * d[1]) / dist < Math.SQRT1_2 - 1e-9) continue; if (!los(T, cam, { x, y })) continue; out.push({ x, y });
  }
  void P; return out;
}
const lit = (T: Tier, P: Placement[], x: number, y: number) => P.some(p => p.item === 'light' && Math.hypot(p.x - x, p.y - y) <= 4 && los(T, p, { x, y }));

/** Which sensors see the cell (x, y) during this attack. */
export function watchers(T: Tier, P: Placement[], A: Attack, x: number, y: number, camsOff = false): string[] {
  const out: string[] = []; const c = at(T, x, y), night = A.phase === 'night';
  const room = roomAt(T, x, y);
  for (const p of P) {
    if ((p.item === 'cam' || p.item === 'ircam') && !camsOff) {
      if (A.insider && !(room && room.restricted)) continue;   // an insider is expected in public areas
      if (!cameraCells(T, P, p).some(q => q.x === x && q.y === y)) continue;
      if (night && p.item === 'cam' && isOutside(c) && !lit(T, P, x, y)) continue;
      out.push(p.item === 'ircam' ? 'Night camera' : 'Camera');
    } else if (p.item === 'motion' && night && !isOutside(c) && Math.hypot(p.x - x, p.y - y) <= 3 && los(T, p, { x, y })) out.push('Motion sensor');
    else if (p.item === 'guard' && Math.hypot(p.x - x, p.y - y) <= 4 && los(T, p, { x, y }) && !(A.insider && !(room && room.restricted))) out.push('Guard');
  }
  return out;
}

/* ------------------------------------------------------------------ movement */
const WALK = 1.5;
/** Seconds to get through cell (x, y), or Infinity if this attacker cannot pass it. Also: does passing raise an alarm? */
export function passage(T: Tier, P: Placement[], A: Attack, x: number, y: number): { t: number; alarm?: string } {
  const c = at(T, x, y), here = P.filter(p => p.x === x && p.y === y), has = (i: ItemId) => here.some(p => p.item === i), night = A.phase === 'night';
  if (c === '#') return { t: Infinity };
  if (c === '.' || c === ',' || '123'.includes(c)) return { t: WALK };
  if (c === '%') return night ? { t: 35, alarm: undefined } : { t: Infinity };
  if (c === 'W') { if (!night) return { t: Infinity }; return { t: 40 + (has('bars') ? 180 : 0), alarm: has('glass') ? 'Glass-break sensor' : has('contact') ? 'Window sensor' : undefined }; }
  const forced = (base: number) => ({ t: base + (has('lock') ? 90 : 0) + (has('reader') ? 30 : 0), alarm: has('contact') ? 'Door sensor' : has('reader') ? 'Badge reader: door forced' : undefined });
  if (night) return c === 'D' && !has('reader') && !has('lock') ? { t: 4, alarm: has('contact') ? 'Door sensor' : undefined } : forced(c === 'D' ? 10 : 30);
  // daytime
  if (A.insider) return { t: has('mantrap') ? 15 : 4 };
  if (c === 'E') { if (has('mantrap')) return { t: Infinity }; return { t: has('reader') ? (A.tailgate ? 20 : Infinity) : 2 }; }
  if (c === 'G') return { t: has('reader') ? (A.tailgate ? 25 : Infinity) : 3 };
  if (c === 'B') return A.delivery ? { t: has('reader') ? 60 : 3 } : { t: has('reader') ? (A.tailgate ? 40 : Infinity) : 3 };
  return { t: has('reader') ? (A.tailgate || A.delivery ? 45 : Infinity) : 4 };
}

function starts(T: Tier, A: Attack): Pt[] {
  if (A.start !== 'edge') return [A.start];
  const out: Pt[] = []; for (let x = 0; x < T.w; x++) { out.push({ x, y: 0 }, { x, y: T.h - 1 }); } for (let y = 1; y < T.h - 1; y++) { out.push({ x: 0, y }, { x: T.w - 1, y }); }
  return out.filter(p => at(T, p.x, p.y) === ',');
}
/** Dijkstra over cells. penalty(x, y) adds cost for cells the attacker wants to avoid. Returns the cell path. */
export function route(T: Tier, P: Placement[], A: Attack, from: Pt[], to: (x: number, y: number) => boolean, penalty: (x: number, y: number) => number = () => 0): Pt[] | null {
  const W = T.w, dist = new Float64Array(W * T.h).fill(Infinity), prev = new Int32Array(W * T.h).fill(-1), done = new Uint8Array(W * T.h);
  const heap: [number, number][] = []; const push = (d: number, i: number) => { heap.push([d, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop()!; if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  for (const s of from) { const t = passage(T, P, A, s.x, s.y).t; if (t === Infinity) continue; const i = s.y * W + s.x; dist[i] = 0; push(0, i); }
  while (heap.length) {
    const [d, i] = pop(); if (done[i]) continue; done[i] = 1; const x = i % W, y = (i / W) | 0;
    if (to(x, y)) { const path: Pt[] = []; for (let k = i; k >= 0; k = prev[k]) path.unshift({ x: k % W, y: (k / W) | 0 }); return path; }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= T.h) continue; const j = ny * W + nx; if (done[j]) continue;
      const t = passage(T, P, A, nx, ny).t; if (t === Infinity) continue; const nd = d + t + penalty(nx, ny); if (nd < dist[j]) { dist[j] = nd; prev[j] = i; push(nd, j); } }
  }
  return null;
}

/* ------------------------------------------------------------------ simulation */
export type Event = { t: number; x: number; y: number; text: string; kind: 'move' | 'breach' | 'detect' | 'arrive' | 'step' | 'blocked' | 'caught' | 'respond' };
export type Result = { attack: Attack; path: Pt[]; times: number[]; events: Event[]; detectAt: number | null; detectBy: string; responseAt: number; reachAt: number | null; target: string | null;
  outcome: 'stopped' | 'contained' | 'breached'; executed: string[]; blocked: string[]; response?: number };

export function walk(T: Tier, P: Placement[], C: string[], A: Attack, path: Pt[]): Result {
  const camsOff = !!A.insider && !C.includes('camnet');
  const events: Event[] = []; const times: number[] = []; let t = 0, detectAt: number | null = null, detectBy = '';
  const response = P.some(p => p.item === 'guard') ? 60 : T.response;
  const detect = (when: number, by: string, x: number, y: number) => { if (detectAt === null) { detectAt = when; detectBy = by; events.push({ t: when, x, y, text: `Detected by ${by}. Response on the way (${response} s).`, kind: 'detect' }); } };
  if (A.insider) events.push({ t: 0, x: path[0].x, y: path[0].y, text: camsOff ? `${NVR_STEP.text}. Cameras are off for this attack.` : 'Tries the camera recorder: the network is isolated and passwords changed. Cameras stay on.', kind: camsOff ? 'step' : 'blocked' });
  let target: string | null = null, reachAt: number | null = null;
  for (let k = 0; k < path.length; k++) {
    const { x, y } = path[k]; const pass = passage(T, P, A, x, y); const c = at(T, x, y);
    if (k > 0 || A.start !== 'edge') t += pass.t;
    if (pass.t > 4 && !'.,123'.includes(c)) events.push({ t, x, y, text: c === 'W' ? `Gets through a window (${Math.round(pass.t)} s)` : c === '%' ? 'Climbs the fence (35 s)' : `Gets through ${c === 'G' ? 'the gate' : 'a door'} (${Math.round(pass.t)} s)`, kind: 'breach' });
    if (pass.alarm) detect(t, pass.alarm, x, y);
    const w = watchers(T, P, A, x, y, camsOff); if (w.length) detect(t, w[0], x, y);
    if (A.tailgate && c === 'G' && P.some(p => p.item === 'guard' && Math.hypot(p.x - x, p.y - y) <= 4)) detect(t, 'Guard at the gate (asks for a work order)', x, y);
    times.push(t);
    if (A.targets.includes(c)) { target = c; reachAt = t; break; }
  }
  const responseAt = detectAt === null ? Infinity : detectAt + response;
  const executed: string[] = [], blocked: string[] = [];
  let outcome: Result['outcome'] = 'contained';
  if (reachAt === null) outcome = 'stopped';
  else if (responseAt <= reachAt) { outcome = 'stopped'; events.push({ t: responseAt, x: path[path.length - 1].x, y: path[path.length - 1].y, text: 'Response arrives before they reach the target.', kind: 'caught' }); }
  else {
    const last = path[path.length - 1];
    events.push({ t: reachAt, x: last.x, y: last.y, text: `Reaches the ${T.assets[target!].name}.`, kind: 'arrive' });
    let now = reachAt; let resp = responseAt;
    if (P.some(p => p.item === 'cage' && p.x === last.x && p.y === last.y)) { now += 150; events.push({ t: now, x: last.x, y: last.y, text: 'Gets into the locked cage (150 s).', kind: 'breach' }); }
    for (const s of STEPS[T.assets[target!].kind]) {
      if (now >= resp) break;
      if (C.includes(s.by)) { blocked.push(s.id); now += 5; events.push({ t: now, x: last.x, y: last.y, text: `${s.text}: blocked by ${CONTROLS[s.by].name}.`, kind: 'blocked' }); continue; }
      if (now + s.t > resp) { events.push({ t: resp, x: last.x, y: last.y, text: `${s.text}: interrupted.`, kind: 'blocked' }); now = resp; break; }
      now += s.t; executed.push(s.id); events.push({ t: now, x: last.x, y: last.y, text: `${s.text}.`, kind: 'step' });
      if (C.includes('siem') && detectAt === null) { detectAt = now; detectBy = 'Central logging alert'; resp = now + response; events.push({ t: now, x: last.x, y: last.y, text: `Detected by central logging. Response on the way (${response} s).`, kind: 'detect' }); }
    }
    if (resp === Infinity) events.push({ t: now, x: last.x, y: last.y, text: 'Leaves. Nobody noticed.', kind: 'respond' });
    else if (resp <= now) events.push({ t: resp, x: last.x, y: last.y, text: 'Response arrives and catches them at the target.', kind: 'caught' });
    else events.push({ t: now, x: last.x, y: last.y, text: `Leaves ${Math.round(resp - now)} s before the response arrives.`, kind: 'respond' });
    outcome = executed.length ? 'breached' : 'contained';
  }
  events.sort((a, b) => a.t - b.t); path = path.slice(0, times.length);
  return { attack: A, path, times, events, detectAt, detectBy, responseAt: detectAt === null ? Infinity : detectAt + response, reachAt, target, outcome, executed, blocked, response };
}
/** Critical detection point: the last square on the route where detection still lets the response arrive before the attacker reaches the target. */
export function critical(r: Result): number {
  if (r.reachAt === null || !r.response) return -1; let k = -1;
  for (let i = 0; i < r.times.length; i++) if (r.reachAt - r.times[i] >= r.response) k = i;
  return k;
}
const rank = (r: Result) => (r.outcome === 'breached' ? 3000 : r.outcome === 'contained' ? 2000 : 1000) + r.executed.length * 100 + Math.min(999, Math.max(0, (r.responseAt === Infinity ? 999 : r.responseAt - (r.reachAt ?? r.responseAt))));

/** The attacker's best plan against these defenses. Smarter attackers consider more routes. */
export function simulate(T: Tier, P: Placement[], C: string[], A: Attack): Result {
  const from = starts(T, A); const cands: Pt[][] = [];
  for (const target of A.targets) {
    const isT = (x: number, y: number) => at(T, x, y) === target;
    const fast = route(T, P, A, from, isT); if (fast) cands.push(fast);
    if (A.mode !== 'fast') {
      const openings: Pt[] = []; for (let y = 0; y < T.h; y++) for (let x = 0; x < T.w; x++) { const c = T.grid[y][x]; if ('EBWG'.includes(c) || (c === '%' && (x + y) % 3 === 0)) openings.push({ x, y }); }
      for (const o of openings) { const a = route(T, P, A, from, (x, y) => x === o.x && y === o.y); if (!a) continue; const b = route(T, P, A, [o], isT); if (b) cands.push([...a, ...b.slice(1)]); }
    }
    if (A.mode === 'stealth') { const camsOff = !!A.insider && !C.includes('camnet'); const pen = (x: number, y: number) => (watchers(T, P, A, x, y, camsOff).length ? 400 : 0) + (passage(T, P, A, x, y).alarm ? 400 : 0);
      const quiet = route(T, P, A, from, isT, pen); if (quiet) cands.push(quiet); }
  }
  if (!cands.length) return { attack: A, path: [from[0]], times: [0], events: [{ t: 0, x: from[0].x, y: from[0].y, text: 'Finds no way in at all.', kind: 'caught' }], detectAt: null, detectBy: '', responseAt: Infinity, reachAt: null, target: null, outcome: 'stopped', executed: [], blocked: [] };
  let best: Result | null = null; for (const p of cands) { const r = walk(T, P, C, A, p); if (!best || rank(r) > rank(best)) best = r; }
  return best!;
}
export function grade(T: Tier, P: Placement[], C: string[]) {
  const results = T.attacks.map(A => simulate(T, P, C, A));
  const over = spent(P) > T.budget || itSpent(C) > T.it;
  const stopped = results.filter(r => r.outcome === 'stopped').length, breached = results.filter(r => r.outcome === 'breached').length;
  const detected = results.filter(r => r.detectAt !== null).length;
  // 3: nothing taken and every attacker seen. 2: nothing taken. 1: at least one attack held. 0: everything lost or over budget.
  const stars = over ? 0 : !breached ? (detected === results.length ? 3 : 2) : breached < results.length ? 1 : 0;
  return { results, stars, over, stopped, breached, detected };
}

/* ================================================================== UI */
const NS = 'http://www.w3.org/2000/svg';
const C = 24, M = { l: 44, t: 64, r: 28, b: 92 };
const fmtT = (t: number) => { const s = Math.max(0, Math.round(t)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const money = (n: number) => '$' + n.toLocaleString('en-US');
const DIRS = ['→ East', '↓ South', '← West', '↑ North'];
const SHEET: Record<string, string> = { ground: 'A-101', wing: 'A-201', black: 'A-301' };

/** Deterministic pencil scribble for trees. */
function scribble(cx: number, cy: number, r: number, seed: number) {
  let a = seed * 9301 + 49297; const rnd = () => ((a = (a * 9301 + 49297) % 233280) / 233280);
  let d = ''; const n = 26;
  for (let i = 0; i <= n; i++) { const t = (i / n) * Math.PI * 2 * 3.2, rr = r * (0.35 + 0.65 * rnd()); d += `${i ? 'L' : 'M'}${(cx + Math.cos(t) * rr).toFixed(1)} ${(cy + Math.sin(t) * rr * 0.92).toFixed(1)}`; }
  return d;
}

function basePlan(T: Tier): string {
  const W = T.w * C, H = T.h * C; let s = '';
  const g = (x: number, y: number) => at(T, x, y);
  s += `<defs><pattern id="pl-stip" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r=".7"/><circle cx="10" cy="2" r=".5"/><circle cx="7" cy="10" r=".8"/><circle cx="12" cy="12" r=".5"/><circle cx="1" cy="12" r=".4"/></pattern>`
    + `<pattern id="pl-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6"/></pattern>`
    + `<marker id="pl-arrow" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L8 4L0 8z"/></marker></defs>`;
  s += `<rect class="pl-site" x="0" y="0" width="${W}" height="${H}"/><rect class="pl-stip" x="0" y="0" width="${W}" height="${H}"/>`;
  // floors
  let floor = '', grid = '';
  for (let y = 0; y < T.h; y++) for (let x = 0; x < T.w; x++) { const c = g(x, y); if (c === '.' || '123'.includes(c) || ('DEBW'.includes(c))) floor += `M${x * C} ${y * C}h${C}v${C}h${-C}z`; }
  s += `<path class="pl-floor" d="${floor}"/>`;
  for (const r of T.rooms) { for (let x = r.x0 + 1; x <= r.x1; x++) grid += `M${x * C} ${r.y0 * C}V${(r.y1 + 1) * C}`; for (let y = r.y0 + 1; y <= r.y1; y++) grid += `M${r.x0 * C} ${y * C}H${(r.x1 + 1) * C}`; }
  s += `<path class="pl-grid" d="${grid}"/>`;
  // dock hatch + restricted outlines
  for (const r of T.rooms) {
    if (r.furniture === 'dock') s += `<rect class="pl-hatch" x="${r.x0 * C + 4}" y="${(r.y1 - 1) * C + 4}" width="${(r.x1 - r.x0 + 1) * C - 8}" height="${2 * C - 8}"/>`;
    if (r.restricted) s += `<rect class="pl-restricted" x="${r.x0 * C + 5}" y="${r.y0 * C + 5}" width="${(r.x1 - r.x0 + 1) * C - 10}" height="${(r.y1 - r.y0 + 1) * C - 10}"/>`;
  }
  // furniture
  let f = '';
  const assetIn = (x: number, y: number) => '123'.includes(g(x, y)) || '123'.includes(g(x + 1, y));
  for (const r of T.rooms) {
    const w = r.x1 - r.x0 + 1, h = r.y1 - r.y0 + 1, X = r.x0 * C, Y = r.y0 * C;
    if (r.furniture === 'desks') for (let y = r.y0 + 2; y + 1 <= r.y1; y += 3) for (let x = r.x0 + 1; x + 1 <= r.x1 - 1; x += 3) { if (assetIn(x, y)) continue;
      f += `<rect x="${x * C + 2}" y="${y * C + 4}" width="${2 * C - 4}" height="${C - 8}"/><circle cx="${x * C + C}" cy="${(y + 1) * C + 4}" r="5"/>`; }
    if (r.furniture === 'desk') f += `<path d="M${X + w * C - 10} ${Y + 8}h-${2 * C}v${C}"/><circle cx="${X + w * C - 2 * C}" cy="${Y + 2 * C}" r="5"/>`;
    if (r.furniture === 'racks') for (let x = r.x0 + 1; x <= r.x1 - 1; x += 2) { let hit = false; for (let yy = r.y0 + 1; yy <= r.y1; yy++) if ('123'.includes(g(x, yy)) || '123'.includes(g(x + 1, yy)) || '123'.includes(g(x - 1, yy))) hit = true; if (hit) continue;
      f += `<rect x="${x * C + 3}" y="${Y + C + 10}" width="${C - 6}" height="${h * C - C - 18}"/><path d="M${x * C + 3} ${Y + (h * C + C) / 2}h${C - 6}"/>`; }
    if (r.furniture === 'lobby') f += `<path d="M${X + 10} ${Y + h * C - 1.6 * C}a${1.5 * C} ${1.5 * C} 0 0 0 ${3 * C} 0"/><rect x="${X + w * C - C - 6}" y="${Y + C + 10}" width="${C - 4}" height="${2.4 * C}"/><circle cx="${X + w * C - 14}" cy="${Y + h * C - 14}" r="7"/>`;
    if (r.furniture === 'shelves') { f += `<rect x="${X + 6}" y="${Y + C + 6}" width="10" height="${h * C - C - 12}"/><rect x="${X + w * C - 16}" y="${Y + C + 6}" width="10" height="${h * C - C - 12}"/><rect x="${X + 2 * C}" y="${Y + h * C - 16}" width="${w * C - 4 * C}" height="10"/>`; }
    if (r.furniture === 'dock') f += `<rect x="${X + w * C - 1.6 * C - 8}" y="${Y + C + 8}" width="${1.6 * C}" height="${1.1 * C}"/><rect x="${X + w * C - 3.4 * C - 8}" y="${Y + C + 8}" width="${1.6 * C}" height="${1.1 * C}"/>`;
    if (r.furniture === 'gens') for (let k = 0; k < 2; k++) f += `<rect x="${X + 6 + k * 2 * C}" y="${Y + h * C - 1.6 * C}" width="${1.6 * C}" height="${1.2 * C}"/><circle cx="${X + 6 + k * 2 * C + .8 * C}" cy="${Y + h * C - C}" r="7"/>`;
  }
  s += `<g class="pl-furn">${f}</g>`;
  // walls (solid poche), merged per row
  let walls = '';
  for (let y = 0; y < T.h; y++) { let x = 0; while (x < T.w) { if (g(x, y) !== '#') { x++; continue; } const x0 = x; while (g(x, y) === '#') x++; walls += `M${x0 * C} ${y * C}h${(x - x0) * C}v${C}h${-(x - x0) * C}z`; } }
  s += `<path class="pl-wall" d="${walls}"/>`;
  // fences
  let fence = '', ticks = '';
  for (let y = 0; y < T.h; y++) for (let x = 0; x < T.w; x++) { const c = g(x, y); if (c !== '%' && !(c === 'G')) continue; const cx = x * C + C / 2, cy = y * C + C / 2;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = g(x + dx, y + dy); if (n === '%' || n === 'G') fence += `M${cx} ${cy}L${cx + dx * C / 2} ${cy + dy * C / 2}`; }
    if (c === '%' && (x + y) % 2 === 0) ticks += `M${cx - 3} ${cy - 3}l6 6M${cx + 3} ${cy - 3}l-6 6`; }
  s += `<path class="pl-fence" d="${fence}"/><path class="pl-fence-x" d="${ticks}"/>`;
  // openings
  for (let y = 0; y < T.h; y++) for (let x = 0; x < T.w; x++) {
    const c = g(x, y); if (!'DEBWG'.includes(c)) continue;
    const horiz = '#%WDEBG'.includes(g(x - 1, y)) && '#%WDEBG'.includes(g(x + 1, y)); const X = x * C, Y = y * C;
    if (c === 'G') { s += `<rect class="pl-gap" x="${X}" y="${Y}" width="${C}" height="${C}"/>` + (horiz ? `<path class="pl-door" d="M${X} ${Y + C / 2}l${C / 2} -9M${X + C} ${Y + C / 2}l${-C / 2} -9"/>` : `<path class="pl-door" d="M${X + C / 2} ${Y}l-9 ${C / 2}M${X + C / 2} ${Y + C}l-9 ${-C / 2}"/>`); continue; }
    if (c === 'W') { s += horiz ? `<rect class="pl-gap" x="${X}" y="${Y}" width="${C}" height="${C}"/><path class="pl-win" d="M${X} ${Y + 5}h${C}M${X} ${Y + C / 2}h${C}M${X} ${Y + C - 5}h${C}M${X} ${Y + 5}v${C - 10}M${X + C} ${Y + 5}v${C - 10}"/>`
      : `<rect class="pl-gap" x="${X}" y="${Y}" width="${C}" height="${C}"/><path class="pl-win" d="M${X + 5} ${Y}v${C}M${X + C / 2} ${Y}v${C}M${X + C - 5} ${Y}v${C}M${X + 5} ${Y}h${C - 10}M${X + 5} ${Y + C}h${C - 10}"/>`; continue; }
    // door: leaf swings toward the inside (a floor cell that is not outside)
    s += `<rect class="pl-gap" x="${X}" y="${Y}" width="${C}" height="${C}"/>`;
    if (horiz) { const down = g(x, y + 1) === '.' || '123'.includes(g(x, y + 1)) ? (g(x, y - 1) === ',' || c === 'D' ? 1 : 1) : -1; const sy = down > 0 ? Y + C : Y;
      s += `<path class="pl-door" d="M${X} ${sy}v${down * C}"/><path class="pl-swing" d="M${X} ${sy + down * C}A${C} ${C} 0 0 ${down > 0 ? 0 : 1} ${X + C} ${sy}"/>`; }
    else { const right = g(x + 1, y) === '.' || '123'.includes(g(x + 1, y)) ? 1 : -1; const sx = right > 0 ? X + C : X;
      s += `<path class="pl-door" d="M${sx} ${Y}h${right * C}"/><path class="pl-swing" d="M${sx + right * C} ${Y}A${C} ${C} 0 0 ${right > 0 ? 1 : 0} ${sx} ${Y + C}"/>`; }
    if (c !== 'D') { const lbl = c === 'E' ? 'ENTRY' : 'SERVICE';
      if (horiz) s += `<text class="pl-tag" x="${X + C / 2}" y="${g(x, y - 1) === ',' ? Y - 6 : Y + C + 12}">${lbl}</text>`;
      else s += g(x - 1, y) === ',' ? `<text class="pl-tag pl-tag-e" x="${X - 5}" y="${Y + C / 2 + 2.5}">${lbl}</text>` : `<text class="pl-tag pl-tag-s" x="${X + C + 5}" y="${Y + C / 2 + 2.5}">${lbl}</text>`; }
  }
  // trees on open ground, away from walls
  let k = 0;
  for (let y = 1; y < T.h - 1; y += 3) for (let x = 1; x < T.w - 1; x += 3) {
    let clear = true; for (let dy = -2; dy <= 2 && clear; dy++) for (let dx = -2; dx <= 2; dx++) if (g(x + dx, y + dy) !== ',') { clear = false; break; }
    if (!clear || (x * 7 + y * 13) % 5 > 1) continue; k++;
    const cx = x * C + C / 2, cy = y * C + C / 2; s += `<g class="pl-tree"><circle cx="${cx}" cy="${cy}" r="${C * .95}"/><path d="${scribble(cx, cy, C * .85, k)}"/><circle class="pl-trunk" cx="${cx}" cy="${cy}" r="1.6"/></g>`;
  }
  // room labels
  for (const r of T.rooms) {
    const cx = (r.x0 + r.x1 + 1) * C / 2, cy = r.y0 * C + 22, area = Math.round((r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1) * 2.25);
    s += `<text class="pl-room" x="${cx}" y="${cy - 2}">${r.name.toUpperCase()}</text><text class="pl-area" x="${cx}" y="${cy + 11}">${area} m²${r.restricted ? ' · RESTRICTED' : ''}</text>`;
  }
  // assets
  for (let y = 0; y < T.h; y++) for (let x = 0; x < T.w; x++) { const c = g(x, y); if (!'123'.includes(c)) continue;
    s += `<rect class="pl-asset" x="${x * C + 3}" y="${y * C + 3}" width="${C - 6}" height="${C - 6}"/><path class="pl-asset-x" d="M${x * C + 3} ${y * C + 3}l${C - 6} ${C - 6}M${x * C + C - 3} ${y * C + 3}l${-(C - 6)} ${C - 6}"/>`
      + `<text class="pl-asset-t" x="${x * C + C / 2}" y="${(y + 1) * C + 9}">${(T.assets[c].label || T.assets[c].name).toUpperCase()}</text>`; }
  // dimension strings (red), from building extents
  let bx0 = T.w, bx1 = -1, by0 = T.h, by1 = -1;
  for (let y = 0; y < T.h; y++) for (let x = 0; x < T.w; x++) if ('#EBWD'.includes(g(x, y))) { bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y); }
  const dy = -30, dx = -30, m = (n: number) => (n * 1.5).toFixed(1) + ' m';
  const vx: number[] = [bx0]; for (let x = bx0 + 1; x < bx1; x++) if (g(x, by0) === '#' && g(x, by0 + 1) === '#' && g(x, by0 + 2) === '#') vx.push(x); vx.push(bx1 + 1);
  let dim = `M${bx0 * C} ${dy}H${(bx1 + 1) * C}`, dt = '';
  for (let i = 0; i < vx.length; i++) { const X = vx[i] * C + (i && i < vx.length - 1 ? C / 2 : 0); dim += `M${X - 4} ${dy + 4}l8 -8M${X} ${dy - 7}V${by0 * C - 6}`;
    if (i) { const pX = vx[i - 1] * C + (i - 1 ? C / 2 : 0); dt += `<text class="pl-dim-t" x="${(pX + X) / 2}" y="${dy - 6}">${m((X - pX) / C)}</text>`; } }
  dim += `M${dx} ${by0 * C}V${(by1 + 1) * C}M${dx - 4} ${by0 * C + 4}l8 -8M${dx - 4} ${(by1 + 1) * C + 4}l8 -8M${dx - 7} ${by0 * C}H${bx0 * C - 6}M${dx - 7} ${(by1 + 1) * C}H${bx0 * C - 6}`;
  dt += `<text class="pl-dim-t" transform="translate(${dx - 7} ${(by0 + by1 + 1) * C / 2}) rotate(-90)">${m(by1 - by0 + 1)}</text>`;
  s += `<g class="pl-dim"><path d="${dim}"/>${dt}</g>`;
  // title block + north arrow
  const ty = H + 26;
  s += `<g class="pl-title"><path class="pl-title-rule" d="M0 ${ty}H${W}"/><text class="pl-sheet" x="0" y="${ty + 26}">${T.name.toUpperCase()} — SECURITY PLAN</text>`
    + `<text class="pl-sheet-s" x="0" y="${ty + 44}">LOCKDOWN LAB · ${T.level.toUpperCase()} · 1 SQUARE = 1.5 m · SCALE 1:150</text>`
    + `<text class="pl-sheet-n" x="${W}" y="${ty + 30}">${SHEET[T.id]}</text>`
    + `<g transform="translate(${W - 92} ${ty + 22})"><circle r="11" class="pl-north"/><path class="pl-north-a" d="M0 -16L5 6L0 2L-5 6z"/><text class="pl-sheet-s" x="0" y="-20">N</text></g></g>`;
  return s;
}

function itemGlyph(p: Placement): string {
  const X = p.x * C, Y = p.y * C, cx = X + C / 2, cy = Y + C / 2;
  switch (p.item) {
    case 'cam': case 'ircam': { const a = (p.dir ?? 0) * 90; return `<g transform="rotate(${a} ${cx} ${cy})"><rect class="pl-i" x="${cx - 7}" y="${cy - 5}" width="11" height="10"/><path class="pl-i" d="M${cx + 4} ${cy - 3}l5 -3v12l-5 -3"/>${p.item === 'ircam' ? `<circle class="pl-i-f" cx="${cx - 2}" cy="${cy}" r="2"/>` : ''}</g>`; }
    case 'motion': return `<circle class="pl-i" cx="${cx}" cy="${cy}" r="6"/><path class="pl-i" d="M${cx - 3} ${cy}a3 3 0 0 1 6 0"/>`;
    case 'light': return `<circle class="pl-i" cx="${cx}" cy="${cy}" r="4"/><path class="pl-i" d="M${cx} ${cy - 10}v4M${cx} ${cy + 6}v4M${cx - 10} ${cy}h4M${cx + 6} ${cy}h4M${cx - 7} ${cy - 7}l3 3M${cx + 4} ${cy + 4}l3 3M${cx + 7} ${cy - 7}l-3 3M${cx - 4} ${cy + 4}l-3 3"/>`;
    case 'guard': return `<circle class="pl-i pl-i-f" cx="${cx}" cy="${cy}" r="8"/><text class="pl-i-t" x="${cx}" y="${cy + 3.5}">G</text>`;
    case 'reader': return `<rect class="pl-i pl-i-f" x="${X + 2}" y="${Y + 2}" width="9" height="12"/><path class="pl-i-w" d="M${X + 4} ${Y + 6}h5"/>`;
    case 'lock': return `<rect class="pl-i pl-i-f" x="${X + C - 12}" y="${Y + C - 11}" width="9" height="8"/><path class="pl-i" d="M${X + C - 10} ${Y + C - 11}v-3a2.5 2.5 0 0 1 5 0v3"/>`;
    case 'contact': return `<rect class="pl-i pl-i-f" x="${X + C - 9}" y="${Y + 2}" width="4" height="4"/><rect class="pl-i pl-i-f" x="${X + C - 5}" y="${Y + 2}" width="4" height="4"/>`;
    case 'glass': return `<path class="pl-i" d="M${X + 2} ${Y + C - 4}l4 -5l4 5l4 -5l4 5l4 -5"/>`;
    case 'bars': return `<path class="pl-i" d="M${X + 4} ${Y}v${C}M${X + 10} ${Y}v${C}M${X + 16} ${Y}v${C}M${X + 22} ${Y}v${C}M${X} ${Y + 4}h${C}M${X} ${Y + C - 4}h${C}"/>`;
    case 'mantrap': return `<rect class="pl-i" x="${X - 4}" y="${Y - 4}" width="${C + 8}" height="${C + 8}"/><rect class="pl-i" x="${X + 2}" y="${Y + 2}" width="${C - 4}" height="${C - 4}"/>`;
    case 'cage': return `<rect class="pl-i pl-cage" x="${X - 3}" y="${Y - 3}" width="${C + 6}" height="${C + 6}"/>`;
  }
  return '';
}

/** Replace an SVG group's content with drawing markup generated in this file (XML parser: never runs scripts). */
function svgSet(g: Element, markup: string) {
  if (/<script|\son[a-z]+\s*=|javascript:/i.test(markup)) throw new Error('unexpected markup');
  const doc = new DOMParser().parseFromString(`<svg xmlns="${NS}">${markup}</svg>`, 'image/svg+xml');
  g.replaceChildren(...Array.from(doc.documentElement.childNodes).map(n => document.importNode(n, true)));
}
type Kid = Node | string | null | false | undefined;
function h(tag: string, props: Record<string, string> = {}, ...kids: Kid[]): HTMLElement {
  const e = document.createElement(tag); for (const [k, v] of Object.entries(props)) e.setAttribute(k, v);
  for (const k of kids) if (k) e.append(k); return e;
}

const root = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('#phys');
if (root) {
  const KEY = 'cyberhub:phys', LKEY = 'cyberhub:phys:layout';
  const load = <V>(k: string, d: V): V => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v && typeof v === 'object' ? v : d; } catch { return d; } };
  const store = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage off */ } };
  const stars: Record<string, number> = load(KEY, {});
  const layouts: Record<string, { P: Placement[]; C: string[] }> = load(LKEY, {});
  const $ = <E extends Element = HTMLElement>(sel: string) => root.querySelector<E>(sel as string)!;
  const svg = $<SVGSVGElement>('#pl-svg'), live = $('#pl-live'), info = $('#pl-info');
  const base = svg.querySelector('#pl-base')!, cover = svg.querySelector('#pl-cover')!, items = svg.querySelector('#pl-items')!, run = svg.querySelector('#pl-run')!, cursor = svg.querySelector<SVGRectElement>('#pl-cursor')!;
  let T = TIERS[0], P: Placement[] = [], CT: string[] = [], tool: ItemId | 'erase' = 'cam', dir = 0, cur: Pt = { x: 3, y: 3 }, phase = 'defend', graded: ReturnType<typeof grade> | null = null, shown = 0, anim = 0;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const say = (m: string) => { live.textContent = m; };

  const saveLayout = () => { layouts[T.id] = { P, C: CT }; store(LKEY, layouts); };
  function budget() {
    const used = spent(P), it = itSpent(CT);
    $('#pl-money').textContent = `${money(used)} of ${money(T.budget)}`; $('#pl-money-bar').style.setProperty('--f', String(Math.min(1, used / T.budget)));
    $('#pl-money-wrap').classList.toggle('over', used > T.budget);
    $('#pl-it').textContent = `${it} of ${T.it} points`; $('#pl-it-bar').style.setProperty('--f', String(Math.min(1, it / T.it)));
    $('#pl-it-wrap').classList.toggle('over', it > T.it);
    $<HTMLButtonElement>('#pl-go').disabled = used > T.budget || it > T.it;
    $('#pl-go-note').textContent = used > T.budget ? `Over budget by ${money(used - T.budget)}. Remove something first.` : it > T.it ? 'Too many IT controls for the IT budget.' : '';
    root.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach(b => { const id = b.dataset.tool as ItemId; if (id in ITEMS) b.classList.toggle('dim', used + ITEMS[id].cost > T.budget); });
    root.querySelectorAll<HTMLInputElement>('[data-ctl]').forEach(i => { i.checked = CT.includes(i.dataset.ctl!); });
  }
  function drawItems() {
    let cv = '', it = '';
    for (const p of P) {
      if (p.item === 'cam' || p.item === 'ircam') { for (const q of cameraCells(T, P, p)) cv += `M${q.x * C} ${q.y * C}h${C}v${C}h${-C}z`; }
      if (p.item === 'motion') it += `<circle class="pl-range" cx="${p.x * C + C / 2}" cy="${p.y * C + C / 2}" r="${3 * C + C / 2}"/>`;
      if (p.item === 'light') it += `<circle class="pl-range pl-range-l" cx="${p.x * C + C / 2}" cy="${p.y * C + C / 2}" r="${4 * C + C / 2}"/>`;
      if (p.item === 'guard') it += `<circle class="pl-range" cx="${p.x * C + C / 2}" cy="${p.y * C + C / 2}" r="${4 * C + C / 2}"/>`;
    }
    svgSet(cover, `<path class="pl-cov" d="${cv}"/>`);
    svgSet(items, it + P.map(itemGlyph).join(''));
    budget(); saveLayout();
  }
  function moveCursor(p: Pt) {
    cur = { x: Math.max(0, Math.min(T.w - 1, p.x)), y: Math.max(0, Math.min(T.h - 1, p.y)) };
    cursor.setAttribute('x', String(cur.x * C)); cursor.setAttribute('y', String(cur.y * C));
    const c = at(T, cur.x, cur.y), room = roomAt(T, cur.x, cur.y);
    const what = { '#': 'Wall', '.': 'Floor', ',': 'Outside', '%': 'Fence', G: 'Gate', E: 'Main entrance', B: 'Service door', D: 'Interior door', W: 'Window' }[c] || (T.assets[c]?.name ?? '');
    const here = P.filter(p => p.x === cur.x && p.y === cur.y).map(p => ITEMS[p.item].name);
    const err = tool === 'erase' ? (here.length ? null : 'Nothing to remove here.') : canPlace(T, P, tool, cur.x, cur.y);
    cursor.classList.toggle('bad', !!err && phase === 'defend');
    info.textContent = `${what}${room ? ' · ' + room.name : ''}${here.length ? ' · has ' + here.join(', ') : ''}${phase === 'defend' && err ? ' — ' + err : ''}`;
  }
  function act(p: Pt) {
    if (phase !== 'defend') return; moveCursor(p);
    const here = P.filter(q => q.x === p.x && q.y === p.y);
    if (tool === 'erase') { if (!here.length) return; const gone = here[here.length - 1]; P = P.filter(q => q !== gone); drawItems(); say(`Removed ${ITEMS[gone.item].name}. ${money(T.budget - spent(P))} left.`); moveCursor(p); return; }
    const same = here.find(q => q.item === tool);
    if (same && (tool === 'cam' || tool === 'ircam')) { same.dir = ((same.dir ?? 0) + 1) % 4; drawItems(); say(`Camera now faces ${DIRS[same.dir].split(' ')[1]}.`); return; }
    if (same) { P = P.filter(q => q !== same); drawItems(); say(`Removed ${ITEMS[tool].name}.`); moveCursor(p); return; }
    const err = canPlace(T, P, tool, p.x, p.y); if (err) { say(err); info.textContent = err; return; }
    if (spent(P) + ITEMS[tool].cost > T.budget) { say(`Not enough budget: ${ITEMS[tool].name} costs ${money(ITEMS[tool].cost)}.`); info.textContent = 'Not enough budget left for that.'; return; }
    P = [...P, { item: tool, x: p.x, y: p.y, ...(tool === 'cam' || tool === 'ircam' ? { dir } : {}) }]; drawItems();
    say(`Placed ${ITEMS[tool].name}. ${money(T.budget - spent(P))} left.`); moveCursor(p);
  }
  const cellOf = (e: PointerEvent | MouseEvent): Pt | null => {
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const m = (base as SVGGElement).getScreenCTM(); if (!m) return null; const q = pt.matrixTransform(m.inverse());
    const x = Math.floor(q.x / C), y = Math.floor(q.y / C); return x >= 0 && y >= 0 && x < T.w && y < T.h ? { x, y } : null;
  };
  svg.addEventListener('pointermove', e => { const c = cellOf(e); if (c && (c.x !== cur.x || c.y !== cur.y)) moveCursor(c); });
  svg.addEventListener('click', e => { const c = cellOf(e); if (c) { act(c); } });
  svg.addEventListener('keydown', e => {
    const k = e.key; const d: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (d[k]) { e.preventDefault(); moveCursor({ x: cur.x + d[k][0], y: cur.y + d[k][1] }); say(info.textContent || ''); }
    else if (k === 'Enter' || k === ' ') { e.preventDefault(); act(cur); }
    else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); const t = tool; tool = 'erase'; act(cur); tool = t; }
    else if (k === 'r' || k === 'R') { const cam = P.find(q => q.x === cur.x && q.y === cur.y && (q.item === 'cam' || q.item === 'ircam')); if (cam) { cam.dir = ((cam.dir ?? 0) + 1) % 4; drawItems(); say(`Camera now faces ${DIRS[cam.dir].split(' ')[1]}.`); } }
  });

  // tools
  const tools = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-tool]'));
  const pick = (id: string) => { tool = id as ItemId | 'erase'; tools.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tool === id)));
    $('#pl-dir').hidden = !(id === 'cam' || id === 'ircam'); $('#pl-what').textContent = id === 'erase' ? 'Click anything you placed to remove it and get the money back.' : ITEMS[id as ItemId].what; moveCursor(cur); };
  tools.forEach(b => b.addEventListener('click', () => pick(b.dataset.tool!)));
  root.querySelectorAll<HTMLButtonElement>('[data-dir]').forEach(b => b.addEventListener('click', () => { dir = Number(b.dataset.dir); root.querySelectorAll('[data-dir]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); }));
  root.querySelectorAll<HTMLInputElement>('[data-ctl]').forEach(i => i.addEventListener('change', () => { const id = i.dataset.ctl!; CT = i.checked ? [...new Set([...CT, id])] : CT.filter(c => c !== id); budget(); saveLayout(); }));
  $('#pl-clear').addEventListener('click', () => { P = []; drawItems(); say('Plan cleared.'); });

  // phases
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-phase]'));
  function setPhase(p: string) {
    phase = p; tabs.forEach(t => { const on = t.dataset.phase === p; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    root.querySelectorAll<HTMLElement>('[data-pane]').forEach(x => { x.hidden = x.dataset.pane !== p; });
    root.dataset.phase = p; if (p !== 'attack') { cancelAnimationFrame(anim); run.replaceChildren(); }
    moveCursor(cur);
  }
  tabs.forEach((t, i) => { t.addEventListener('click', () => setPhase(t.dataset.phase!)); t.addEventListener('keydown', e => { const n = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!n) return; e.preventDefault(); const nx = tabs[(i + n + tabs.length) % tabs.length]; nx.focus(); setPhase(nx.dataset.phase!); }); });
  root.querySelectorAll<HTMLButtonElement>('[data-goto]').forEach(b => b.addEventListener('click', () => setPhase(b.dataset.goto!)));

  // tiers
  const tierBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-tier]'));
  function paintStars() { tierBtns.forEach(b => { const n = stars[b.dataset.tier!] || 0; b.querySelector('.pl-stars')!.textContent = '★'.repeat(n) + '☆'.repeat(3 - n); b.querySelector('.pl-stars')!.setAttribute('aria-label', `${n} of 3 stars`); }); }
  function setTier(id: string) {
    T = TIERS.find(t => t.id === id) || TIERS[0]; graded = null;
    tierBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tier === T.id)));
    const L = layouts[T.id]; P = Array.isArray(L?.P) ? L.P.filter(p => p && p.item in ITEMS && canPlace(T, [], p.item, p.x, p.y) === null) : []; CT = Array.isArray(L?.C) ? L.C.filter(c => c in CONTROLS) : [];
    svg.setAttribute('viewBox', `${-M.l} ${-M.t} ${T.w * C + M.l + M.r} ${T.h * C + M.t + M.b}`);
    svgSet(base, basePlan(T)); run.replaceChildren();
    $('#pl-brief').textContent = T.blurb;
    $('#pl-threats').replaceChildren(...T.attacks.map(a => h('li', {}, h('b', {}, a.name), ' ', h('span', { class: 'label' }, a.phase === 'night' ? 'Night' : 'Day'), h('p', {}, a.brief))));
    $('#pl-assets').textContent = Object.values(T.assets).map(a => a.name).join(', ');
    $('#pl-resp').textContent = `${T.response} s`;
    // only offer controls relevant to this site's equipment, plus the camera network and logging
    const kinds = new Set(Object.values(T.assets).map(a => a.kind)); const rel = new Set<string>(); for (const k of kinds) for (const s of STEPS[k]) rel.add(s.by);
    if (T.attacks.some(a => a.insider)) rel.add('camnet'); if (T.id !== 'ground') rel.add('siem');
    root.querySelectorAll<HTMLElement>('[data-ctl-row]').forEach(r => { r.hidden = !rel.has(r.dataset.ctlRow!); });
    CT = CT.filter(c => rel.has(c));
    tools.forEach(b => { const id = b.dataset.tool!; if (id === 'erase') return; b.hidden = (id === 'mantrap' && !T.attacks.some(a => a.tailgate)) || (id === 'guard' && T.id === 'ground'); });
    $('#pl-result').hidden = true; $('#pl-solution').hidden = true; $('#pl-empty').hidden = false;
    drawItems(); moveCursor({ x: Math.floor(T.w / 2), y: Math.floor(T.h / 2) }); setPhase('defend');
    try { history.replaceState(null, '', '#' + T.id); } catch { /* ignore */ }
  }
  tierBtns.forEach(b => b.addEventListener('click', () => { setTier(b.dataset.tier!); say(`${T.name}. Budget ${money(T.budget)}.`); }));

  // attack
  const outcomeText = { stopped: 'Stopped', contained: 'Held', breached: 'Breached' } as const;
  function tips(r: Result): string[] {
    const out: string[] = []; const cp = critical(r);
    if (r.outcome !== 'breached') { if (r.detectAt === null) out.push('Nothing was taken, but nobody saw them. Next time they might bring different tools. Add detection on their route.'); return out; }
    if (r.detectAt === null) out.push(`Nobody saw them. They came in through ${r.path.filter(p => 'EBWGD%'.includes(at(T, p.x, p.y))).map(p => ({ E: 'the main entrance', B: 'the service door', W: 'a window', G: 'the gate', D: 'an interior door', '%': 'the fence' } as Record<string, string>)[at(T, p.x, p.y)]).filter((v, i, a) => a.indexOf(v) === i).join(', then ') || 'an open route'}. Put a sensor or camera on that route.`);
    else out.push(`Detected at T+${fmtT(r.detectAt)} by ${r.detectBy}, but the response takes ${r.response} s and they reached the target at T+${fmtT(r.reachAt!)}. Detect them earlier (before the red ✕ on the plan) or add delay: locks, bars or a cage.`);
    const miss = r.executed.map(id => Object.values(STEPS).flat().find(s => s.id === id)!).filter(Boolean).map(s => CONTROLS[s.by].name).filter((v, i, a) => a.indexOf(v) === i);
    if (miss.length) out.push(`At the keyboard, these would have stopped them: ${miss.join(', ')}.`);
    if (cp < 0 && r.reachAt !== null) out.push('Even detecting them at the property line would be too late without more delay. Delay buys time for the response.');
    return out;
  }
  function timeline(r: Result): HTMLElement {
    const end = Math.max(r.events.length ? r.events[r.events.length - 1].t : 0, r.reachAt ?? 0, r.responseAt === Infinity ? 0 : r.responseAt, 30);
    const mk = (t: number | null, cls: string, label: string) => { if (t === null || t === Infinity) return null;
      const m = h('span', { class: `pl-tl-m ${cls}` }, h('i'), h('em', {}, `${label} ${fmtT(t)}`)); m.style.setProperty('--at', Math.min(100, (t / end) * 100).toFixed(1) + '%'); return m; };
    return h('div', { class: 'pl-tl', role: 'img', 'aria-label': `Detected ${r.detectAt === null ? 'never' : 'at ' + fmtT(r.detectAt)}, reached target ${r.reachAt === null ? 'never' : 'at ' + fmtT(r.reachAt)}, response ${r.responseAt === Infinity ? 'never sent' : 'at ' + fmtT(r.responseAt)}` },
      h('div', { class: 'pl-tl-bar' }), mk(r.detectAt, 'det', 'Detect'), mk(r.reachAt, 'reach', 'Target'), mk(r.responseAt, 'resp', 'Response'));
  }
  function play(i: number) {
    if (!graded) return; shown = i; const r = graded.results[i]; cancelAnimationFrame(anim);
    root.querySelectorAll('[data-show]').forEach(b => b.setAttribute('aria-pressed', String(Number((b as HTMLElement).dataset.show) === i)));
    const pts = r.path.map(p => `${p.x * C + C / 2},${p.y * C + C / 2}`).join(' '); const cp = critical(r);
    const evs = r.events.filter(e => e.kind !== 'move');
    svgSet(run, `<polyline class="pl-path" points="${pts}" pathLength="1"/>` + (cp >= 0 ? `<g class="pl-cdp"><path d="M${r.path[cp].x * C + 5} ${r.path[cp].y * C + 5}l14 14M${r.path[cp].x * C + 19} ${r.path[cp].y * C + 5}l-14 14"/><text x="${r.path[cp].x * C + C / 2}" y="${r.path[cp].y * C - 6}">CRITICAL DETECTION POINT</text></g>` : '')
      + evs.filter(e => e.kind === 'detect').map(e => `<circle class="pl-det" cx="${e.x * C + C / 2}" cy="${e.y * C + C / 2}" r="15"/>`).join('')
      + `<g class="pl-intruder"><circle r="7"/><circle class="pl-intruder-ring" r="12"/></g>`);
    const dot = run.querySelector<SVGGElement>('.pl-intruder')!, log = $('#pl-log');
    log.replaceChildren(...evs.map(e => { const li = h('li', { class: 'ev-' + e.kind }, h('span', {}, 'T+' + fmtT(e.t)), e.text); li.hidden = true; return li; }));
    const lis = Array.from(log.children) as HTMLElement[];
    const got = r.executed.map(id => Object.values(STEPS).flat().find(st => st.id === id)!.text.toLowerCase()).join('; ');
    $('#pl-detail').replaceChildren(h('p', { class: `pl-out pl-out-${r.outcome}` }, outcomeText[r.outcome]),
      h('p', {}, r.outcome === 'stopped' ? (r.reachAt === null ? 'They never found a way to the target.' : 'The response arrived before they reached the target.') : r.outcome === 'contained' ? 'They reached the target but left with nothing.' : `They got: ${got}.`),
      timeline(r), h('ul', { class: 'pl-tips' }, ...tips(r).map(t => h('li', {}, t))));
    const end = Math.max(r.times[r.times.length - 1] || 0, ...evs.map(e => e.t)); const speed = end > 0 ? Math.min(14000, Math.max(5000, end * 30)) / end : 1;
    const place = (t: number) => { let k = 0; while (k < r.times.length - 1 && r.times[k + 1] <= t) k++; const a = r.path[k], b = r.path[Math.min(k + 1, r.path.length - 1)];
      const t0 = r.times[k], t1 = r.times[Math.min(k + 1, r.times.length - 1)]; const f = t1 > t0 ? Math.min(1, Math.max(0, (t - t0) / (t1 - t0))) : 0;
      dot.setAttribute('transform', `translate(${(a.x + (b.x - a.x) * f) * C + C / 2} ${(a.y + (b.y - a.y) * f) * C + C / 2})`);
      lis.forEach((li, j) => { li.hidden = evs[j].t > t; }); run.querySelectorAll('.pl-det').forEach(c => c.classList.toggle('on', r.detectAt !== null && t >= r.detectAt));
      $('#pl-clock').textContent = `T+${fmtT(t)}`; };
    if (reduce) { place(end); run.classList.add('done'); return; }
    run.classList.remove('done'); const t0 = performance.now();
    const step = (now: number) => { const t = (now - t0) / speed; place(Math.min(t, end)); const last = lis.filter(l => !l.hidden).pop(); if (last) last.scrollIntoView({ block: 'nearest' });
      if (t < end) anim = requestAnimationFrame(step); else run.classList.add('done'); };
    anim = requestAnimationFrame(step);
  }
  $('#pl-go').addEventListener('click', () => {
    graded = grade(T, P, CT); setPhase('attack');
    const best = Math.max(stars[T.id] || 0, graded.stars); if (best !== (stars[T.id] || 0)) { stars[T.id] = best; store(KEY, stars); paintStars(); }
    $('#pl-result').hidden = false; $('#pl-solution').hidden = false; $('#pl-empty').hidden = true;
    $('#pl-score').replaceChildren(h('span', { class: 'pl-big', role: 'img', 'aria-label': `${graded.stars} of 3 stars` }, '★'.repeat(graded.stars) + '☆'.repeat(3 - graded.stars)),
      h('span', {}, graded.stars === 3 ? 'Locked down. Nothing taken and every attacker seen.' : graded.stars === 2 ? 'Nothing taken, but someone got in unseen.' : graded.stars === 1 ? 'You held some of it. Read the debrief and adjust.' : 'They got what they came for. Read the debrief and try again.'));
    $('#pl-attacks').replaceChildren(...graded.results.map((r, i) => h('button', { type: 'button', class: `pl-atk pl-out-${r.outcome}`, 'data-show': String(i), 'aria-pressed': 'false' }, h('b', {}, r.attack.name), h('span', {}, outcomeText[r.outcome]))));
    root.querySelectorAll<HTMLButtonElement>('[data-show]').forEach(b => b.addEventListener('click', () => play(Number(b.dataset.show))));
    const first = graded.results.findIndex(r => r.outcome === 'breached'); play(first < 0 ? 0 : first);
    say(`${graded.stars} of 3 stars. ${graded.results.map(r => r.attack.name + ': ' + outcomeText[r.outcome]).join('. ')}.`);
  });
  $('#pl-replay').addEventListener('click', () => play(shown));
  $('#pl-solution').addEventListener('click', () => { if (!confirmSolution()) return; P = T.model.map(p => ({ ...p })); CT = [...T.modelIt]; drawItems(); setPhase('defend'); say('Loaded one solution that earns three stars. Study why each piece is there.'); });
  function confirmSolution() { const b = $<HTMLButtonElement>('#pl-solution'); if (b.dataset.armed) return true; b.dataset.armed = '1'; b.textContent = 'Replace my plan with a solution?'; setTimeout(() => { delete b.dataset.armed; b.textContent = 'Show a solution'; }, 4000); return false; }

  paintStars(); pick('cam');
  const want = location.hash.slice(1); setTier(TIERS.some(t => t.id === want) ? want : 'ground');
}
