"""Read-only sources -> bounded, attributed records. All changes remain reviewable."""
import argparse
import json
import re
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html import unescape
from html.parser import HTMLParser
from urllib.parse import urlsplit, urlencode
from xml.etree import ElementTree as ET
from .common import ROOT, CVE, canonical_url, now, read_json, stable_id, timestamp, write_json
from .http import Client, FetchError

class PlainText(HTMLParser):
    def __init__(self):
        super().__init__(); self.parts = []
    def handle_data(self, value):
        self.parts.append(value)

def plain(value, limit=300):
    p = PlainText(); p.feed(str(value or ''))
    return ' '.join(unescape(' '.join(p.parts)).split())[:limit]

def feed_date(value):
    if not value:
        return None
    try:
        d = parsedate_to_datetime(value)
        if d.tzinfo is None: return None
    except (ValueError, TypeError, OverflowError):
        try: d = timestamp(value)
        except (ValueError, TypeError): return None
    return d.astimezone(timezone.utc).isoformat().replace('+00:00','Z')

def parse_feed(text, source, retrieved):
    if re.search(r'<!\s*(DOCTYPE|ENTITY)', text, re.I):
        raise ValueError('DTD/entities forbidden')
    root = ET.fromstring(text)
    if root.tag.split('}')[-1] not in ('rss', 'feed', 'RDF'):
        raise ValueError('Not an RSS/Atom feed')
    entries = [e for e in root.iter() if e.tag.split('}')[-1] in ('item', 'entry')][:100]
    result = []
    for e in entries:
        fields = {child.tag.split('}')[-1]: child for child in e}
        title = plain(''.join(fields['title'].itertext())) if 'title' in fields else ''
        links = [c for c in e if c.tag.split('}')[-1] == 'link']
        link = next((c.get('href') or c.text for c in links if c.get('rel','alternate') == 'alternate'), None)
        if not title or not link: continue
        try: url = canonical_url(link.strip())
        except ValueError: continue
        if urlsplit(url).hostname not in source['article_hosts']: continue
        pub = next((fields[k].text for k in ('pubDate','published','date','updated') if k in fields), None)
        # No publisher excerpts: link-only indexing prevents accidental article redistribution.
        result.append({'id': stable_id(url), 'title': title, 'url': url, 'source': source['name'],
                       'source_id': source['id'], 'category': source['category'],
                       'published_at': feed_date(pub), 'event_date': None,
                       'retrieved_at': retrieved, 'last_verified': None,
                       'verification_status': 'source-reported', 'summary': None,
                       'cves': sorted(set(re.findall(r'CVE-\d{4}-\d{4,}', title)))})
    return result

def merge_news(old, new, limit=3000):
    merged = {x['id']: x for x in old}
    for item in new:
        # Preserve first retrieval for identical records; update corrected titles explicitly.
        prev = merged.get(item['id'])
        if prev and prev['title'] == item['title']:
            continue
        merged[item['id']] = item
    return sorted(merged.values(), key=lambda x: (x.get('published_at') or '',x['id']), reverse=True)[:limit]

def parse_kev(raw, retrieved):
    if not isinstance(raw, dict) or not isinstance(raw.get('vulnerabilities'), list) or not raw['vulnerabilities']:
        raise ValueError('Empty or invalid KEV catalog')
    out = []
    for v in raw['vulnerabilities']:
        if not isinstance(v,dict): raise ValueError('KEV entry must be an object')
        for field in ('vendorProject','product','vulnerabilityName','requiredAction','dateAdded','dueDate'):
            if not isinstance(v.get(field),str) or not v[field].strip(): raise ValueError('Missing KEV '+field)
        for field in ('dateAdded','dueDate'): datetime.strptime(v[field],'%Y-%m-%d')
        if not CVE.fullmatch(v.get('cveID','')): raise ValueError('Invalid KEV CVE')
        out.append({'id': v['cveID'], 'vendor': plain(v.get('vendorProject')), 'product': plain(v.get('product')),
                    'title': plain(v.get('vulnerabilityName')), 'date_added': v.get('dateAdded'),
                    'required_action': plain(v.get('requiredAction'), 1600),
                    'due_date': v.get('dueDate'), 'kev': True, 'cvss': None, 'epss': None,
                    'epss_date': None, 'nvd_verified_at': None, 'references': [],
                    'source': 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
                    'retrieved_at': retrieved, 'last_verified': None,
                    'verification_status': 'source-reported', 'version': raw.get('catalogVersion')})
    return sorted(out, key=lambda v: (v['date_added'] or '',v['id']), reverse=True)

def apply_epss(items, payload):
    if not isinstance(payload.get('data'), list): raise ValueError('Invalid EPSS envelope')
    scores = {}
    for v in payload['data']:
        score = float(v['epss'])
        if not 0 <= score <= 1 or not CVE.fullmatch(v['cve']): raise ValueError('Invalid EPSS score')
        datetime.strptime(v['date'], '%Y-%m-%d')
        scores[v['cve']] = (score, v['date'])
    for item in items:
        if item['id'] in scores: item['epss'], item['epss_date'] = scores[item['id']]

def apply_nvd(item, payload, retrieved):
    candidates = payload.get('vulnerabilities', [])
    match = next((v['cve'] for v in candidates if v.get('cve',{}).get('id') == item['id']), None)
    if not match: return
    metrics = match.get('metrics', {})
    for version in ('cvssMetricV40','cvssMetricV31','cvssMetricV30','cvssMetricV2'):
        vals = metrics.get(version, [])
        if vals:
            metric = next((v for v in vals if v.get('type') == 'Primary'), vals[0])
            data = metric['cvssData']
            score = float(data['baseScore'])
            if not 0 <= score <= 10: raise ValueError('Invalid CVSS')
            item['cvss'] = {'score':score, 'version':data['version'], 'vector':data.get('vectorString'), 'source':metric.get('source')}
            break
    refs = []
    for r in match.get('references',[])[:30]:
        try: refs.append(canonical_url(r['url']))
        except (ValueError,KeyError): continue
    item['references'] = sorted(set(refs)); item['nvd_verified_at'] = retrieved

def refresh(root=ROOT, fixture_dir=None, dry_run=False):
    root = __import__('pathlib').Path(root)
    sources = read_json(root/'data/sources.json')
    state = read_json(root/'data/intelligence.json')
    if not fixture_dir and state.get('mode') == 'educational-fixtures':
        raise ValueError('Refusing to mix fixture data with live reporting. Restore a clean source-reported data file first.')
    stamp = now()
    client = Client({s['host'] for s in sources} | {'api.first.org','services.nvd.nist.gov'},
                    None if dry_run else root/'.cache/http', budget=45)
    def get(source):
        if fixture_dir:
            return (__import__('pathlib').Path(fixture_dir)/source['fixture']).read_text()
        return client.get(source['url'])
    statuses = dict(state.get('sources', {}))
    failures = []
    for source in sources:
        sid = source['id']
        previous = statuses.get(sid, {})
        try:
            text = get(source)
            if source['kind'] == 'rss':
                state['news'] = merge_news(state['news'], parse_feed(text,source,stamp))
            elif source['kind'] == 'kev':
                fresh = parse_kev(json.loads(text), stamp)
                previous_v = {v['id']:v for v in state['vulnerabilities']}
                for v in fresh:
                    if v['id'] in previous_v:
                        for field in ('epss','epss_date','cvss','nvd_verified_at','references'):
                            v[field] = previous_v[v['id']].get(field)
                state['vulnerabilities'] = fresh
            statuses[sid] = {'last_attempt':stamp,'last_success':stamp,'error':None,'url':source['url']}
        except (FetchError,ValueError,ET.ParseError,OSError,KeyError,TypeError) as e:
            statuses[sid] = {**previous,'last_attempt':stamp,'error':str(e)[:180],'url':source['url']}
            failures.append(sid)
    # Enrich only a bounded window; older scores retain their explicit dates.
    if state['vulnerabilities']:
        recent = state['vulnerabilities'][:50]
        try:
            body = (__import__('pathlib').Path(fixture_dir)/'epss.json').read_text() if fixture_dir else client.get(
                'https://api.first.org/data/v1/epss?' + urlencode({'cve':','.join(v['id'] for v in recent),'limit':100}))
            apply_epss(recent,json.loads(body))
            statuses['epss'] = {'last_attempt':stamp,'last_success':stamp,'error':None}
        except (FetchError,ValueError,KeyError,TypeError,OSError) as e:
            statuses['epss'] = {**statuses.get('epss',{}),'last_attempt':stamp,'error':str(e)[:180]}; failures.append('epss')
        nvd_errors = []
        if not fixture_dir:
            # Rotate oldest checks first so a stable KEV head does not starve coverage.
            for v in sorted(state['vulnerabilities'],key=lambda x:x.get('nvd_verified_at') or '')[:3]:
                try:
                    body = client.get('https://services.nvd.nist.gov/rest/json/cves/2.0?cveId='+v['id'])
                    apply_nvd(v,json.loads(body),stamp)
                    client.sleep(6)
                except (FetchError,ValueError,KeyError,TypeError) as e: nvd_errors.append(str(e)[:100])
            statuses['nvd'] = {**statuses.get('nvd',{}),'last_attempt':stamp,'error':'; '.join(nvd_errors) or None}
            if not nvd_errors: statuses['nvd']['last_success'] = stamp
            else: failures.append('nvd')
    state['sources'] = statuses
    state['mode'] = 'educational-fixtures' if fixture_dir else 'source-reported'
    if not dry_run:
        write_json(root/'data/intelligence.json',state)
    return {'requests':client.requests,'failures':failures,'news':len(state['news']),
            'vulnerabilities':len(state['vulnerabilities']),'dry_run':dry_run,'mode':state['mode']}

if __name__ == '__main__':
    p=argparse.ArgumentParser(); p.add_argument('--dry-run',action='store_true'); p.add_argument('--fixtures')
    args=p.parse_args()
    print(json.dumps(refresh(fixture_dir=args.fixtures,dry_run=args.dry_run),indent=2))
