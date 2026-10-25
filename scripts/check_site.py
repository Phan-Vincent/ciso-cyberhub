"""Inspect every generated page: local links/fragments, HTML safety, basic semantics."""
import re,argparse
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit,unquote

class Page(HTMLParser):
    def __init__(self):
        super().__init__();self.links=[];self.ids=set();self.errors=[];self.h1=0;self.lang=False;self.main=0;self.labels=[];self.controls=[];self.csp=False;self.scripts=[];self.label_depth=0;self.references=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='html':self.lang=bool(a.get('lang'))
        if tag=='main':self.main+=1
        if tag=='h1':self.h1+=1
        if tag=='meta'and a.get('http-equiv')=='Content-Security-Policy':self.csp=True
        if tag=='label':self.label_depth+=1;self.labels.append(a.get('for'))
        if tag in ('input','select','textarea')and a.get('type')not in ('hidden','submit'):
            self.controls.append((a.get('id'),bool(a.get('aria-label')or a.get('aria-labelledby')or self.label_depth)))
        if tag=='label'and a.get('for'):self.references.append(a['for'])
        for key in ('aria-labelledby','aria-controls'):
            if a.get(key):self.references.extend(a[key].split())
        if 'id'in a:
            if a['id']in self.ids:self.errors.append('Duplicate id '+a['id'])
            self.ids.add(a['id'])
        if any(k.startswith('on')for k in a):self.errors.append('Inline event handler')
        if tag=='script'and not a.get('src'):self.errors.append('Inline script')
        if tag=='img'and 'alt'not in a:self.errors.append('Image missing alt')
        for key in ('href','src'):
            if key in a:self.links.append(a[key])
    def handle_endtag(self,tag):
        if tag=='label':self.label_depth=max(0,self.label_depth-1)

def check_site(directory,base=''):
    root=Path(directory);pages={};errors=[];link_count=0
    for p in root.rglob('*.html'):
        if ' 'in p.name:continue
        parser=Page();parser.feed(p.read_text());pages[p.resolve()]=parser
        if parser.h1!=1 or parser.main!=1 or not parser.lang or not parser.csp:parser.errors.append('Missing page semantics/CSP')
        for ref in parser.references:
            if ref not in parser.ids:parser.errors.append('Missing referenced id '+ref)
        for id,labeled in parser.controls:
            if not labeled and id not in parser.labels:parser.errors.append('Unlabeled form control')
        errors.extend(f'{p.relative_to(root)}: {e}'for e in parser.errors)
    for path,page in pages.items():
        for url in page.links:
            link_count+=1;parsed=urlsplit(url)
            if parsed.scheme or parsed.netloc:
                if parsed.scheme=='mailto' and re.fullmatch(r'mailto:[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}',url):continue
                if parsed.scheme!='https':errors.append(f'Unsafe external link {url}')
                continue
            if parsed.path:
                urlpath=unquote(parsed.path)
                if base and not(urlpath==base or urlpath.startswith(base+'/')):errors.append(f'Base path missing: {url}');continue
                target=(root/urlpath[len(base):].lstrip('/')).resolve() if urlpath.startswith('/') else (path.parent/urlpath).resolve()
                if not target.is_relative_to(root.resolve()):errors.append('Path escapes output');continue
                if target.is_dir():target=target/'index.html'
            else:target=path
            if not target.exists():errors.append(f'{path.relative_to(root.resolve())}: missing {url}');continue
            if parsed.fragment and target in pages and unquote(parsed.fragment)not in pages[target].ids:errors.append(f'Missing fragment {url}')
    if errors:raise ValueError('\n'.join(errors[:50]))
    return {'html_files':len(pages),'local_and_external_links_checked':link_count,'errors':0,'note':'Structural checks, not full WCAG or browser verification.'}
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--directory',default='dist');p.add_argument('--base',default='');a=p.parse_args();print(json.dumps(check_site(a.directory,a.base)))
