"""Restore JSON only from an open bot PR. Never execute branch code."""
import base64
import json
import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from propose import ALLOWED, MAX_PROPOSAL_BYTES, api, raw_api

def decode_proposal_item(item, endpoint, fetch_raw=raw_api, limit=MAX_PROPOSAL_BYTES):
    if not isinstance(item, dict) or item.get('type') != 'file':
        raise ValueError('Invalid proposal file')
    size = item.get('size', 0)
    if not isinstance(size, int) or size <= 0 or size > limit:
        raise ValueError('Invalid proposal file')
    encoding = item.get('encoding')
    content = item.get('content')
    if encoding == 'base64' and isinstance(content, str) and content.strip():
        raw_bytes = base64.b64decode(content, validate=False)
    elif encoding in ('none', None, '') or not content:
        raw_bytes = fetch_raw(endpoint, limit=limit)
        if isinstance(raw_bytes, str):
            raw_bytes = raw_bytes.encode('utf-8')
    else:
        raise ValueError(f'Unsupported proposal encoding: {encoding}')
    if not raw_bytes or len(raw_bytes) > limit:
        raise ValueError('Invalid proposal file size')
    value = json.loads(raw_bytes.decode('utf-8'))
    if not isinstance(value, (dict, list)):
        raise ValueError('Proposal JSON root must be an object or array')
    return value

def restore(repo=None, root=Path('.'), fetch_api=api, fetch_raw=raw_api):
    repo = repo if repo is not None else os.environ['GITHUB_REPOSITORY']
    branch = 'automation/source-review'
    prs = fetch_api(f'repos/{repo}/pulls?state=open&head={repo.split("/")[0]}:{branch}')
    if not prs:
        return False
    files = fetch_api(f'repos/{repo}/pulls/{prs[0]["number"]}/files?per_page=100')
    if len(files) >= 100 or any(f['filename'] not in ALLOWED for f in files):
        raise ValueError('Review branch contains changes outside the data allowlist; resolve manually.')
    sha = prs[0]['head']['sha']
    root = Path(root)
    for path in ALLOWED:
        endpoint = f'repos/{repo}/contents/{path}?ref={sha}'
        try:
            item = fetch_api(endpoint)
        except Exception:
            # A newly introduced maintenance file need not exist on the proposal branch.
            if path == 'data/maintenance.json':
                continue
            raise
        value = decode_proposal_item(item, endpoint, fetch_raw=fetch_raw)
        target = root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(value, indent=2) + '\n')
    cache = root / '.cache'
    cache.mkdir(exist_ok=True)
    (cache / 'proposal-parent').write_text(sha)
    return True

if __name__ == '__main__':
    restore()
