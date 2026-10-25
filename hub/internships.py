"""Weekly internship scanner, focused on students at Cal State San Bernardino.

Source: the community-maintained SimplifyJobs Summer 2027 internship list (public JSON,
updated many times a day). We keep only active, visible postings that are (a) within
driving range of CSUSB, using a fixed table of Southern California city coordinates, or
(b) remote in the US. Each record keeps a link to the employer's own posting, the
date it was posted, and attribution. Nothing is inferred about pay or eligibility.

Run:  python -m hub.internships            (fetch over HTTPS, write data/internships.json)
      python -m hub.internships --file X   (use a local copy of listings.json)
"""
from __future__ import annotations

import argparse
import json
import math
import re
import urllib.request
from datetime import datetime, timezone
from urllib.parse import urlsplit

from .common import ROOT, now, safe_url, write_json

SOURCE_URL = 'https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/.github/scripts/listings.json'
SOURCE_PAGE = 'https://github.com/SimplifyJobs/Summer2027-Internships'
MAX_BYTES = 40_000_000
CSUSB = (34.1826, -117.3231)  # Cal State San Bernardino, 5500 University Pkwy
NEAR_MILES, REGION_MILES = 45, 110

# Approximate city centers (lat, lon). Enough precision for "about N miles" labels.
CITIES = {
    'san bernardino': (34.1083, -117.2898), 'highland': (34.1283, -117.2086), 'redlands': (34.0556, -117.1825), 'loma linda': (34.0483, -117.2612),
    'colton': (34.0739, -117.3137), 'rialto': (34.1064, -117.3703), 'fontana': (34.0922, -117.4350), 'yucaipa': (34.0336, -117.0431),
    'riverside': (33.9806, -117.3755), 'moreno valley': (33.9425, -117.2297), 'corona': (33.8753, -117.5664), 'ontario': (34.0633, -117.6509),
    'rancho cucamonga': (34.1064, -117.5931), 'upland': (34.0975, -117.6484), 'chino': (34.0122, -117.6889), 'chino hills': (33.9898, -117.7326),
    'claremont': (34.0967, -117.7198), 'pomona': (34.0551, -117.7500), 'victorville': (34.5362, -117.2928), 'hesperia': (34.4264, -117.3009),
    'temecula': (33.4936, -117.1484), 'murrieta': (33.5539, -117.2139), 'palm springs': (33.8303, -116.5453), 'palm desert': (33.7222, -116.3745),
    'diamond bar': (34.0286, -117.8103), 'walnut': (34.0203, -117.8654), 'west covina': (34.0686, -117.9390), 'el monte': (34.0686, -118.0276),
    'rosemead': (34.0806, -118.0728), 'alhambra': (34.0953, -118.1270), 'pasadena': (34.1478, -118.1445), 'monrovia': (34.1442, -117.9990),
    'glendale': (34.1425, -118.2551), 'burbank': (34.1808, -118.3090), 'los angeles': (34.0522, -118.2437), 'culver city': (34.0211, -118.3965),
    'santa monica': (34.0195, -118.4912), 'venice': (33.9850, -118.4695), 'playa vista': (33.9757, -118.4166), 'el segundo': (33.9192, -118.4165),
    'hawthorne': (33.9164, -118.3526), 'torrance': (33.8358, -118.3406), 'redondo beach': (33.8492, -118.3884), 'carson': (33.8317, -118.2820),
    'long beach': (33.7701, -118.1937), 'cerritos': (33.8583, -118.0648), 'downey': (33.9401, -118.1332), 'brea': (33.9167, -117.9001),
    'fullerton': (33.8704, -117.9242), 'anaheim': (33.8366, -117.9143), 'orange': (33.7879, -117.8531), 'santa ana': (33.7455, -117.8677),
    'tustin': (33.7458, -117.8261), 'irvine': (33.6846, -117.8265), 'costa mesa': (33.6411, -117.9187), 'newport beach': (33.6189, -117.9298),
    'huntington beach': (33.6595, -117.9988), 'lake forest': (33.6469, -117.6892), 'mission viejo': (33.6000, -117.6720), 'aliso viejo': (33.5685, -117.7256),
    'san clemente': (33.4270, -117.6120), 'oceanside': (33.1959, -117.3795), 'carlsbad': (33.1581, -117.3506), 'vista': (33.2000, -117.2425),
    'san marcos': (33.1434, -117.1661), 'escondido': (33.1192, -117.0864), 'san diego': (32.7157, -117.1611), 'la jolla': (32.8328, -117.2713),
    'northridge': (34.2283, -118.5368), 'van nuys': (34.1899, -118.4514), 'calabasas': (34.1367, -118.6615), 'westlake village': (34.1458, -118.8059),
    'thousand oaks': (34.1706, -118.8376), 'simi valley': (34.2694, -118.7815), 'moorpark': (34.2856, -118.8820), 'valencia': (34.4436, -118.6090),
    'santa clarita': (34.3917, -118.5426), 'lancaster': (34.6868, -118.1542), 'palmdale': (34.5794, -118.1165),
}
SECURITY = re.compile(r'secur|cyber|\bsoc\b|threat|vulnerab|incident|forensic|\bgrc\b|governance|risk|identity|\biam\b|privacy|compliance|penetration|red team|blue team|detection|malware|assurance|information systems|\bit\b|information technology|network|infrastructure|systems admin|cloud', re.I)


def miles(a, b):
    lat1, lon1, lat2, lon2 = map(math.radians, (*a, *b))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 3958.8 * 2 * math.asin(math.sqrt(h))


def place(location: str):
    """('San Diego, CA') -> (miles from CSUSB, 'San Diego') or None. Remote -> (None, 'Remote')."""
    loc = location.strip()
    low = loc.lower()
    if re.fullmatch(r'remote(?:\s*(?:in|[-,/()])\s*(?:us|usa|united states)\s*\)?)?', low):
        return (None, 'Remote (US)')
    m = re.fullmatch(r'([^,]+),\s*(?:CA|California)', loc, re.I)
    if not m:
        return None
    city = m.group(1).strip().lower()
    if city in CITIES:
        return (round(miles(CSUSB, CITIES[city])), m.group(1).strip())
    return None


def scan(listings: list[dict], today: datetime | None = None) -> dict:
    today = today or datetime.now(timezone.utc)
    items = []
    for x in listings:
        if not x.get('active') or not x.get('is_visible', True):
            continue
        try:
            url = safe_url(x.get('url') or '')
        except ValueError:
            continue
        spots = [p for p in (place(l) for l in x.get('locations') or []) if p]
        if not spots:
            continue
        near = [p for p in spots if p[0] is not None and p[0] <= REGION_MILES]
        remote = any(p[0] is None for p in spots)
        if not near and not remote:
            continue
        best = min(near, key=lambda p: p[0]) if near else None
        try:
            posted = datetime.fromtimestamp(int(x.get('date_posted') or 0), timezone.utc)
        except (ValueError, OverflowError, OSError, TypeError):
            continue
        title = ' '.join(str(x.get('title') or '').split())[:160]
        company = ' '.join(str(x.get('company_name') or '').split())[:80]
        if not title or not company:
            continue
        items.append({
            'id': str(x.get('id'))[:64], 'company': company, 'title': title, 'url': url,
            'category': str(x.get('category') or 'Other')[:40], 'terms': [str(t)[:20] for t in (x.get('terms') or []) if t and t != 'N/A'][:3],
            'posted': posted.date().isoformat(), 'new': (today - posted).days <= 7,
            'city': best[1] if best else 'Remote (US)', 'miles': best[0] if best else None,
            'zone': 'near' if best and best[0] <= NEAR_MILES else ('region' if best else 'remote'),
            'also_remote': bool(best and remote), 'security': bool(SECURITY.search(f"{title} {x.get('category') or ''}")),
            'sponsorship': str(x.get('sponsorship') or '')[:40],
        })
    seen=set();uniq=[]
    for i in items:
        k=(i['company'].lower(),i['title'].lower(),i['city'])
        if k not in seen:seen.add(k);uniq.append(i)
    items=uniq
    items.sort(key=lambda i: (i['zone'] != 'near', not i['security'], i['posted'] and -int(i['posted'].replace('-', '')), i['miles'] if i['miles'] is not None else 999))
    return {'generated_at': now(), 'source': {'name': 'SimplifyJobs Summer 2027 Internships (community list)', 'url': SOURCE_PAGE},
            'origin': {'name': 'Cal State San Bernardino', 'lat': CSUSB[0], 'lon': CSUSB[1]}, 'near_miles': NEAR_MILES, 'region_miles': REGION_MILES,
            'items': items[:600]}


def fetch() -> list[dict]:
    safe_url(SOURCE_URL)
    if urlsplit(SOURCE_URL).hostname != 'raw.githubusercontent.com':
        raise RuntimeError('Unexpected source host')
    req = urllib.request.Request(SOURCE_URL, headers={'User-Agent': 'CISOCyberHub/0.1 (+internship scanner)', 'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=60) as r:  # noqa: S310 - fixed HTTPS allowlisted URL
        body = r.read(MAX_BYTES + 1)
    if len(body) > MAX_BYTES:
        raise RuntimeError('Listing file exceeds size bound')
    data = json.loads(body.decode('utf-8'))
    if not isinstance(data, list):
        raise RuntimeError('Unexpected listing format')
    return data


def main() -> None:
    p = argparse.ArgumentParser(); p.add_argument('--file'); a = p.parse_args()
    listings = json.loads(open(a.file, encoding='utf-8').read()) if a.file else fetch()
    out = scan(listings)
    if len(out['items']) == 0:
        raise SystemExit('Scanner found no postings; keeping the previous file.')
    write_json(ROOT / 'data/internships.json', out)
    print(json.dumps({'internships': len(out['items']), 'near': sum(i['zone'] == 'near' for i in out['items']),
                      'region': sum(i['zone'] == 'region' for i in out['items']), 'remote': sum(i['zone'] == 'remote' for i in out['items']),
                      'security': sum(i['security'] for i in out['items']), 'new_this_week': sum(i['new'] for i in out['items'])}))


if __name__ == '__main__':
    main()
