"""GIS and data analytics: /gis/, /data/, /labs/gis/ and /labs/data/.

The data pages use real open data already in the repo: the CISA KEV snapshot (with CVSS and EPSS
scores) from data/intelligence.json and the internship scan from data/internships.json. Both are
refreshed by the daily pipeline, so the charts and the Data Lab answers move with them.
The GIS hub's earthquake layer is fetched from USGS in the visitor's browser, only when they ask.
"""
from __future__ import annotations

import html
import json
from collections import Counter

from .common import ROOT, read_json
from .drawings import data_drawing, gis_drawing

E = html.escape


# ------------------------------------------------------------------ data exports
def kev_rows(intel: dict) -> list[list]:
    out = []
    for v in intel.get('vulnerabilities', []):
        if not v.get('kev') or not v.get('date_added'):
            continue
        c = v.get('cvss') or {}
        score = c.get('score') if isinstance(c, dict) else None
        epss = v.get('epss')
        out.append([v['id'], v.get('vendor') or '(unknown)', v.get('product') or '(unknown)', v['date_added'],
                    round(float(score), 1) if isinstance(score, (int, float)) else None, round(float(epss), 5) if isinstance(epss, (int, float)) else None])
    return sorted(out, key=lambda r: (r[3], r[0]), reverse=True)


def job_rows(data: dict) -> list[list]:
    out = []
    for i in data.get('items', []):
        try:
            miles = round(float(i.get('miles')), 1) if i.get('miles') not in (None, '') else None
        except (TypeError, ValueError):
            miles = None
        sec = i.get('security')
        out.append([i.get('company', ''), i.get('title', ''), i.get('city', ''), miles, i.get('zone', ''), sec is True or str(sec).lower() == 'true', i.get('category', ''), i.get('posted', '')])
    return out


def _months(last: str, n: int) -> list[str]:
    y, m = int(last[:4]), int(last[5:7])
    out = []
    for k in range(n - 1, -1, -1):
        mm = m - k
        yy = y + (mm - 1) // 12
        mm = (mm - 1) % 12 + 1
        out.append(f'{yy:04d}-{mm:02d}')
    return out


def _bars(rows: list[tuple[str, int]], label: str, highlight: str = '', w: int = 640, h: int = 260) -> str:
    """Server-rendered single-series bar chart in the site's drawing language (same classes as the Data Lab)."""
    L, B, T = 40, 46, 16
    mx = max([1] + [v for _, v in rows])
    step = 10 ** max(0, len(str(mx)) - 1)
    top = ((mx + step - 1) // step) * step
    y = lambda v: h - B - v / top * (h - B - T)
    bw = (w - L - 8) / max(1, len(rows))
    s = f'<svg class="dl-chart" viewBox="0 0 {w} {h}" role="img" aria-label="{E(label)}">'
    for i in range(5):
        v = top * i / 4
        s += f'<path class="{"dl-grid" if i else "dl-base"}" d="M{L} {y(v):.1f}H{w - 4}"/><text class="dl-tick dl-r" x="{L - 6}" y="{y(v) + 3:.1f}">{int(v)}</text>'
    for i, (k, v) in enumerate(rows):
        x = L + 4 + i * bw
        cls = 'dl-bar hi' if k == highlight else 'dl-bar'
        s += f'<rect class="{cls}" x="{x:.1f}" y="{y(v):.1f}" width="{max(2, bw - 6):.1f}" height="{h - B - y(v):.1f}"><title>{E(k)}: {v}</title></rect>'
        s += f'<text class="dl-tick dl-c" x="{x + (bw - 6) / 2:.1f}" y="{h - B + 14}">{E(k if len(k) <= 9 else k[:8] + "…")}</text>'
        if k == highlight:
            s += f'<text class="dl-val dl-c" x="{x + (bw - 6) / 2:.1f}" y="{y(v) - 5:.1f}">{v}</text>'
    return s + '</svg>'


def _table(rows: list[tuple[str, int]], a: str, b: str) -> str:
    return (f'<details class="dl-tview"><summary>Show as a table</summary><table class="dl-table"><thead><tr><th>{E(a)}</th><th class="num">{E(b)}</th></tr></thead><tbody>'
            + ''.join(f'<tr><td>{E(k)}</td><td class="num">{v:,}</td></tr>' for k, v in rows) + '</tbody></table></details>')


# ------------------------------------------------------------------ pages
SOURCES = [
    ('Natural Earth', 'Country, coastline and city layers at three scales.', 'Public domain', 'https://www.naturalearthdata.com/about/terms-of-use/'),
    ('OpenStreetMap', 'Streets, buildings and points of interest, edited by volunteers worldwide.', 'ODbL: attribute and share alike', 'https://www.openstreetmap.org/copyright'),
    ('USGS earthquake feeds', 'GeoJSON of every recorded quake, updated every minute.', 'U.S. public domain', 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php'),
    ('U.S. Census TIGER/Line', 'Boundaries, roads and address ranges for the whole country.', 'U.S. public domain', 'https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html'),
    ('FEMA National Flood Hazard Layer', 'Official flood zones, the layer behind flood insurance maps.', 'U.S. public domain', 'https://www.fema.gov/flood-maps/national-flood-hazard-layer'),
    ('NASA FIRMS', 'Active fire detections from satellites, within hours.', 'Open, cite NASA', 'https://firms.modaps.eosdis.nasa.gov/'),
]
TOOLS = [('QGIS', 'Free desktop GIS: open layers, run buffers and overlays, make maps.', 'https://qgis.org/'),
         ('PostGIS', 'Spatial SQL for PostgreSQL: "which assets are within 5 km?" as a query.', 'https://postgis.net/'),
         ('GDAL', 'The command-line Swiss Army knife for converting and reprojecting geodata.', 'https://gdal.org/'),
         ('Leaflet', 'A small JavaScript library for interactive web maps.', 'https://leafletjs.com/')]


def gis_page(site) -> str:
    b = site.base
    body = site.heading('GIS and security', 'Maps are data, and data is IT. Learn how location shows up in security work, from impossible-travel alerts to the substations behind the grid.', 'Learn / GIS')
    body += gis_drawing(b)
    body += ('<section class="gx-sec"><h2>Why IT needs GIS</h2><div class="gx-grid">'
             '<article><h3>Infrastructure has an address</h3><p>The United States designates 16 critical infrastructure sectors, from energy and water to communications. Every substation, cell tower and data center sits somewhere, and attackers, insurers and responders all ask the same question: what is near what? '
             '<a href="https://www.everycrsreport.com/reports/R48878.html">Congressional Research Service, 2026</a>.</p></article>'
             '<article id="coords"><h3>Every log line has a place</h3><p>Sign-in logs record an IP address, and tools turn that into a location. Microsoft Entra ID flags "atypical travel" when two sign-ins come from places too far apart for the time between them. '
             '<a href="https://learn.microsoft.com/en-us/entra/id-protection/concept-identity-protection-risks">Microsoft Learn</a>.</p></article>'
             '<article><h3>Locations are estimates</h3><p>IP geolocation returns a circle, not a pin. MaxMind describes an accuracy radius the address is "more likely than not" inside, and says it is not precise enough to put a pin on a map. '
             '<a href="https://blog.maxmind.com/2022/06/using-maxminds-accuracy-radius">MaxMind</a>.</p></article>'
             '<article><h3>Position can be attacked</h3><p>GPS signals can be jammed or spoofed. The FAA publishes a GPS and GNSS interference resource guide for pilots, updated in 2026, that names spoofing hotspots. '
             '<a href="https://nbaa.org/aircraft-operations/communications-navigation-surveillance-cns/global-positioning-system-gps/gps-interference/faa-publishes-updated-gps-gnss-interferences-jamming-and-spoofing-resource/">NBAA on the FAA guide</a>.</p></article>'
             '<article id="layers"><h3>Geodata is sensitive data</h3><p>A map of every substation is useful to planners and to attackers. The federal HIFLD Open portal of infrastructure layers was shut down, and most of that data now sits behind a login. '
             '<a href="https://www.napsgfoundation.org/navigating-the-hifld-transition/">NAPSG Foundation</a>.</p></article>'
             '<article id="buffer"><h3>GIS systems are IT systems</h3><p>Map servers, spatial databases and tile caches run on the same networks as everything else, with the same patching, access control and backup needs. A GIS analyst who understands security is rare and valuable.</p></article>'
             '</div></section>')
    body += ('<section class="gx-sec"><h2>Core ideas in five minutes</h2><dl class="gx-defs">'
             '<div><dt>Coordinates</dt><dd>Latitude runs north–south from −90 to 90; longitude runs east–west from −180 to 180. South and west are negative.</dd></div>'
             '<div><dt>Projection</dt><dd>Flattening a globe always distorts something. Web Mercator keeps shapes but inflates areas toward the poles.</dd></div>'
             '<div><dt>Vector and raster</dt><dd>Vector data is points, lines and polygons (a fence line). Raster data is a grid of cells (a satellite image, a heat map).</dd></div>'
             '<div><dt>Layers</dt><dd>A map stacks layers: roads, flood zones, assets. Analysis happens where layers overlap.</dd></div>'
             '<div><dt>Buffer and overlay</dt><dd>A buffer is everything within a distance; an overlay intersects layers, such as assets inside a flood zone.</dd></div>'
             '<div><dt>Geocoding</dt><dd>Turning an address or an IP into coordinates. Always ask how precise the result really is.</dd></div></dl></section>')
    body += ('<section class="gx-sec gx-live" id="gis-live"><div class="gx-live-head"><div><h2>Live layer: earthquakes this week</h2>'
             '<p>Pull the U.S. Geological Survey\'s public feed of magnitude 4.5+ earthquakes from the past 7 days and plot it on the map. Your browser asks USGS directly, only when you press the button.</p></div>'
             '<button type="button" class="primary" id="gis-load">Load from USGS</button></div>'
             '<div class="gl-live-map"></div><p class="gl-live-status" role="status">Not loaded yet.</p><ol class="gl-live-list"></ol>'
             '<p class="gl-src">Data: <a href="https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php">USGS Earthquake Hazards Program</a>, public domain. Map: Natural Earth, public domain.</p></section>')
    body += '<section class="gx-sec"><h2>Open data you can use</h2><div class="gx-src">' + ''.join(
        f'<a class="gx-card" href="{E(u)}"><b>{E(n)}</b><span>{E(d)}</span><em>{E(lic)}</em></a>' for n, d, lic, u in SOURCES) + '</div></section>'
    body += '<section class="gx-sec"><h2>Free tools to learn</h2><div class="gx-src">' + ''.join(
        f'<a class="gx-card" href="{E(u)}"><b>{E(n)}</b><span>{E(d)}</span></a>' for n, d, u in TOOLS) + '</div></section>'
    body += ('<section class="gx-sec gx-cta"><div><h2>Careers</h2><p>The Bureau of Labor Statistics counts 14,700 cartographers and photogrammetrists, with median pay of $81,390 (May 2025) and 7% projected growth from 2025 to 2035, much faster than average. '
             'GIS analysts, geospatial intelligence analysts and security engineers who can work with location data all build on the same skills. '
             '<a href="https://www.bls.gov/ooh/architecture-and-engineering/cartographers-and-photogrammetrists.htm">BLS Occupational Outlook Handbook</a>.</p></div>'
             f'<div class="gx-go"><a class="button primary" href="{E(b)}/labs/gis/">Start the GIS Lab</a><a class="button" href="{E(b)}/data/">Data analytics</a></div></section>')
    return body


def data_page(site, kev: list[list], jobs: list[list]) -> str:
    b = site.base
    newest = max((r[3] for r in kev), default='')
    months = _months(newest, 12) if newest else []
    per = Counter(r[3][:7] for r in kev)
    mrows = [(m, per.get(m, 0)) for m in months]
    peak = max(mrows, key=lambda x: (x[1], x[0]))[0] if mrows else ''
    vendors = Counter(r[1] for r in kev).most_common(10)
    with_cvss = sum(1 for r in kev if r[4] is not None)
    hi_epss = sum(1 for r in kev if r[5] is not None and r[5] >= .5)
    body = site.heading('Data analytics', 'Security runs on data: which vulnerabilities to patch first, which alerts matter, where the risk sits. Learn the analysis loop on real, open security data.', 'Learn / Data')
    body += data_drawing(b)
    body += ('<section class="gx-sec"><h2>The analysis loop</h2><ol class="gx-loop">'
             '<li><b>Ask</b><span>A question someone will act on: what do we patch this week?</span></li>'
             '<li><b>Acquire</b><span>Find data with a known source, date and license.</span></li>'
             '<li><b>Clean</b><span>Fix types, time zones, duplicates and missing values.</span></li>'
             '<li><b>Explore</b><span>Count, group, chart. Look at the rows behind every spike.</span></li>'
             '<li><b>Explain</b><span>An honest chart and one sentence a manager can act on.</span></li></ol></section>')
    body += (f'<section class="gx-sec"><h2>On real data: the CISA KEV catalog</h2><p class="gx-lead">CISA\'s Known Exploited Vulnerabilities catalog lists vulnerabilities with evidence of exploitation in the wild. This snapshot has <b>{len(kev):,}</b> entries, the newest added {E(newest)}. '
             f'{with_cvss:,} carry a CVSS severity score so far (the pipeline adds scores a few at a time) and {hi_epss:,} have an EPSS score of 0.5 or higher, meaning at least an estimated 50% chance of exploitation in the next 30 days.</p>'
             '<div class="gx-charts">'
             f'<figure><figcaption><b>Entries added per month</b><span>Last 12 months of the snapshot. Highlighted: the busiest month.</span></figcaption>{_bars([(m[2:], c) for m, c in mrows], "Bar chart of KEV entries added per month for the last 12 months.", peak[2:])}{_table(mrows, "Month", "Entries added")}</figure>'
             f'<figure><figcaption><b>Top 10 vendors by entries</b><span>All years. Counts, not rates: big vendors ship more software.</span></figcaption>{_bars([(v, c) for v, c in vendors], "Bar chart of the ten vendors with the most KEV entries.", vendors[0][0] if vendors else "")}{_table(vendors, "Vendor", "Entries")}</figure>'
             '</div><p class="gl-src">Source: <a href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog">CISA KEV</a>, with CVSS from <a href="https://nvd.nist.gov/">NVD</a> and EPSS from <a href="https://www.first.org/epss/">FIRST</a>. Refreshed by this site\'s daily pipeline.</p></section>')
    body += ('<section class="gx-sec"><h2>Why it matters in security</h2><div class="gx-grid">'
             '<article><h3>Prioritization</h3><p>No team patches everything at once. KEV says what is being exploited; EPSS ranks what is likely next; CVSS says how bad it would be. Combining them is a data problem.</p></article>'
             '<article><h3>Detection</h3><p>A SOC is an analytics shop: baselines, outliers and correlations turn millions of log lines into a few alerts worth a human\'s time.</p></article>'
             '<article><h3>Reporting</h3><p>Leaders fund what they can see. Clear, honest charts of risk and progress are how security teams earn budget.</p></article></div></section>')
    body += ('<section class="gx-sec"><h2>Tools to learn</h2><div class="gx-src">'
             '<a class="gx-card" href="https://pandas.pydata.org/"><b>Python and pandas</b><span>The standard for cleaning and analyzing tables in code.</span></a>'
             '<a class="gx-card" href="https://jupyter.org/"><b>Jupyter</b><span>Notebooks that mix code, charts and notes, ideal for investigations.</span></a>'
             '<a class="gx-card" href="https://duckdb.org/"><b>DuckDB</b><span>Fast SQL on CSV and Parquet files on your laptop, no server needed.</span></a>'
             '<a class="gx-card" href="https://www.elastic.co/kibana"><b>Kibana</b><span>Search and dashboards on logs, common in security operations.</span></a></div></section>')
    body += ('<section class="gx-sec gx-cta"><div><h2>Careers</h2><p>The Bureau of Labor Statistics counts 275,600 data scientists, with median pay of $120,230 in 2025 and 35% projected growth from 2025 to 2035. Security analysts, threat hunters and GIS analysts use the same skills every day. '
             '<a href="https://www.bls.gov/ooh/math/data-scientists.htm">BLS Occupational Outlook Handbook</a>.</p></div>'
             f'<div class="gx-go"><a class="button primary" href="{E(b)}/labs/data/">Start the Data Lab</a><a class="button" href="{E(b)}/gis/">GIS and security</a></div></section>')
    return body


def _shell(rid: str, p: str, workspace: str) -> str:
    return (f'<div class="chal gx-lab" id="{rid}"><div class="ch-top"><nav class="rt-lvls ch-lvls" id="{p}-lvls" aria-label="Levels"></nav><span class="label" id="{p}-count"></span></div>'
            f'<section class="ch-task"><p class="label" id="{p}-lvl"></p><p class="ch-q" id="{p}-q"></p></section>{workspace}'
            f'<form class="ch-form" id="{p}-form" autocomplete="off"><label class="label" id="{p}-a-label" for="{p}-a">Your answer</label>'
            f'<input id="{p}-a" type="text" maxlength="120" spellcheck="false"><button type="submit" class="primary">Check</button></form><p class="ch-msg" id="{p}-msg" role="status"></p>'
            f'<div class="ch-help"><button type="button" id="{p}-hint">Stuck? Get a hint</button><ol class="ch-hints" id="{p}-hints"></ol></div>'
            f'<div class="soc-result" id="{p}-lesson" hidden><strong>What this teaches</strong><p></p><button type="button" class="primary" id="{p}-next">Next level →</button></div>'
            '<noscript><p class="notice">This lab needs JavaScript.</p></noscript></div>')


def gis_lab_page(site) -> str:
    body = site.heading('GIS Lab', 'Ten levels on location data in security: read coordinates, measure distances, catch impossible travel, run buffers and geofences, and pull a location out of a photo.', 'Practice / GIS Lab')
    calc = ('<aside class="gc" aria-label="Geo calculator"><h2 class="label">Geo calculator</h2>'
            '<form id="gc-conv"><label>Convert a point<input id="gc-c" type="text" placeholder="34°10′57″N 117°19′23″W" autocomplete="off" spellcheck="false"></label><button type="submit">Convert</button></form>'
            '<form id="gc-dist"><label>From<input id="gc-a" type="text" placeholder="lat, lon" autocomplete="off"></label><label>To<input id="gc-b" type="text" placeholder="lat, lon" autocomplete="off"></label>'
            '<label>Minutes between (optional)<input id="gc-min" type="number" min="0" step="1"></label><button type="submit">Distance</button></form>'
            '<form id="gc-tile"><label>Point<input id="gc-t" type="text" placeholder="lat, lon" autocomplete="off"></label><label>Zoom<input id="gc-z" type="number" min="0" max="20" value="12"></label><button type="submit">Tile and scale</button></form>'
            '<pre class="gc-out" id="gc-out" role="status">Results appear here.</pre></aside>')
    body += _shell('gislab', 'gl', f'<div class="gx-work"><div class="gl-stage" id="gl-stage"></div>{calc}</div>')
    body += ('<section class="rt-about"><h2>Take it further</h2><p>Install QGIS (free) and open the Natural Earth countries layer, then try a buffer around a city. '
             f'Read <a href="{E(site.base)}/gis/">GIS and security</a> for the ideas behind each level.</p></section>')
    return body


def data_lab_page(site) -> str:
    body = site.heading('Data Lab', 'Ten levels answered with real open data: the CISA Known Exploited Vulnerabilities catalog and this site\'s internship scan. Filter, group, chart, then explain what you found.', 'Practice / Data Lab')
    ws = ('<div class="dx" aria-label="Data explorer"><p class="label" id="dx-meta">Loading data…</p><form class="dx-form" id="dx-form">'
          '<label>Dataset<select id="dx-set"><option value="kev">CISA KEV</option><option value="jobs">Internships</option></select></label>'
          '<label>Search<input id="dx-q" type="search" placeholder="vendor, product, company…" autocomplete="off"></label>'
          '<label data-for="kev">Added on or after<input id="dx-from" type="date"></label><label data-for="kev">Added on or before<input id="dx-to" type="date"></label>'
          '<label data-for="kev">CVSS at least<input id="dx-cvss" type="number" min="0" max="10" step="0.1"></label><label data-for="kev">EPSS at least<input id="dx-epss" type="number" min="0" max="1" step="0.01"></label>'
          '<label data-for="kev">Missing<select id="dx-miss"><option value="">Either</option><option value="cvss">CVSS missing</option><option value="epss">EPSS missing</option></select></label>'
          '<label data-for="jobs" hidden>Security role<select id="dx-sec"><option value="">Any</option><option value="true">Yes</option><option value="false">No</option></select></label>'
          '<label data-for="jobs" hidden>Miles at most<input id="dx-miles" type="number" min="0" step="1"></label>'
          '<label>Group by<select id="dx-group"></select></label><label>Metric<select id="dx-metric"></select></label>'
          '<div class="dx-btns"><button type="button" id="dx-reset">Reset</button><button type="button" id="dx-csv">Download CSV</button></div></form>'
          '<p class="label" id="dx-count" role="status"></p><div class="dx-out"><div id="dx-chart"></div><div id="dx-table"></div></div></div>'
          '<div id="dl-extra" class="dl-extra"></div>')
    body += _shell('datalab', 'dl', ws)
    body += (f'<section class="rt-about"><h2>Take it further</h2><p>Download the CSV and repeat a level in a spreadsheet, or in Python with pandas. Read <a href="{E(site.base)}/data/">Data analytics</a> for the analysis loop. '
             'Data: <a href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog">CISA KEV</a>, <a href="https://www.first.org/epss/">FIRST EPSS</a>, <a href="https://nvd.nist.gov/">NVD</a>.</p></section>')
    return body


def build_geodata(site) -> None:
    kev = kev_rows(site.intel)
    jobs_src = read_json(ROOT / 'data/internships.json')
    jobs = job_rows(jobs_src)
    out = site.out / 'assets/data'
    out.mkdir(parents=True, exist_ok=True)
    version = next((v.get('version') for v in site.intel.get('vulnerabilities', []) if v.get('version')), '')
    (out / 'kev.json').write_text(json.dumps({'source': 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog', 'version': version,
                                              'cols': ['id', 'vendor', 'product', 'added', 'cvss', 'epss'], 'rows': kev}, separators=(',', ':')))
    (out / 'internships.json').write_text(json.dumps({'source': jobs_src.get('source', {}).get('url', ''), 'generated': jobs_src.get('generated_at', ''),
                                                      'cols': ['company', 'title', 'city', 'miles', 'zone', 'security', 'category', 'posted'], 'rows': jobs}, separators=(',', ':')))
    site.page('/gis/', 'GIS and security', gis_page(site), 'Why GIS matters in IT and security: coordinates, projections, IP geolocation, impossible travel, critical infrastructure and open geodata, with a live USGS earthquake layer.', 'Learn', module='gislab')
    site.page('/labs/gis/', 'GIS Lab', gis_lab_page(site), 'GIS Lab: ten levels on coordinates, distances, impossible travel, accuracy radius, buffers, geofences, Mercator distortion, map tiles and photo EXIF.', 'Labs', module='gislab')
    site.page('/data/', 'Data analytics', data_page(site, kev, jobs), 'Data analytics for security on real open data: the CISA KEV catalog with CVSS and EPSS scores, refreshed daily.', 'Learn')
    site.page('/labs/data/', 'Data Lab', data_lab_page(site), 'Data Lab: ten levels using real CISA KEV and internship data. Filter, group, chart and explain.', 'Labs', module='datalab')
