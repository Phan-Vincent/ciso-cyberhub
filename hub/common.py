"""Small, explicit trust boundaries shared by ingestion, validation and rendering."""
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

ROOT = Path(__file__).resolve().parents[1]
CVE = re.compile(r'^CVE-\d{4}-\d{4,}$')
SLUG = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')


def now():
    return datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')


def read_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(value, indent=2, ensure_ascii=False, sort_keys=True) + '\n'
    if path.exists() and path.read_text(encoding='utf-8') == text:
        return False
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(text, encoding='utf-8')
    temp.replace(path)
    return True


def safe_url(value):
    if not isinstance(value, str) or len(value) > 4096 or any(ord(c) < 33 for c in value):
        raise ValueError('Invalid URL')
    p = urlsplit(value)
    if p.scheme != 'https' or not p.hostname or p.username or p.password or p.port not in (443, None):
        raise ValueError('Only HTTPS URLs without credentials are permitted')
    return value


def canonical_url(value):
    safe_url(value)
    p = urlsplit(value)
    query = [(k, v) for k, v in parse_qsl(p.query, keep_blank_values=True)
             if not k.lower().startswith('utm_') and k.lower() not in ('fbclid','gclid')]
    return urlunsplit(('https', p.netloc.lower(), p.path or '/', urlencode(sorted(query)), ''))


def stable_id(value):
    return hashlib.sha256(value.encode()).hexdigest()[:20]


def timestamp(value):
    if not isinstance(value, str):
        raise ValueError('Timestamp must be a string')
    d = datetime.fromisoformat(value.replace('Z','+00:00'))
    if d.tzinfo is None:
        raise ValueError('Timestamp requires timezone')
    return d.astimezone(timezone.utc)
