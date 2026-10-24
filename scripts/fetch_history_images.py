"""Fetch archival photos for the history page from Wikimedia Commons, license-checked.

For each event in hub/history.py, try its candidate file names, then a Commons search.
Only files whose license is public domain, CC0, CC BY or CC BY-SA are accepted; NC/ND,
fair-use and unknown licenses are skipped. Each accepted image is saved as a 1600 px wide
JPEG-or-PNG thumbnail at public/assets/history/<id>.jpg and its author, license and page
are recorded in data/history_images.json. Existing images are kept.

Run: python scripts/fetch_history_images.py   (needs network access to commons.wikimedia.org)
"""
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from hub.history import EVENTS  # noqa: E402

API = 'https://commons.wikimedia.org/w/api.php'
UA = {'User-Agent': 'CISOCyberHub/0.1 (https://github.com/Phan-Vincent/ciso-cyberhub; educational history page)'}
OUT = ROOT / 'public/assets/history'
MANIFEST = ROOT / 'data/history_images.json'
FREE = re.compile(r'^(public domain|pd\b|pd-|cc0|cc[ -]by(-sa)?[ -]?[0-9.]*$|cc[ -]by(-sa)?[ -][0-9.]+.*$)', re.I)
BLOCKED = re.compile(r'\b(nc|nd|non-?commercial|no ?deriv|fair use)\b', re.I)


def api(params):
    url = API + '?' + urllib.parse.urlencode({**params, 'format': 'json', 'formatversion': '2'})
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return json.loads(r.read(4_000_000))


def strip(html):
    return ' '.join(unescape(re.sub(r'<[^>]+>', ' ', html or '')).split())[:160]


def info(title):
    data = api({'action': 'query', 'prop': 'imageinfo', 'titles': title, 'iiprop': 'url|extmetadata|mime', 'iiurlwidth': 1600})
    page = (data.get('query', {}).get('pages') or [{}])[0]
    ii = (page.get('imageinfo') or [None])[0]
    if not ii or page.get('missing'):
        return None
    meta = ii.get('extmetadata', {})
    lic = strip(meta.get('LicenseShortName', {}).get('value', ''))
    if not lic or BLOCKED.search(lic) or not FREE.search(lic):
        return None
    if ii.get('mime') not in ('image/jpeg', 'image/png', 'image/svg+xml'):
        return None
    return {'title': title, 'url': ii.get('thumburl') or ii['url'], 'page': ii.get('descriptionurl'), 'license': lic,
            'author': strip(meta.get('Artist', {}).get('value', '')) or 'Unknown author', 'description': strip(meta.get('ImageDescription', {}).get('value', ''))}


def search(query):
    data = api({'action': 'query', 'list': 'search', 'srsearch': query, 'srnamespace': 6, 'srlimit': 10})
    return [h['title'] for h in data.get('query', {}).get('search', [])]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    for eid, _era, _year, title, _s, _l, candidates, query, _src in EVENTS:
        dest = OUT / f'{eid}.jpg'
        if dest.exists() and eid in manifest:
            continue
        titles = [c if c.startswith('File:') else 'File:' + c for c in candidates]
        if query:
            try:
                titles += search(query)
            except Exception as exc:  # noqa: BLE001 - keep going
                print('search failed', eid, exc)
        chosen = None
        for t in titles:
            try:
                chosen = info(t)
            except Exception as exc:  # noqa: BLE001
                print('lookup failed', t, exc)
            if chosen:
                break
            time.sleep(0.2)
        if not chosen:
            print('no free image for', eid)
            continue
        with urllib.request.urlopen(urllib.request.Request(chosen['url'], headers=UA), timeout=60) as r:
            body = r.read(12_000_000)
        dest.write_bytes(body)
        manifest[eid] = {k: chosen[k] for k in ('title', 'page', 'license', 'author', 'description')}
        print('saved', eid, chosen['title'], chosen['license'], f'{len(body) // 1024} KB')
        time.sleep(0.5)
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False, sort_keys=True) + '\n')


if __name__ == '__main__':
    main()
