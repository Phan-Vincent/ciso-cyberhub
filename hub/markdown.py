"""Deliberately small Markdown: headings, paragraphs, lists, code, links, emphasis.
Raw HTML, MDX and executable components are never interpreted.
"""
import html
import re
from .common import safe_url

def inline(text, base=''):
    text=text.replace('\x00','')
    tokens=[]
    def token(value):
        tokens.append(value); return f'\x00{len(tokens)-1}\x00'
    text=re.sub(r'`([^`]+)`',lambda m: token('<code>'+html.escape(m[1])+'</code>'),text)
    def link(m):
        label,url=m[1],m[2]
        if url.startswith('/') and not url.startswith('//') and '\\' not in url:
            if any(part in ('.', '..') for part in url.split('?', 1)[0].split('#', 1)[0].split('/')): return label
            url=base+url
        else:
            try: safe_url(url)
            except ValueError: return label
        return token(f'<a href="{html.escape(url,quote=True)}">{html.escape(label)}</a>')
    text=re.sub(r'\[([^\]]+)\]\(([^\s)]+)\)',link,text)
    text=html.escape(text)
    text=re.sub(r'\*\*([^*]+)\*\*',r'<strong>\1</strong>',text)
    for _ in range(2):
        text=re.sub(r'\x00(\d+)\x00',lambda m:tokens[int(m[1])],text)
    return text

def render(text, base=''):
    out=[]; paragraph=[]; code=None; listing=None
    def flush():
        if paragraph: out.append('<p>'+inline(' '.join(paragraph),base)+'</p>');paragraph.clear()
    for line in text.splitlines()+['']:
        if line.startswith('```'):
            flush()
            if listing:out.append(f'</{listing}>');listing=None
            if code is None:code=[]
            else:out.append('<pre><code>'+html.escape('\n'.join(code))+'</code></pre>');code=None
            continue
        if code is not None:code.append(line);continue
        heading=re.match(r'^(#{1,6}) (.+)$',line)
        ul_bullet=re.match(r'^- (.+)$',line)
        ol_bullet=re.match(r'^\d+\. (.+)$',line)
        list_tag='ul' if ul_bullet else ('ol' if ol_bullet else None)
        if listing and listing!=list_tag:out.append(f'</{listing}>');listing=None
        if heading:
            flush(); level=min(6,max(2,len(heading[1])))
            out.append(f'<h{level}>'+inline(heading[2],base)+f'</h{level}>')
        elif list_tag:
            flush()
            if not listing:out.append(f'<{list_tag}>');listing=list_tag
            out.append('<li>'+inline((ul_bullet or ol_bullet)[1],base)+'</li>')
        elif line.strip():paragraph.append(line)
        else:flush()
    if code is not None:raise ValueError('Unclosed code fence')
    return '\n'.join(out)
