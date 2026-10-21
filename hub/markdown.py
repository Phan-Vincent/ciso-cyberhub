"""Deliberately small Markdown: headings, paragraphs, lists, code, links, emphasis.
Raw HTML, MDX and executable components are never interpreted.
"""
import html
import re
from .common import safe_url

def inline(text, base=''):
    tokens=[]
    def token(value):
        tokens.append(value); return f'\x00{len(tokens)-1}\x00'
    text=re.sub(r'`([^`]+)`',lambda m: token('<code>'+html.escape(m[1])+'</code>'),text)
    def link(m):
        label,url=m[1],m[2]
        if url.startswith('/') and not url.startswith('//') and '\\' not in url:
            url=base+url
        else:
            try: safe_url(url)
            except ValueError: return label
        return token(f'<a href="{html.escape(url,quote=True)}">{html.escape(label)}</a>')
    text=re.sub(r'\[([^\]]+)\]\(([^\s)]+)\)',link,text)
    text=html.escape(text)
    text=re.sub(r'\*\*([^*]+)\*\*',r'<strong>\1</strong>',text)
    return re.sub(r'\x00(\d+)\x00',lambda m:tokens[int(m[1])],text)

def render(text, base=''):
    out=[]; paragraph=[]; code=None; listing=False
    def flush():
        if paragraph: out.append('<p>'+inline(' '.join(paragraph),base)+'</p>');paragraph.clear()
    for line in text.splitlines()+['']:
        if line.startswith('```'):
            flush()
            if listing:out.append('</ul>');listing=False
            if code is None:code=[]
            else:out.append('<pre><code>'+html.escape('\n'.join(code))+'</code></pre>');code=None
            continue
        if code is not None:code.append(line);continue
        heading=re.match(r'^(#{1,6}) (.+)$',line)
        bullet=re.match(r'^(?:- |\d+\. )(.+)$',line)
        if not bullet and listing:out.append('</ul>');listing=False
        if heading:
            flush(); level=min(6,len(heading[1])+1)
            out.append(f'<h{level}>'+inline(heading[2],base)+f'</h{level}>')
        elif bullet:
            flush()
            if not listing:out.append('<ul>');listing=True
            out.append('<li>'+inline(bullet[1],base)+'</li>')
        elif line.strip():paragraph.append(line)
        else:flush()
    if code is not None:raise ValueError('Unclosed code fence')
    return '\n'.join(out)
