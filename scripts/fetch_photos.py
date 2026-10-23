"""Download the free photos listed in data/photos.json into public/assets/photos/.

Run from the repo root on a normal internet connection:  python scripts/fetch_photos.py
Photos are self-hosted because the site's Content Security Policy only allows images from 'self'.
Before committing a photo, open its "page" link and confirm it is under the Unsplash License
(free to use) and not "Unsplash+" (paid). Remove any entry that is not free.
"""
import json, pathlib, sys, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/photos'

def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    failed = 0
    for p in json.loads((ROOT / 'data/photos.json').read_text(encoding='utf-8')):
        dest = OUT / p['file']
        if dest.exists():
            print('have', dest.name); continue
        url = f"https://unsplash.com/photos/{p['id']}/download?force=true&w=1600"
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'CyberHub photo fetch'})
            with urllib.request.urlopen(req, timeout=60) as r:
                if not r.headers.get('content-type', '').startswith('image/'):
                    raise ValueError('not an image (may be Unsplash+, check the page)')
                dest.write_bytes(r.read())
            print('saved', dest.name, f'{dest.stat().st_size // 1024} KB')
        except Exception as exc:  # report and continue
            failed += 1; print('FAILED', p['file'], exc, file=sys.stderr)
    return 1 if failed else 0

if __name__ == '__main__':
    raise SystemExit(main())
