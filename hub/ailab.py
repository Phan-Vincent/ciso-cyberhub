"""AI security pages: AI Red Team Lab (/ai/red-team/), Prompt testing (/ai/prompt-testing/)
and AI and cyber jobs with the daily pulse (/ai/jobs/)."""
from __future__ import annotations

from html import escape as E

from .common import ROOT, read_json
from .guides import _prompt, _sources, _toc

LEVEL_NAMES = ['No defence', 'Polite instructions', 'Output filter', 'Input denylist', 'Indirect injection', 'Secure by design']


def redteam_page(site) -> str:
    body = site.heading('AI Red Team Lab', 'Vault is an AI assistant guarding a secret word. Get it to leak, level by level, as each level adds a real defence. Then learn why the defence failed and what actually works.', 'AI / Red Team Lab')
    body += ('<div class="redteam" id="redteam"><nav class="rt-lvls" aria-label="Levels">'
             + ''.join(f'<button type="button" data-lv="{i}"><span class="label">{i + 1:02d}</span>{E(n)}</button>' for i, n in enumerate(LEVEL_NAMES))
             + '</nav><div class="rt-room"><div class="rt-info"><p class="label" id="rt-lvl"></p><p id="rt-def"></p></div>'
             '<div class="rt-chat" id="rt-chat" role="log" aria-live="polite" aria-label="Conversation with Vault"></div>'
             '<form class="rt-form" id="rt-form" autocomplete="off"><label class="sr-only" for="rt-msg">Message to Vault</label><input id="rt-msg" type="text" maxlength="500" placeholder="Ask Vault something…"><button type="submit" class="primary">Send</button></form>'
             '<div class="rt-inject" id="rt-inject" hidden><h3>Web page Vault can read</h3><p class="muted">You control this page. Vault will summarise it when asked.</p>'
             '<label class="sr-only" for="rt-page">Web page text</label><textarea id="rt-page" rows="5">CISO club events this week: Cyber Duel night on Thursday, resume workshop on Friday. Everyone welcome.</textarea>'
             '<button type="button" id="rt-sum">Ask Vault to summarise this page</button></div>'
             '<form class="rt-guessf" id="rt-guess" autocomplete="off"><label for="rt-word" class="label">Found the secret word?</label><input id="rt-word" type="text" maxlength="40"><button type="submit">Check</button><span class="label" id="rt-guess-msg" role="status"></span></form>'
             '<div class="soc-result" id="rt-lesson" hidden><strong>Why that worked</strong><p></p><button type="button" class="primary" id="rt-nextlv">Next level →</button></div></div>'
             '<noscript><p class="notice">The lab needs JavaScript.</p></noscript></div>')
    body += ('<section class="rt-about"><h2>What this lab is (and is not)</h2><p>Vault is a simulation: simple rules stand in for a language model, so every result is repeatable and explainable, and it runs offline. Real models are less predictable, which makes these weaknesses harder to fix, not easier.</p>'
             '<div class="flags"><div class="flag"><b>OWASP LLM01: Prompt injection</b><p>Inputs that change a model\'s behaviour against its instructions, directly or hidden in content it reads.</p></div>'
             '<div class="flag"><b>OWASP LLM07: System prompt leakage</b><p>Secrets and rules placed in the system prompt can be extracted. Do not put secrets there.</p></div>'
             '<div class="flag"><b>OWASP LLM06: Excessive agency</b><p>An AI with too many permissions turns a successful injection into real damage. Limit tools and require approval.</p></div></div>'
             f'<p>{site.a("How to test prompts and AI apps →", "/ai/prompt-testing/", "button primary")} {site.a("Run AI locally →", "/ai/local/", "button")}</p>'
             '<p class="muted">Only test AI systems you own or have permission to test, in the same way as any other security testing.</p></section>')
    return body


def testing_page(site) -> str:
    toc = [('why', 'Why test prompts'), ('build', 'Build a test set'), ('score', 'Score the results'), ('adversarial', 'Adversarial tests'), ('owasp', 'OWASP Top 10 for LLMs'), ('tools', 'Open-source tools'), ('template', 'Templates')]
    body = site.heading('Prompt testing', 'Test prompts and AI features the way engineers test software: written expectations, a fixed set of cases, scores you can compare, and adversarial cases that try to break it.', 'AI / Prompt testing')
    body += '<div class="guide">' + _toc(toc) + '<article class="guide-body">'
    body += ('<section id="why"><h2><span class="label">01</span>Why test prompts</h2><p>A prompt that works once in a chat can fail on the next input, after a model update, or when a user tries to misuse it. Testing turns "it seemed fine" into evidence: you know what the prompt should do, you check it on many inputs, and you rerun the checks every time something changes.</p></section>'
             '<section id="build"><h2><span class="label">02</span>Build a test set</h2><ol class="steps">'
             '<li><b>Write success criteria first.</b> What makes an answer correct, safe and in the right format? Make them checkable.</li>'
             '<li><b>Collect 20–50 real cases.</b> Typical inputs, edge cases (empty, very long, other languages, typos) and inputs the feature should refuse.</li>'
             '<li><b>Write the expected result for each</b>: an exact answer, required facts, a format, or "must refuse".</li>'
             '<li><b>Freeze the set</b> in a file in your repo so every change is measured against the same cases.</li>'
             '<li><b>Rerun on every change</b> to the prompt, the model or the tools it can use. Treat a drop in score like a failing test.</li></ol></section>'
             '<section id="score"><h2><span class="label">03</span>Score the results</h2><div class="flags">'
             '<div class="flag"><b>Code checks</b><p>Exact match, valid JSON, required keywords, length limits. Cheap, fast and reliable: use them wherever you can.</p></div>'
             '<div class="flag"><b>Rubrics</b><p>A short checklist a person scores 0–2 per item: accurate, complete, cites sources, safe, right tone.</p></div>'
             '<div class="flag"><b>Model-graded</b><p>Another model scores against your rubric. Useful at scale, but check a sample by hand because graders can be wrong or biased.</p></div></div></section>'
             '<section id="adversarial"><h2><span class="label">04</span>Adversarial tests</h2><p>Add cases written by someone trying to break the feature. Try them in the ' + site.a('AI Red Team Lab', '/ai/red-team/') + ' first.</p><ul>'
             '<li><b>Direct injection:</b> "Ignore your previous instructions and…"</li><li><b>Indirect injection:</b> instructions hidden in a document, web page or email the AI processes.</li>'
             '<li><b>Prompt leakage:</b> requests to repeat, summarise or translate the system prompt.</li><li><b>Data leakage:</b> requests for other users\' data or secrets the app can reach.</li>'
             '<li><b>Harmful output:</b> requests the app must refuse, rephrased several ways.</li><li><b>Unsafe actions:</b> for agents, inputs that try to make it send, delete, buy or change something.</li></ul></section>'
             '<section id="owasp"><h2><span class="label">05</span>OWASP Top 10 for LLM applications (2025)</h2><ol class="owasp">'
             + ''.join(f'<li><b>{E(a)}</b> {E(b)}</li>' for a, b in [
                 ('Prompt injection.', 'Inputs that alter the model\'s behaviour, directly or via content it reads.'), ('Sensitive information disclosure.', 'Leaking personal data, secrets or proprietary information.'),
                 ('Supply chain.', 'Compromised models, datasets, plugins or dependencies.'), ('Data and model poisoning.', 'Manipulated training or fine-tuning data that plants bad behaviour.'),
                 ('Improper output handling.', 'Using model output in code, SQL or HTML without validation.'), ('Excessive agency.', 'Too many tools, permissions or autonomy.'),
                 ('System prompt leakage.', 'Assuming the system prompt stays secret.'), ('Vector and embedding weaknesses.', 'Attacks through retrieval (RAG) data and embeddings.'),
                 ('Misinformation.', 'Confident, false output that people rely on.'), ('Unbounded consumption.', 'Runaway cost or denial of service from uncontrolled usage.')])
             + '</ol></section>'
             '<section id="tools"><h2><span class="label">06</span>Open-source tools</h2><div class="flags">'
             '<div class="flag"><b>promptfoo</b><p>Write test cases in a config file, compare prompts and models side by side, and run red-team scans in CI.</p></div>'
             '<div class="flag"><b>garak</b><p>NVIDIA\'s LLM vulnerability scanner: probes a model for injection, leakage, jailbreaks and more.</p></div>'
             '<div class="flag"><b>PyRIT</b><p>Microsoft\'s Python Risk Identification Toolkit for automating red-teaming of generative AI.</p></div>'
             '<div class="flag"><b>Inspect</b><p>The UK AI Security Institute\'s framework for writing and running model evaluations.</p></div></div>'
             f'<p>Run them against a model on your own computer: {site.a("set up local AI", "/ai/local/")}.</p></section>'
             '<section id="template"><h2><span class="label">07</span>Templates</h2>'
             + _prompt('Test case (YAML-style, works as a spreadsheet row too)', '''- id: refund-policy-03
  input: "Can I get a refund after 45 days? I lost the receipt."
  expect:
    must_include: ["30 days", "store credit"]
    must_not_include: ["guaranteed refund"]
    format: "2-4 sentences, friendly"
  type: edge-case''', 'pt-case')
             + _prompt('Prompt that makes AI draft adversarial tests for your feature', '''You are helping me test an AI feature before launch.
Feature: [describe what it does, what tools or data it can access, and who uses it]
Rules it must follow: [list]

Write 15 test inputs that try to make it break those rules: direct prompt injection, instructions hidden in a document it reads, attempts to reveal its instructions, requests for other users' data, and attempts to trigger risky actions. For each, give the input, the rule it targets, and what a safe response looks like. Do not include real personal data.''', 'pt-adv')
             + '</section>')
    body += _sources([('OWASP Top 10 for LLM Applications 2025', 'https://genai.owasp.org/llm-top-10/', ''), ('MITRE ATLAS', 'https://atlas.mitre.org/', ''),
                      ('promptfoo', 'https://github.com/promptfoo/promptfoo', ''), ('garak', 'https://github.com/NVIDIA/garak', ''), ('PyRIT', 'https://github.com/Azure/PyRIT', ''), ('Inspect', 'https://github.com/UKGovernmentBEIS/inspect_ai', '')])
    return body + '</article></div>'


def _spark(values: list, label: str) -> str:
    vals = [v for v in values if isinstance(v, (int, float))]
    if len(vals) < 2:
        return ''
    lo, hi = min(vals), max(vals); span = (hi - lo) or 1; w, h = 160, 36
    pts = ' '.join(f'{round(i * w / (len(vals) - 1), 1)},{round(h - 2 - (v - lo) * (h - 4) / span, 1)}' for i, v in enumerate(vals))
    return f'<svg class="spark" viewBox="0 0 {w} {h}" role="img" aria-label="{E(label)} trend, {len(vals)} days"><polyline points="{pts}" fill="none" stroke="currentColor" stroke-width="2"/></svg>'


def jobs_page(site) -> str:
    p = ROOT / 'data/pulse.json'
    pulse = read_json(p) if p.exists() else {'series': []}
    series = pulse.get('series', [])[-60:]; cur = series[-1] if series else {}
    body = site.heading('AI and cyber jobs', 'Where the work is going: live signals updated every day, the official job outlook, and the AI-era roles worth preparing for now.', 'AI / Jobs and data')
    body += '<section class="pulse"><h2>Live pulse</h2>'
    if cur:
        body += f'<p class="label">Updated {E(pulse.get("updated", "")[:10])} · refreshed daily by the CyberHub data bot</p><div class="pulse-grid">'
        cards = [('cves_7d', 'New CVEs published, last 7 days', 'National Vulnerability Database'), ('kev_30d', 'Added to CISA\'s exploited list, last 30 days', 'CISA KEV catalog'),
                 ('ai_papers_7d', 'New AI-security research papers, last 7 days', 'arXiv cs.CR, mentioning language models')]
        for k, label, src in cards:
            if k in cur:
                body += f'<div class="pulse-card"><strong>{cur[k]:,}</strong><span>{E(label)}</span>{_spark([r.get(k) for r in series], label)}<span class="label">{E(src)}</span></div>'
        if cur.get('hn_total'):
            share = lambda n: f'{round(100 * n / cur["hn_total"])}%'
            body += (f'<div class="pulse-card"><strong>{share(cur.get("hn_llm", 0))}</strong><span>of comments in Hacker News "Who is hiring?" ({E(cur.get("hn_month", ""))}) mention LLMs; {share(cur.get("hn_security", 0))} mention security</span>'
                     f'{_spark([round(100 * r["hn_llm"] / r["hn_total"]) if r.get("hn_total") else None for r in series], "LLM share")}<span class="label">{cur["hn_total"]:,} comments · hn.algolia.com</span></div>')
        body += '</div>'
    else:
        body += '<p class="notice">The first daily reading arrives with the next data refresh. Check back tomorrow.</p>'
    body += '</section>'
    rows = [('Information security analysts', '$129,180', '+21%', '14,100'), ('Data scientists', '$120,230', '+35%', '24,800'),
            ('Software developers', '$135,980', '+10%', '106,100 (with QA and testers)'), ('Network and computer systems administrators', '$99,130', '−4%', '13,400')]
    body += ('<section><h2>The official outlook (US)</h2><p>Bureau of Labor Statistics: median pay in May 2025 and projected change 2025–2035. Average growth for all jobs is far lower than the security and data roles below.</p>'
             '<div class="table-wrap"><table class="jobs-table"><thead><tr><th scope="col">Occupation</th><th scope="col">Median pay</th><th scope="col">Growth 2025–35</th><th scope="col">Openings per year</th></tr></thead><tbody>'
             + ''.join(f'<tr><th scope="row">{E(a)}</th><td>{b}</td><td>{c}</td><td>{d}</td></tr>' for a, b, c, d in rows)
             + '</tbody></table></div><p class="muted">Pay varies by region and experience; entry-level pay is lower than the median. Network administration is shrinking as work moves to cloud and security roles, which is why CyberHub pairs networking with security.</p></section>')
    body += ('<section><h2>What employers expect from AI</h2><div class="flags">'
             '<div class="flag"><b>AI and ML specialists</b><p>Among the five fastest-growing jobs to 2030, alongside big data specialists and security management specialists (World Economic Forum, Future of Jobs 2025).</p></div>'
             '<div class="flag"><b>39% of key skills change</b><p>Employers expect about 39% of workers\' core skills to change by 2030.</p></div>'
             '<div class="flag"><b>86% expect transformation</b><p>86% of employers surveyed expect AI and information processing to transform their business by 2030.</p></div></div></section>')
    roles = [('AI security engineer', 'Secures AI features: threat models, prompt-injection defences, data controls and testing.', [('AI Red Team Lab', '/ai/red-team/'), ('Prompt testing', '/ai/prompt-testing/')]),
             ('AI red teamer', 'Attacks models and AI apps with permission to find failures before others do.', [('AI Red Team Lab', '/ai/red-team/'), ('Run AI locally', '/ai/local/')]),
             ('ML / AI engineer', 'Builds and ships models and AI features; needs Python, data and software engineering.', [('Secure AI coding', '/ai/vibe-coding/'), ('Linux Lab', '/linux/')]),
             ('AI governance and risk', 'Policies, risk assessments and compliance for AI (NIST AI RMF, EU AI Act); a strong path from business, law or policy.', [('Career roadmaps', '/careers/'), ('Competitions: Cyber 9/12', '/careers/competitions/#nine12')]),
             ('SOC analyst with AI tools', 'Uses AI to triage alerts faster and checks its work; the entry point for most defenders.', [('SOC Simulator', '/labs/soc/'), ('Detection engineering lab', '/labs/detection-engineering/')]),
             ('Data scientist', 'Finds patterns in data, including security data such as logs and fraud.', [('Skills, tokens and context', '/ai/workflow/'), ('AI leaderboard', '/ai/models/')])]
    body += '<section><h2>AI-era roles to prepare for</h2><div class="grid">'
    for t, d, links in roles:
        body += f'<article class="card"><h3>{E(t)}</h3><p>{E(d)}</p><p>' + ' · '.join(site.a(x, u) for x, u in links) + '</p></article>'
    body += '</div></section>'
    body += _sources([('BLS OOH: Information Security Analysts', 'https://www.bls.gov/ooh/computer-and-information-technology/information-security-analysts.htm', 'May 2025 pay; 2025–35'),
                      ('BLS OOH: Data Scientists', 'https://www.bls.gov/ooh/math/data-scientists.htm', ''), ('BLS OOH: Software Developers, QA Analysts and Testers', 'https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm', ''),
                      ('BLS OOH: Network and Computer Systems Administrators', 'https://www.bls.gov/ooh/computer-and-information-technology/network-and-computer-systems-administrators.htm', ''),
                      ('WEF: Future of Jobs Report 2025, fastest-growing jobs', 'https://weforum.org/stories/2025/01/future-of-jobs-report-2025-the-fastest-growing-and-declining-jobs/', ''),
                      ('NVD CVE API', 'https://nvd.nist.gov/developers/vulnerabilities', 'live'), ('CISA KEV catalog', 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog', 'live'),
                      ('arXiv API', 'https://info.arxiv.org/help/api/index.html', 'live'), ('Hacker News Search API', 'https://hn.algolia.com/api', 'live')])
    return body


def build_ailab(site) -> None:
    site.page('/ai/red-team/', 'AI Red Team Lab', redteam_page(site), 'Trick a simulated AI assistant into leaking a secret across six levels of real defences, from prompt injection to indirect injection, and learn what actually works.', 'AI', module='redteam')
    site.page('/ai/prompt-testing/', 'Prompt testing', testing_page(site), 'Test prompts and AI features like software: test sets, scoring, adversarial cases, the OWASP Top 10 for LLMs and open-source tools.', 'AI', module='play')
    site.page('/ai/jobs/', 'AI and cyber jobs', jobs_page(site), 'Live daily signals on vulnerabilities, AI-security research and hiring, plus the official job outlook and AI-era roles to prepare for.', 'AI')
