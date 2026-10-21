"""Restore JSON only from an open bot PR. Never execute branch code."""
import base64
import json
import os
from pathlib import Path
from propose import api,ALLOWED

repo=os.environ['GITHUB_REPOSITORY'];branch='automation/source-review'
prs=api(f'repos/{repo}/pulls?state=open&head={repo.split("/")[0]}:{branch}')
if prs:
    files=api(f'repos/{repo}/pulls/{prs[0]["number"]}/files?per_page=100')
    if len(files)>=100 or any(f['filename'] not in ALLOWED for f in files):
        raise ValueError('Review branch contains changes outside the data allowlist; resolve manually.')
    sha=prs[0]['head']['sha']
    for path in ALLOWED:
        try:item=api(f'repos/{repo}/contents/{path}?ref={sha}')
        except Exception:
            # A newly introduced maintenance file need not exist on the proposal branch.
            if path=='data/maintenance.json':continue
            raise
        if item.get('type')!='file' or item.get('size',0)>8_000_000:raise ValueError('Invalid proposal file')
        value=json.loads(base64.b64decode(item['content'],validate=False))
        Path(path).write_text(json.dumps(value,indent=2)+'\n')
    Path('.cache').mkdir(exist_ok=True)
    Path('.cache/proposal-parent').write_text(sha)
