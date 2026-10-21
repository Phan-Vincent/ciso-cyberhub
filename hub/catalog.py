"""Generate review proposals; never overwrite curated tool records."""
import argparse
import json
import os
from datetime import datetime, timezone
from urllib.parse import urlencode, urlsplit
from .common import ROOT, now, read_json, write_json
from .http import Client, FetchError


def proposal(tool, repo, release, stamp):
    pushed = repo.get('pushed_at')
    inactive = bool(pushed and (datetime.now(timezone.utc) - datetime.fromisoformat(pushed.replace('Z','+00:00'))).days > 730)
    canonical = repo.get('html_url')
    return {'id':tool['id'], 'status':'pending-review', 'retrieved_at':stamp,
            'last_verified':None, 'source':repo.get('url'),
            'changes': {'repository':canonical, 'renamed':canonical != tool['repository'],
                        'license_signal':(repo.get('license') or {}).get('spdx_id'),
                        'archived':bool(repo.get('archived')), 'pushed_at':pushed,
                        'maintenance_signal':'archived' if repo.get('archived') else ('inactive-signal' if inactive else 'activity-observed'),
                        'stars_signal':repo.get('stargazers_count'),
                        'release':release.get('tag_name') if release else None},
            'review_notes':'API license detection and activity are signals, not a license audit or security endorsement.'}


def run(dry_run=False):
    tools = read_json(ROOT/'data/tools.json'); stamp=now()
    client=Client({'api.github.com'},None if dry_run else ROOT/'.cache/http',budget=55 if not os.getenv('GITHUB_TOKEN') else 180)
    previous = read_json(ROOT/'data/review-queue.json')
    state = read_json(ROOT/'data/catalog-state.json')
    start=state.get('offset',0) % max(1,len(tools))
    count=min(20,len(tools)); updates=[]; errors=[]
    for i in range(count):
        tool=tools[(start+i)%len(tools)]
        if urlsplit(tool['repository']).hostname != 'github.com': continue
        repo_path=urlsplit(tool['repository']).path.strip('/')
        try:
            meta=json.loads(client.get('https://api.github.com/repos/'+repo_path))
            release=None
            try: release=json.loads(client.get('https://api.github.com/repos/'+repo_path+'/releases/latest'))
            except FetchError as e:
                if str(e) != 'HTTP 404': errors.append({'id':tool['id'],'error':str(e)})
            updates.append(proposal(tool,meta,release,stamp))
        except (FetchError,ValueError,KeyError,TypeError) as e: errors.append({'id':tool['id'],'error':str(e)[:180]})
    # Bounded discovery from public GitHub topic search. Always pending review.
    candidates={x['repository'].lower():x for x in previous.get('discoveries',[])}
    known={t['repository'].lower() for t in tools}
    try:
        query=urlencode({'q':'topic:security archived:false','sort':'updated','order':'desc','per_page':10})
        found=json.loads(client.get('https://api.github.com/search/repositories?'+query))
        for r in found.get('items',[]):
            if r['html_url'].lower() not in known:
                candidates[r['html_url'].lower()]={'repository':r['html_url'],'name':r['full_name'],'status':'pending-review',
                    'source':'https://api.github.com/search/repositories','retrieved_at':stamp,'last_verified':None}
    except (FetchError,ValueError,KeyError,TypeError) as e: errors.append({'id':'discovery','error':str(e)[:180]})
    proposals={x['id']:x for x in previous.get('updates',[])}
    proposals.update({x['id']:x for x in updates})
    if not dry_run:
        write_json(ROOT/'data/review-queue.json', {'updates':sorted(proposals.values(),key=lambda x:x['id']),
                   'discoveries':list(candidates.values())[-300:], 'errors':errors, 'last_attempt':stamp})
        write_json(ROOT/'data/catalog-state.json',{'offset':(start+count)%max(1,len(tools))})
    return {'proposals':len(updates),'errors':errors,'requests':client.requests,'dry_run':dry_run}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--dry-run',action='store_true');a=p.parse_args()
    print(json.dumps(run(a.dry_run),indent=2))
