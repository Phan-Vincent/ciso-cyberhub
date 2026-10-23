"""Vendor the Natural Earth 1:110m country polygons used by the home globe.

Public-domain source data is downloaded once, validated, compacted and
committed as a local asset under public/assets/geo/. At runtime the page
fetches only that self-hosted file; it makes no external network request for
map data.

Usage: python3 scripts/fetch_geography.py [--source path/to/geojson]

Coordinates are rounded to four decimal degrees (about 11 m); a ring that
would otherwise collapse below a valid closed ring keeps its full source
precision instead. Network fetches are capped and timed out. With --source the
file is read from disk and its SHA-256 is recomputed from that file, while
`retrieved` is set to the date the script runs — re-running does not freeze an
earlier retrieval date.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/geo/ne_110m_countries.json'
SOURCE_URL = (
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/'
    'master/geojson/ne_110m_admin_0_countries.geojson'
)
SOURCE_PAGE = (
    'https://github.com/nvkelso/natural-earth-vector/blob/'
    'master/geojson/ne_110m_admin_0_countries.geojson'
)
TERMS_URL = 'https://www.naturalearthdata.com/about/terms-of-use/'
ATTRIBUTION = (
    'Made with Natural Earth. Free vector and raster map data @ naturalearthdata.com.'
)
MAX_BYTES = 3_000_000
TIMEOUT_SECONDS = 30
MIN_COUNTRIES = 170
ROUND_DECIMALS = 4  # 0.0001 degrees ~ 11 m; collapse-prone rings keep source precision


def fetch(url: str) -> bytes:
    request = urllib.request.Request(
        url, headers={'User-Agent': 'cyberhub-geodata/1.0 (+https://ciso-csusb.org)'}
    )
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        data = response.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise ValueError(f'Source exceeds the {MAX_BYTES} byte cap')
    return data


def valid_ring(ring) -> bool:
    """A closed ring needs at least three distinct vertices plus its closing point."""
    if not isinstance(ring, list) or len(ring) < 4:
        return False
    if ring[0] != ring[-1]:
        return False
    seen: set[tuple[float, float]] = set()
    for point in ring:
        if (
            not isinstance(point, list)
            or len(point) < 2
            or not all(isinstance(v, (int, float)) for v in point[:2])
            or not -180 <= point[0] <= 180
            or not -90 <= point[1] <= 90
        ):
            return False
        seen.add((float(point[0]), float(point[1])))
    return len(seen) >= 3


def clean_ring(ring, decimals=ROUND_DECIMALS) -> list[list[float]]:
    cleaned: list[list[float]] = []
    for point in ring:
        lon, lat = float(point[0]), float(point[1])
        if decimals is not None:
            lon, lat = round(lon, decimals), round(lat, decimals)
        pair = [lon, lat]
        if not cleaned or cleaned[-1] != pair:
            cleaned.append(pair)
    if cleaned and cleaned[0] != cleaned[-1]:
        cleaned.append(cleaned[0])
    return cleaned


def clean_ring_stable(ring) -> list[list[float]]:
    """Round to the preferred precision, or keep full source precision if that
    would collapse the ring below a valid closed ring (a tiny island, for
    example)."""
    rounded = clean_ring(ring)
    if valid_ring(rounded):
        return rounded
    return clean_ring(ring, decimals=None)


def compact(data: bytes) -> dict:
    document = json.loads(data)
    if document.get('type') != 'FeatureCollection':
        raise ValueError('Source is not a GeoJSON FeatureCollection')
    features = document.get('features') or []
    countries = []
    for feature in features:
        geometry = feature.get('geometry') or {}
        if geometry.get('type') not in ('Polygon', 'MultiPolygon'):
            continue
        raw = geometry.get('coordinates')
        polygons = [raw] if geometry['type'] == 'Polygon' else raw
        if not isinstance(polygons, list) or not polygons:
            continue
        cleaned_polygons = []
        for polygon in polygons:
            if not isinstance(polygon, list) or not polygon:
                continue
            rings = []
            for ring in polygon:
                if not valid_ring(ring):
                    continue
                cleaned = clean_ring_stable(ring)
                if valid_ring(cleaned):
                    rings.append(cleaned)
            if rings:
                cleaned_polygons.append(rings)
        if not cleaned_polygons:
            continue
        props = feature.get('properties') or {}
        code = props.get('ISO_A3')
        if not isinstance(code, str) or len(code) != 3 or code == '-99':
            code = str(props.get('ADM0_A3') or '')
        name = props.get('ADMIN') or props.get('NAME')
        if not name or not code:
            continue
        countries.append(
            {
                'code': code,
                'name': name,
                'polygons': cleaned_polygons,
            }
        )
    if len(countries) < MIN_COUNTRIES:
        raise ValueError(f'Expected at least {MIN_COUNTRIES} countries, found {len(countries)}')
    return {
        'source': {
            'dataset': 'Natural Earth 1:110m Admin 0 Countries',
            'source_url': SOURCE_PAGE,
            'download_url': SOURCE_URL,
            'terms_url': TERMS_URL,
            'license': 'Public domain',
            'attribution': ATTRIBUTION,
            'retrieved': date.today().isoformat(),
            'source_sha256': hashlib.sha256(data).hexdigest(),
            'rounding': (
                'coordinates rounded to 0.0001 degrees (~11 m); rings that would '
                'otherwise collapse keep full source precision; consecutive '
                'duplicates removed'
            ),
        },
        'countries': countries,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, help='Use an existing downloaded GeoJSON file')
    args = parser.parse_args()
    data = args.source.read_bytes() if args.source else fetch(SOURCE_URL)
    output = compact(data)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(output, ensure_ascii=False, separators=(',', ':')) + '\n',
        encoding='utf-8',
    )
    print(
        f'{OUT.relative_to(ROOT)}: {len(output["countries"])} countries, '
        f'{OUT.stat().st_size} bytes, source sha256 {output["source"]["source_sha256"]}'
    )
    return 0


if __name__ == '__main__':
    sys.exit(main())
