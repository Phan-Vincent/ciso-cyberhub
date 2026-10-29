"""Fictional, connected incident investigation."""
import json
from html import escape as E
from .common import ROOT, read_json


def build_capstone(site):
    case = read_json(ROOT / 'data/capstone.json')
    body = site.heading('Capstone: The VPN update',
                        'Follow one fictional incident from an email through a Windows laptop, network flows and Active Directory. Then write the incident report.',
                        'Labs / Capstone')
    body += '<p class="label">Advanced · 30–45 min · local progress · no account needed</p>'
    body += f'<p>{E(case["setting"])}</p>'
    body += '<p>Answer each stage from its evidence. Correct findings unlock the next stage. A wrong answer shows a hint and reduces that question’s points from 10 to 8.</p>'
    body += '<div class="capstone" id="capstone"><p id="cap-load-error" role="alert"></p>'
    for stage in case['stages']:
        body += (f'<section class="cap-stage card" id="{E(stage["id"])}">'
                 f'<h2>{E(stage["title"])}</h2><p>{E(stage["intro"])}</p>'
                 '<div class="cap-evidence" role="region" tabindex="0" aria-label="Evidence, scroll horizontally"><pre>')
        body += E('\n'.join(stage['evidence'])) + '</pre></div><div class="cap-questions"></div></section>'
    body += ('<section class="cap-stage card" id="cap-report"><h2>5. Incident write-up</h2>'
             '<p>Write what the evidence supports. The timeline is filled from your confirmed findings and stays editable. The report is not auto-graded.</p>'
             '<div class="cap-fields"></div><button type="button" class="primary" id="cap-submit">Submit write-up</button>'
             '<p id="cap-report-message" role="status"></p><div id="cap-result" hidden><h3>Your Markdown report</h3>'
             '<textarea id="cap-markdown" rows="18" readonly aria-label="Markdown incident report"></textarea>'
             '<p><button type="button" id="cap-copy">Copy report</button></p>'
             '<details id="cap-model"><summary>Compare with analyst notes</summary><div class="cap-model-text"></div></details></div></section>'
             '<noscript><p class="notice">The evidence is readable here, but questions, scoring and the write-up need JavaScript.</p></noscript></div>')
    site.page('/labs/capstone/', 'Capstone investigation', body,
              'Investigate a fictional phishing incident across email, endpoint, network and Active Directory evidence, then write a report.',
              'Labs', module='capstone')
    (site.out / 'assets/capstone.json').write_text(json.dumps(case, separators=(',', ':')), encoding='utf-8')
