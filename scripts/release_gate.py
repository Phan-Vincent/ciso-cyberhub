"""Deployment requires an intentional origin configuration and source-only data."""
import json
import os
from pathlib import Path
from urllib.parse import urlsplit
site=os.getenv('SITE_URL','')
p=urlsplit(site)
if p.scheme!='https' or not p.hostname or p.path not in ('','/') or p.username or p.password:
    raise SystemExit('Set SITE_URL to the approved HTTPS origin; put the repository path in BASE_PATH.')
intel=json.loads(Path('data/intelligence.json').read_text())
if intel['mode']!='source-reported':raise SystemExit('Refusing to deploy educational feed fixtures.')
print('Deployment configuration gate passed. Human release approval still applies.')
