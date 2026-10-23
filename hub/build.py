"""Reproducible static output; no network access or untrusted executable content."""
import argparse
import html
import json
import os
import re
import shutil
import subprocess
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from .intel_art import intel_art
import hashlib as _hashlib
from pathlib import Path as _Path
# Cache-busting version: changes whenever any front-end source changes, so browsers never pair new HTML with an old stylesheet or script.
ASSET_V=_hashlib.sha256(b''.join(p.read_bytes() for p in sorted((_Path(__file__).resolve().parents[1]/'web').iterdir()) if p.is_file())).hexdigest()[:10]
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
    BRAND='/assets/brand/'
    DISCIPLINES=[
        ('Network analysis','Read packets and traffic to see what actually crossed the wire.',['Network analysis','Network monitoring','Intrusion detection','Network scanning'],'packet-analysis',[1,2,7]),
        ('Detection engineering','Write rules that catch the bad case and stay quiet on the good one.',['Detection engineering'],'detection-engineering',[0,2,3]),
        ('Endpoint & forensics','Follow what happened on a machine, and preserve the evidence.',['Endpoint detection','Digital forensics','Reverse engineering','Incident response'],'windows-events',[1,0,5]),
        ('Vulnerability management','Know what you run and which weaknesses matter first.',['Vulnerability management','Software supply chain'],None,[4,1,7]),
        ('Application security','Find secrets, insecure code and risky web behaviour before release.',['Application security','Web security','Penetration testing'],None,[3,5,6]),
        ('Cloud & containers','Misconfiguration and identity on the platforms software now runs on.',['Cloud security','Container security','System hardening'],'linux-hardening',[4,2,7]),
        ('Cryptography','Hashes, certificates and the trust they do and do not give you.',['Cryptography and PKI'],None,[4,7,3]),
        ('Governance & risk','Turn policy, risk and compliance into decisions people can follow.',[],None,[3,6,0]),
    ]
    def img(self,name,alt='',cls='',w=None,h=None):
        size=(f' width="{w}"' if w else '')+(f' height="{h}"' if h else '')
        c=f' class="{cls}"' if cls else ''
        return f'<img{c} src="{E(self.base+self.BRAND+name)}" alt="{E(alt)}"{size}>'
    def page(self,path,title,body,description='',section=''):
        if not path.startswith('/') or '..' in path:raise ValueError('Invalid output path')
        file=self.out/path.lstrip('/')/'index.html';file.parent.mkdir(parents=True,exist_ok=True)
        b=self.base;home=path=='/'
        nav_items=[('01','Resources','/resources/','Resources'),('02','Tools','/tools/','Tools'),('03','Academy','/academy/','Academy'),('04','Labs','/labs/','Labs'),('05','Intelligence','/intelligence/','Intelligence'),('06','Careers','/careers/','Careers')]
        nav=''.join(f'<a href="{E(b+p)}"'+(' aria-current="page"' if section==sec else '')+f'><span>{n}</span>{label}</a>' for n,label,p,sec in nav_items)
        menu_nav=''.join(f'<a href="{E(b+p)}"><span class="label">{n}</span>{label}</a>' for n,label,p,sec in nav_items)+f'<a href="{E(b)}/search/"><span class="label">07</span>Search</a><a href="{E(self.config["club_url"])}"><span class="label">08</span>CISO club ↗</a>'
        canonical=f'<link rel="canonical" href="{E(self.site_url+b+path)}">' if self.site_url else '<meta name="robots" content="noindex">'
        brand=(f'<a class="brand" href="{E(b)}/" aria-label="CyberHub home">'
               f'<span class="brand-core">{self.img("cyberhub-core-on-dark.svg","","dark",32,32)}{self.img("cyberhub-core-on-light.svg","","light",32,32)}</span>'
               '<span class="brand-word">Cyber<i>Hub</i></span><span class="label">Powered by CISO</span></a>')
        theme_btn='<button id="theme" class="icon-btn" type="button" aria-label="Dark theme" aria-pressed="false" title="Switch between light and dark theme"><svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><circle cx="10" cy="10" r="6.5"/><path class="fill" d="M10 3.5a6.5 6.5 0 0 0 0 13z"/></svg></button>'
        header=(f'<div class="progress" aria-hidden="true"><i id="progress"></i></div>'
                f'<header class="site-header wrap{" tone-void" if home else ""}" id="site-header">{brand}<nav class="main-nav label" aria-label="Main navigation">{nav}</nav>'
                f'<div class="header-actions"><a class="club-link label" href="{E(self.config["club_url"])}" aria-label="CISO club site, ciso-csusb.org"><span class="lbl">CISO club site</span><span class="short">CISO</span> ↗</a><a class="search-pill label" href="{E(b)}/search/"><span class="lbl">Search</span><kbd>⌘K</kbd></a>{theme_btn}'
                '<button class="menu-btn label" id="menu-open" type="button" aria-expanded="false" aria-controls="menu">Menu</button></div></header>'
                f'<div class="menu wrap tone-void" id="menu" role="dialog" aria-modal="true" aria-label="Site menu"><div class="menu-top">'
                f'<a class="brand" href="{E(b)}/"><span class="brand-core">{self.img("cyberhub-core-on-dark.svg","","dark",32,32)}</span><span class="brand-word">Cyber<i>Hub</i></span></a>'
                f'<button class="label" id="menu-close" type="button">Close</button></div><nav aria-label="Menu">{menu_nav}</nav>'
                '<div class="menu-sys label"><span>CyberHub / open access</span><span>Powered by CISO at CSUSB</span></div></div>')
        footer=(f'<footer class="footer tone-void" data-tone="footer"><div class="foot-core" aria-hidden="true">{self.img("cyberhub-core-on-dark.svg")}</div>'
                '<p class="foot-say wrap" aria-hidden="true"><span>Build.</span><span>Break.</span><span>Defend.</span><span>Learn.</span></p>'
                f'<div class="foot-lockup wrap"><div class="brand-frame">{self.img("cyberhub-lockup-on-dark.svg","CyberHub, powered by CISO","",622,160)}</div>'
                f'<a class="brand-frame powered" href="{E(self.config["club_url"])}" aria-label="Powered by CISO, the Cyber Intelligence and Security Organization (opens the club site)"><img src="{E(b+self.BRAND)}ciso-seal.png" alt="" width="96" height="96"><span class="ciso-word" aria-hidden="true"><span class="label">Powered by</span><strong>CISO</strong><span class="label">Cyber Intelligence &amp; Security Org.</span></span></a></div>'
                '<div class="netline" aria-hidden="true"><i></i></div><div class="foot-grid wrap">'
                f'<div><h2>CyberHub</h2><span>Open security learning</span><span>Free, no account, nothing to install</span></div>'
                f'<div><h2>Learn</h2>{self.a("Tool explorer","/tools/")}{self.a("Security+ academy","/academy/")}{self.a("Labs","/labs/")}{self.a("Career roadmaps","/careers/")}</div>'
                f'<div><h2>Follow</h2>{self.a("Intelligence desk","/intelligence/")}{self.a("Vulnerability explorer","/vulnerabilities/")}{self.a("Daily digest","/archive/")}</div>'
                f'<div><h2>Project</h2>{self.a("Contribute","/contribute/")}{self.a("Privacy and accessibility","/about/")}<a href="{E(self.config["club_url"])}">CISO club website ↗</a></div></div>'
                f'<div class="foot-base wrap label"><span>CyberHub release 0.1.0 · CISO at CSUSB</span><span>{E(self.config["affiliation"])}</span><span>Software MIT · lessons CC BY 4.0</span></div></footer>')
        loader=(f'<div class="loader" id="loader" aria-hidden="true"><div class="loader-inner"><div class="loader-row">{self.img("cyberhub-core-animated.svg","","",72,72)}<span class="loader-count" id="load-count">00</span></div>'
                '<div class="loader-line"><i id="load-line"></i></div><div class="loader-row label"><span>Loading modules</span><span>Powered by CISO</span></div></div></div>') if home else ''
        doc=(f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="{E(description or title)}"><meta name="referrer" content="strict-origin-when-cross-origin">'
             f'<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'self\'; style-src \'self\'; img-src \'self\' data:; font-src \'self\'; connect-src \'self\'; base-uri \'none\'; form-action \'none\'; object-src \'none\'">'
             f'<meta name="theme-color" content="#050505"><title>{E(title)} · {E(self.config["name"])}</title>{canonical}'
             f'<link rel="icon" href="{b}/assets/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="{b}{self.BRAND}cyberhub-app-icon.svg">'
             f'<link rel="preload" href="{b}/assets/fonts/archivo.woff2" as="font" type="font/woff2" crossorigin>'
             f'<link rel="stylesheet" href="{b}/assets/site.css?v={ASSET_V}"><script src="{b}/assets/theme.js?v={ASSET_V}"></script><script type="module" src="{b}/assets/app.js?v={ASSET_V}"></script></head>'
             f'<body class="{"home" if home else "inner"}" data-base="{E(b)}"><a class="skip" href="#main">Skip to content</a>{loader}{header}'
             f'<main id="main" class="shell">{body}<div id="status" class="status" role="status" aria-live="polite"></div></main>{footer}'
             '<div class="cursor" id="cursor" aria-hidden="true"><div class="ring"><span id="cursor-label">View</span></div><div class="dot"></div></div></body></html>')
        file.write_text(doc,encoding='utf-8');self.paths.append(path)
        self.search.append({'title':title,'section':section or 'Hub','path':path,'text':re.sub('<[^>]+>',' ',body)[:14000]})
    def heading(self,title,desc,eyebrow=''):
        crumb=f'<p class="crumb">{E(eyebrow)}</p>' if eyebrow else ''
        return f'<header class="page-head">{crumb}<h1>{E(title)}</h1><p class="lead">{E(desc)}</p></header>'
    def card(self,title,desc,path,tag,footer=''):
        return f'<article class="card"><div class="card-top"><span class="label on">{E(tag)}</span><span class="meta-mono">{E(footer)}</span></div><h2>{self.a(title,path)}</h2><p>{E(desc)}</p></article>'
    def filters(self, fields, sort_options=(('name','Name A–Z'),)):
        form='<form id="filters" class="filters" role="search"><label class="filter-search">Search this list<input type="search" name="q" autocomplete="off" placeholder="Name, topic, CVE or keyword"></label>'
        for name,label,values in fields:
            form+=f'<label>{E(label)}<select name="{E(name)}"><option value="">All</option>'+''.join(f'<option value="{E(v)}">{E(v)}</option>' for v in sorted(set(values)))+'</select></label>'
        form+='<label>Sort<select name="sort">'+''.join(f'<option value="{E(v)}">{E(label)}</option>' for v,label in sort_options)+'</select></label><div class="filter-actions"><button type="button" id="reset-filters">Reset</button></div></form><p id="result-count" class="list-count" role="status"></p><noscript><p>Filters need JavaScript. All records remain available below and through browser Find.</p></noscript>'
        return form
    def home(self):
        b=self.base;count=len(self.tools);course=self.academy;lessons=len(course['objectives'])
        labs_list=[d for d in self.docs if d['section']=='labs'];tutorials=len([d for d in self.docs if d['section']=='tutorials']);careers=len([d for d in self.docs if d['section']=='careers'])
        sources_cfg=read_json(ROOT/'data/sources.json');news=sorted(self.intel['news'],key=lambda n:(n.get('published_at') or '',n.get('id') or ''),reverse=True)
        healthy=sum(1 for s in sources_cfg if self.source_health(self.intel['sources'].get(s['id'],{}))[0])
        R=lambda label,d='':f'<span class="rv-l{" "+d if d else ""}"><span>{label}</span></span>'
        # 01 hero + 02 aperture
        body=('<section class="scene stage tone-void" id="top" data-tone="void" data-sec="01" aria-labelledby="hero-title"><div class="stage-pin"><div class="hero wrap">'
              '<div class="hero-main"><h1 class="hero-type" id="hero-title" aria-label="CyberHub: open security learning, powered by CISO"><span class="type-solid" aria-hidden="true">'
              '<span class="ln ln-1" data-w=".74"><span>Cyber</span></span><span class="ln ln-2" data-w=".5"><span>Hub</span></span></span></h1>'
              '<div class="hero-intro"><p class="hero-lead">Open security learning from CISO at CSUSB. Real tools, real evidence, clear reasoning. Free, with no account.</p>'
              f'<div class="hero-actions">{self.a("Explore the resources →","/resources/","button primary")}{self.a("Start the academy","/academy/","button")}</div></div></div>'
              f'<div class="seal" id="seal" role="img" aria-label="Simulated cyberattack map: illustrative arcs between eight countries. Not live telemetry."><div class="seal-tilt" id="seal-tilt">{self.img("cyberhub-core-on-dark.svg")}<canvas id="core-canvas" data-ready="loading" aria-hidden="true"></canvas></div></div>'
              '<span class="reg reg-tl" aria-hidden="true"></span><span class="reg reg-tr" aria-hidden="true"></span><span class="reg reg-bl" aria-hidden="true"></span><span class="reg reg-br" aria-hidden="true"></span>'
              '<div class="hero-meta label"><div>Open learning platform / <b>Powered by CISO</b></div>'
              '<div>Map / <b>simulated paths</b> · 08 nodes<br>Illustrative only &nbsp; Pointer <span id="coords">x 0.500 y 0.500</span></div>'
              f'<div>{self.a("Scroll, or jump to every resource ↓","/resources/","scroll-cue")}</div></div></div>'
              '<div class="aperture-ring" id="ap-ring" aria-hidden="true"></div>'
              '<div class="aperture tone-paper" id="aperture"><div class="mission wrap" id="mission">'
              '<div class="mission-head label"><span>02 / What CyberHub is</span><span>Access / open</span><span>Account / none required</span></div>'
              '<p class="mission-statement">Learn security the way it is practiced. <span class="soft">With real tools, safe evidence and reasoning you can check.</span></p><div class="spec">')
        for n,label in [(count,'Open-source tools'),(lessons,'Security+ lessons'),(len(labs_list),'Guided labs'),(careers,'Career roadmaps')]:
            body+=f'<div><strong data-count="{n}">{n:02d}</strong><span class="label">{E(label)}</span></div>'
        body+='</div></div></div></div></section>'
        # 03 learning map
        tool_by_cat=defaultdict(list)
        for t in self.tools:tool_by_cat[t['category']].append(t)
        nodes='';cards=[]
        for i,(name,text,cats,lab,rel) in enumerate(self.DISCIPLINES):
            ts=[t for c in cats for t in tool_by_cat.get(c,[])]
            tools_txt=' · '.join(t['name'] for t in ts) or 'Domain 5 lessons'
            lab_txt=next((l['title'] for l in labs_list if l['id']==lab),'') if lab else ''
            nodes+=(f'<li><button type="button" data-node="{i}" data-name="{E(name)}" data-text="{E(text)}" data-tools="{E(tools_txt)}" data-lab="{E(lab_txt)}" data-rel="{",".join(map(str,rel))}" aria-pressed="{"true" if i==0 else "false"}">'
                    f'<span class="label">{i+1:02d}</span><span class="nm">{E(name)}</span><span class="label st">{len(ts) or "—"} tools</span></button></li>')
            cards.append((name,text,tools_txt,lab_txt))
        n0=cards[0]
        body+=('<section class="scene net tone-void" id="map" data-tone="void" data-sec="03" aria-labelledby="map-title"><div class="net-pin wrap"><div class="net-copy">'
               '<span class="label"><span class="on">03</span> / Learning map</span><h2 id="map-title">Eight disciplines. One system.</h2>'
               '<p class="intro">Security is never one skill. Pick a discipline to see the tools and labs CyberHub has for it.</p>'
               f'<div class="net-count label"><strong id="net-count">08</strong><span>of 08 disciplines mapped</span></div><ul class="node-list" id="node-list">{nodes}</ul></div>'
               '<div class="net-canvas"><canvas id="net-canvas" aria-hidden="true"></canvas><div class="node-card" aria-live="polite">'
               f'<span class="label" id="nc-idx">Node / 001</span><h3 id="nc-name">{E(n0[0])}</h3><p id="nc-text">{E(n0[1])}</p><span class="label links" id="nc-links">Tools / {E(n0[2])}{" — "+E(n0[3]) if n0[3] else ""}</span></div></div></div></section>')
        # blue interlude with latest real headline
        latest=news[0] if news else None
        if latest:
            published=(latest.get('published_at') or '')[:10]
            date_html=f'<time datetime="{E(published)}">{E(published)}</time>' if published else '<span>Publication date not reported</span>'
            feature=(f'<div class="intel-feature wrap"><article class="intel-feature-panel has-art"><div class="intel-feature-text"><p class="intel-feature-kicker label"><span class="intel-dot" aria-hidden="true"></span>Intel desk / latest report</p>'
                     f'<h2 class="intel-feature-headline"><a href="{E(latest["url"])}">{E(latest["title"])}<span class="arr" aria-hidden="true">↗</span></a></h2>'
                     f'<p class="intel-feature-meta label"><span>{E(latest["source"])}</span>{date_html}</p></div>{intel_art(latest)}</article></div>')
        else:
            feature=(f'<div class="intel-feature wrap"><article class="intel-feature-panel"><p class="intel-feature-kicker label"><span class="intel-dot" aria-hidden="true"></span>Intel desk / latest report</p>'
                     f'<h2 class="intel-feature-headline">{self.a("No headlines retrieved yet — see source health.","/intelligence/")}</h2>'
                     f'<p class="intel-feature-meta label"><span>{healthy}/{len(sources_cfg)} feeds healthy</span><span>Attributed source reporting only</span></p></article></div>')
        body+=('<section class="scene interlude tone-blue" data-tone="blue" data-sec="03" aria-label="Latest intelligence">'
               '<div class="marquee m1" id="m1" aria-hidden="true"><span>Learn</span><span class="o">Practice</span><span>Verify</span><span class="o">Defend</span><span>Learn</span><span class="o">Practice</span></div>'
               '<div class="marquee m2" id="m2" aria-hidden="true"><span class="o">Observe</span><span>Reason</span><span class="o">Report</span><span>Observe</span><span class="o">Reason</span></div>'
               f'{feature}</section>')
        # 04 modules
        mods=[('01','Tool explorer',count,'tools',f'{tutorials} tutorials','Open-source security tools with checked license and source details, and step-by-step tutorials.','tools','/tools/'),
              ('02','Academy',lessons,'lessons','Security+ SY0-701',f'Short lessons mapped to the exam objectives, {len(course["questions"])} practice questions and {len(course["flashcards"])} flashcards.','bars','/academy/'),
              ('03','Labs',len(labs_list),'labs','Hash-verified evidence','Guided investigations on safe packet captures, logs and detection rules.','trace','/labs/'),
              ('04','Intel desk',len(self.intel['vulnerabilities']),'KEV records',f'{len(sources_cfg)} sources','Attributed headlines and exploited-vulnerability signals, with source health shown.','topology','/intelligence/'),
              ('05','Careers',careers,'roadmaps','SOC to architect','Role guides that connect skills to projects you can show.','path','/careers/')]
        body+=('<section class="scene tone-paper sec-pad wrap" id="modules" data-tone="paper" data-sec="04" aria-labelledby="mod-title"><div class="sec-head rv">'
               f'<span class="label"><span class="on">04</span> / Modules</span><h2 id="mod-title">{R("Five ways")}{R("into the field","d1")}</h2></div>'
               '<div class="diptych"><div class="dip-bar label" aria-hidden="true"><span>Selected modules</span><span class="dip-arrows">&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</span></div>'
               f'<div class="dip-panels"><a class="dip dip-dark" href="{E(b)}/tools/" aria-label="Open the tool explorer"><canvas data-machine="rig" aria-hidden="true"></canvas><span class="dip-cap label" aria-hidden="true"><span>Core / top view</span><span>N01–N08</span></span></a>'
               f'<a class="dip dip-light" href="{E(b)}/resources/" aria-label="See every resource"><canvas data-machine="xray" aria-hidden="true"></canvas><span class="dip-cap label" aria-hidden="true"><span>Core / exploded</span><span>Layers 01–05</span></span></a></div></div>'
               '<ol class="modules">')
        for idx,title,num,unit,meta,desc,art,path in mods:
            body+=(f'<li class="mod"><figure class="mod-media" aria-hidden="true"><canvas data-art="{art}"></canvas></figure><a href="{E(b+path)}" data-cursor="Open">'
                   f'<span class="idx label">{idx} / Module</span><h3 class="ttl">{E(title)}</h3><span class="meta label"><strong>{num:,}</strong><span>{E(unit)}</span><span>{E(meta)}</span></span><p class="mod-desc">{E(desc)}</p></a></li>')
        body+=f'</ol><p class="mod-more">{self.a("See every resource in one place →","/resources/","button primary")}</p></section>'
        # field band: real photos, rendered only for files present in public/assets/photos/
        photos=[p for p in read_json(ROOT/'data/photos.json') if p.get('slot')=='field' and (ROOT/'public/assets/photos'/p['file']).is_file()]
        if photos:
            body+=('<section class="scene tone-carbon sec-pad wrap field" data-tone="carbon" aria-labelledby="field-title"><div class="sec-head rv">'
                   f'<span class="label"><span class="on">Field</span> / In the room</span><h2 id="field-title">{R("What you")}{R("will defend","d1")}</h2></div><div class="field-grid">')
            for i,p in enumerate(photos[:5]):
                body+=(f'<figure class="shot shot-{i+1} rv" tabindex="0" aria-describedby="shot-pop-{i+1}"><p class="shot-pop" id="shot-pop-{i+1}"><span class="label">{E(p["caption"])}</span>{E(p.get("desc",""))}</p><img src="{E(b)}/assets/photos/{E(p["file"])}" alt="{E(p["alt"])}" loading="lazy" decoding="async">'
                       f'<figcaption class="label"><span>{i+1:02d} / {E(p["caption"])}</span><span>{E(p["note"])}</span></figcaption></figure>')
            credits=', '.join(f'<a href="{E(p["page"])}">{E(p["by"])}</a>' for p in photos[:5])
            body+=f'</div><p class="field-credit label">Photography: {credits} / Unsplash License</p></section>'
        # 05 labs
        body+=('<section class="scene tone-void sec-pad wrap" id="labs" data-tone="void" data-sec="05" aria-labelledby="lab-title"><div class="sec-head rv">'
               f'<span class="label"><span class="on">05</span> / Labs</span><h2 id="lab-title">{R("Evidence you")}{R("can touch","d1")}</h2></div><div class="lab">'
               '<div class="lab-intro fade"><span class="label"><span class="on">Live</span> / Bench 01</span><h3>Change one letter. Watch half the bits flip.</h3>'
               '<p>SHA-256, running in your browser. A good hash turns a tiny change into a completely different fingerprint. It is how every CyberHub lab file proves nobody has touched it.</p></div>'
               '<div class="device fade d1"><div class="device-shell"><div class="device-screen"><div class="bench tick"><div class="bench-bar label"><span>SHA-256 / avalanche</span><span>Runs locally, nothing sent</span></div><div class="bench-body"><div>'
               '<label class="label" for="hash-in">Input</label><input id="hash-in" type="text" value="CyberHub" autocomplete="off" spellcheck="false" maxlength="64">'
               '<div class="hash" id="hash-out" aria-live="polite">Hashing needs JavaScript.</div></div><div class="bits" id="bits" aria-hidden="true"></div></div>'
               '<div class="aval label"><span>Bits changed since last input</span><strong id="aval">Edit the input</strong></div></div></div><div class="device-chin label"><span>CyberHub / Bench 01</span><i aria-hidden="true"></i></div></div><div class="device-base" aria-hidden="true"></div></div><div class="lab-index fade">')
        for i,l in enumerate(labs_list):
            body+=f'<a href="{E(b)}/labs/{E(l["id"])}/" data-cursor="Open"><span class="label">Lab / {i+1:02d} · {E(l["minutes"])} min</span><strong>{E(l["title"])}</strong></a>'
        body+='</div></div></section>'
        # 06 academy
        q=course['questions'][0]
        body+=('<section class="scene tone-paper sec-pad wrap" id="academy-preview" data-tone="paper" data-sec="06" aria-labelledby="acad-title"><div class="sec-head rv">'
               f'<span class="label"><span class="on">06</span> / Security+ academy</span><h2 id="acad-title">{R(f"{len(course["domains"])} domains.")}{R(f"{lessons} lessons.","d1")}</h2>'
               f'<p class="intro fade">Mapped to the {E(course["exam_version"])} objectives and weighted the way the exam is. <span id="home-progress-summary">Progress stays in your browser.</span></p></div>'
               '<div class="acad"><table class="domains"><caption class="sr-only">Security+ domains, lessons and exam weight</caption><thead class="label"><tr><th scope="col">ID</th><th scope="col">Domain</th><th scope="col">Lessons</th><th scope="col" class="d-bar">Exam weight</th><th scope="col"><span class="sr-only">Weight percent</span></th></tr></thead><tbody>')
        for d in course['domains']:
            n=len([o for o in course['objectives'] if o['id'].startswith(d['id']+'.')])
            peak=' peak' if d['weight']==max(x['weight'] for x in course['domains']) else ''
            body+=(f'<tr><td class="d-id">{E(d["id"])}</td><td class="d-name"><a href="{E(b)}/academy/#domain-{E(d["id"])}">{E(d["title"])}</a></td><td class="label">{n} lessons</td>'
                   f'<td class="d-bar"><div class="track"><i class="w{E(d["weight"])}{peak}"></i></div></td><td class="d-w label">{E(d["weight"])}%</td></tr>')
        body+=(f'</tbody></table><div class="qcard tick" id="qcard" data-total="{len(course["questions"])}"><div class="label"><span>Practice / objective <span id="q-obj">{E(q["objective"])}</span></span><span id="q-num">1 of {len(course["questions"])}</span></div>'
               f'<h3 id="q-prompt">{E(q["prompt"])}</h3><ol id="q-choices">'+''.join(f'<li><button type="button" data-choice="{n}"><span class="label">{"ABCDEF"[n]}</span><span>{E(c)}</span></button></li>' for n,c in enumerate(q['choices']))+
               f'</ol><p class="why" id="q-why" aria-live="polite">Pick an answer. You will see why it is right or wrong.</p><div class="q-foot"><span class="label">{self.a("All practice questions","/academy/practice/")}</span><button class="label" id="q-next" type="button">Next question</button></div></div></div></section>')
        # 07 tools
        lv={'beginner':1,'intermediate':2,'advanced':3}
        body+=('<section class="scene tone-carbon sec-pad wrap" id="tool-grid" data-tone="void" data-sec="07" aria-labelledby="tools-title"><div class="sec-head rv">'
               f'<span class="label"><span class="on">07</span> / Tool explorer</span><h2 id="tools-title">{R(f"{count} tools,")}{R("source-checked","d1")}</h2></div>'
               '<div class="tools-bar"><div class="chips" role="group" aria-label="Filter tools by difficulty">'
               '<button class="chip label" type="button" aria-pressed="true" data-lvl="all">All</button><button class="chip label" type="button" aria-pressed="false" data-lvl="beginner">Beginner</button>'
               '<button class="chip label" type="button" aria-pressed="false" data-lvl="intermediate">Intermediate</button><button class="chip label" type="button" aria-pressed="false" data-lvl="advanced">Advanced</button></div>'
               f'<span class="label" id="tool-count" role="status">{count} tools</span></div><ul class="tiles short" id="tiles">')
        for i,t in enumerate(self.tools):
            l=lv.get(t['difficulty'],2)
            body+=(f'<li class="tile" data-lvl="{E(t["difficulty"])}"><a href="{E(b)}/tools/{E(t["id"])}/"><span class="t-top label"><span>{i+1:02d}</span><span>{E(t["license"] or t["license_status"].replace("-"," "))}</span></span>'
                   f'<span><h3>{E(t["name"])}</h3><span class="t-cat label">{E(t["category"])}</span></span><span class="lvl"><i class="on"></i><i class="{"on" if l>1 else ""}"></i><i class="{"on" if l>2 else ""}"></i><span class="sr-only">{E(t["difficulty"])}</span></span></a></li>')
        body+=(f'</ul><button class="tiles-more" id="tiles-more" type="button">Show all tools</button><p class="tools-note label">Licenses and repository facts are checked against upstream sources. Checked is not the same as endorsed. {self.a("Open the full explorer","/tools/")}</p></section>')
        # 08 start + handoff
        body+=('<section class="scene tone-blue sec-pad wrap start" id="start" data-tone="blue" data-sec="08" aria-labelledby="start-title"><span class="label"><span class="on">08</span> / Start</span>'
               f'<h2 class="sr-only" id="start-title">Start learning</h2><a class="start-big" href="{E(b)}/resources/" data-cursor="Start"><span>Start learning <span class="arr" aria-hidden="true">↗</span></span><span class="fill" aria-hidden="true">Start learning <span class="arr">↗</span></span></a>'
               '<div class="handoff"><span class="label">Want a team?</span><p>CyberHub is built by members of CISO, the Cyber Intelligence &amp; Security Organization at CSUSB. The club runs project tracks and competes nationally.</p>'
               f'<div class="tags label"><span>CCDC</span><span>NCL</span><span>CPTC</span><span>NCAE</span></div><a class="button" href="{E(self.config["club_url"])}" data-cursor="Visit">Visit the club <span class="arr" aria-hidden="true">↗</span></a></div></section>')
        self.page('/','Open security learning',body,'Free cybersecurity learning, tools and practical labs for students, powered by CISO at CSUSB.')
    def resources_page(self):
        b=self.base;course=self.academy;labs=[d for d in self.docs if d['section']=='labs']
        n=lambda sec:len([d for d in self.docs if d['section']==sec])
        main=[('01','Tool explorer',len(self.tools),'tools',f'{n("tutorials")} tutorials','Open-source security tools with checked license and source details.','tools','/tools/'),
              ('02','Security+ academy',len(course['objectives']),'lessons',course['exam_version'],'Short lessons mapped to the exam objectives, grouped by domain.','bars','/academy/'),
              ('03','Labs',len(labs),'labs','Hash-verified evidence','Guided investigations on safe packet captures, logs and detection rules.','trace','/labs/'),
              ('04','Intelligence desk',len(self.intel['news']),'headlines',f'{len(self.intel["vulnerabilities"]):,} KEV records','Attributed headlines and exploited-vulnerability signals, with source health shown.','topology','/intelligence/'),
              ('05','Career roadmaps',n('careers'),'roadmaps','SOC to architect','Role guides that connect skills to projects you can show.','path','/careers/')]
        body=self.heading('Every resource, in one place.','Pick where to start. Everything here is free, needs no account, and keeps your progress in your browser.','Resources / Index')
        body+='<ol class="modules resource-list">'
        for idx,title,num,unit,meta,desc,art,path in main:
            body+=(f'<li class="mod"><figure class="mod-media" aria-hidden="true"><canvas data-art="{art}"></canvas></figure><a href="{E(b+path)}" data-cursor="Open">'
                   f'<span class="idx label">{idx} / Resource</span><h2 class="ttl">{E(title)}</h2><span class="meta label"><strong>{num:,}</strong><span>{E(unit)}</span><span>{E(meta)}</span></span><p class="mod-desc">{E(desc)}</p></a></li>')
        body+='</ol><div class="section-heading"><h2>Also in CyberHub</h2><span class="badge subtle">Study tools and references</span></div><div class="grid">'
        for title,desc,path,tag,meta in [('Tool tutorials','Step-by-step walkthroughs you can verify, one bounded workflow at a time.','/tutorials/','Tools',f'{n("tutorials")} tutorials'),
                                         ('Practice questions',f'Original questions with explanations. Timed or untimed.','/academy/practice/','Academy',f'{len(course["questions"])} questions'),
                                         ('Flashcards','One concept at a time. Explain the answer before you turn the card.','/academy/flashcards/','Academy',f'{len(course["flashcards"])} cards'),
                                         ('Certification planning','Other credentials to research, with provider links and honest status notes.','/academy/certifications/','Academy','Planning records'),
                                         ('Vulnerability explorer','CISA KEV entries with CVSS and EPSS context, newest first.','/vulnerabilities/','Intelligence','KEV catalog'),
                                         ('Daily digest','Source headlines grouped by publication date.','/archive/','Intelligence','Archive'),
                                         ('Search','Find any tool, lesson, lab or roadmap. Everything is indexed on your device.','/search/','Hub','⌘K'),
                                         ('Contribute','Help maintain CyberHub: research tools, write lessons, review content.','/contribute/','Project','Open to members')]:
            body+=self.card(title,desc,path,tag,meta)
        body+=f'</div><p class="notice">Looking for a team, projects or competitions? Those live on the CISO club site. <a href="{E(self.config["club_url"])}">Visit ciso-csusb.org ↗</a></p>'
        self.page('/resources/','Resources',body,'Every CyberHub resource in one place: tools, Security+ lessons, labs, intelligence and career roadmaps.','Resources')
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
        flash=self.heading('One concept at a time.','Try to explain the answer before you turn the card.','Academy / Flashcards')+'<section id="flashcards"><p id="card-count" class="meta-mono" role="status"></p><div class="flashcard-live" aria-live="polite"><button class="card flashcard" id="card-text" type="button" aria-pressed="false"></button></div><p class="flashcard-hint">Click the card, or press Enter or Space, to flip it.</p><div class="actions"><button id="previous-card" type="button">← Previous</button><button id="flip" type="button" class="primary">Show answer</button><button id="next-card" type="button">Next →</button></div></section>'
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
        self.page('/about/','Privacy and accessibility',self.heading('Study without an account.','The site keeps its infrastructure and data collection deliberately small.')+'<article class="prose card"><h2>Privacy</h2><p>No analytics, advertising scripts or authentication are included. Learning progress and theme preference use browser-local storage. Export or clear progress from the Academy page. The hosting provider may record ordinary HTTP access logs; external source links follow those sites’ policies.</p><h2>Accessibility</h2><p>Core content is server-rendered and readable without JavaScript. Keyboard navigation, skip links, labeled controls, visible focus and light/dark themes are included. Quizzes support untimed practice. Automated checks are limited; screen-reader and user testing remain necessary before broad release.</p><h2>Independence</h2><p>Certification names identify study topics. This project is not affiliated with certification providers and does not reproduce exam questions. University endorsement has not been established. The existing club website remains the source for club information.</p></article>')
    def build(self):
        validate()
        if self.out.exists():shutil.rmtree(self.out,ignore_errors=True)
        self.out.mkdir(exist_ok=True);shutil.copytree(ROOT/'public',self.out,dirs_exist_ok=True);(self.out/'assets').mkdir(exist_ok=True)
        shutil.copyfile(ROOT/'web/site.css',self.out/'assets/site.css')
        shutil.copyfile(ROOT/'public/assets/brand/cyberhub-favicon.svg',self.out/'assets/favicon.svg')
        subprocess.run(['node','scripts/transpile.mjs'],cwd=ROOT,check=True)
        self.home();self.resources_page();self.tool_pages();self.academy_pages();self.document_pages();self.intelligence_pages();self.misc()
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
