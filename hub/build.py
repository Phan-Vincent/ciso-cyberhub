"""Reproducible static output; no network access or untrusted executable content."""
import argparse
import html
import json
import os
import re
import shutil
import subprocess
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from .common import ROOT, read_json, safe_url, timestamp
from .markdown import render
from .validate import validate

E=lambda x:html.escape(str(x if x is not None else 'Not verified'),quote=True)

class Site:
    def __init__(self, base=None):
        self.config=read_json(ROOT/'site.json');self.base=(base if base is not None else os.getenv('BASE_PATH',self.config['base_path'])).rstrip('/')
        if self.base and not re.fullmatch(r'/[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*',self.base):raise ValueError('Invalid BASE_PATH')
        self.site_url=os.getenv('SITE_URL',self.config['site_url']).rstrip('/')
        if self.site_url:safe_url(self.site_url)
        self.tools=read_json(ROOT/'data/tools.json');self.academy=read_json(ROOT/'data/academy.json');self.intel=read_json(ROOT/'data/intelligence.json');self.docs=read_json(ROOT/'data/content.json')
        self.out=ROOT/'dist';self.search=[];self.paths=[]
        self.ref_time=self._reference_time()
    def _reference_time(self):
        candidates=[]
        for st in self.intel.get('sources',{}).values():
            for k in ('last_attempt','last_success'):
                if st.get(k):
                    try:candidates.append(timestamp(st[k]))
                    except ValueError:pass
        return max(candidates) if candidates else datetime(2026,10,22,tzinfo=timezone.utc)
    def source_health(self,st):
        success=st.get('last_success')
        attempt=st.get('last_attempt')
        err=st.get('error')
        stale=True
        age_days=None
        if success:
            try:
                s_dt=timestamp(success)
                ref=max(self.ref_time, timestamp(attempt)) if attempt else self.ref_time
                age_days=max(0,int((ref-s_dt).total_seconds()//86400))
                stale=(ref-s_dt).total_seconds()>172800
            except ValueError:
                stale=True
        healthy=bool(success) and not err and not stale
        if healthy:
            return True,'online',f'Updated ({success[:10]})'
        if err and success:
            age_note=f'stale · {age_days}d old, last ok {success[:10]}' if stale and age_days is not None else f'last ok {success[:10]}'
            return False,'warn',f'Error: {err} ({age_note})'
        if err:
            return False,'warn',f'Error: {err} (no successful retrieval)'
        if success:
            age_note=f'{age_days}d since success ({success[:10]})' if age_days is not None else f'last ok {success[:10]}'
            return False,'warn',f'Stale · {age_note}'
        return False,'warn','No successful retrieval'
    def a(self,label,path,cls=''):
        attr=f' class="{E(cls)}"' if cls else ''
        return f'<a{attr} href="{E(self.base+path)}">{E(label)}</a>'
    def badge(self,text,cls=''):
        full=('badge '+cls).strip()
        return f'<span class="{E(full)}">{E(text)}</span>'
    def page(self,path,title,body,description='',section=''):
        if not path.startswith('/') or '..' in path:raise ValueError('Invalid output path')
        file=self.out/path.lstrip('/')/'index.html';file.parent.mkdir(parents=True,exist_ok=True)
        nav_items=[('Overview','/',''),('Tools','/tools/','Tools'),('Academy','/academy/','Academy'),('Intelligence','/intelligence/','Intelligence'),('Labs','/labs/','Labs'),('Careers','/careers/','Careers')]
        nav=''.join(f'<a href="{E(self.base+p)}" '+('aria-current="page"' if (section==sec and sec) or (path=='/' and p=='/') else '')+f'>{label}</a>' for label,p,sec in nav_items)
        canonical=f'<link rel="canonical" href="{E(self.site_url+self.base+path)}">' if self.site_url else '<meta name="robots" content="noindex">'
        doc=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="{E(description or title)}"><meta name="referrer" content="strict-origin-when-cross-origin"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'"><title>{E(title)} · {E(self.config['name'])}</title>{canonical}<link rel="icon" href="{self.base}/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="{self.base}/assets/site.css"><script type="module" src="{self.base}/assets/app.js"></script></head><body data-base="{E(self.base)}"><div class="ambient-bg" aria-hidden="true"></div><a class="skip" href="#main">Skip to content</a><header class="site-header"><div class="header-inner"><a class="brand" href="{self.base}/"><span class="brand-mark" aria-hidden="true">CH</span><span class="brand-text"><strong>{E(self.config['name'])}</strong><small>CSUSB Cyber Intelligence &amp; Security</small></span></a><nav aria-label="Main navigation">{nav}</nav><div class="header-actions">{self.a('Search ⌘K','/search/','search-pill')}<button id="theme" type="button" aria-label="Switch between light and dark theme">Theme ◐</button></div></div></header><main id="main" class="shell">{body}<div id="status" class="status" role="status" aria-live="polite"></div></main><footer class="footer"><div class="footer-inner"><div class="footer-brand"><div class="brand-row"><span class="brand-mark sm" aria-hidden="true">CH</span><strong>{E(self.config['name'])}</strong><span class="badge subtle">v0.1.0 Static Core</span></div><p>{E(self.config['affiliation'])} Zero-cost open architecture. Free study resources with no account required.</p></div><div class="footer-links"><div class="footer-nav">{self.a('Tool Explorer','/tools/')} · {self.a('Security+ Academy','/academy/')} · {self.a('Threat Intel','/intelligence/')} · {self.a('Labs','/labs/')} · {self.a('Contribute','/contribute/')} · {self.a('Privacy & accessibility','/about/')}</div><p><a href="{E(self.config['club_url'])}">Visit the official CISO CSUSB club website ↗</a></p></div></div></footer></body></html>'''
        file.write_text(doc,encoding='utf-8');self.paths.append(path)
        self.search.append({'title':title,'section':section or 'Hub','path':path,'text':re.sub('<[^>]+>',' ',body)[:14000]})
    def heading(self,title,desc,eyebrow='CISO / CyberHub'):
        return f'<div class="page-head"><div class="eyebrow"><span class="pulse-dot" aria-hidden="true"></span>{E(eyebrow)}</div><h1>{E(title)}</h1><p class="lead">{E(desc)}</p></div>'
    def card(self,title,desc,path,tag,footer=''):
        return f'<article class="card"><div class="card-top">{self.badge(tag,"green")}</div><h2>{self.a(title,path)}</h2><p>{E(desc)}</p><div class="card-footer"><span class="meta-mono">{E(footer)}</span>{self.a("Explore →",path,"card-link")}</div></article>'
    def filters(self, fields, sort_options=(('name','Name A–Z'),)):
        form='<form id="filters" class="filters" role="search"><label class="filter-search">Search catalog<input type="search" name="q" autocomplete="off" placeholder="Filter by name, topic, CVE, or keyword…"></label>'
        for name,label,values in fields:
            form+=f'<label>{E(label)}<select name="{E(name)}"><option value="">All</option>'+''.join(f'<option value="{E(v)}">{E(v)}</option>' for v in sorted(set(values)))+'</select></label>'
        form+='<label>Sort<select name="sort">'+''.join(f'<option value="{E(v)}">{E(label)}</option>' for v,label in sort_options)+'</select></label><div class="filter-actions"><button type="button" id="reset-filters">Reset filters</button></div></form><p id="result-count" class="list-count" role="status"></p><noscript><p>Filters need JavaScript. All records remain available below and through browser Find.</p></noscript>'
        return form
    def home(self):
        count=len(self.tools);lessons=len(self.academy['objectives']);labs_list=[d for d in self.docs if d['section']=='labs'];labs=len(labs_list)
        tutorials_count=len([d for d in self.docs if d['section']=='tutorials'])
        careers_count=len([d for d in self.docs if d['section']=='careers'])
        cat_counts=Counter(t['category'] for t in self.tools)
        top_cats=cat_counts.most_common(6)
        sources_cfg=read_json(ROOT/'data/sources.json')

        body=f'''<section class="hero"><div class="hero-main"><div class="eyebrow"><span class="pulse-dot" aria-hidden="true"></span>CSUSB Cyber Intelligence &amp; Security · Open Knowledge Platform</div><h1>Learn the craft.<br><span>Build your practice.</span></h1><p class="lead">An open-source, zero-cost cybersecurity command center for students. Master defensive and offensive tooling, work through SY0-701 objectives, analyze synthetic lab evidence, and inspect attributed threat telemetry.</p><div class="actions">{self.a('Launch Academy →','/academy/','button primary')}{self.a('Explore Tool Catalog','/tools/','button')}{self.a('Hands-On Labs','/labs/','button ghost')}</div><div class="hero-pills"><span class="badge subtle">Zero Mandatory Cost ($0)</span><span class="badge subtle">Local-First Privacy</span><span class="badge subtle">{len(self.tools)} Verified Tools</span><span class="badge subtle">Source-Checked Telemetry</span></div></div><aside class="path-panel"><div class="panel-header"><div class="eyebrow">Operations Launchpad</div><span class="badge green" id="home-progress-badge">Local workspace ready</span></div><h2>Your first hour in CyberHub</h2><p class="panel-sub" id="home-progress-summary">0 of {lessons} lessons completed · 0 quiz attempts recorded on this browser.</p><div class="path-steps">'''
        for number,title,path,desc in [
            ('01','Understand security foundations','/academy/','Work through identity, trust boundaries, risk, and security controls.'),
            ('02','Inspect packet evidence','/labs/packet-analysis/','Analyze a deterministic synthetic DNS capture with Wireshark or Zeek.'),
            ('03','Validate with original questions','/academy/practice/','Test domain reasoning with instant rationales and weak-domain telemetry.')
        ]:
            body+=f'<div class="path-step"><b>{number}</b><div>{self.a(title,path)}<p>{E(desc)}</p></div></div>'
        body+=f'''</div><div class="panel-footer">{self.a('Resume Academy pathway →','/academy/','card-link')}{self.a('Global search ⌘K','/search/','meta-mono')}</div></aside></section>'''

        body+=f'''<section class="stats" aria-label="Platform telemetry"><div class="stat"><span class="stat-label">TOOL CATALOG</span><strong>{count}</strong><span>Source-checked open tools &amp; {tutorials_count} guided walkthroughs</span></div><div class="stat"><span class="stat-label">CERTIFICATION ACADEMY</span><strong>{lessons}</strong><span>Mapped SY0-701 lessons, 28 quiz items &amp; 28 flashcards</span></div><div class="stat"><span class="stat-label">PRACTICAL LABS</span><strong>{labs}</strong><span>Isolated exercises with SHA-256 verified synthetic artifacts</span></div><div class="stat"><span class="stat-label">CAREER &amp; COST</span><strong>$0</strong><span>{careers_count} role roadmaps · zero subscriptions or API keys</span></div></section>'''

        body+=f'''<div class="section-heading"><div><div class="eyebrow">Command Modules</div><h2>Choose your operational workspace</h2></div>{self.a('View all 12 career roadmaps →','/careers/')}</div><div class="grid">'''
        for title,desc,path,tag,footer in [
            ('Open-Source Tool Explorer','Filter security tools by category, SPDX license, verification status, and platform support.','/tools/','01 / TOOLING',f'{count} verified records'),
            ('Security+ SY0-701 Academy','Study structured domain lessons, flip flashcards, and run timed or untimed practice quizzes.','/academy/','02 / ACADEMY',f'{lessons} mapped modules'),
            ('Hands-On Lab Workbench','Investigate synthetic DNS PCAPs, Linux baselines, Windows logon events, and YARA/Sigma rules.','/labs/','03 / LABS',f'{labs} guided exercises')
        ]:
            body+=self.card(title,desc,path,tag,footer)
        body+='</div>'

        body+='<div class="section-heading"><div><div class="eyebrow">Curriculum &amp; Tooling Telemetry</div><h2>Interactive platform overview</h2></div>'+self.a('Full coverage manifest →','/contribute/')+'</div>'
        body+='<div class="bento-grid"><section class="card bento-wide"><div class="card-top"><span class="badge green">SY0-701 Blueprint</span><span class="meta-mono">Doc v5.0 · Introductory</span></div><h2>Security+ Domain Matrix</h2><p>Track your local study completion across all five official exam domains. Progress persists locally in your browser.</p><div class="domain-bars">'
        for d in self.academy['domains']:
            obj_count=len([o for o in self.academy['objectives'] if o['id'].startswith(d['id']+'.')])
            body+=f'''<div class="domain-row" data-domain-row="{E(d['id'])}"><div class="domain-info"><a href="{E(self.base)}/academy/#domain-{E(d['id'])}"><strong>Domain {E(d['id'])}: {E(d['title'])}</strong></a><span class="meta-mono"><span data-domain-progress="{E(d['id'])}">0/{obj_count}</span> lessons · {E(d['weight'])}% exam weight</span></div><div class="bar-track" aria-hidden="true"><div class="bar-fill" data-domain-bar="{E(d['id'])}" data-weight="{E(d['weight'])}"></div></div></div>'''
        body+='</div><div class="card-footer"><span class="meta-mono">28 original questions + 28 flashcards</span>'+self.a('Open Practice Exam →','/academy/practice/','card-link')+'</div></section>'

        body+='<section class="card"><div class="card-top"><span class="badge">Catalog Breakdown</span><span class="meta-mono">14 Categories</span></div><h2>Featured Security Tooling</h2><p>Every catalog entry separates verified repository facts from editorial study guidance.</p><div class="tag-cloud">'
        for cat,c_num in top_cats:
            body+=f'<a class="tag-chip" href="{E(self.base)}/tools/?category={E(cat)}"><span>{E(cat)}</span><b>{c_num}</b></a>'
        body+='</div><div class="mini-list">'
        for t in self.tools[:4]:
            lic=t['license'] or t['license_status']
            body+=f'<div class="mini-item"><a href="{E(self.base)}/tools/{E(t["id"])}/"><strong>{E(t["name"])}</strong></a><span class="badge subtle">{E(lic)}</span></div>'
        body+='</div><div class="card-footer"><span class="meta-mono">10 step-by-step tutorials</span>'+self.a('Browse all tools →','/tools/','card-link')+'</div></section></div>'

        body+='<div class="section-heading"><div><div class="eyebrow">Practical Evidence &amp; Live Feeds</div><h2>Labs and intelligence status</h2></div>'+self.a('Open Intelligence Desk →','/intelligence/')+'</div>'
        body+='<div class="grid two"><section class="card"><div class="card-top"><span class="badge green">Synthetic Artifacts</span><span class="meta-mono">Safe &amp; Offline</span></div><h2>Starter Lab Workbench</h2><p>Practice investigation workflows using deterministic, locally verified datasets—no external targets or lab VMs required.</p><div class="mini-list">'
        for lab in labs_list:
            body+=f'<div class="mini-item"><a href="{E(self.base)}/labs/{E(lab["id"])}/"><strong>{E(lab["title"])}</strong></a><span class="meta-mono">{E(lab["minutes"])}m · {E(lab["difficulty"])}</span></div>'
        body+='</div><div class="card-footer"><span class="meta-mono">SHA-256 verified fixtures</span>'+self.a('Explore all labs →','/labs/','card-link')+'</div></section>'

        body+='<section class="card"><div class="card-top"><span class="badge">Source Telemetry</span><span class="meta-mono">Mode: '+E(self.intel['mode'])+'</span></div><h2>Intelligence &amp; Feed Health</h2><p>Attributed headlines and CISA KEV vulnerability signals. Outages and unretrieved states remain transparently visible—never masked with fake alerts.</p><div class="mini-list">'
        for src in sources_cfg:
            st=self.intel['sources'].get(src['id'],{})
            healthy,dot_cls,status_label=self.source_health(st)
            success=st.get('last_success') or ''
            err=st.get('error') or ''
            warn_cls='' if healthy else ' warning'
            body+=f'<div class="mini-item" data-feed-item="{E(src["id"])}"><span><span class="status-dot {dot_cls}" aria-hidden="true"></span><strong>{E(src["name"])}</strong> <small>({E(src["category"])})</small></span><span class="meta-mono{warn_cls}" data-freshness="{E(success)}" data-error="{E(err)}">{E(status_label)}</span></div>'
        body+='</div><div class="card-footer">'+self.a('Vulnerability Explorer →','/vulnerabilities/','card-link')+self.a('Source status →','/intelligence/','card-link')+'</div></section></div>'

        self.page('/','Learn the craft. Build your practice.',body,'Free cybersecurity learning, tools and practical labs for students.')
    def tool_pages(self):
        body=self.heading('Tool Explorer','Find a tool for the problem in front of you. Licensing and verification stay visible.','Explore / Security tooling')
        body+='<p class="notice">Source-checked means the listed fields were checked against upstream pages. It is not a security endorsement. Empty fields are unknown; custom licenses are not classified as OSI-approved. Difficulty and learning links are editorial recommendations.</p>'
        fields=[('category','Category',[t['category'] for t in self.tools]),('difficulty','Difficulty',[t['difficulty'] for t in self.tools]),('license_status','License type',[t['license_status'] for t in self.tools]),('license','SPDX identifier',[t['license'] for t in self.tools if t['license']]),('os','Verified platform',[o for t in self.tools for o in t['os']]),('maintenance','Maintenance',[t['maintenance'] for t in self.tools])]
        body+=self.filters(fields,(('name','Name A–Z'),('last_verified','Recently checked')))+'<div id="results" class="grid">'
        for t in self.tools:
            tut_badge='<span class="badge subtle">Tutorial</span>' if t['tutorials'] else ''
            lab_badge='<span class="badge subtle">Lab</span>' if t['labs'] else ''
            body+=f'<article class="card" data-record="{E(json.dumps(t))}"><div class="card-top">{self.badge(t["category"],"green")}<div class="badge-group">{tut_badge}{lab_badge}</div></div><h2>{self.a(t["name"],"/tools/"+t["id"]+"/")}</h2><p>{E(t["description"])}</p><div class="card-footer">{self.badge(t["license"] or t["license_status"])}<small class="meta-mono">{E(t["difficulty"])} · {E(t["verification_status"])}</small></div></article>'
            detail=self.heading(t['name'],t['description'],f'Tools / {t["category"]}')
            detail+=f'<div class="actions"><a class="button primary" href="{E(t["repository"])}">Source repository ↗</a><a class="button" href="{E(t["installation"])}">Upstream setup guidance ↗</a></div><h2>Know the scope</h2><p>{E(t["license_notes"])}</p><dl class="metadata">'
            for label,value in [('Primary category',t['category']),('License',t['license']),('License classification',t['license_status']),('Platform',', '.join(t['os']) or 'Not verified'),('Difficulty (editorial)',t['difficulty']),('Maintenance',t['maintenance']),('Latest release',t['latest_release']),('Activity',t['activity']),('Checked fields',', '.join(t['verified_fields'])),('Last source check',t['last_verified'])]:detail+=f'<dt>{E(label)}</dt><dd>{E(value)}</dd>'
            detail+='</dl><h2>Use in your learning</h2><ul>'+''.join(f'<li>{E(u)}</li>' for u in t['use_cases'])+'</ul><p>Use only on systems and data you own or are explicitly authorized to examine. Confirm the installed version and current upstream documentation before following a workflow.</p>'
            if t['tutorials']:detail+='<h2>Guided tutorial</h2>'+''.join('<p>'+self.a('Start the '+t['name']+' tutorial','/tutorials/'+x+'/')+'</p>' for x in t['tutorials'])
            if t['labs']:detail+='<h2>Practice lab</h2>'+''.join('<p>'+self.a(x.replace('-',' ').title(),'/labs/'+x+'/')+'</p>'for x in t['labs'])
            detail+='<p data-verification="'+E(t['last_verified'])+'">Check the source date before relying on changing metadata.</p><h2>Attribution</h2><ul>'+''.join(f'<li class="source-line"><a href="{E(s)}">{E(s)}</a></li>'for s in t['sources'])+'</ul><p>Null metadata is intentionally not guessed. Scheduled checks propose changes for human review.</p>'
            self.page('/tools/'+t['id']+'/',t['name'],detail,t['description'],'Tools')
        body+='</div><p id="empty" class="empty" hidden>No matching tools. Try fewer filters or another keyword.</p>'
        self.page('/tools/','Tool Explorer',body,section='Tools')
    def academy_pages(self):
        course=self.academy
        body=self.heading('Build a security foundation.','Study a concept, test it in practice, then explain what the evidence supports.','Academy / Security+ pathway')
        body+=f'<p class="notice">Mapped edition: {E(course["exam_version"])} · objectives document {E(course["objective_document_version"])}. Current exam status and independent curriculum review are pending. These 28 introductory lessons do not cover every subtopic in depth and are not a complete exam course. <a href="{E(course["source"])}">Official source document ↗</a></p>'
        body+='<div class="actions">'+self.a('Practice questions','/academy/practice/','button primary')+self.a('Review flashcards','/academy/flashcards/','button')+self.a('Other certification tracks','/academy/certifications/','button')+'</div><section class="card telemetry-panel"><div class="card-top"><span class="badge green">Local Telemetry</span><span class="meta-mono">Browser Storage v1</span></div><h2>Your learning, on this browser</h2><p id="progress-summary"></p><div id="weak-domains"></div><div class="progress-tools"><button id="export-progress" type="button">Export progress</button><label class="file-label">Import progress <input id="import-progress" type="file" accept="application/json"></label><button id="reset-progress" type="button">Clear progress</button></div><p class="muted">Progress stays on this browser and site path. It is not sent to a server. Export a copy before clearing browser data.</p></section>'
        for d in course['domains']:
            body+=f'<div class="section-heading"><h2 id="domain-{d["id"]}">Domain {d["id"]}. {E(d["title"])}</h2><span class="badge subtle">{E(d["weight"])}% of exam blueprint</span></div><div class="grid">'
            for o in course['objectives']:
                if o['id'].split('.')[0]==d['id']:body+=self.card(o['title'],'Learn the concept, examine a scenario and explain your reasoning.','/academy/'+o['lesson']+'/',f'Objective {o["id"]}','15 min · introductory')
            body+='</div>'
        self.page('/academy/','Certification Academy',body,section='Academy')
        practice=self.heading('Practice with explanations.','Original learning questions. Your result is a study signal, not a prediction of exam performance.','Academy / Practice')
        practice+='<section id="quiz"><div class="quiz-actions card"><label>Domain<select id="quiz-domain"><option value="">All five domains</option>'+''.join(f'<option value="{d["id"]}">{E(d["title"])}</option>'for d in course['domains'])+'</select></label><label class="checkbox-label"><input type="checkbox" id="timed"> Timed: 90 seconds per question</label><button id="start-quiz" type="button" class="primary">Start practice</button><span id="timer" class="meta-mono"></span></div><noscript><p>Interactive practice requires JavaScript. Lessons include written self-checks.</p></noscript><div id="quiz-result" role="status" tabindex="-1"></div><div id="quiz-questions"></div><button id="submit-quiz" type="button" disabled>Finish and review answers</button></section>'
        self.page('/academy/practice/','Practice questions',practice,section='Academy')
        flash=self.heading('One concept at a time.','Try to explain the answer before you turn the card.','Academy / Flashcards')+'<section id="flashcards"><p id="card-count" class="meta-mono" role="status"></p><div class="card flashcard" id="card-text" aria-live="polite"></div><div class="actions"><button id="previous-card" type="button">← Previous</button><button id="flip" type="button" class="primary">Show answer</button><button id="next-card" type="button">Next →</button></div></section>'
        self.page('/academy/flashcards/','Flashcards',flash,section='Academy')
        certs=self.heading('Plan your next credential.','Provider names, exam versions and eligibility change. Verify them before committing time or money.','Academy / Research queue')+'<p class="notice">These are planning records, not verified active-exam listings or complete courses. Exams and some external training are paid. No exam versions or eligibility claims are guessed.</p><div class="grid">'
        for c in read_json(ROOT/'data/certifications.json'):
            certs+=f'<article class="card"><div class="card-top">{self.badge(c["track"],"green")}</div><h2>{E(c["name"])}</h2><p>{E(c["free_study_start"])}</p><div class="card-footer"><a class="card-link" href="{E(c["provider_url"])}">Provider details ↗</a><small class="meta-mono">{E(c["status"])}</small></div></article>'
        self.page('/academy/certifications/','Certification planning',certs+'</div>',section='Academy')
    def document_pages(self):
        for d in self.docs:
            sec=d['section'];path=f'/{sec}/{d["id"]}/';body=self.heading(d['title'],d['description'],sec.title()+' / Guided learning')
            body+=f'<p class="muted meta-mono">{d["minutes"]} min · {E(d["difficulty"])} · {E(d["status"])}</p>'
            body+='<div class="article-layout"><article class="prose card" data-lesson="'+sec+'/'+d['id']+'">'+render((ROOT/'content'/sec/(d['id']+'.md')).read_text(),self.base)+'<div class="actions"><button id="complete" type="button" aria-pressed="false">Mark lesson complete</button></div></article><aside class="aside card"><h2>Make it practical</h2><p>Record what you tried, what you observed, and what you still cannot conclude.</p>'
            if d.get('objectives'):body+='<p><strong>Mapped objectives:</strong> '+E(', '.join(d['objectives']))+'</p>'
            for t in d.get('tools',[]):body+='<p>'+self.a(next(x['name']for x in self.tools if x['id']==t),'/tools/'+t+'/')+'</p>'
            body+='<p>'+self.a('All labs →','/labs/')+'</p><p>'+self.a('Security+ pathway →','/academy/')+'</p></aside></div>'
            self.page(path,d['title'],body,d['description'],{'academy':'Academy','labs':'Labs','careers':'Careers','tutorials':'Tools'}[sec])
        for section,title,description in [('labs','Practice with a purpose.','Small, isolated exercises. Original synthetic evidence. Clear checks for what you learned.'),('tutorials','Tool tutorials','Learn a bounded workflow and how to verify the result.'),('careers','Build a path you can demonstrate.','Connect foundational skills to projects, evidence and thoughtful career decisions.')]:
            body=self.heading(title,description,section.title())+'<div class="grid">'
            for d in self.docs:
                if d['section']==section:body+=self.card(d['title'],d['description'],f'/{section}/{d["id"]}/',d['difficulty'],f'{d["minutes"]} min')
            self.page('/'+section+'/',section.title(),body+'</div>',section=section.title() if section!='tutorials' else 'Tools')
    def intelligence_pages(self):
        sources_cfg=read_json(ROOT/'data/sources.json')
        active_feeds=sum(1 for s in sources_cfg if self.source_health(self.intel['sources'].get(s['id'],{}))[0])
        body=self.heading('Stay informed. Keep context.','Attributed source reporting, with publication times and visible collection health.','Intelligence / Source desk')
        if self.intel['mode']=='educational-fixtures':body+='<p class="notice">EDUCATIONAL FIXTURE MODE. Every item below is test data, not current reporting or live threat activity.</p>'
        body+='<div class="actions">'+self.a('Vulnerability explorer','/vulnerabilities/','button primary')+self.a('Historical archive','/archive/','button')+'</div>'
        body+=f'''<section class="stats" aria-label="Intelligence telemetry"><div class="stat"><span class="stat-label">CONFIGURED FEEDS</span><strong>{len(sources_cfg)}</strong><span>Permitted HTTPS advisories &amp; catalogs</span></div><div class="stat"><span class="stat-label">LIVE FEED HEALTH</span><strong id="live-feed-health" data-total="{len(sources_cfg)}">{active_feeds}/{len(sources_cfg)}</strong><span>Feeds healthy within 48h with no active errors</span></div><div class="stat"><span class="stat-label">STORED HEADLINES</span><strong>{len(self.intel["news"])}</strong><span>Deduplicated source-reported items</span></div><div class="stat"><span class="stat-label">KEV RECORDS</span><strong>{len(self.intel["vulnerabilities"])}</strong><span>Known exploited vulnerabilities cached</span></div></section>'''
        body+='<p class="notice">Headlines are attributed source reports, not independently verified claims. No article body is republished. Publication time is not an incident’s event time.</p><h2>Source health</h2><div class="grid">'
        for source in sources_cfg:
            st=self.intel['sources'].get(source['id'],{});success=st.get('last_success');err=st.get('error')
            healthy,dot_cls,status_label=self.source_health(st)
            warn_cls='' if healthy else ' warning'
            body+=f'<article class="card" data-feed-card="{E(source["id"])}"><div class="card-top"><span class="badge">{E(source["category"])}</span><span class="meta-mono"><span class="status-dot {dot_cls}" aria-hidden="true"></span>{E(source["id"])}</span></div><h3>{E(source["name"])}</h3><p class="{warn_cls.strip()}" data-freshness="{E(success or "")}" data-error="{E(err or "")}">{E(status_label)}</p><small class="meta-mono">Last success: {E(success or "Never")}<br>Last attempt: {E(st.get("last_attempt") or "Not run")}</small><p class="muted">{E(err or "No current error recorded")}</p></article>'
        body+='</div><h2>Headlines</h2>'+self.filters([('category','Category',[x['category'] for x in self.intel['news']])],(('published_at','Newest publication'),('title','Title A–Z')))+'<div id="results">'
        for n in self.intel['news']:
            body+=f'<article class="digest-row" data-record="{E(json.dumps(n))}"><small class="meta-mono">{E((n.get("published_at") or "Unknown")[:10])}</small><div>{self.badge(n["category"],"green")}<h3><a href="{E(n["url"])}">{E(n["title"])}</a></h3><small>{E(n["source"])} · {E(n.get("published_at") or "Publication time unknown")} · Source-reported</small></div></article>'
        body+='</div><p id="empty" class="empty"'+(' hidden'if self.intel['news']else'')+'>No matching headlines. Source failures and first-run empty states are shown without invented news.</p>'
        self.page('/intelligence/','Cyber intelligence',body,section='Intelligence')
        body=self.heading('Vulnerability signals, explained.','Severity, probability and observed exploitation answer different questions.','Intelligence / Vulnerabilities')+'<div class="grid"><div class="card"><div class="card-top"><span class="badge">Severity Model</span></div><h2>CVSS</h2><p>Technical severity under a particular model and vector. It does not prove exploitation.</p></div><div class="card"><div class="card-top"><span class="badge">Probability (30d)</span></div><h2>EPSS</h2><p>Estimated probability of exploitation over the next 30 days. Always interpret the score date.</p></div><div class="card"><div class="card-top"><span class="badge green">Confirmed Signal</span></div><h2>CISA KEV</h2><p>CISA has evidence of exploitation in the wild. It does not establish compromise of your environment.</p></div></div><p class="notice">This explorer covers the KEV catalog, not all CVEs. Enrichment is bounded: EPSS for 50 recent entries and up to three NVD records per refresh. Missing values mean unknown, never zero. CISA due dates are shown as catalog context, not universal deadlines.</p>'
        if self.intel['mode']=='educational-fixtures':body+='<p class="notice">EDUCATIONAL FIXTURE MODE: synthetic test records, not live intelligence.</p>'
        body+='<h2>Enrichment freshness</h2><div class="grid two">'
        for key,label in [('epss','FIRST EPSS'),('nvd','NVD')]:
            state=self.intel['sources'].get(key,{})
            healthy,dot_cls,status_label=self.source_health(state)
            warn_cls='' if healthy else ' warning'
            body+=f'<div class="card"><div class="card-top"><span class="meta-mono"><span class="status-dot {dot_cls}" aria-hidden="true"></span>{E(key)}</span></div><h3>{label}</h3><p class="{warn_cls.strip()}" data-freshness="{E(state.get("last_success")or"")}" data-error="{E(state.get("error")or"")}">{E(status_label)}</p><p class="muted">{E(state.get("error")or"No current error recorded")}</p></div>'
        body+='</div>'
        body+=self.filters([], (('date_added','Newest KEV addition'),('id','CVE identifier')))+'<div class="grid" id="results">'
        sorted_vulns=sorted(self.intel['vulnerabilities'],key=lambda x:(x.get('date_added') or '',x.get('id') or ''),reverse=True)
        for v in sorted_vulns:
            score='Unknown'if v['epss']is None else f'{v["epss"]*100:.2f}% ({v["epss_date"]})'
            cvss='Unknown'if v['cvss']is None else f'{v["cvss"]["score"]} / v{v["cvss"]["version"]}'
            body+=f'<article class="card" data-record="{E(json.dumps(v))}"><div class="card-top">{self.badge("CISA KEV","green")}</div><h2>{E(v["id"])}</h2><p>{E(v["vendor"])} · {E(v["product"])}</p><p>{E(v["title"])}</p><p class="meta-mono">CVSS: {E(cvss)}<br>EPSS: {E(score)}</p><p>{E(v["required_action"])}</p><small class="meta-mono">Added: {E(v["date_added"])} · CISA due: {E(v["due_date"])}</small><p><a href="{E(v["source"])}">CISA source ↗</a> · <a href="https://nvd.nist.gov/vuln/detail/{E(v["id"])}">NVD record ↗</a></p>'+''.join(f'<p><a href="{E(u)}">Advisory reference {i+1} ↗</a></p>'for i,u in enumerate(v['references'][:3]))+'</article>'
        body+='</div><p id="empty" class="empty"'+(' hidden'if self.intel['vulnerabilities']else'')+'>No matching vulnerability records. Run an authorized source refresh to populate this view.</p>'
        self.page('/vulnerabilities/','Vulnerability explorer',body,section='Intelligence')
        groups=defaultdict(list)
        for n in self.intel['news']:groups[(n.get('published_at') or 'unknown')[:10]].append(n)
        archive=self.heading('Daily source digest','Grouped by source publication date. Records without a timestamp stay separate.','Intelligence / Archive')
        for day,items in sorted(groups.items(),reverse=True):
            archive+='<p>'+self.a(day+f' · {len(items)} headlines','/archive/'+day+'/')+'</p>'
            entries='<ul>'+''.join(f'<li><a href="{E(n["url"])}">{E(n["title"])}</a> — {E(n["source"])}</li>'for n in items)+'</ul>'
            self.page('/archive/'+day+'/',day+' source digest',self.heading(day+' digest','Attributed headlines; no independent event-date inference.')+entries,section='Intelligence')
        if not groups:archive+='<p class="empty">No source records have been archived yet.</p>'
        self.page('/archive/','News archive',archive,section='Intelligence')
    def misc(self):
        self.page('/search/','Search CyberHub',self.heading('Find your next answer.','Search tools, lessons, labs and roadmaps. Everything is indexed locally.')+'<div class="card search-panel"><label for="global-search">Search CyberHub</label><input id="global-search" type="search" placeholder="Try identity, packet, risk, Wireshark, SY0-701…" autocomplete="off"><ul id="search-results" class="search-results"></ul></div><noscript><p>Search needs JavaScript; use the section navigation to browse all pages.</p></noscript>')
        body=self.heading('Built to be passed on.','A useful club project should survive a change in maintainers.','Community / Contribute')+'<div class="notice">Release 0.1.0 is a functioning foundation, not the completed production scope. Current exam verification, deep curriculum coverage, 100–150 verified tools, live feed acceptance and club deployment approval remain open.</div><div class="grid">'
        for title,desc in [('Platform engineering','Improve accessibility, tests and build tooling. Treat every imported field as untrusted data.'),('Tool research','Check official repositories and license files. Propose field-specific evidence; never infer safety from stars.'),('Curriculum','Write original explanations and questions. Map objective IDs, explain distractors and obtain an independent reviewer.'),('Intelligence','Review feed policies, source failures and attribution. Separate reported claims from confirmed findings.'),('Content review','Check factual accuracy, safe scope, readability and reproducible verification.'),('Cohort handoff','Keep two maintainers, record decisions, rotate access and run a clean deployment rehearsal each term.')]:body+=f'<article class="card"><h2>{title}</h2><p>{desc}</p></article>'
        body+='</div><h2>How to contribute</h2><p>Use the CONTRIBUTING guide and templates in the source package. Submit a reviewable pull request with sources and test results. Automated discovery remains in a private-to-the-repository review file until a maintainer verifies it.</p><h2>Content licenses</h2><p>Original software: MIT. Original lessons and synthetic datasets: CC BY 4.0. Third-party projects, feeds and trademarks retain their own licenses and ownership. Source links do not grant redistribution rights.</p>'
        self.page('/contribute/','Contribute',body)
        self.page('/about/','Privacy and accessibility',self.heading('Study without an account.','The site keeps its infrastructure and data collection deliberately small.')+'<article class="prose card"><h2>Privacy</h2><p>No analytics, advertising scripts or authentication are included. Learning progress and theme preference use browser-local storage. Export or clear progress from the Academy page. The hosting provider may record ordinary HTTP access logs; external source links follow those sites’ policies.</p><h2>Accessibility</h2><p>Core content is server-rendered and readable without JavaScript. Keyboard navigation, skip links, labeled controls, visible focus and light/dark themes are included. Quizzes support untimed practice. Automated checks are limited; screen-reader and user testing remain necessary before broad release.</p><h2>Independence</h2><p>Certification names identify study topics. This project is not affiliated with certification providers and does not reproduce exam questions. University and club endorsement have not been established. The existing club website remains the source for club information.</p></article>')
    def build(self):
        validate()
        if self.out.exists():shutil.rmtree(self.out,ignore_errors=True)
        self.out.mkdir(exist_ok=True);shutil.copytree(ROOT/'public',self.out,dirs_exist_ok=True);(self.out/'assets').mkdir(exist_ok=True)
        shutil.copyfile(ROOT/'web/site.css',self.out/'assets/site.css')
        (self.out/'assets/favicon.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#06b6d4"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="#0b1120"/><rect x="2" y="2" width="60" height="60" rx="14" fill="none" stroke="url(#g)" stroke-width="3"/><text x="32" y="41" text-anchor="middle" font-family="ui-monospace,monospace" font-size="26" font-weight="800" fill="#ecfdf5">CH</text></svg>')
        subprocess.run(['node','scripts/transpile.mjs'],cwd=ROOT,check=True)
        self.home();self.tool_pages();self.academy_pages();self.document_pages();self.intelligence_pages();self.misc()
        for name,data in [('academy',self.academy),('search',self.search)]:
            (self.out/'assets'/f'{name}.json').write_text(json.dumps(data,ensure_ascii=False))
        self.page('/404/','Page not found',self.heading('This page is not here.','Use search or the main navigation to find a learning resource.')+self.a('Return home','/','button primary'))
        shutil.copyfile(self.out/'404/index.html',self.out/'404.html');(self.out/'.nojekyll').touch()
        if self.site_url:
            sitemap='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join('<url><loc>'+E(self.site_url+self.base+p)+'</loc></url>'for p in self.paths if p!='/404/')+'</urlset>'
            (self.out/'sitemap.xml').write_text(sitemap)
        (self.out/'robots.txt').write_text('User-agent: *\n'+('Allow: /\nSitemap: '+self.site_url+self.base+'/sitemap.xml\n'if self.site_url else'Disallow: /\n'))
        print(json.dumps({'pages':len(self.paths),'base_path':self.base,'output_bytes':sum(p.stat().st_size for p in self.out.rglob('*')if p.is_file()and' 'not in p.name),'network_requests':0}))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--base');args=p.parse_args();Site(args.base).build()
