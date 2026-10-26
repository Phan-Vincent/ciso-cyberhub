"""Working with AI: skills, token savings, context savers, staying on track, and
organization/scope guidelines. Sourced; reviewed every 90 days like the other AI guides.
"""
from __future__ import annotations

from .guides import _prompt, _review_badge, _sources, _toc


def workflow_page(site) -> str:
    toc = [('why', 'Why context is everything'), ('skills', 'Build a skill'), ('tokens', 'Save tokens'), ('saver', 'The context saver'),
           ('track', 'Keep AI on track'), ('org', 'Teach AI your organization'), ('scope', 'Scope fences'), ('kit', 'Starter kit')]
    body = site.heading('Working with AI: skills, tokens and context', 'Make AI cheaper, sharper and consistent. Package what it should know as skills, keep its memory small and useful, and give it your organization\'s rules once instead of every time.', 'AI / Workflow guide')
    body += _review_badge()
    body += '<div class="guide">' + _toc(toc) + '<article class="guide-body">'

    body += ('<section id="why"><h2><span class="label">01</span>Why context is everything</h2>'
             '<p>An AI model only knows what is in its <b>context window</b>: your instructions, the conversation so far, files it read and tool output. Every message re-sends that context, so it drives both <b>cost</b> and <b>quality</b>.</p>'
             '<div class="flags">'
             '<div class="flag"><b>Bigger is not better</b><p>Chroma\'s 2025 "context rot" study of 18 models found reliability drops as input grows, even on simple tasks. Less, better context wins.</p></div>'
             '<div class="flag"><b>You pay for history</b><p>A one-line question in a long chat still sends the whole conversation. Clearing between unrelated tasks is the biggest saving.</p></div>'
             '<div class="flag"><b>Write it down once</b><p>Rules you repeat in every chat belong in an instructions file or a skill, loaded automatically.</p></div></div></section>')

    body += ('<section id="skills"><h2><span class="label">02</span>Build a skill</h2>'
             '<p><b>Agent Skills</b> are an open format, created by Anthropic and adopted by many agent tools: a folder with a <code>SKILL.md</code> file of instructions, plus optional scripts, references and templates. The agent only sees each skill\'s name and description until a task matches, then loads the rest. You can keep dozens of skills on hand for almost no context cost.</p>'
             '<ol class="steps"><li><b>Pick a repeated task.</b> Something you explain to AI more than twice: a report format, a review checklist, log triage.</li>'
             '<li><b>Write the description first.</b> It decides when the skill is used. Say what it does and when to use it, with the words people actually type.</li>'
             '<li><b>Write the steps.</b> Numbered, specific, with the output format. Keep <code>SKILL.md</code> under about 500 lines; move long reference material to <code>references/</code>.</li>'
             '<li><b>Add scripts for exact work.</b> Anything that must be identical every time (parsing, formatting, calculations) is better as a script the skill runs.</li>'
             '<li><b>Test it on real tasks</b> and tighten the description if it fires too often or not at all.</li></ol>'
             '<pre class="tree" aria-label="Skill folder layout">log-triage/\n├── SKILL.md          required: name, description, instructions\n├── scripts/          optional: code the agent can run\n├── references/       optional: docs loaded only when needed\n└── assets/           optional: templates</pre>'
             + _prompt('SKILL.md template', '''---
name: log-triage
description: Triage Linux auth and web server logs for signs of brute force, new admin logins and suspicious IPs. Use when the user shares log files or asks "what happened on this server".
---

# Log triage

## Steps
1. Identify the log type from the first lines (auth.log, access.log, syslog).
2. Count failed vs successful logins per source IP; list the top 5.
3. Flag: successful login after many failures, logins at unusual hours, new users added.
4. Never run commands on production systems; analyze only what was provided.

## Output
- Summary (3 lines)
- Table: IP | failures | successes | first seen | verdict
- Next steps for the analyst

## Reference
See references/known-good-ips.md before flagging internal addresses.''', 'sk-1')
             + '<p class="muted">Rules from the spec: <code>name</code> up to 64 characters, lowercase letters, numbers and hyphens, matching the folder name. <code>description</code> up to 1,024 characters. In Claude Code, project skills live in <code>.claude/skills/</code> and personal ones in <code>~/.claude/skills/</code>; other tools document their own folder.</p></section>')

    body += ('<section id="tokens"><h2><span class="label">03</span>Save tokens (and money)</h2><div class="flags">'
             + ''.join(f'<div class="flag"><b>{t}</b><p>{d}</p></div>' for t, d in [
                 ('Clear between tasks', 'Start a fresh chat or run /clear when you switch topics. Old context costs tokens on every message and distracts the model.'),
                 ('Be specific', '"Add input validation to login() in auth.ts" reads one file. "Improve this codebase" reads everything.'),
                 ('Right model, right effort', 'Use smaller, faster models and lower reasoning effort for simple edits. Save the largest model for hard design questions.'),
                 ('Keep instructions lean', 'An always-loaded file (CLAUDE.md, AGENTS.md) is paid for in every request. Keep it short, around 200 lines, and move specialized workflows into skills that load on demand.'),
                 ('Point, do not paste', 'Give file paths or the relevant 30 lines instead of pasting whole files and logs.'),
                 ('Filter noisy output', 'Ask for failing tests only, or grep logs first. Hooks and scripts can trim output before the model reads it.'),
                 ('Delegate heavy reading', 'Subagents can read long docs or logs in their own context and hand back a summary.'),
                 ('Reuse the cache', 'Providers cache a repeated prompt prefix. On Claude, cache reads cost a small fraction of normal input (0.1× base on most models). Keep the start of long prompts stable.'),
                 ('Ask for short answers', 'Say "answer in five bullets" or "diff only". Output tokens usually cost more than input.')])
             + '</div><p class="muted">In Claude Code, <code>/usage</code> shows what a session costs and <code>/context</code> shows what fills the window. <code>/compact</code> summarizes a long conversation; <code>/clear</code> starts fresh at no cost.</p></section>')

    body += ('<section id="saver"><h2><span class="label">04</span>The context saver</h2>'
             '<p>Long projects outlive any single chat. A <b>context saver</b> is a short file the AI keeps up to date so that you, a teammate or a fresh session can continue without re-explaining everything. CyberHub itself is built this way: <code>docs/HANDOFF.md</code> in the repo is ours.</p>'
             + _prompt('HANDOFF.md template', '''# Handoff: <project>  (updated YYYY-MM-DD)

## Goal
One paragraph: what we are building, for whom, and what "done" looks like.

## Decisions (and why)
- Chose X over Y because ...
- Do not change Z: <reason>

## Current state
- Working: ...
- In progress: ...
- Broken or unknown: ...

## Next steps (in order)
1. ...
2. ...

## Gotchas
- Commands that must be run, environment quirks, things that look wrong but are intentional.

## Links
Repo, docs, designs, tickets.''', 'cs-1')
             + _prompt('Ask the AI to update it', '''Before we stop: update docs/HANDOFF.md. Keep it under 80 lines.
Record decisions with their reasons, what changed today, what is broken, and the
exact next three steps. Remove anything no longer true. Do not paste code.''', 'cs-2')
             + _prompt('Start a new session from it', '''Read docs/HANDOFF.md first. Summarize the goal and the next step in three lines
and ask me anything unclear before changing files.''', 'cs-3')
             + '<p class="muted">Tip: a custom compaction instruction like <code>/compact keep decisions, file paths and failing tests</code> keeps the right details when a long chat is summarized.</p></section>')

    body += ('<section id="track"><h2><span class="label">05</span>Keep AI on track</h2><ol class="steps">'
             '<li><b>Plan before code.</b> Ask for a short plan and the files it will touch. Approve or correct the plan. Many tools have a plan mode for this.</li>'
             '<li><b>Define done.</b> Give acceptance criteria: tests that must pass, the output format, a screenshot to match.</li>'
             '<li><b>One task per request.</b> Small steps are easy to check and cheap to undo.</li>'
             '<li><b>Make it verify.</b> "Run the tests and show me the output" catches mistakes before you do.</li>'
             '<li><b>Checkpoint.</b> Commit after each green step; rewind or restore when a turn goes wrong.</li>'
             '<li><b>Stop early.</b> Interrupt as soon as it heads the wrong way. Course-correcting late wastes the most tokens.</li>'
             '<li><b>Let it ask.</b> "If anything is ambiguous, ask me up to three questions first" prevents confident guesses.</li></ol>'
             + _prompt('A task prompt that stays on track', '''Task: <one sentence>
Context: <files, links, constraints>
Done means: <tests pass / output looks like X / no new dependencies>
Out of scope: <what not to touch>
First show a 5-bullet plan and wait for my OK. After each step, run the checks and report results honestly.''', 'tr-1') + '</section>')

    body += ('<section id="org"><h2><span class="label">06</span>Teach AI your organization</h2>'
             '<p>Write your organization\'s context once, in a file the AI loads automatically: <code>AGENTS.md</code> (the cross-tool standard), <code>CLAUDE.md</code> for Claude Code, project instructions in chat apps, or a shared skill. Keep it short, specific and in version control so changes are reviewed.</p>'
             '<div class="flags">'
             + ''.join(f'<div class="flag"><b>{t}</b><p>{d}</p></div>' for t, d in [
                 ('Who we are', 'One paragraph: mission, audience, what you produce.'),
                 ('Voice and format', 'Tone, spelling, banned phrases, preferred structure, with one short example of "good".'),
                 ('Glossary', 'Your acronyms and names: what CISO, CCDC or "the lab" mean here.'),
                 ('Sources of truth', 'Where facts come from: official site, policies, data files. "If it is not there, say you do not know."'),
                 ('Rules', 'Privacy, security and approvals: never share member data, never publish without review.'),
                 ('Layers', 'Global defaults, then project files, then folder-specific notes. The most specific wins.')])
             + '</div>'
             + _prompt('Organization guide template (AGENTS.md or project instructions)', '''# About us
CISO (Cyber Intelligence & Security Organization) is a student club at Cal State San Bernardino.
We build CyberHub, a free security-learning site for students of every level.

# Audience
Students from first-years with no IT background to seniors preparing for Security+.

# Voice
Plain, encouraging, precise. American English. Short sentences. No hype, no hacker cliches.

# Glossary
CISO = our club (not the job title). CCDC/NCL = competitions we enter. KEV = CISA Known Exploited Vulnerabilities.

# Sources of truth
Club facts: https://www.ciso-csusb.org/. Course content: data/academy.json. If unsure, ask; never invent.

# Rules
- Never include member names, emails or grades.
- Every statistic needs a source link. Offensive techniques: legal, authorized contexts only.
- Changes go through a pull request; do not push to main.''', 'org-1') + '</section>')

    body += ('<section id="scope"><h2><span class="label">07</span>Scope fences</h2><p>Most "AI went off the rails" moments are scope problems. Fence the work explicitly:</p>'
             '<table class="guide-table"><thead><tr><th>Fence</th><th>Example</th></tr></thead><tbody>'
             '<tr><td>In scope</td><td>"Only the files in web/ and hub/play.py."</td></tr>'
             '<tr><td>Out of scope</td><td>"Do not touch workflows, dependencies or the design tokens."</td></tr>'
             '<tr><td>Stop conditions</td><td>"If a change needs a new package or touches auth, stop and ask."</td></tr>'
             '<tr><td>Budget</td><td>"Keep this under 3 files and one commit."</td></tr>'
             '<tr><td>Definition of done</td><td>"Tests pass, the page works at 390 px wide, no console errors."</td></tr></tbody></table></section>')

    body += ('<section id="kit"><h2><span class="label">08</span>Starter kit</h2><ul class="ticks">'
             '<li><b>AGENTS.md / CLAUDE.md:</b> who you are, commands, rules, scope. Under 200 lines.</li>'
             '<li><b>docs/HANDOFF.md:</b> the context saver, updated at the end of every session.</li>'
             '<li><b>Skills folder:</b> one skill per repeated workflow, each with a sharp description.</li>'
             '<li><b>A habit:</b> plan, small step, verify, commit, clear.</li></ul>'
             f'<p>Next: {site.a("Secure AI coding cheat sheet", "/ai/vibe-coding/")} · {site.a("Meta-prompting guide", "/ai/meta-prompting/")} · {site.a("Run AI locally", "/ai/local/")}</p></section>')
    body += '</article></div>'
    body += _sources([
        ('Agent Skills: overview and specification (open standard, created by Anthropic)', 'https://agentskills.io', ''),
        ('Microsoft Agent Framework: Agent Skills (format constraints, progressive disclosure)', 'https://learn.microsoft.com/en-us/agent-framework/agents/skills', ''),
        ('Claude Code: Manage costs effectively', 'https://code.claude.com/docs/en/costs', 'checked 2026-10-24'),
        ('Claude: Prompt caching (pricing multipliers)', 'https://platform.claude.com/docs/en/build-with-claude/prompt-caching', 'checked 2026-10-24'),
        ('Chroma: Context Rot', 'https://trychroma.com/research/context-rot', 'July 2025, 18 models'),
        ('AGENTS.md as an open standard', 'https://codex.danielvaughan.com/2026/04/07/agents-md-open-standard-cross-tool-portability', 'Apr 2026'),
    ])
    return body


def build_aiflow(site) -> None:
    site.page('/ai/workflow/', 'Working with AI: skills, tokens and context', workflow_page(site), 'Build AI skills, save tokens, keep a context saver, keep AI on track and teach it your organization\'s rules.', 'Resources', module='play')
