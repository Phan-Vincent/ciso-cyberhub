// GIS Lab and the GIS hub's live layer. Geometry helpers are pure and exported for tests.
// Real coordinates for real places; scenario points (substations, offices, geofence) are labeled synthetic.

export type LL = { lat: number; lon: number };
const R_EARTH = 6371.0088; // mean Earth radius, km
const rad = (d: number) => d * Math.PI / 180;

/** Great-circle distance in km (haversine). */
export function haversine(a: LL, b: LL): number {
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(h)));
}
export const dmsToDec = (d: number, m: number, s: number, hemi: string) => (d + m / 60 + s / 3600) * (/^[SW]$/i.test(hemi) ? -1 : 1);
export function decToDms(v: number, isLat: boolean): string {
  const h = isLat ? (v < 0 ? 'S' : 'N') : (v < 0 ? 'W' : 'E'); let a = Math.abs(v); const d = Math.floor(a); a = (a - d) * 60; const m = Math.floor(a); const s = (a - m) * 60;
  return `${d}°${String(m).padStart(2, '0')}′${s.toFixed(2).padStart(5, '0')}″ ${h}`;
}
/** Parse "34.18, -117.32", "34°10′57″N 117°19′23″W" and similar into a point. */
export function parseLL(text: string): LL | null {
  const t = text.trim().replace(/[′’']/g, "'").replace(/[″”"]/g, '"');
  const dms = [...t.matchAll(/(-?\d+(?:\.\d+)?)\s*°\s*(?:(\d+(?:\.\d+)?)\s*'\s*)?(?:(\d+(?:\.\d+)?)\s*"\s*)?([NSEW])?/gi)];
  if (dms.length === 2 && t.includes('°')) {
    const v = dms.map(m => { const d = Math.abs(Number(m[1])), mm = Number(m[2] || 0), ss = Number(m[3] || 0); const hemi = m[4] || (Number(m[1]) < 0 ? 'S' : ''); return { v: dmsToDec(d, mm, ss, hemi), h: (m[4] || '').toUpperCase() }; });
    const [a, b] = v[0].h === 'E' || v[0].h === 'W' ? [v[1], v[0]] : v; return valid({ lat: a.v, lon: b.v });
  }
  const nums = t.match(/-?\d+(?:\.\d+)?/g); if (!nums || nums.length !== 2) return null;
  return valid({ lat: Number(nums[0]), lon: Number(nums[1]) });
}
const valid = (p: LL) => (Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180 ? p : null);
/** Ray casting: is the point inside the polygon (lon/lat ring)? */
export function inPolygon(p: LL, ring: LL[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a.lat > p.lat) !== (b.lat > p.lat) && p.lon < ((b.lon - a.lon) * (p.lat - a.lat)) / (b.lat - a.lat) + a.lon) inside = !inside;
  }
  return inside;
}
/** Web Mercator (slippy map) tile containing a point. */
export function tileXY(p: LL, z: number): { x: number; y: number } {
  const n = 2 ** z, lr = rad(p.lat);
  return { x: Math.floor(((p.lon + 180) / 360) * n), y: Math.floor(((1 - Math.log(Math.tan(lr) + 1 / Math.cos(lr)) / Math.PI) / 2) * n) };
}
/** Mercator linear scale factor at a latitude; areas are exaggerated by its square. */
export const mercatorScale = (lat: number) => 1 / Math.cos(rad(lat));
/** EXIF GPS stores degrees, minutes, seconds as rationals like "34/1, 3/1, 2580/100". */
export function exifToDec(rationals: string, ref: string): number {
  const v = rationals.split(',').map(s => { const [a, b] = s.trim().split('/').map(Number); return a / (b || 1); });
  return dmsToDec(v[0] || 0, v[1] || 0, v[2] || 0, ref);
}

/* ------------------------------------------------------------------ places and scenarios */
export const CSUSB: LL = { lat: 34.1826, lon: -117.3231 };
export const PLACES: Record<string, LL & { name: string }> = {
  sydney: { name: 'Sydney', lat: -33.8568, lon: 151.2153 }, ashburn: { name: 'Ashburn, Virginia', lat: 39.0438, lon: -77.4874 },
  frankfurt: { name: 'Frankfurt', lat: 50.1109, lon: 8.6821 }, la: { name: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
  sb: { name: 'San Bernardino', lat: 34.1083, lon: -117.2898 }, riverside: { name: 'Riverside', lat: 33.9806, lon: -117.3755 },
};
export type Pin = LL & { id: string; name: string };
export const OFFICES: Pin[] = [
  { id: 'o1', name: 'Ontario', lat: 34.0633, lon: -117.6509 }, { id: 'o2', name: 'San Bernardino', lat: 34.1083, lon: -117.2898 },
  { id: 'o3', name: 'Palm Springs', lat: 33.8303, lon: -116.5453 }, { id: 'o4', name: 'Temecula', lat: 33.4936, lon: -117.1484 },
  { id: 'o5', name: 'Pomona', lat: 34.0551, lon: -117.7500 }, { id: 'o6', name: 'Victorville', lat: 34.5362, lon: -117.2928 },
];
export const QUAKE: LL = { lat: 34.25, lon: -117.45 };
export const SUBSTATIONS: Pin[] = [
  { id: 's1', name: 'Substation A', lat: 34.30, lon: -117.40 }, { id: 's2', name: 'Substation B', lat: 34.12, lon: -117.55 },
  { id: 's3', name: 'Substation C', lat: 34.42, lon: -117.62 }, { id: 's4', name: 'Substation D', lat: 34.05, lon: -117.30 },
  { id: 's5', name: 'Substation E', lat: 34.22, lon: -117.18 }, { id: 's6', name: 'Substation F', lat: 34.36, lon: -117.29 },
];
// A concave campus geofence (synthetic), counter-clockwise.
export const FENCE: LL[] = [
  { lat: 34.1780, lon: -117.3300 }, { lat: 34.1780, lon: -117.3150 }, { lat: 34.1880, lon: -117.3150 }, { lat: 34.1880, lon: -117.3200 },
  { lat: 34.1830, lon: -117.3200 }, { lat: 34.1830, lon: -117.3250 }, { lat: 34.1880, lon: -117.3250 }, { lat: 34.1880, lon: -117.3300 },
];
export const LOGINS: Pin[] = [
  { id: 'l1', name: 'Login 1', lat: 34.1800, lon: -117.3280 }, { id: 'l2', name: 'Login 2', lat: 34.1860, lon: -117.3225 },
  { id: 'l3', name: 'Login 3', lat: 34.1860, lon: -117.3170 }, { id: 'l4', name: 'Login 4', lat: 34.1905, lon: -117.3175 },
  { id: 'l5', name: 'Login 5', lat: 34.1860, lon: -117.3275 }, { id: 'l6', name: 'Login 6', lat: 34.1795, lon: -117.3120 },
];
export type Signin = { n: number; when: string; city: string; ip: string } & LL;
export const SIGNINS: Signin[] = [
  { n: 1, when: '2026-10-14 08:02', city: 'San Bernardino, US', ip: '198.51.100.24', lat: 34.1083, lon: -117.2898 },
  { n: 2, when: '2026-10-14 09:15', city: 'Los Angeles, US', ip: '198.51.100.77', lat: 34.0522, lon: -118.2437 },
  { n: 3, when: '2026-10-14 10:40', city: 'Frankfurt, DE', ip: '203.0.113.9', lat: 50.1109, lon: 8.6821 },
  { n: 4, when: '2026-10-15 07:10', city: 'San Bernardino, US', ip: '198.51.100.24', lat: 34.1083, lon: -117.2898 },
];
export const minutes = (a: string, b: string) => (Date.parse(b.replace(' ', 'T') + 'Z') - Date.parse(a.replace(' ', 'T') + 'Z')) / 60000;
/** Implied speed between consecutive sign-ins, km/h. */
export const speeds = (s: Signin[]) => s.slice(1).map((x, i) => ({ from: s[i].n, to: x.n, km: haversine(s[i], x), kmh: haversine(s[i], x) / (minutes(s[i].when, x.when) / 60) }));

/* ------------------------------------------------------------------ levels */
export type Kind = 'text' | 'pick' | 'click';
export type Level = { id: string; tier: 'Beginner' | 'Intermediate' | 'Advanced'; title: string; q: string; kind: Kind; map: 'world' | 'local' | 'fence' | 'none';
  pins?: Pin[]; check: (v: string | string[] | LL) => boolean; hints: string[]; lesson: string; table?: boolean };
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every(x => b.includes(x));
const num = (v: unknown) => { const m = String(v).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/); return m ? Number(m[0]) : NaN; };

export const LEVELS: Level[] = [
  { id: 'dd', tier: 'Beginner', title: 'Read a coordinate', kind: 'text', map: 'world',
    q: 'CSUSB\'s campus is at 34°10′57″ N, 117°19′23″ W. Write it in decimal degrees as latitude, longitude (for example 12.3456, -98.7654).',
    check: v => { const p = parseLL(String(v)); return !!p && !String(v).includes('°') && near(p.lat, 34.1825, .0006) && near(p.lon, -117.3231, .0006); },
    hints: ['Decimal degrees = degrees + minutes ÷ 60 + seconds ÷ 3600.', 'West longitudes and south latitudes are negative.', 'The calculator on this page converts both ways.'],
    lesson: 'Most systems store decimal degrees, while people and paper maps use degrees, minutes and seconds. A missing minus sign moves a point to the other side of the world, which is a classic data-entry bug in asset inventories.' },
  { id: 'hemi', tier: 'Beginner', title: 'Find it on the map', kind: 'click', map: 'world',
    q: 'A server log geolocates a request to −33.86, 151.21. Click that spot on the world map.',
    check: v => typeof v === 'object' && !Array.isArray(v) && haversine(v as LL, PLACES.sydney) <= 900,
    hints: ['A negative latitude is south of the equator.', 'A positive longitude is east of Greenwich. 151° east is far east.'],
    lesson: 'That is Sydney. Reading signs right is the whole game: latitude is north–south (−90 to 90), longitude is east–west (−180 to 180). Swapped or sign-flipped coordinates are a common reason a dashboard puts users in the ocean.' },
  { id: 'dist', tier: 'Beginner', title: 'How far is it?', kind: 'text', map: 'world',
    q: 'How far is CSUSB (34.1826, −117.3231) from Ashburn, Virginia (39.0438, −77.4874), the largest cluster of data centers in the world? Answer in kilometers (within 2%).',
    check: v => near(num(v), haversine(CSUSB, PLACES.ashburn), haversine(CSUSB, PLACES.ashburn) * .02),
    hints: ['Use the distance tool in the calculator.', 'Distance on a sphere is a great circle, not a straight line on a flat map.'],
    lesson: 'Great-circle distance (the haversine formula) is how security tools judge whether two events are physically plausible. Distance also sets network latency: light in fiber covers roughly 200 km per millisecond, so cross-country round trips cost tens of milliseconds.' },
  { id: 'travel', tier: 'Intermediate', title: 'Impossible travel', kind: 'text', map: 'world', table: true,
    q: 'These are one user\'s sign-ins, in UTC. Which sign-in number is physically impossible after the one before it? A commercial jet cruises at roughly 900 km/h.',
    check: v => num(v) === 3,
    hints: ['For each pair in order: distance ÷ time = speed.', 'Anything far faster than a jet is suspicious.'],
    lesson: 'Sign-in 3 implies about 6,500 km/h. Microsoft Entra ID calls this "atypical travel": two sign-ins from distant places closer together in time than travel allows. Before you call it an attack, check for a VPN or cloud proxy, which can make one person appear in two places.' },
  { id: 'radius', tier: 'Intermediate', title: 'Accuracy radius', kind: 'pick', map: 'local', pins: OFFICES,
    q: 'An IP lookup places a device in Riverside with a 50 km accuracy radius. Select every office the device could plausibly be in.',
    check: v => sameSet(v as string[], OFFICES.filter(o => haversine(o, PLACES.riverside) <= 50).map(o => o.id)),
    hints: ['Draw a 50 km circle around Riverside. The calculator gives distances.', 'IP geolocation gives an area, not a pin.'],
    lesson: 'MaxMind describes its result as a circle the address is "more likely than not" inside, and warns it is not precise enough to put a pin on a map. Never treat an IP location as a street address, and never accuse someone of being somewhere because of one.' },
  { id: 'buffer', tier: 'Intermediate', title: 'Buffer analysis', kind: 'pick', map: 'local', pins: SUBSTATIONS,
    q: 'Scenario: an earthquake at 34.25, −117.45 (the blue star). Utilities inspect everything within 25 km first. Select the substations inside that buffer.',
    check: v => sameSet(v as string[], SUBSTATIONS.filter(s => haversine(s, QUAKE) <= 25).map(s => s.id)),
    hints: ['A buffer is every point within a distance of a feature.', 'Measure from the star to each substation.'],
    lesson: 'Buffers answer "what is near this?": assets near a fault, a flood zone, a wildfire or a compromised cell tower. Incident responders and utilities use the same query to decide where to send people first.' },
  { id: 'fence', tier: 'Advanced', title: 'Geofence', kind: 'pick', map: 'fence', pins: LOGINS,
    q: 'Admin sign-ins are only allowed from inside the campus geofence (the outlined shape, which has a notch). Select every sign-in that came from outside it.',
    check: v => sameSet(v as string[], LOGINS.filter(l => !inPolygon(l, FENCE)).map(l => l.id)),
    hints: ['Look closely at the notch on the north side.', 'Ray casting: draw a line from the point to the edge of the map and count crossings. Odd means inside.'],
    lesson: 'Point-in-polygon is how geofencing, conditional access by location and drone no-fly zones work. Concave shapes are where naive bounding-box checks fail: a point can sit inside the box but outside the fence.' },
  { id: 'merc', tier: 'Advanced', title: 'Projection distortion', kind: 'text', map: 'none',
    q: 'On a Web Mercator map (the projection behind most web maps), how many times larger does a region at 60° latitude look compared with the same-sized region at the equator?',
    check: v => near(num(v), 4, .05),
    hints: ['Mercator stretches distances by 1 ÷ cos(latitude).', 'Area is stretched in both directions, so square the factor.'],
    lesson: 'At 60° the stretch is 2× each way, so areas look 4× larger. That is why Greenland looks the size of Africa. When you compare regions on a dashboard, use an equal-area projection or the numbers, not the shapes.' },
  { id: 'tile', tier: 'Advanced', title: 'Map tiles in the logs', kind: 'text', map: 'none',
    q: 'Web maps load square tiles named zoom/x/y. Which zoom-12 tile contains CSUSB (34.1826, −117.3231)? Answer as x/y.',
    check: v => { const m = String(v).match(/(\d+)\s*[/,\s]\s*(\d+)/); const t = tileXY(CSUSB, 12); return !!m && Number(m[1]) === t.x && Number(m[2]) === t.y; },
    hints: ['x = floor((lon + 180) ÷ 360 × 2^zoom).', 'y uses the Mercator formula; the calculator has a tile tool.'],
    lesson: 'Tile URLs show up in proxy and DNS logs. A run of requests for tiles around one building tells an analyst exactly what someone was looking at, which matters in insider and reconnaissance investigations.' },
  { id: 'exif', tier: 'Advanced', title: 'Photo metadata', kind: 'text', map: 'world',
    q: 'A photo posted by an employee has EXIF GPS tags: GPSLatitude 34/1, 3/1, 2580/100 (Ref N) and GPSLongitude 118/1, 14/1, 3540/100 (Ref W). Where was it taken, in decimal degrees?',
    check: v => { const p = parseLL(String(v)); return !!p && near(p.lat, exifToDec('34/1, 3/1, 2580/100', 'N'), .0006) && near(p.lon, exifToDec('118/1, 14/1, 3540/100', 'W'), .0006); },
    hints: ['Each rational is a fraction: 2580/100 is 25.8 seconds.', 'Then convert degrees, minutes, seconds to decimal. W is negative.'],
    lesson: 'That is downtown Los Angeles. Phones write GPS into photos by default, and OSINT investigators and attackers both read it. Strip location metadata before publishing, and turn off camera location on work devices in sensitive sites.' },
];

/* ================================================================== UI */
type Country = { code: string; name: string; polygons: number[][][][] };
const NS = 'http://www.w3.org/2000/svg';
function s<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, text = ''): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v)); if (text) e.textContent = text; return e;
}
function h(tag: string, props: Record<string, string> = {}, ...kids: (Node | string | null | false)[]): HTMLElement {
  const e = document.createElement(tag); for (const [k, v] of Object.entries(props)) e.setAttribute(k, v); for (const k of kids) if (k) e.append(k); return e;
}
const fmt = (n: number, d = 1) => n.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
let worldCache: Promise<Country[]> | null = null;
const loadWorld = (base: string) => (worldCache ||= fetch(base + '/assets/geo/ne_110m_countries.json').then(r => r.json()).then(d => d.countries as Country[]));
/** Equirectangular world map, 2 px per degree. */
const WX = (lon: number) => (lon + 180) * 2, WY = (lat: number) => (90 - lat) * 2;
function worldPath(cs: Country[]) {
  let d = '';
  for (const c of cs) for (const poly of c.polygons) for (const ring of poly) { ring.forEach(([lon, lat], i) => { d += (i ? 'L' : 'M') + WX(lon).toFixed(1) + ' ' + WY(lat).toFixed(1); }); d += 'Z'; }
  return d;
}
function worldSvg(cs: Country[], label: string) {
  const svg = s('svg', { viewBox: '0 0 720 360', class: 'gl-map', role: 'img', 'aria-label': label });
  svg.append(s('rect', { x: 0, y: 0, width: 720, height: 360, class: 'gl-sea' }));
  let grid = ''; for (let lon = -150; lon <= 150; lon += 30) grid += `M${WX(lon)} 0V360`; for (let lat = -60; lat <= 60; lat += 30) grid += `M0 ${WY(lat)}H720`;
  svg.append(s('path', { d: grid, class: 'gl-grat' }), s('path', { d: `M0 ${WY(0)}H720M${WX(0)} 0V360`, class: 'gl-eq' }), s('path', { d: worldPath(cs), class: 'gl-land' }));
  for (const [lat, t] of [[60, '60°N'], [30, '30°N'], [0, '0°'], [-30, '30°S'], [-60, '60°S']] as [number, string][]) svg.append(s('text', { x: 4, y: WY(lat) - 3, class: 'gl-tick' }, t));
  for (const [lon, t] of [[-120, '120°W'], [-60, '60°W'], [0, '0°'], [60, '60°E'], [120, '120°E']] as [number, string][]) svg.append(s('text', { x: WX(lon) + 3, y: 354, class: 'gl-tick' }, t));
  return svg;
}
/** Local map of the Inland Empire: simple equirectangular scaled by cos(latitude). */
function localProj(b: { s: number; w: number; n: number; e: number }, W: number, H: number) {
  const k = Math.cos(rad((b.s + b.n) / 2)); const sx = W / ((b.e - b.w) * k), sy = H / (b.n - b.s); const sc = Math.min(sx, sy);
  const ox = (W - (b.e - b.w) * k * sc) / 2, oy = (H - (b.n - b.s) * sc) / 2;
  return { x: (lon: number) => ox + (lon - b.w) * k * sc, y: (lat: number) => oy + (b.n - lat) * sc, km: (km: number) => (km / 111.32) * sc };
}

const gl = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('#gislab');
if (gl) {
  const base = document.body.dataset.base || ''; const KEY = 'cyberhub:gis';
  const $ = <T extends HTMLElement = HTMLElement>(q: string) => gl.querySelector<T>(q)!;
  let solved: string[] = []; try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); if (Array.isArray(v)) solved = v.filter(x => typeof x === 'string'); } catch { /* ignore */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(solved)); } catch { /* ignore */ } };
  let cur = 0, hintN = 0, picks: string[] = [], click: LL | null = null; const nav = $('#gl-lvls'), fb = $('#gl-msg'), stage = $('#gl-stage');
  LEVELS.forEach((L, i) => { if (i === 0 || LEVELS[i - 1].tier !== L.tier) nav.append(h('span', { class: 'label ch-adv-sep' }, L.tier));
    const b = h('button', { type: 'button', 'data-i': String(i), title: L.title, 'aria-label': `Level ${i + 1}, ${L.tier}: ${L.title}` }, String(i + 1)); if (L.tier === 'Advanced') b.classList.add('adv'); b.addEventListener('click', () => open(i)); nav.append(b); });
  const mark = () => { nav.querySelectorAll<HTMLButtonElement>('button').forEach(b => { const i = Number(b.dataset.i); b.classList.toggle('done', solved.includes(LEVELS[i].id)); b.setAttribute('aria-current', String(i === cur)); });
    $('#gl-count').textContent = `${solved.filter(id => LEVELS.some(l => l.id === id)).length} of ${LEVELS.length} solved`; };

  async function drawStage(L: Level) {
    stage.replaceChildren(); picks = []; click = null;
    if (L.table) { const t = h('table', { class: 'gl-table' }, h('thead', {}, h('tr', {}, ...['#', 'Time (UTC)', 'IP geolocation', 'Address', 'Lat, lon'].map(c => h('th', {}, c)))),
        h('tbody', {}, ...SIGNINS.map(x => h('tr', {}, h('td', {}, String(x.n)), h('td', {}, x.when), h('td', {}, x.city), h('td', {}, h('code', {}, x.ip)), h('td', {}, `${x.lat}, ${x.lon}`)))));
      stage.append(h('div', { class: 'gl-scroll' }, t)); }
    if (L.map === 'world') {
      const cs = await loadWorld(base).catch(() => [] as Country[]); const svg = worldSvg(cs, 'World map, equirectangular projection.');
      if (L.id === 'dist') { svg.append(s('path', { class: 'gl-arc', d: `M${WX(CSUSB.lon)} ${WY(CSUSB.lat)}L${WX(PLACES.ashburn.lon)} ${WY(PLACES.ashburn.lat)}` })); for (const p of [CSUSB, PLACES.ashburn]) svg.append(s('circle', { cx: WX(p.lon), cy: WY(p.lat), r: 3.5, class: 'gl-pt' })); }
      if (L.id === 'travel') { let d = ''; SIGNINS.forEach((x, i) => { d += (i ? 'L' : 'M') + WX(x.lon) + ' ' + WY(x.lat); }); svg.append(s('path', { d, class: 'gl-arc' }));
        SIGNINS.forEach(x => { svg.append(s('circle', { cx: WX(x.lon), cy: WY(x.lat), r: 3.5, class: 'gl-pt' })); svg.append(s('text', { x: WX(x.lon) + 5 + (x.n === 2 ? -14 : 0), y: WY(x.lat) - 5 - (x.n === 4 ? 9 : 0), class: 'gl-lbl' }, String(x.n))); }); }
      if (L.kind === 'click') {
        const pin = s('g', { class: 'gl-pin' }); pin.append(s('circle', { r: 6 }), s('circle', { r: 1.8, class: 'gl-pin-c' })); pin.setAttribute('visibility', 'hidden'); svg.append(pin);
        svg.classList.add('gl-clickable'); svg.setAttribute('tabindex', '0'); svg.setAttribute('aria-label', 'World map. Click to drop a pin, or use the latitude and longitude boxes.');
        const place = (p: LL) => { click = p; pin.setAttribute('transform', `translate(${WX(p.lon)} ${WY(p.lat)})`); pin.setAttribute('visibility', 'visible'); $('#gl-pick').textContent = `Pin at ${fmt(p.lat, 2)}, ${fmt(p.lon, 2)}`; };
        svg.addEventListener('click', e => { const m = svg.getScreenCTM(); if (!m) return; const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()); place({ lat: 90 - q.y / 2, lon: q.x / 2 - 180 }); });
        stage.append(svg, h('p', { class: 'gl-note', id: 'gl-pick', role: 'status' }, 'Click the map to drop a pin.'));
        const f = h('form', { class: 'gl-kbd' }, h('label', {}, 'Or type it: ', h('input', { id: 'gl-ll', type: 'text', placeholder: 'lat, lon', autocomplete: 'off', spellcheck: 'false' })), h('button', { type: 'submit' }, 'Drop pin'));
        f.addEventListener('submit', e => { e.preventDefault(); const p = parseLL($<HTMLInputElement>('#gl-ll').value); if (p) place(p); }); stage.append(f);
      } else stage.append(svg);
      stage.append(h('p', { class: 'gl-src' }, 'Map: Natural Earth 1:110m, public domain. Equirectangular projection.'));
    }
    if (L.map === 'local' || L.map === 'fence') {
      const W = 640, H = 400; const fence = L.map === 'fence';
      const b = fence ? { s: 34.1760, w: -117.3320, n: 34.1925, e: -117.3100 } : L.id === 'buffer' ? { s: 33.95, w: -117.80, n: 34.55, e: -117.00 } : { s: 33.40, w: -117.85, n: 34.62, e: -116.45 };
      const P = localProj(b, W, H); const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'gl-map gl-local', role: 'group', 'aria-label': fence ? 'Campus map with the geofence and six sign-ins.' : 'Regional map with points to select.' });
      svg.append(s('rect', { x: 0, y: 0, width: W, height: H, class: 'gl-sea gl-land-bg' }));
      let grid = ''; for (let x = 0; x <= W; x += 40) grid += `M${x} 0V${H}`; for (let y = 0; y <= H; y += 40) grid += `M0 ${y}H${W}`; svg.append(s('path', { d: grid, class: 'gl-grat' }));
      if (fence) { svg.append(s('path', { class: 'gl-fence', d: 'M' + FENCE.map(p => `${P.x(p.lon).toFixed(1)} ${P.y(p.lat).toFixed(1)}`).join('L') + 'Z' })); svg.append(s('text', { x: P.x(-117.3295), y: P.y(34.1773), class: 'gl-lbl' }, 'CAMPUS GEOFENCE')); }
      if (L.id === 'radius') { svg.append(s('circle', { cx: P.x(PLACES.riverside.lon), cy: P.y(PLACES.riverside.lat), r: P.km(50), class: 'gl-buffer' }));
        svg.append(s('circle', { cx: P.x(PLACES.riverside.lon), cy: P.y(PLACES.riverside.lat), r: 3, class: 'gl-pt-r' }), s('text', { x: P.x(PLACES.riverside.lon) + 6, y: P.y(PLACES.riverside.lat) + 14, class: 'gl-lbl gl-red' }, 'RIVERSIDE ±50 km')); }
      if (L.id === 'buffer') { const qx = P.x(QUAKE.lon), qy = P.y(QUAKE.lat); let st = ''; for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 4 : 10; st += (i ? 'L' : 'M') + (qx + Math.cos(a) * r).toFixed(1) + ' ' + (qy + Math.sin(a) * r).toFixed(1); }
        svg.append(s('path', { d: st + 'Z', class: 'gl-star' })); }
      // scale bar
      const km = fence ? .5 : 25; svg.append(s('path', { d: `M16 ${H - 18}h${P.km(km)}M16 ${H - 22}v8M${16 + P.km(km)} ${H - 22}v8`, class: 'gl-scale' }), s('text', { x: 16, y: H - 26, class: 'gl-tick' }, fence ? '500 m' : '25 km'));
      for (const p of L.pins || []) {
        const g = s('g', { class: 'gl-cand', tabindex: '0', role: 'checkbox', 'aria-checked': 'false', 'aria-label': `${p.name}, ${p.lat}, ${p.lon}` });
        g.append(s('rect', { x: P.x(p.lon) - 14, y: P.y(p.lat) - 24, width: 30 + p.name.length * 6.6, height: 38, class: 'gl-hit' }), s('circle', { cx: P.x(p.lon), cy: P.y(p.lat), r: 6, class: 'gl-dot' }), s('text', { x: P.x(p.lon) + 10, y: P.y(p.lat) - 9, class: 'gl-lbl' }, p.name));
        const tog = () => { picks = picks.includes(p.id) ? picks.filter(x => x !== p.id) : [...picks, p.id]; g.classList.toggle('on', picks.includes(p.id)); g.setAttribute('aria-checked', String(picks.includes(p.id))); };
        g.addEventListener('click', tog); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tog(); } }); svg.append(g);
      }
      stage.append(svg, h('p', { class: 'gl-src' }, fence ? 'Synthetic campus geofence for practice.' : L.id === 'buffer' ? 'Scenario quake and substations are synthetic; place spacing is to scale.' : 'Office cities are real places; the scenario is synthetic.'));
      if (L.pins) stage.append(h('ul', { class: 'gl-coords' }, ...L.pins.map(p => h('li', {}, h('b', {}, p.name), ` ${p.lat}, ${p.lon}`))));
    }
    if (L.id === 'merc') { const svg = s('svg', { viewBox: '0 0 640 220', class: 'gl-map', role: 'img', 'aria-label': 'The same square drawn at the equator and at 60 degrees on a Mercator map.' });
      svg.append(s('rect', { x: 0, y: 0, width: 640, height: 220, class: 'gl-sea' }), s('rect', { x: 120, y: 120, width: 40, height: 40, class: 'gl-sq' }), s('rect', { x: 400, y: 40, width: 80, height: 80, class: 'gl-sq gl-sq-r' }),
        s('text', { x: 140, y: 182, class: 'gl-lbl', 'text-anchor': 'middle' }, '0°'), s('text', { x: 440, y: 142, class: 'gl-lbl', 'text-anchor': 'middle' }, '60°'), s('text', { x: 320, y: 206, class: 'gl-tick', 'text-anchor': 'middle' }, 'Same ground area, drawn on Web Mercator'));
      stage.append(svg); }
  }
  function open(i: number) {
    cur = i; hintN = 0; const L = LEVELS[i];
    $('#gl-lvl').textContent = `Level ${i + 1} of ${LEVELS.length} · ${L.tier}: ${L.title}`; $('#gl-q').textContent = L.q;
    $('#gl-lesson').hidden = true; fb.textContent = ''; $('#gl-hints').replaceChildren(); $('#gl-hint').textContent = 'Stuck? Get a hint'; ($('#gl-hint') as HTMLButtonElement).hidden = !L.hints.length;
    $<HTMLInputElement>('#gl-a').value = ''; $('#gl-form').classList.toggle('gl-noinput', L.kind !== 'text'); $<HTMLInputElement>('#gl-a').hidden = L.kind !== 'text';
    $('#gl-a-label').textContent = L.kind === 'text' ? 'Your answer' : L.kind === 'pick' ? 'Select points on the map, then check' : 'Drop a pin, then check';
    drawStage(L); mark();
  }
  $('#gl-hint').addEventListener('click', () => { const H = LEVELS[cur].hints; if (hintN < H.length) { $('#gl-hints').append(h('li', {}, H[hintN])); hintN++; } $('#gl-hint').textContent = hintN < H.length ? 'Another hint' : 'No more hints'; });
  $('#gl-form').addEventListener('submit', e => { e.preventDefault(); const L = LEVELS[cur];
    const v: string | string[] | LL | null = L.kind === 'text' ? $<HTMLInputElement>('#gl-a').value.trim() : L.kind === 'pick' ? picks : click;
    if (!v || (typeof v === 'string' && !v)) { fb.textContent = L.kind === 'click' ? 'Drop a pin on the map first.' : L.kind === 'pick' ? 'Select at least one point first.' : 'Type an answer first.'; return; }
    const ok = L.check(v); fb.textContent = ok ? '✔ Correct. Level complete.' : '✘ Not quite. Check your work, use the calculator, or take a hint.';
    if (ok) { if (!solved.includes(L.id)) { solved.push(L.id); save(); } const r = $('#gl-lesson'); r.hidden = false; r.querySelector('p')!.textContent = L.lesson; ($('#gl-next') as HTMLButtonElement).hidden = cur >= LEVELS.length - 1; mark(); } });
  $('#gl-next').addEventListener('click', () => open(Math.min(cur + 1, LEVELS.length - 1)));

  // calculator
  const out = $('#gc-out'); const show = (t: string) => { out.textContent = t; };
  const pv = (id: string) => parseLL($<HTMLInputElement>(id).value);
  $('#gc-conv').addEventListener('submit', e => { e.preventDefault(); const p = pv('#gc-c'); if (!p) return show('Could not read that. Try 34.1826, -117.3231 or 34°10′57″N 117°19′23″W.');
    show(`Decimal: ${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}\nDMS: ${decToDms(p.lat, true)}  ${decToDms(p.lon, false)}`); });
  $('#gc-dist').addEventListener('submit', e => { e.preventDefault(); const a = pv('#gc-a'), b = pv('#gc-b'); if (!a || !b) return show('Enter two points as lat, lon.');
    const km = haversine(a, b); const mins = Number($<HTMLInputElement>('#gc-min').value); show(`Distance: ${fmt(km, 1)} km (${fmt(km * .621371, 1)} mi)` + (mins > 0 ? `\nImplied speed over ${mins} min: ${fmt(km / (mins / 60), 0)} km/h` : '')); });
  $('#gc-tile').addEventListener('submit', e => { e.preventDefault(); const p = pv('#gc-t'), z = Math.max(0, Math.min(20, Math.round(Number($<HTMLInputElement>('#gc-z').value) || 0))); if (!p) return show('Enter a point as lat, lon.');
    const t = tileXY(p, z); show(`Zoom ${z} tile: ${t.x}/${t.y}\nMercator scale at ${fmt(p.lat, 2)}°: ×${fmt(mercatorScale(p.lat), 3)} in length, ×${fmt(mercatorScale(p.lat) ** 2, 3)} in area`); });

  const first = LEVELS.findIndex(l => !solved.includes(l.id)); open(first < 0 ? 0 : first);
}

/* ------------------------------------------------------------------ GIS hub: live USGS layer, loaded only on request */
export type Quake = { mag: number; place: string; time: number; url: string; lon: number; lat: number; depth: number };
export function parseQuakes(j: unknown): Quake[] {
  const fs = (j as { features?: unknown[] })?.features; if (!Array.isArray(fs)) throw new Error('Not a GeoJSON FeatureCollection');
  const out: Quake[] = [];
  for (const f of fs as { properties?: Record<string, unknown>; geometry?: { coordinates?: unknown[] } }[]) {
    const p = f.properties || {}, c = f.geometry?.coordinates || [];
    const q = { mag: Number(p.mag), place: String(p.place ?? ''), time: Number(p.time), url: String(p.url ?? ''), lon: Number(c[0]), lat: Number(c[1]), depth: Number(c[2]) };
    if ([q.mag, q.time, q.lon, q.lat].every(Number.isFinite) && Math.abs(q.lat) <= 90 && Math.abs(q.lon) <= 180 && /^https:\/\/earthquake\.usgs\.gov\//.test(q.url)) out.push(q);
  }
  return out.sort((a, b) => b.mag - a.mag);
}
const live = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('#gis-live');
if (live) {
  const base = document.body.dataset.base || ''; const box = live.querySelector<HTMLElement>('.gl-live-map')!, list = live.querySelector<HTMLElement>('.gl-live-list')!, st = live.querySelector<HTMLElement>('.gl-live-status')!;
  loadWorld(base).then(cs => { box.replaceChildren(worldSvg(cs, 'World map. Load the live layer to plot this week\'s earthquakes.')); }).catch(() => { /* map optional */ });
  live.querySelector('#gis-load')!.addEventListener('click', async e => {
    const btn = e.currentTarget as HTMLButtonElement; btn.disabled = true; st.textContent = 'Loading from USGS…';
    try {
      const r = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson', { credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!r.ok) throw new Error('USGS returned ' + r.status); const qs = parseQuakes(await r.json());
      const svg = box.querySelector('svg'); if (svg) { svg.querySelectorAll('.gl-q').forEach(n => n.remove());
        for (const q of [...qs].reverse()) { const c = s('circle', { cx: WX(q.lon).toFixed(1), cy: WY(q.lat).toFixed(1), r: Math.max(2, (q.mag - 4) * 3).toFixed(1), class: 'gl-q' }); c.append(s('title', {}, `M${q.mag.toFixed(1)} · ${q.place} · ${new Date(q.time).toUTCString()}`)); svg.append(c); } }
      st.textContent = `${qs.length} earthquakes of magnitude 4.5 or more in the past 7 days. Retrieved ${new Date().toUTCString()}.`;
      list.replaceChildren(...qs.slice(0, 8).map(q => h('li', {}, h('b', {}, 'M' + q.mag.toFixed(1)), ' ', h('a', { href: q.url, rel: 'noopener' }, q.place || 'Unnamed location'), h('span', {}, ` ${new Date(q.time).toISOString().slice(0, 16).replace('T', ' ')} UTC · ${Math.round(q.depth)} km deep`))));
      btn.textContent = 'Refresh';
    } catch (err) { st.textContent = 'Could not load the USGS feed (' + (err as Error).message + '). Check your connection, or open the feed directly.'; }
    btn.disabled = false;
  });
}
