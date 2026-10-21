"""Bounded weekly link checks and monthly curriculum reminders; review data only."""
import argparse
from datetime import datetime, timezone
from urllib.parse import urlsplit
from .common import ROOT, now, read_json, write_json
from .http import Client, FetchError

def run(kind,dry_run=False):
    target=ROOT/'data/maintenance.json';state=read_json(target)if target.exists()else{}
    if kind=='certifications':
        state['curriculum_review']={'requested_at':now(),'status':'pending-human-verification','checks':['Confirm active names, exam versions, provider objectives and eligibility.','Compare all objective subtopics with lesson coverage.','Run independent question and rationale review.'],'provider_urls':sorted({c['provider_url']for c in read_json(ROOT/'data/certifications.json')})}
    else:
        tools=read_json(ROOT/'data/tools.json');urls=sorted({t['repository']for t in tools}|{t['installation']for t in tools})
        offset=state.get('link_offset',0)%len(urls);selected=[urls[(offset+i)%len(urls)]for i in range(min(20,len(urls)))]
        client=Client({urlsplit(u).hostname for u in selected},None if dry_run else ROOT/'.cache/http',budget=30)
        results=dict(state.get('links',{}))
        for url in selected:
            try:client.get(url);results[url]={'checked_at':now(),'status':'reachable','error':None}
            except FetchError as e:results[url]={'checked_at':now(),'status':'needs-review','error':str(e)}
        state['links']=results;state['link_offset']=(offset+len(selected))%len(urls)
    if not dry_run:write_json(target,state)
    return state
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('kind',choices=['links','certifications']);p.add_argument('--dry-run',action='store_true');a=p.parse_args();run(a.kind,a.dry_run);print(a.kind+' maintenance proposal prepared')
