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
    def fields(item, keys, label):
        require(isinstance(item,dict) and all(string(item.get(k)) for k in keys), f'Invalid {label}')
    def rows(name, key):
        data=read_json(root/'data'/f'{name}.json')
        require(isinstance(data,dict) and isinstance(data.get(key),list), f'Invalid {name}')
        return data
    leaderboard=read_json(root/'data/ai_leaderboard.json')
    require(isinstance(leaderboard,dict) and isinstance(leaderboard.get('as_of'),str),'Invalid leaderboard')
    date.fromisoformat(leaderboard['as_of'])
    for group in ('frontier','local'):
        g=leaderboard.get(group)
        require(isinstance(g,dict) and isinstance(g.get('rows'),list) and g['rows'] and isinstance(g.get('source'),dict),'Invalid leaderboard group')
        fields(g['source'],('name','metric'),'leaderboard source');safe_url(g['source'].get('url'))
        for row in g['rows']:
            fields(row,('model','org','license') if group=='frontier' else ('model','org','sizes','pulls','use'),'leaderboard row')
            if group=='frontier': require(type(row.get('score')) in (int,float),'Invalid leaderboard score')
        if group=='frontier':
            require(isinstance(g.get('callouts'),list),'Invalid leaderboard callouts')
            for c in g['callouts']:fields(c,('label','value','detail'),'leaderboard callout')
    duel=rows('duel','questions')
    require(isinstance(duel.get('categories'),dict) and duel['categories'] and duel['questions'],'Invalid duel')
    for category in duel['categories'].values():require(string(category),'Invalid duel category')
    for q in duel['questions']:
        fields(q,('id','cat','q','why'),'duel question')
        require(q['cat'] in duel['categories'] and type(q.get('level')) is int and q['level'] in (1,2,3,4) and isinstance(q.get('choices'),list) and len(q['choices'])==4 and all(string(c) for c in q['choices']) and type(q.get('answer')) is int and 0<=q['answer']<4,'Invalid duel question')
    for sc in duel.get('scenarios',[]):
        require(isinstance(sc,dict) and string(sc.get('id')) and string(sc.get('title')) and isinstance(sc.get('steps'),list) and 3<=len(sc['steps'])<=12,'Invalid duel scenario')
        for q in sc['steps']:
            fields(q,('id','cat','q','why'),'scenario step')
            require(q['cat']=='tt:'+sc['id'] and isinstance(q.get('choices'),list) and len(q['choices'])==4 and all(string(c) for c in q['choices']) and type(q.get('answer')) is int and 0<=q['answer']<4,'Invalid scenario step')
    glossary=read_json(root/'data/glossary.json')
    require(isinstance(glossary,list) and glossary,'Invalid glossary')
    for term in glossary:
        fields(term,('term','def'),'glossary term')
        require(isinstance(term.get('link'),str) and (not term['link'] or (term['link'].startswith('/') and '..' not in term['link'].split('/'))),'Invalid glossary link')
    images=read_json(root/'data/history_images.json')
    require(isinstance(images,dict) and images,'Invalid history images')
    for entry in images.values():
        fields(entry,('title','author','license','description'),'history image')
        safe_url(entry.get('page'))
    internships=rows('internships','items')
    timestamp(internships.get('generated_at'))
    fields(internships.get('source'),('name',),'internship source');safe_url(internships['source'].get('url'))
    require(isinstance(internships.get('origin'),dict) and string(internships['origin'].get('name')) and all(type(internships['origin'].get(k)) in (int,float) for k in ('lat','lon')),'Invalid internship origin')
    for k in ('near_miles','region_miles'):require(type(internships.get(k)) is int and internships[k]>0,'Invalid internship radius')
    for item in internships['items']:
        fields(item,('id','company','title','category','city','posted','zone'),'internship')
        safe_url(item.get('url'));date.fromisoformat(item['posted'])
        require(item['zone'] in ('near','region','remote') and isinstance(item.get('terms'),list) and all(string(t) for t in item['terms']) and (item.get('miles') is None or type(item['miles']) is int) and all(type(item.get(k)) is bool for k in ('new','also_remote','security')),'Invalid internship fields')
    cards=rows('it_cards','cards')
    require(isinstance(cards.get('decks'),dict) and cards['decks'],'Invalid IT decks')
    for name,title in cards['decks'].items():require(string(name) and string(title),'Invalid IT deck')
    for card in cards['cards']:
        fields(card,('id','deck','topic','front','back'),'IT card')
        require(card['deck'] in cards['decks'],'Invalid IT card deck')
    maintenance=read_json(root/'data/maintenance.json')
    require(isinstance(maintenance,dict) and type(maintenance.get('link_offset')) is int and maintenance['link_offset']>=0 and isinstance(maintenance.get('links'),dict),'Invalid maintenance')
    review=maintenance.get('curriculum_review')
    require(isinstance(review,dict) and isinstance(review.get('checks'),list) and isinstance(review.get('provider_urls'),list) and string(review.get('status')),'Invalid curriculum review')
    timestamp(review.get('requested_at'))
    for u in review['provider_urls']:safe_url(u)
    for u,state in maintenance['links'].items():
        safe_url(u);require(isinstance(state,dict) and string(state.get('status')),'Invalid maintenance link')
        if state.get('checked_at'):timestamp(state['checked_at'])
    pulse=rows('pulse','series');timestamp(pulse.get('updated'))
    require(isinstance(pulse.get('errors'),list) and all(string(e) for e in pulse['errors']),'Invalid pulse errors')
    for row in pulse['series']:
        require(isinstance(row,dict) and string(row.get('date')),'Invalid pulse row');date.fromisoformat(row['date'])
        for k,v in row.items():
            if k not in ('date','hn_month'):require(type(v) is int and v>=0,'Invalid pulse value')
    research=read_json(root/'data/research.json')
    require(isinstance(research,dict) and string(research.get('method')) and isinstance(research.get('sources'),list) and isinstance(research.get('limitations'),list),'Invalid research')
    date.fromisoformat(research.get('checked_on',''))
    for u in research['sources']:safe_url(u)
    for note in research['limitations']:require(string(note),'Invalid research limitation')
    trending=rows('trending','repos');timestamp(trending.get('generated_at'))
    require(type(trending.get('window_days')) is int and trending['window_days']>0 and isinstance(trending.get('models'),list) and isinstance(trending.get('spotlight'),list) and isinstance(trending.get('sources'),dict),'Invalid trending')
    for k in ('repos','models'):require(string(trending['sources'].get(k)),'Invalid trending source')
    for repo in trending['repos']:
        fields(repo,('name','description'),'trending repo');safe_url(repo.get('url'))
        require(type(repo.get('stars')) is int and (repo.get('gain') is None or type(repo['gain']) is int),'Invalid trending stars')
    for model in trending['models']:
        fields(model,('id','org','task'),'trending model');safe_url(model.get('url'))
        require(re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+',model['id']) and '..' not in model['id'].split('/') and all(type(model.get(k)) is int for k in ('likes','downloads','trending')),'Invalid trending model')
    for spot in trending['spotlight']:
        fields(spot,('name','why'),'trending spotlight');safe_url(spot.get('url'))
        require(all(type(spot.get(k)) is int for k in ('stars','forks')),'Invalid trending spotlight')
    return {'tools':len(tools),'objectives':len(objective_ids),'questions':len(qids),'content_pages':len(docs)}

if __name__=='__main__':
    print(validate())
