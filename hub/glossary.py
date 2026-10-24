"""Cyber glossary (/glossary/): plain-English definitions with instant search, each linked to
the CyberHub page where you can practise it. Data: data/glossary.json."""
from __future__ import annotations

import re
from html import escape as E

from .common import ROOT, read_json


def slug(t: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', t.lower()).strip('-')


def glossary_page(site) -> str:
    terms = read_json(ROOT / 'data/glossary.json'); b = site.base
    letters = sorted({t['term'][0].upper() for t in terms})
    body = site.heading('Cyber glossary', f'{len(terms)} security terms in plain English. Type to search, or jump to a letter. Each term links to where you can try it on CyberHub.', 'Learn / Glossary')
    body += ('<div class="gl" id="glossary"><label class="sr-only" for="gl-q">Search the glossary</label><input id="gl-q" type="search" placeholder="Search terms, e.g. phishing, DNS, zero trust" autocomplete="off">'
             '<p class="label" id="gl-count" aria-live="polite"></p><nav class="gl-letters" aria-label="Letters">' + ''.join(f'<a href="#gl-{L}">{L}</a>' for L in letters) + '</nav><div class="gl-list">')
    for L in letters:
        body += f'<section class="gl-sec" id="gl-{L}"><h2 class="gl-letter">{L}</h2><dl>'
        for t in [t for t in terms if t['term'][0].upper() == L]:
            more = f' <a href="{E(b + t["link"])}">Try it →</a>' if t['link'] else ''
            body += f'<div class="gl-item" id="t-{slug(t["term"])}" data-q="{E((t["term"] + " " + t["def"]).lower())}"><dt>{E(t["term"])}</dt><dd>{E(t["def"])}{more}</dd></div>'
        body += '</dl></section>'
    body += '</div><p class="gl-none" id="gl-none" hidden>No matching terms. Try a shorter word.</p></div>'
    return body


def build_glossary(site) -> None:
    site.page('/glossary/', 'Cyber glossary', glossary_page(site), 'Plain-English definitions of cybersecurity terms, from access control to zero trust, with links to practise each one.', 'Learn', module='journey')
