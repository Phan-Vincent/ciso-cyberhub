"""Executable schema and cross-reference validation; failures stop the build."""
import re
from datetime import date
from .common import ROOT, CVE, SLUG, read_json, safe_url, timestamp


def require(value, message):
    if not value: raise ValueError(message)

def string(value, limit=2000):
    return isinstance(value,str) and 0 < len(value) <= limit

def validate(root=ROOT):
    tools=read_json(root/'data/tools.json'); academy=read_json(root/'data/academy.json')
    intel=read_json(root/'data/intelligence.json'); docs=read_json(root/'data/content.json')
    ids=set(); repos=set()
    for t in tools:
        require(SLUG.fullmatch(t['id']) and t['id'] not in ids,'Duplicate/invalid tool id');ids.add(t['id'])
        require(t['repository'].lower() not in repos,'Duplicate repository');repos.add(t['repository'].lower())
        for k in ('name','description','category','difficulty','maintenance','license_status','verification_status'):
            require(string(t[k]),f'Missing tool {k}')
        require(t['difficulty'] in ('beginner','intermediate','advanced'),'Invalid difficulty')
        require(t['verification_status'] in ('source-checked','pending-review'),'Invalid verification')
        require(t['license_status'] in ('open-source','custom','mixed','pending-review'),'Invalid license status')
        require(t['maintenance'] in ('unknown','active','maintenance-mode','archived','inactive-signal'),'Invalid maintenance')
        for k in ('secondary_categories','os','use_cases','classification','certifications','labs','tutorials','sources','verified_fields'):
            require(isinstance(t[k],list),f'{k} must be list')
        for k in ('repository','website','installation'):
            if t[k]: safe_url(t[k])
        for src in t['sources']: safe_url(src)
        if t['last_verified']: date.fromisoformat(t['last_verified'])
        if t['retrieved_at']: timestamp(t['retrieved_at'])
        if t['verification_status']=='source-checked':
            require(t['last_verified'] and t['sources'] and t['verified_fields'],'Source checked requires evidence')
        if t['license_status']=='open-source': require(t['license'] and 'license' in t['verified_fields'],'License needs evidence')
        for tutorial in t['tutorials']:
            require((root/'content/tutorials'/f'{tutorial}.md').exists(),'Missing tutorial')
        for lab in t['labs']: require((root/'content/labs'/f'{lab}.md').exists(),'Missing lab')
    objective_ids={o['id'] for o in academy['objectives']}
    require(len(objective_ids)==len(academy['objectives']),'Duplicate objective')
    qids=set()
    for q in academy['questions']:
        require(SLUG.fullmatch(q['id']) and q['id'] not in qids,'Duplicate/invalid question');qids.add(q['id'])
        require(q['objective'] in objective_ids,'Unknown question objective')
        require(len(q['choices'])==4 and len(set(q['choices']))==4,'Question requires four distinct choices')
        require(type(q['answer']) is int and 0<=q['answer']<4,'Invalid answer')
        require(string(q['rationale']), 'Missing rationale')
    for card in academy['flashcards']: require(card['objective'] in objective_ids,'Unknown card objective')
    for o in academy['objectives']:
        require(re.fullmatch(r'[1-5]\.\d+',o['id']),'Invalid objective id')
        require(o['status'] in ('introductory','reviewed','missing'),'Invalid coverage status')
        require((root/'content/academy'/f"{o['lesson']}.md").exists(),'Missing mapped lesson')
    routes=set()
    for d in docs:
        route=d['section']+'/'+d['id']
        require(d['section'] in ('academy','tutorials','labs','careers'),'Bad content section')
        require(SLUG.fullmatch(d['id']) and route not in routes,'Invalid content id');routes.add(route)
        require((root/'content'/d['section']/f"{d['id']}.md").exists(),'Missing content body')
        for obj in d.get('objectives',[]): require(obj in objective_ids,'Unknown content objective')
        for tool in d.get('tools',[]): require(tool in ids,'Unknown content tool')
    seen=set()
    for article in intel['news']:
        require(article['id'] not in seen,'Duplicate article');seen.add(article['id'])
        safe_url(article['url']); require(string(article['title'],300),'Invalid headline')
        require(article['verification_status']=='source-reported','Unexpected news trust level')
        require(article['summary'] is None,'Automatic summaries are not approved')
        for k in ('retrieved_at','published_at','last_verified'):
            if article.get(k): timestamp(article[k])
        require(all(CVE.fullmatch(c) for c in article['cves']),'Invalid news CVE')
    seen=set()
    for v in intel['vulnerabilities']:
        require(CVE.fullmatch(v['id']) and v['id'] not in seen,'Invalid/duplicate CVE');seen.add(v['id'])
        require(v['kev'] is True,'KEV field must be true for this data source')
        safe_url(v['source']); timestamp(v['retrieved_at'])
        if v['epss'] is not None: require(type(v['epss']) in (int,float) and 0<=v['epss']<=1,'Invalid EPSS')
        if v['cvss'] is not None: require(isinstance(v['cvss'],dict) and type(v['cvss'].get('score')) in (int,float) and 0<=v['cvss']['score']<=10,'Invalid CVSS')
        for u in v['references']: safe_url(u)
    require(intel['mode'] in ('source-reported','educational-fixtures'),'Invalid intelligence mode')
    if (root/'data/sources.json').exists():
        sources=read_json(root/'data/sources.json'); sids=set()
        require(isinstance(sources,list) and sources,'Invalid sources list')
        for s in sources:
            require(SLUG.fullmatch(s.get('id','')) and s['id'] not in sids,'Duplicate/invalid source id'); sids.add(s['id'])
            require(s.get('kind') in ('rss','kev') and string(s.get('name')) and string(s.get('category')),'Invalid source metadata')
            safe_url(s.get('url',''))
            require(isinstance(s.get('article_hosts'),list) and all(string(h,255) for h in s['article_hosts']),'Invalid source hosts')
    if (root/'data/certifications.json').exists():
        certs=read_json(root/'data/certifications.json')
        require(isinstance(certs,list) and certs,'Invalid certifications list')
        for c in certs:
            for k in ('name','track','status','free_study_start','exam_cost_note'): require(string(c.get(k)),f'Invalid certification {k}')
            safe_url(c.get('provider_url',''))
    if (root/'data/photos.json').exists():
        photos=read_json(root/'data/photos.json')
        require(isinstance(photos,list) and photos,'Invalid photos list')
        for p in photos:
            for k in ('slot','file','id','by','alt','caption','note'): require(string(p.get(k)),f'Invalid photo {k}')
            safe_url(p.get('page','')); safe_url(p.get('src',''))
            require(not p['src'].startswith('https://plus.unsplash.com/'),'Unsplash+ paid photos are not permitted')
    if (root/'data/review-queue.json').exists():
        rq=read_json(root/'data/review-queue.json')
        require(isinstance(rq,dict) and isinstance(rq.get('updates'),list) and isinstance(rq.get('discoveries'),list) and isinstance(rq.get('errors'),list),'Invalid review queue')
        for d in rq['discoveries']:
            require(string(d.get('name')) and d.get('status')=='pending-review','Invalid discovery entry')
            safe_url(d.get('repository',''))
    if (root/'data/catalog-state.json').exists():
        cs=read_json(root/'data/catalog-state.json')
        require(isinstance(cs,dict) and type(cs.get('offset')) is int and cs['offset']>=0,'Invalid catalog state')
    return {'tools':len(tools),'objectives':len(objective_ids),'questions':len(qids),'content_pages':len(docs)}

if __name__=='__main__':
    print(validate())
