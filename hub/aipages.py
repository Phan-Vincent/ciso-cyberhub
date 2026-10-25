"""Local AI setup guide (Ollama, every OS), AI model leaderboard, and trending
open-source security tools. Leaderboard snapshots carry their as-of date and source;
trending tools and open-weight models refresh weekly via hub/trending.py.
"""
from __future__ import annotations

from datetime import date
from html import escape as E

from .common import ROOT, read_json
from .guides import _prompt, _review_badge, _sources, _toc


def _num(n: int) -> str:
    return f'{n / 1_000_000:.1f}M' if n >= 1_000_000 else f'{n / 1000:.1f}k' if n >= 1000 else str(n)


# --------------------------------------------------------------------------- local AI
def local_page(site) -> str:
    toc = [('why', 'Why run AI locally'), ('hardware', 'Will my computer handle it?'), ('install', 'Install Ollama'), ('first', 'Your first model'),
           ('pick', 'Which model to pull'), ('commands', 'Everyday commands'), ('chat', 'A chat window'), ('code', 'Use it from code and tools'),
           ('secure', 'Keep it private and safe'), ('fix', 'Troubleshooting')]
    body = site.heading('Run AI on your own computer', 'A first-timer\'s guide to local models with Ollama on Windows, macOS and Linux. Private, free to run and works offline once downloaded.', 'AI / Local setup')
    body += _review_badge()
    body += '<div class="guide">' + _toc(toc) + '<article class="guide-body">'
    body += ('<section id="why"><h2><span class="label">01</span>Why run AI locally</h2><div class="flags">'
             + ''.join(f'<div class="flag"><b>{t}</b><p>{d}</p></div>' for t, d in [
                 ('Privacy', 'Prompts and files never leave your machine. Useful for logs, notes and anything you would not paste into a website.'),
                 ('Offline', 'Once a model is downloaded it works on a plane, in a lab network or during an outage.'),
                 ('Free to run', 'No subscription or per-token cost. You pay in disk space, memory and electricity.'),
                 ('Learn how it works', 'You see the moving parts: model files, sizes, quantisation, context windows and APIs.')])
             + '</div><p class="callout">Trade-off: local models are smaller than the frontier models on the leaderboard. They are great for summarizing, drafting, explaining and coding help, less so for the hardest reasoning.</p></section>')
    body += ('<section id="hardware"><h2><span class="label">02</span>Will my computer handle it?</h2>'
             '<p>The model has to fit in memory: your graphics card\'s VRAM if you have one, otherwise system RAM. Apple Silicon Macs share one pool of "unified memory", which works well. As a rough guide for the common 4-bit versions that Ollama downloads by default:</p>'
             '<table class="guide-table"><thead><tr><th>Your memory</th><th>Comfortable model size</th><th>Try</th></tr></thead><tbody>'
             '<tr><td>8 GB</td><td>1–4 billion parameters</td><td><code>gemma4:e2b</code>, <code>llama3.2:3b</code>, <code>qwen3.5:2b</code></td></tr>'
             '<tr><td>16 GB</td><td>7–12 billion</td><td><code>gemma4:e4b</code>, <code>qwen3.5:9b</code>, <code>deepseek-r1:8b</code></td></tr>'
             '<tr><td>32 GB</td><td>up to about 30 billion</td><td><code>gemma4:26b</code>, <code>qwen3.5:27b</code></td></tr>'
             '<tr><td>64 GB+ or a large GPU</td><td>70 billion and up</td><td><code>llama3.1:70b</code></td></tr></tbody></table>'
             '<p class="muted">Rule of thumb: a 4-bit model needs a little over half a gigabyte per billion parameters, plus room for the conversation. It still runs on CPU only, just slower. Disk: plan for 2–40 GB per model.</p></section>')
    tabs = [('win', 'Windows', [('Option A: one command in PowerShell', 'irm https://ollama.com/install.ps1 | iex'),
                               ('Option B: installer', '1. Download OllamaSetup.exe from https://ollama.com/download\n2. Run it and follow the prompts\n3. Open a NEW PowerShell or Terminal window')],
             'Windows 10 or 11. NVIDIA and AMD GPUs are used automatically when drivers are current. Ollama runs in the background with a tray icon.'),
            ('mac', 'macOS', [('Option A: Terminal', 'curl -fsSL https://ollama.com/install.sh | sh'),
                             ('Option B: app', '1. Download Ollama.dmg from https://ollama.com/download\n2. Drag Ollama to Applications and open it\n3. Allow it to install the command-line tool when asked')],
             'Apple Silicon (M1 or newer) runs models on the GPU through unified memory. Intel Macs work on CPU, slowly.'),
            ('linux', 'Linux', [('Install script', 'curl -fsSL https://ollama.com/install.sh | sh'),
                               ('Check the service', 'systemctl status ollama\nollama --version')],
             'The script installs a systemd service. For NVIDIA install the proprietary driver first; AMD needs ROCm-supported cards. Prefer to read scripts before piping them to a shell? Download it, read it, then run it.'),
            ('docker', 'Docker', [('CPU only', 'docker run -d -v ollama:/root/.ollama -p 127.0.0.1:11434:11434 --name ollama ollama/ollama'),
                                 ('NVIDIA GPU (needs NVIDIA Container Toolkit)', 'docker run -d --gpus=all -v ollama:/root/.ollama -p 127.0.0.1:11434:11434 --name ollama ollama/ollama'),
                                 ('Run a model inside the container', 'docker exec -it ollama ollama run gemma4:e4b')],
             'Binding to 127.0.0.1 keeps the API off your network. The named volume keeps downloaded models when the container is replaced.')]
    body += '<section id="install"><h2><span class="label">03</span>Install Ollama</h2><div class="os-tabs" role="tablist" aria-label="Operating system">'
    body += ''.join(f'<button type="button" role="tab" class="os-tab" id="tab-{k}" aria-controls="os-{k}" aria-selected="{"true" if i == 0 else "false"}" data-os="{k}">{n}</button>' for i, (k, n, _, _) in enumerate(tabs))
    body += '</div>'
    for i, (k, n, blocks, note) in enumerate(tabs):
        body += f'<div class="os-panel" id="os-{k}" role="tabpanel" aria-labelledby="tab-{k}"{" hidden" if i else ""}><h3>{n}</h3>' + ''.join(_prompt(t, c, f'i-{k}-{j}') for j, (t, c) in enumerate(blocks)) + f'<p class="muted">{E(note)}</p></div>'
    body += '<p>Check it worked in a new terminal: <code>ollama --version</code>. The app and service listen on <code>http://localhost:11434</code>.</p></section>'
    body += ('<section id="first"><h2><span class="label">04</span>Your first model</h2>'
             + _prompt('Download and chat', 'ollama run gemma4:e4b\n>>> Explain what a hash function is in three sentences.\n>>> /bye', 'f-1')
             + '<p><code>ollama run</code> downloads the model the first time (a few GB), then opens a chat. Type <code>/bye</code> to leave, <code>/?</code> for help. Running <code>ollama</code> on its own opens a menu that can also connect Ollama to coding tools.</p></section>')
    body += ('<section id="pick"><h2><span class="label">05</span>Which model to pull</h2><table class="guide-table"><thead><tr><th>Goal</th><th>Start with</th><th>Why</th></tr></thead><tbody>'
             '<tr><td>All-rounder</td><td><code>gemma4:e4b</code> or <code>gemma4:12b</code></td><td>Google\'s current open family: reasoning, coding and images</td></tr>'
             '<tr><td>Small laptop</td><td><code>llama3.2:3b</code> or <code>gemma4:e2b</code></td><td>Fast on 8 GB machines</td></tr>'
             '<tr><td>Step-by-step reasoning</td><td><code>deepseek-r1:8b</code></td><td>Shows its thinking before answering</td></tr>'
             '<tr><td>Coding help</td><td><code>qwen2.5-coder:7b</code></td><td>Trained for code completion and fixes</td></tr>'
             '<tr><td>Images and screenshots</td><td><code>qwen3.5:9b</code> or <code>gemma4</code></td><td>Multimodal: describe images, read screenshots</td></tr>'
             '<tr><td>Search your own notes</td><td><code>nomic-embed-text</code></td><td>Embedding model for local search and RAG</td></tr></tbody></table>'
             f'<p>See what the community is pulling on the {site.a("AI leaderboard", "/ai/models/")}.</p></section>')
    body += ('<section id="commands"><h2><span class="label">06</span>Everyday commands</h2><table class="guide-table"><thead><tr><th>Command</th><th>Does</th></tr></thead><tbody>'
             + ''.join(f'<tr><td><code>{c}</code></td><td>{d}</td></tr>' for c, d in [
                 ('ollama pull MODEL', 'Download or update a model without chatting'), ('ollama run MODEL', 'Chat (downloads first if needed)'), ('ollama list', 'Models on disk and their sizes'),
                 ('ollama ps', 'Loaded models, and whether they use GPU or CPU'), ('ollama stop MODEL', 'Unload a model to free memory'), ('ollama show MODEL', 'Parameters, context length, license'),
                 ('ollama rm MODEL', 'Delete a model and free the disk space'), ('ollama serve', 'Start the server by hand (Linux or headless use)')])
             + '</tbody></table></section>')
    body += ('<section id="chat"><h2><span class="label">07</span>A chat window instead of a terminal</h2><ul class="ticks">'
             '<li><b>Ollama app</b> (Windows, macOS): includes a simple chat window. Pick a model from the dropdown.</li>'
             '<li><b>Open WebUI</b>: a ChatGPT-style interface for your browser that talks to Ollama. Install with Docker or pip from its official docs and keep it on localhost.</li>'
             '<li><b>LM Studio</b>: a separate desktop app with its own model downloader, if you prefer clicking to typing.</li></ul></section>')
    body += ('<section id="code"><h2><span class="label">08</span>Use it from code and tools</h2>'
             + _prompt('REST API (any language)', 'curl http://localhost:11434/api/chat -d \'{\n  "model": "gemma4:e4b",\n  "messages": [{"role": "user", "content": "Summarize this log line: Failed password for root from 203.0.113.9"}],\n  "stream": false\n}\'', 'c-1')
             + _prompt('Python', 'pip install ollama\n\nfrom ollama import chat\nr = chat(model="gemma4:e4b", messages=[{"role": "user", "content": "What is a CVE?"}])\nprint(r.message.content)', 'c-2')
             + '<p>Coding agents can use local models too: <code>ollama launch</code> connects Ollama to supported tools such as Claude Code, Codex and OpenCode. Small local models are weaker at multi-step agent work than frontier models, so start with simple tasks.</p></section>')
    body += ('<section id="secure"><h2><span class="label">09</span>Keep it private and safe</h2><ul class="ticks">'
             '<li><b>Do not expose port 11434 to the internet.</b> The API has no login. By default it listens only on localhost; only change <code>OLLAMA_HOST</code> if you understand who can reach it.</li>'
             '<li><b>Download models from publishers you trust.</b> Model files are large binaries from the internet. Prefer official library models over random re-uploads.</li>'
             '<li><b>Avoid "uncensored" re-uploads</b> for anything serious. Safety tuning was removed and nobody vouches for what else changed.</li>'
             '<li><b>Treat output as a draft.</b> Local models make mistakes confidently. Check commands before you run them.</li>'
             '<li><b>Mind the data you feed it.</b> Local is private, but files you paste into a shared machine or a synced folder are not.</li></ul></section>')
    body += ('<section id="fix"><h2><span class="label">10</span>Troubleshooting</h2><div class="flags">'
             + ''.join(f'<div class="flag"><b>{t}</b><p>{d}</p></div>' for t, d in [
                 ('"ollama: command not found"', 'Open a new terminal after installing. On Windows sign out and back in if PATH still is not updated.'),
                 ('Very slow answers', 'Run ollama ps. If it says CPU, the model did not fit in GPU memory: pick a smaller size or close other apps.'),
                 ('Out of memory', 'Use a smaller model or tag (e2b, 3b, 7b). Long chats use more memory; start a new one.'),
                 ('Port 11434 already in use', 'Ollama is probably already running in the background. Check the tray icon or systemctl status ollama.'),
                 ('GPU not detected', 'Update the graphics driver. On Linux check nvidia-smi works first. In Docker, add --gpus=all with the NVIDIA toolkit.'),
                 ('Disk filling up', 'ollama list then ollama rm the models you no longer use.')])
             + '</div></section>')
    body += '</article></div>'
    body += _sources([('Ollama README (install, CLI, API)', 'https://github.com/ollama/ollama', 'checked 2026-10-24'), ('Ollama documentation', 'https://docs.ollama.com/', ''),
                      ('Ollama model library', 'https://ollama.com/library', ''), ('Ollama Docker image', 'https://hub.docker.com/r/ollama/ollama', '')])
    return body


# --------------------------------------------------------------------------- leaderboard
def models_page(site) -> str:
    lb = read_json(ROOT / 'data/ai_leaderboard.json')
    tr = read_json(ROOT / 'data/trending.json') if (ROOT / 'data/trending.json').exists() else {'models': [], 'generated_at': ''}
    fr = lb['frontier']
    top = max(r['score'] for r in fr['rows'])
    body = site.heading('AI leaderboard', 'Who leads right now: frontier models, the open-weight models you can download, and what people actually run at home.', 'AI / Leaderboard')
    body += '<div class="lb-callouts">' + ''.join(f'<div><span class="label">{E(c["label"])}</span><strong>{E(c["value"])}</strong><span>{E(c["detail"])}</span></div>' for c in fr['callouts']) + '</div>'
    body += (f'<section class="lb"><div class="lb-head"><h2>Frontier models</h2><p class="label">Snapshot {E(lb["as_of"])} · <a href="{E(fr["source"]["url"])}">{E(fr["source"]["name"])}</a> · {E(fr["source"]["metric"])}</p></div><ol class="lb-rows">')
    for i, r in enumerate(fr['rows']):
        open_w = r['license'] != 'Proprietary'
        body += (f'<li class="lb-row{" open" if open_w else ""}"><span class="lb-rank">{i + 1:02d}</span><span class="lb-name"><b>{E(r["model"])}</b><span class="label">{E(r["org"])}'
                 + (f' · {E(r["note"])}' if r.get('note') else '') + f'</span></span><span class="tag{" sec" if open_w else ""}">{E(r["license"])}</span>'
                 f'<span class="lb-bar" aria-hidden="true"><i class="w{round(r["score"] / top * 20)}"></i></span><span class="lb-score">{r["score"]:.1f}</span>'
                 f'<span class="lb-meta label">{E(r.get("context") or "–")} ctx · {E(r.get("price") or "–")}</span></li>')
    body += '</ol><p class="muted">Price is the blended cost per million tokens as listed by the source. Scores change as new results land; follow the source link for the live table.</p></section>'
    body += (f'<section class="lb"><div class="lb-head"><h2>Trending open-weight models</h2><p class="label">Updated daily · {E((tr.get("generated_at") or "")[:10])} · Hugging Face trending</p></div><ol class="lb-rows">')
    tmax = max([m['trending'] for m in tr['models']] or [1])
    for i, m in enumerate(tr['models']):
        body += (f'<li class="lb-row"><span class="lb-rank">{i + 1:02d}</span><span class="lb-name"><b><a href="{E(m["url"])}">{E(m["id"].split("/")[-1])}</a></b><span class="label">{E(m["org"])} · {E(m["task"])}</span></span>'
                 f'<span class="tag">{_num(m["downloads"])} downloads</span><span class="lb-bar" aria-hidden="true"><i class="w{max(1, round(m["trending"] / tmax * 20))}"></i></span>'
                 f'<span class="lb-score">{m["trending"]}</span><span class="lb-meta label">{_num(m["likes"])} likes · since {E(m["created"])}</span></li>')
    body += '</ol><p class="muted">Trending score reflects recent likes and downloads on Hugging Face. Re-uploads labeled "uncensored", "abliterated" or similar are filtered out. Trending is not an endorsement: check the license and publisher.</p></section>'
    loc = lb['local']
    body += (f'<section class="lb"><div class="lb-head"><h2>Most-run local models</h2><p class="label">Snapshot {E(lb["as_of"])} · <a href="{E(loc["source"]["url"])}">{E(loc["source"]["name"])}</a> · {E(loc["source"]["metric"])}</p></div>'
             '<div class="table-wrap"><table class="guide-table"><thead><tr><th>#</th><th>Model</th><th>By</th><th>Sizes</th><th>Pulls</th><th>Good for</th></tr></thead><tbody>'
             + ''.join(f'<tr><td>{i + 1:02d}</td><td><code>{E(r["model"])}</code></td><td>{E(r["org"])}</td><td>{E(r["sizes"])}</td><td>{E(r["pulls"])}</td><td>{E(r["use"])}</td></tr>' for i, r in enumerate(loc['rows']))
             + f'</tbody></table></div><p>{site.a("Set up local AI on your computer →", "/ai/local/", "button primary")}</p></section>')
    return body


# --------------------------------------------------------------------------- trending tools
def trending_page(site) -> str:
    tr = read_json(ROOT / 'data/trending.json')
    body = site.heading('Trending security tools', f'The ten fastest-rising open-source security projects on GitHub, created in the last {tr.get("window_days", 120)} days. Refreshed every week.', 'Tools / Trending')
    body += (f'<p class="guide-meta label"><span class="dot" aria-hidden="true"></span>Last refresh <time datetime="{E(tr["generated_at"][:10])}">{E(tr["generated_at"][:10])}</time> · {E(tr["sources"]["repos"])}</p>'
             '<p class="notice"><b>Trending is not vetted.</b> New projects can be brilliant, abandoned or unsafe. Read the code and license before running anything, use a VM for offensive tools, and only test systems you are authorized to test. Jailbreak kits, spam and re-uploads are filtered out automatically.</p>')
    for sp in tr.get('spotlight', []):
        owner, name = sp['name'].split('/', 1)
        note = f' ({E(sp["stars_note"])})' if sp.get('stars_note') else ''
        body += (f'<a class="trend-spot" href="{E(sp["url"])}" rel="noopener"><span class="label">Spotlight / {E(owner)}</span><strong>{E(name.upper())}</strong>'
                 f'<span class="ts-why">{E(sp["why"])}</span><span class="ts-stats"><b>{sp["stars"]:,}</b> stars{note} · {sp["forks"]:,} forks · {E(sp.get("license") or "license unknown")}</span>'
                 '<span class="ts-warn">Reverse engineering is legal for interoperability and research in many places, but check software licenses and only analyze apps you own or are authorized to test.</span></a>')
    body += '<ol class="trend-list">'
    for i, r in enumerate(tr['repos']):
        owner, name = r['name'].split('/', 1)
        gain = f'<span class="tag new">+{r["gain"]:,} this week</span>' if r.get('gain') else ''
        body += (f'<li class="trend"><span class="trend-rank">{i + 1:02d}</span><div class="trend-main"><p class="label">{E(owner)} /</p><h2><a href="{E(r["url"])}" rel="noopener">{E(name)}<span class="arr" aria-hidden="true">↗</span></a></h2>'
                 f'<p>{E(r["description"])}</p><p class="job-tags">{gain}' + (f'<span class="tag">{E(r["language"])}</span>' if r['language'] else '') + (f'<span class="tag">{E(r["license"])}</span>' if r.get('license') else '')
                 + f'<span class="tag">Created {E(r["created"])}</span></p></div><div class="trend-stars"><strong>{r["stars"]:,}</strong><span class="label">stars</span></div></li>')
    body += f'</ol><p>{site.a("Browse the tool explorer →", "/tools/", "button")}</p>'
    return body


def build_ai_extras(site) -> None:
    site.page('/ai/local/', 'Run AI on your own computer', local_page(site), 'Install Ollama on Windows, macOS, Linux or Docker, pick a model for your hardware and keep it private.', 'Resources', module='play')
    site.page('/ai/models/', 'AI leaderboard', models_page(site), 'Frontier model rankings, trending open-weight models and the most-run local models, with dates and sources.', 'Resources')
    site.page('/tools/trending/', 'Trending security tools', trending_page(site), 'The top ten rising open-source security projects on GitHub this week.', 'Tools')
