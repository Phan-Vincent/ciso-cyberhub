"""Resume tailor page (/careers/resume/). Runs entirely in the browser (web/resume.ts).
This page alone allows connections to the user's own Ollama on localhost for optional
local-AI tailoring; nothing is sent anywhere else.
"""
from __future__ import annotations

import json
from html import escape as E

from .common import ROOT, read_json
from .guides import _prompt

# Extra CSP for this page only: the visitor's own local Ollama.
CSP_CONNECT = "http://localhost:11434 http://127.0.0.1:11434"


def write_assets(site) -> None:
    p = ROOT / 'data/internships.json'
    items = read_json(p)['items'] if p.exists() else []
    slim = [{k: i[k] for k in ('id', 'company', 'title', 'url', 'city')} for i in items]
    (site.out / 'assets/internships.json').write_text(json.dumps(slim, ensure_ascii=False, separators=(',', ':')))


def resume_page(site) -> str:
    a = site.a
    body = site.heading('Resume tailor', 'Match your resume to an internship posting: see which skills line up, what is missing and how to sharpen your bullets. Then let AI tailor your resume or write a cover letter, without inventing anything.', 'Careers / Resume tailor')
    body += ('<p class="guide-meta label"><span class="dot" aria-hidden="true"></span>Private by design: your resume stays in this browser tab. Nothing is uploaded or stored by CyberHub.</p>'
             '<div class="tailor" id="tailor">'
             '<section class="rt-step"><h2><span class="label">01</span>Your resume</h2>'
             '<div class="rt-file"><label class="button" for="rt-file">Open .docx or .txt</label><input id="rt-file" type="file" accept=".docx,.txt,.md,text/plain" class="sr-only"><span class="label" id="rt-file-status">Or paste the text below. For a PDF, open it, select all and paste.</span></div>'
             '<label class="sr-only" for="rt-resume">Resume text</label><textarea id="rt-resume" rows="14" placeholder="Paste your resume text here"></textarea>'
             '<label class="rt-remember"><input type="checkbox" id="rt-remember"> Remember my resume on this device (saved only in this browser)</label></section>'
             '<section class="rt-step"><h2><span class="label">02</span>The internship</h2>'
             f'<p>Pick one from the {a("internship scanner", "/careers/internships/")} (use "Tailor my resume" on any listing) or paste any posting.</p>'
             '<label for="rt-target" class="label">Role and company</label><input id="rt-target" type="text" placeholder="e.g. Security Analyst Intern at Acme (Irvine)">'
             '<a id="rt-posting" class="rt-posting" href="#" rel="noopener" hidden></a>'
             '<label class="sr-only" for="rt-job">Job posting text</label><textarea id="rt-job" rows="10" placeholder="Paste the full job description: responsibilities, requirements, nice-to-haves"></textarea></section>'
             '<section class="rt-step"><h2><span class="label">03</span>Match</h2><div class="rt-actions"><button type="button" class="primary" id="rt-analyze">Check my match</button><button type="button" id="rt-clear">Clear everything</button><span class="label" id="rt-msg" role="status"></span></div></section>'
             '<section class="rt-out" id="rt-out" hidden aria-live="polite"><div class="rt-score-row"><div class="rt-ring" id="rt-ring"><strong id="rt-score">0</strong><span class="label">match</span></div><p id="rt-verdict" class="rt-verdict"></p></div>'
             '<div class="rt-cols"><div><h3>Skills you already show</h3><div class="job-tags" id="rt-matched"></div></div><div><h3>In the posting, not in your resume</h3><div class="job-tags" id="rt-missing"></div>'
             '<p class="muted">Only add a skill if it is true. Otherwise build it: a Linux Lab module, a lab or a small project is a real bullet within a week.</p></div></div>'
             '<h3>Resume checks</h3><ul class="rt-checks" id="rt-checks"></ul>'
             '<div id="rt-weak-box" hidden><h3>Bullets to strengthen</h3><p class="muted">Start with what you did, then the result: "Built…, cutting… by 30%".</p><ul class="rt-weak" id="rt-weak"></ul></div>'
             '<h3 id="rt-tailor-h">04 / Tailor it with AI</h3>'
             '<fieldset class="rt-mode"><legend class="label">What should AI write?</legend>'
             '<label><input type="radio" name="rt-mode" value="resume" checked> Tailored resume</label>'
             '<label><input type="radio" name="rt-mode" value="cover"> Cover letter</label></fieldset>'
             '<p class="muted">Both use the same rules: only facts from your resume, nothing invented. The cover letter marks anything it cannot know as [PLACEHOLDER] for you to fill in.</p><div class="rt-ai"><article class="rt-ai-card"><p class="label">Option A / Any AI assistant</p><h4>Copy the tailoring prompt</h4>'
             '<p>Paste it into Claude, ChatGPT, Gemini or Copilot to get a <span id="rt-mode-what">tailored resume</span>. It includes your resume, the posting, the skills match and strict rules against invented experience.</p>'
             '<button type="button" class="primary" id="rt-copy">Copy prompt</button><details class="rt-prompt-box"><summary>See the prompt</summary><pre id="rt-prompt"></pre></details>'
             '<p class="muted">This sends your resume to that AI service. Remove your phone number and address first if you prefer.</p></article>'
             '<article class="rt-ai-card"><p class="label">Option B / Fully private</p><h4>Tailor with AI on your own computer</h4>'
             f'<p>Uses Ollama running on your machine. Your resume never leaves it. New to local AI? {a("Set it up in 10 minutes →", "/ai/local/")}</p>'
             '<div class="rt-actions"><button type="button" id="rt-local-check">Connect to Ollama</button><label class="sr-only" for="rt-model">Model</label><select id="rt-model"></select>'
             '<button type="button" class="primary" id="rt-local-run" disabled>Tailor locally</button></div><p class="label" id="rt-local-status" role="status"></p>'
             '<pre class="rt-local-out" id="rt-local-out" hidden></pre><button type="button" id="rt-download" hidden>Download as Markdown</button>'
             '<details class="rt-setup"><summary>One-time setup: let this page talk to Ollama</summary>'
             '<p>Ollama only accepts requests from websites you allow. Add this site once, then restart Ollama:</p>'
             + _prompt('Windows (PowerShell)', 'setx OLLAMA_ORIGINS "https://phan-vincent.github.io"\n# Quit Ollama from the tray icon, then start it again', 'o-win')
             + _prompt('macOS (Terminal)', 'launchctl setenv OLLAMA_ORIGINS "https://phan-vincent.github.io"\n# Quit Ollama from the menu bar, then open it again', 'o-mac')
             + _prompt('Linux (systemd)', 'sudo systemctl edit ollama\n# add these two lines, save:\n[Service]\nEnvironment="OLLAMA_ORIGINS=https://phan-vincent.github.io"\nsudo systemctl restart ollama', 'o-linux')
             + '<p class="muted">Your browser may also ask permission for this site to connect to apps on your device. Allow it for this page. Safari may block it; use Chrome, Edge or Firefox.</p></details></article></div>'
             '</section></div>'
             '<section class="rt-tips"><h2>What recruiters notice first</h2><div class="flags">'
             + ''.join(f'<div class="flag"><b>{t}</b><p>{d}</p></div>' for t, d in [
                 ('Projects beat coursework', 'A home lab, CTF write-up or GitHub project shows you can do the work. Name the tools and the result.'),
                 ('Numbers make it real', '"Triaged 40+ alerts a week" or "cut setup time from 2 hours to 15 minutes" is remembered.'),
                 ('Match the language, honestly', 'If the posting says "SIEM" and you used Splunk, write "Splunk (SIEM)". Never claim what you have not done.'),
                 ('One page, clean format', 'Simple layout, standard headings and no images or tables, so applicant-tracking systems can read it.'),
                 ('Clubs count', 'CISO projects, CCDC, NCL and officer roles are leadership and hands-on experience. List them.'),
                 ('Tailor every application', 'Ten tailored applications beat a hundred generic ones. That is what this page is for.')])
             + f'</div><p>{a("Find internships near CSUSB →", "/careers/internships/", "button primary")} {a("Find your role →", "/careers/match/", "button")}</p></section>')
    return body


def build_resume(site) -> None:
    write_assets(site)
    site.page('/careers/resume/', 'Resume tailor', resume_page(site), 'Match your resume to an internship posting privately in your browser, then tailor it or write a cover letter with AI, without inventing experience.', 'Careers', module='resume')
