"""Weekly trending feeds: rising open-source security tools on GitHub and trending
open-weight models on Hugging Face.

Runs in the updater (GitHub Actions). Uses the public GitHub search API (with the
workflow token) and the public Hugging Face models API. Applies a content filter so a
student resource never promotes jailbreak kits, "uncensored" model re-uploads, crypto
spam or near-duplicate forks. Trending is a signal, not an endorsement; pages say so.

Run: python -m hub.trending
"""
from __future__ import annotations

import json
import os
import re
import urllib.request
from datetime import datetime, timedelta, timezone

from .common import ROOT, now, read_json, safe_url, write_json

OUT = ROOT / 'data/trending.json'
TOPICS = ['security', 'cybersecurity', 'pentesting', 'devsecops', 'threat-intelligence', 'malware-analysis', 'reverse-engineering']
BLOCK = re.compile(r'jailbreak|uncensor|abliterat|unfilter|nsfw|crack(ed)?\b|keygen|stealer|rat\b|botnet|ddos|carding|phishing[- ]?kit|meme|airdrop|token[- ]?sniper|casino|humanizer|dealign|bypass[- ]?(av|edr|antivirus)|破甲|越狱', re.I)
# Viral projects worth showing even when they fall outside the topic/date window. Refreshed live weekly.
SPOTLIGHT = [('morluto/rea', 'Viral this month: an MCP server that gives AI coding agents 170+ reverse-engineering tools for binaries, Electron apps, websites and Android APKs.')]
UA = {'User-Agent': 'CISOCyberHub/0.1 (+trending feed)', 'Accept': 'application/json'}


def _get(url: str, headers: dict | None = None):
    safe_url(url)
    req = urllib.request.Request(url, headers={**UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=30) as r:  # noqa: S310 - fixed HTTPS hosts
        return json.loads(r.read(5_000_000).decode('utf-8'))


def clean_repos(items: list[dict], previous: dict[str, int] | None = None, limit: int = 10) -> list[dict]:
    previous = previous or {}
    out, seen_names = [], set()
    for x in items:
        name, desc = x.get('full_name') or '', (x.get('description') or '').strip()
        if not name or not desc or x.get('fork') or x.get('archived') or BLOCK.search(name + ' ' + desc) or re.search(r'upstream:|fork of|mirror of', desc, re.I):
            continue
        short = name.split('/')[-1].lower()
        if short in seen_names:  # forks and mirrors re-published under new owners
            continue
        seen_names.add(short)
        try:
            url = safe_url(x.get('html_url') or '')
        except ValueError:
            continue
        stars = int(x.get('stargazers_count') or 0)
        out.append({'name': name, 'url': url, 'description': desc[:180], 'stars': stars, 'language': x.get('language') or '',
                    'created': (x.get('created_at') or '')[:10], 'license': ((x.get('license') or {}).get('spdx_id') or ''),
                    'gain': stars - previous[name] if name in previous else None})
    out.sort(key=lambda r: -r['stars'])
    return out[:limit]


def clean_models(items: list[dict], limit: int = 10) -> list[dict]:
    out = []
    for m in items:
        mid = m.get('id') or m.get('modelId') or ''
        if not isinstance(mid, str) or not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', mid) or '..' in mid.split('/') or BLOCK.search(mid):
            continue
        if (m.get('pipeline_tag') or '') not in ('text-generation', 'image-text-to-text', 'any-to-any'):
            continue
        out.append({'id': mid, 'org': mid.split('/')[0], 'url': safe_url(f'https://huggingface.co/{mid}'), 'likes': int(m.get('likes') or 0),
                    'downloads': int(m.get('downloads') or 0), 'trending': int(m.get('trendingScore') or 0),
                    'created': (m.get('createdAt') or '')[:10], 'task': m.get('pipeline_tag') or ''})
    return out[:limit]


def fetch() -> dict:
    since = (datetime.now(timezone.utc) - timedelta(days=120)).date().isoformat()
    token = os.environ.get('GITHUB_TOKEN')
    gh_headers = {'Accept': 'application/vnd.github+json', **({'Authorization': f'Bearer {token}'} if token else {})}
    repos: dict[str, dict] = {}
    for topic in TOPICS:
        data = _get(f'https://api.github.com/search/repositories?q=topic:{topic}+created:>{since}&sort=stars&order=desc&per_page=30', gh_headers)
        for x in data.get('items', []):
            repos.setdefault(x['full_name'], x)
    previous = {}
    if OUT.exists():
        previous = {r['name']: r['stars'] for r in read_json(OUT).get('repos', [])}
    spotlight = []
    for name, why in SPOTLIGHT:
        try:
            x = _get(f'https://api.github.com/repos/{name}', gh_headers)
            spotlight.append({'name': x['full_name'], 'url': x['html_url'], 'why': why, 'stars': int(x.get('stargazers_count') or 0), 'forks': int(x.get('forks_count') or 0),
                              'language': x.get('language') or '', 'license': ((x.get('license') or {}).get('spdx_id') or ''), 'stars_note': ''})
        except Exception as exc:  # noqa: BLE001 - keep last week's entry
            print('spotlight failed', name, exc)
    models = _get('https://huggingface.co/api/models?sort=trendingScore&limit=60&filter=text-generation')
    return {'generated_at': now(), 'window_days': 120,
            'repos': clean_repos(list(repos.values()), previous),
            'models': clean_models(models),
            'spotlight': spotlight,
            'sources': {'repos': 'GitHub search API: security topics, created in the last 120 days, by stars',
                        'models': 'Hugging Face models API, sorted by trending score'}}


def main() -> None:
    data = fetch()
    if len(data['repos']) < 5 or len(data['models']) < 5:
        raise SystemExit('Trending feed looks incomplete; keeping the previous file.')
    write_json(OUT, data)
    print(json.dumps({'repos': len(data['repos']), 'models': len(data['models'])}))


if __name__ == '__main__':
    main()
