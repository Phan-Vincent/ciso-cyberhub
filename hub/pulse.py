"""Daily cyber and AI pulse: a few live numbers recorded once a day into data/pulse.json.

- New CVEs published in the last 7 days (NVD API, totalResults only)
- New AI-security research papers in the last 7 days (arXiv cs.CR mentioning language models)
- New CISA KEV entries in the last 30 days (from data/intelligence.json, no request)
- The latest Hacker News "Who is hiring?" thread: comments overall, mentioning LLMs, mentioning security

Counts only; nothing is republished. Each metric fails independently and keeps the last value.
Run: python -m hub.pulse   (the data workflow runs it with the news refresh)
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

from .common import ROOT, read_json, write_json
from .http import Client, FetchError

HOSTS = {'services.nvd.nist.gov', 'export.arxiv.org', 'hn.algolia.com'}
KEEP = 400


def _nvd(get, today):
    start = (today - timedelta(days=7)).strftime('%Y-%m-%dT00:00:00.000Z'); end = today.strftime('%Y-%m-%dT00:00:00.000Z')
    d = json.loads(get(f'https://services.nvd.nist.gov/rest/json/cves/2.0?pubStartDate={start}&pubEndDate={end}&resultsPerPage=1'))
    return int(d['totalResults'])


def _arxiv(get, today):
    a = (today - timedelta(days=7)).strftime('%Y%m%d'); b = today.strftime('%Y%m%d')
    q = f'cat:cs.CR AND (abs:"language model" OR abs:LLM) AND submittedDate:[{a}0000 TO {b}2359]'
    text = get('https://export.arxiv.org/api/query?search_query=' + quote(q) + '&max_results=0')
    m = re.search(r'<opensearch:totalResults[^>]*>(\d+)<', text)
    if not m: raise ValueError('arXiv response had no total')
    return int(m.group(1))


def _kev(root, today):
    vulns = read_json(root / 'data/intelligence.json').get('vulnerabilities', [])
    cutoff = (today - timedelta(days=30)).date().isoformat()
    return sum(1 for v in vulns if (v.get('date_added') or '') >= cutoff)


def _hn(get):
    stories = json.loads(get('https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&hitsPerPage=10'))['hits']
    story = next(s for s in stories if (s.get('title') or '').startswith('Ask HN: Who is hiring?'))
    sid = int(story['objectID']); month = re.sub(r'^.*\((.*)\).*$', r'\1', story['title'])
    count = lambda q: int(json.loads(get(f'https://hn.algolia.com/api/v1/search?tags=comment,story_{sid}&hitsPerPage=0' + (f'&query={q}' if q else '')))['nbHits'])
    return {'hn_month': month[:40], 'hn_total': count(''), 'hn_llm': count('LLM'), 'hn_security': count('security')}


def refresh(root=ROOT, get=None, today=None):
    today = today or datetime.now(timezone.utc)
    path = root / 'data/pulse.json'
    state = read_json(path) if path.exists() else {'series': []}
    client = None
    if get is None:
        client = Client(HOSTS, root / '.cache/http', budget=12); get = client.get
    last = state['series'][-1] if state['series'] else {}
    row = {'date': today.date().isoformat()}; errors = []
    for key, fn in [('cves_7d', lambda: _nvd(get, today)), ('ai_papers_7d', lambda: _arxiv(get, today)), ('kev_30d', lambda: _kev(root, today))]:
        try: row[key] = fn()
        except (FetchError, ValueError, KeyError, TypeError, OSError) as e:
            errors.append(f'{key}: {str(e)[:80]}')
            if key in last: row[key] = last[key]
    try: row.update(_hn(get))
    except (FetchError, ValueError, KeyError, TypeError, OSError, StopIteration) as e:
        errors.append(f'hn: {str(e)[:80]}'); row.update({k: last[k] for k in ('hn_month', 'hn_total', 'hn_llm', 'hn_security') if k in last})
    series = [r for r in state['series'] if r.get('date') != row['date']] + [row]
    state = {'updated': today.strftime('%Y-%m-%dT%H:%M:%SZ'), 'errors': errors, 'series': series[-KEEP:]}
    write_json(path, state)
    return state


if __name__ == '__main__':
    print(json.dumps(refresh()['series'][-1], indent=2))
