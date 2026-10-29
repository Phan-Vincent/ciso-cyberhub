// GIS Lab: the geometry is right and every level has a sensible, unique answer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = mkdtempSync(join(tmpdir(), 'gis-'));
writeFileSync(join(dir, 'gislab.js'), stripTypeScriptTypes(readFileSync(new URL('../web/gislab.ts', import.meta.url), 'utf8'), { mode: 'strip' }));
const G = await import(pathToFileURL(join(dir, 'gislab.js')).href);
const L = id => G.LEVELS.find(l => l.id === id);

test('haversine matches known distances', () => {
  assert.ok(Math.abs(G.haversine({ lat: 51.5072, lon: -0.1276 }, { lat: 48.8566, lon: 2.3522 }) - 343.5) < 2, 'London to Paris ~344 km');
  assert.ok(Math.abs(G.haversine({ lat: 0, lon: 0 }, { lat: 0, lon: 1 }) - 111.2) < .2);
  assert.equal(G.haversine(G.CSUSB, G.CSUSB), 0);
});

test('coordinate parsing and conversion', () => {
  assert.ok(Math.abs(G.dmsToDec(34, 10, 57, 'N') - 34.1825) < 1e-4); assert.ok(G.dmsToDec(117, 19, 23, 'W') < 0);
  const p = G.parseLL('34°10′57″N 117°19′23″W'); assert.ok(Math.abs(p.lat - 34.1825) < 1e-4 && Math.abs(p.lon + 117.3231) < 1e-4);
  assert.deepEqual(G.parseLL('-33.86, 151.21'), { lat: -33.86, lon: 151.21 }); assert.equal(G.parseLL('95, 10'), null); assert.equal(G.parseLL('hello'), null);
  assert.match(G.decToDms(34.1825, true), /^34°10′57\.00″ N$/);
  assert.ok(Math.abs(G.exifToDec('34/1, 3/1, 2580/100', 'N') - 34.05717) < 1e-4);
});

test('tiles, Mercator and polygons', () => {
  assert.deepEqual(G.tileXY({ lat: 0, lon: 0 }, 1), { x: 1, y: 1 }); assert.deepEqual(G.tileXY(G.CSUSB, 12), { x: 713, y: 1633 });
  assert.ok(Math.abs(G.mercatorScale(60) - 2) < 1e-9);
  const sq = [{ lat: 0, lon: 0 }, { lat: 0, lon: 1 }, { lat: 1, lon: 1 }, { lat: 1, lon: 0 }];
  assert.equal(G.inPolygon({ lat: .5, lon: .5 }, sq), true); assert.equal(G.inPolygon({ lat: 1.5, lon: .5 }, sq), false);
});

test('every level accepts its answer and rejects a wrong one', () => {
  const t = G.tileXY(G.CSUSB, 12);
  const good = { dd: '34.1825, -117.3231', hemi: { lat: -33.9, lon: 151.2 }, dist: String(Math.round(G.haversine(G.CSUSB, G.PLACES.ashburn))), travel: '3', merc: '4', tile: `${t.x}/${t.y}`, exif: '34.0572, -118.2432',
    radius: G.OFFICES.filter(o => G.haversine(o, G.PLACES.riverside) <= 50).map(o => o.id), buffer: G.SUBSTATIONS.filter(s => G.haversine(s, G.QUAKE) <= 25).map(s => s.id),
    fence: G.LOGINS.filter(l => !G.inPolygon(l, G.FENCE)).map(l => l.id) };
  const bad = { dd: '34.1825, 117.3231', hemi: { lat: 33.9, lon: -151.2 }, dist: '1000', travel: '4', merc: '2', tile: '1/1', exif: '34.0572, 118.2432', radius: ['o3'], buffer: ['s3'], fence: [] };
  for (const l of G.LEVELS) { assert.ok(l.check(good[l.id]), 'accepts ' + l.id); assert.ok(!l.check(bad[l.id]), 'rejects ' + l.id); assert.ok(l.hints.length && l.lesson.length > 80); }
  assert.equal(G.LEVELS.length, 10);
});

test('pick levels are not trivial: some in, some out', () => {
  for (const [pins, inside] of [[G.OFFICES, o => G.haversine(o, G.PLACES.riverside) <= 50], [G.SUBSTATIONS, s => G.haversine(s, G.QUAKE) <= 25], [G.LOGINS, l => !G.inPolygon(l, G.FENCE)]]) {
    const n = pins.filter(inside).length; assert.ok(n >= 2 && n <= pins.length - 2, `${n} of ${pins.length}`);
  }
  // the notch matters: a login in the notch is inside the bounding box but outside the fence
  assert.ok(G.LOGINS.some(l => !G.inPolygon(l, G.FENCE) && l.lat < 34.188 && l.lat > 34.178 && l.lon > -117.33 && l.lon < -117.315));
});

test('exactly one sign-in is impossible', () => {
  const sp = G.speeds(G.SIGNINS); assert.deepEqual(sp.filter(x => x.kmh > 900).map(x => x.to), [3]);
});

test('USGS parser keeps valid quakes and drops junk', () => {
  const ok = { properties: { mag: 5.1, place: 'Somewhere', time: 1, url: 'https://earthquake.usgs.gov/earthquakes/eventpage/x' }, geometry: { coordinates: [10, 20, 5] } };
  const qs = G.parseQuakes({ features: [ok, { ...ok, properties: { ...ok.properties, url: 'javascript:alert(1)' } }, { properties: { mag: 'x' }, geometry: {} }, { ...ok, properties: { ...ok.properties, mag: 6 } }] });
  assert.deepEqual(qs.map(q => q.mag), [6, 5.1]); assert.throws(() => G.parseQuakes({}));
});
