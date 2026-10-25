# CyberHub redesign: handoff

This file is for a teammate, or a teammate's Claude session, picking up the CyberHub design work. To a Claude session, say: "Read docs/HANDOFF.md in Phan-Vincent/ciso-cyberhub and continue the design work in the current local working tree on top of `28e12a9`; do not switch to the older `flagship-redesign` branch, whose work is already merged." Last updated 22 Oct 2026 (independent local QA recorded; attack-map globe, phone hero globe, footer brackets; final font fix verified).

## 1. Scope: what this project is and is not

- **CyberHub is a learning resource**, *built by and powered by* CISO (Cyber Intelligence & Security Organization, CSUSB). It has tools, Security+ lessons, labs, intelligence, vulnerabilities and career roadmaps.
- **It is not the club website.** The club site already exists at https://www.ciso-csusb.org/ and covers projects, competitions, mentorship, officers and joining. Do not rebuild that here. CyberHub links to the club site in two places:
  - "CISO club site ↗" in the header
  - the "Start" section and footer hand-off
- The goal of the redesign is an **award-level, "flagship" feel** (Awwwards Site of the Day in technology is the bar). It must still be a fast, accessible, zero-dependency static site.

## 2. Where everything lives

| What | Where |
| --- | --- |
| Repo | https://github.com/Phan-Vincent/ciso-cyberhub |
| Redesign work | Branch `flagship-redesign`. **PR #1** https://github.com/Phan-Vincent/ciso-cyberhub/pull/1 merged only the first commit (`9d5ceec`); everything after it is in the follow-up PR from the same branch |
| Design system: tokens, logo family, brand book | Claude artifact "CISO CyberHub" https://claude.ai/artifact/Goeju2FRfnJJoJ53DQS7tB |
| Standalone prototype (one HTML page; it predates the Resources page and the rounding) | https://claude.ai/artifact/9XythmrDAJ3EcoqwzYD3am |
| Logo rules | `docs/BRAND.md` |
| Shared Drive folder | `ciso-cyberhub` in Google Drive (link sharing is "anyone with the link can view"; confirm that is intended) |

## 3. Hard technical rules (CI and tests enforce these)

- **Stack:**
  - Python standard-library static generator: `hub/build.py`, class `Site`.
  - TypeScript in `web/`, with types stripped by `scripts/transpile.mjs`.
  - **Zero package dependencies.** Do not add npm or pip packages.
- **Strict CSP:** scripts, styles, images and fonts come from `'self'` only.
  - No inline `style=""` attributes or inline scripts.
  - No CDNs, Google Fonts or hot-linked images. Everything is self-hosted under `public/assets/`.
- `scripts/security_check.py` forbids `.innerHTML =` and `eval(` in TypeScript. Build DOM with the `element()` helper in `web/app.ts`.
- **Homepage content comes from `data/`:** tools, academy, labs, sources, the latest headline and photos. Never hard-code counts.
- **Before pushing, run:**
  - `npm run check`
  - `npm test` (54 Python + 13 Node tests)
  - `python3 scripts/security_check.py`
  - `python3 -m hub.build`
  - `python3 scripts/check_site.py` (expect 0 errors)
- **Optionally:** `tests/browser-smoke.mjs` with Playwright. Set `PLAYWRIGHT_EXECUTABLE` to a Chromium binary if Playwright's own download is unavailable; `PLAYWRIGHT_MODULE` can point at an existing Playwright install.

## 4. Design decisions (agreed with the user; keep them unless they change their mind)

- **Concept: "precision instrument" / robotics.** The references are CROX, Emotion Agency, Pragen Hatlen, Weavy, a "Selected projects" robotics render band, a retro beige computer in a sky gradient, and Awwwards technology winners. Those winners use real objects shot like products, with huge grotesk type.
- **Contrasting scenes.** The homepage runs:
  - void hero (title "Cyber/Hub", with the summary **directly under the logotype** and "Explore the resources →")
  - paper mission
  - void learning map
  - blue sky interlude
  - paper modules (with the machine-render diptych)
  - carbon **field photo band**
  - void labs (lab bench in a device frame)
  - paper academy
  - carbon tool grid
  - blue start
  - void footer
- **Colour:** void `#050505`, carbon `#0c0d10`, graphite `#17191e`, paper `#edeff2`. There is one signal colour, CISO blue `#0068bc`, with `#3b93ff` for small text and strokes on black.
- **Type:** Archivo (display at 62% width, weight about 830, capitals) and Martian Mono (labels like `01 / About`). Both are SIL OFL and self-hosted in `public/assets/fonts/`. Paid fonts (Druk, Aeonik, Neue Haas) are excluded.
- **Logo:**
  - The CyberHub Core is the mark; the wordmark is CYBER solid with HUB as a blue outline.
  - **The CISO seal appears once per page**, only as the footer "Powered by" sign-off.
  - The user said explicitly: do not put the logo everywhere.
- **Corners: rounded "like Apple, but not too round".** Scale: `--r-xs 6px`, `--r-sm 8`, `--r-md 12` (buttons, inputs), `--r-lg 20` (panels, cards, photos), `--r-xl 28` (diptych, device frame). Grids sit inside one rounded frame rather than every cell being rounded.
- **Motion** eases with `cubic-bezier(.2,.7,0,1)`, never bounces, runs only for visible sections, and switches off under `prefers-reduced-motion`.
- **Avoid:**
  - hacker clichés: hoodies, green matrix rain, glowing padlocks
  - AI-looking gradient blobs
  - generic SaaS cards
  - stock photos left in full colour (photos get a monochrome grade so mixed sources read as one shoot)
- **Information architecture:**
  - The front page directs people to `/resources/`, which holds all resources in one place (5 large modules plus an "Also in CyberHub" grid).
  - Main nav: 01 Resources, 02 Tools, 03 Academy, 04 Labs, 05 Intelligence, 06 Careers.

## 5. Current state (branch `flagship-redesign`)

| Commit | What |
| --- | --- |
| `9d5ceec` | Flagship redesign, brand system, fonts, new homepage scenes and behaviours |
| `6681284` | `/resources/` page, summary under the hero logotype, "CISO club site" header link |
| `22190d0` | Three-step radius scale (softened corners) |
| `117e51f` | Field photo band, `data/photos.json`, `scripts/fetch_photos.py`, this handoff |
| latest | Five verified free photos committed, header actions pinned right (no phone overflow), named photo credits |

All checks pass. The site builds 105 pages, and the link check is clean. Visual QA was done at 1440, 1024 and 390 px, in light and dark themes and with reduced motion.

**Key files:**
- `hub/build.py`: `page()` shell, `home()` scenes, `resources_page()`
- `web/app.ts`: original logic plus the flagship layer: loader, menu, cursor, reveals, the 3D Core canvas, learning map, machine renders, hash bench, quiz cards
- `web/theme.ts`
- `web/site.css`
- `public/assets/brand/`
- `public/assets/fonts/`

### Local state, 22 Oct 2026 (uncommitted work on `main`)

- **Local base `28e12a9`** — the historical merge of Claude PR #2 from `flagship-redesign`. The working tree is dirty. **Those local changes are not committed, pushed or deployed.**
- **Canvas attack map is now an orthographic globe**, not a rectangular world map: hand-traced LAND outlines sampled into unit vectors, depth-clipped land/graticule, curved elevated MAP_ARCS with animated packets, country labels, instrument ring and ticks, slow rotation (static under reduced motion).
- **Phone hero shows the globe** under the copy in its own grid row (<=640 px); it no longer hides the seal. The footer "Powered by" sign-off uses four blue corner brackets instead of a full rounded border, and the footer lockup is vertically centred.
- **`tests/browser-smoke.mjs`** accepts `PLAYWRIGHT_EXECUTABLE`, waits for fetched content instead of reading immediately, and checks the phone globe slot and footer bracket treatment.

Independently verified by the supervisor on 22 Oct 2026, after the code worker had safely stopped:

| Command | Result |
| --- | --- |
| `npm run check` | Pass |
| `npm test` | Pass: 54 Python + 13 Node = **67 tests** |
| `python3 scripts/security_check.py` | Pass |
| `git diff --check` | Pass |
| Root build (`python3 -m hub.build`) | Pass: **105 routes, 106 HTML files** |
| Project-site build (`/cyberhub`) | Pass: **105 routes, 106 HTML files** |
| `python3 scripts/check_site.py` | Pass for both builds: **8,530 links, 0 errors** each |
| `tests/browser-smoke.mjs` at `http://127.0.0.1:4323` (root) and `http://127.0.0.1:4324/cyberhub` | Pass at both origins |
| Acceptance checks at 1440, 1024, 768 and 390 px | **71/71 pass**, zero page errors; all 28 flashcard fronts/backs and all 5 modules in both themes |
| Motion | Globe **animated** normally; **static** under reduced motion |
| Footer/header contrast | White, readable |
| Build output | Root `dist` restored as the final state |

Evidence: [`../outputs/ui-qa-2026-10-22/verification.json`](../outputs/ui-qa-2026-10-22/verification.json) (all 71 check outcomes; screenshot paths normalized to this repo), `motion.json`, and the reviewed screenshots in the same folder.

**Work record, 22 Oct 2026.** A first Flash worker was partial and hit its step limit; a Pro attempt timed out and was safely stopped; after user authorization a fresh Flash worker completed the implementation; the supervisor then ran independent verification. No cost or effort figures are recorded here; the Reasonix ledger and task IDs supply the audit history.

The earlier statement that "visual sign-off and any deployment remain outstanding" is **superseded** for local QA: the independent acceptance run and screenshot review above passed. This is **not** full WCAG accessibility certification, screen-reader testing or an expert curriculum review, and nothing was published.

**Final font fix, 22 Oct 2026.** A final targeted Flash patch removed the JavaScript font measurement and uses a CSS responsive font size instead. The supervisor then independently reran the root browser smoke on that final code — it now covers font stability once fonts are ready, plus the theme toggle and reload — and rechecked the existing 67 unit and 71 acceptance checks and motion; all passed. No further expert review is claimed.

## 6. Photos

The field band is live with five free photos in `public/assets/photos/` (1600 px wide, 173–312 KB each). Each was checked on its Unsplash page as a free **Unsplash License** photo on 22 Oct 2026. The originally listed server-aisle photo (`8CTEFI7fIPM`) turned out to be **Unsplash+** (paid) and a 3D render, so it was replaced by Taylor Vick's data-centre photo (`M5tzZtFCOfs`).

1. **How fetching works:** `python scripts/fetch_photos.py` downloads each entry's `src` (its `images.unsplash.com/photo-…` address) at 1600 px. The `unsplash.com/photos/<id>/download` endpoint answers scripts with HTTP 401, so it is not used. A `src` on `plus.unsplash.com` is refused, because that host serves Unsplash+.
2. **To swap or add a photo:** open the photo's page and confirm the title says "Free Photo on Unsplash". Copy the page's `og:image` without its query string into `src`. Fill `file`, `id`, `page`, `by` (photographer), `alt`, `caption` and `note` in `data/photos.json` (slot `field`), run the script, and add the credit row in `THIRD_PARTY_NOTICES.md`. The band credits each photographer by name, linked to the photo page.
3. **The band renders only for photos that exist** in `public/assets/photos/`, so a missing file just drops its tile.
4. **Good next slots for photography:**
   - Replace or pair the canvas machine renders in the modules diptych.
   - Add a photo header on `/resources/`.
   - Add a hero backdrop behind the Core. Keep it dark and graded so the type stays readable.

## 7. Open items

1. ~~Fetch and commit the photos~~ Done (section 6).
2. ~~Review and merge the follow-up PR from `flagship-redesign`~~ Historical: PR #2 was merged as `28e12a9`, and that redesign was deployed earlier. The **current local QA changes on top of it are not committed, pushed or deployed**.
3. ~~Header link: CISO club or CISA?~~ Decided 22 Oct 2026: the header link stays on the CISO **club** site, https://www.ciso-csusb.org/ (`site.json` → `club_url`). Do not add a cisa.gov link.
4. Update the design-system artifact to the new radius scale (the brand book still says square corners in places). **Blocked:** the Claude artifact URL returns "Page not found" (HTTP 404).
5. Confirm that the Drive folder's "anyone with the link" sharing is intended. **Blocked:** the relevant Google Drive account is signed out.
6. Optional: deploy a preview through the repo's Pages workflow after maintainer approval.
7. External handoff is blocked: the Claude design-artifact URL returns "Page not found", and the relevant Google Drive account is signed out with no connected-folder matches. No sharing settings were changed; resolve access before relying on those artifacts.

## 8. Working with the user

- They prefer that changes go straight into the GitHub repo, on the PR branch, not into zips or clones.
- They give short direction notes. Apply each note fully, verify visually at desktop and mobile widths, and push.
- They care about the site not looking AI-generated or like a hacker cliché, and about strong contrast between sections.

## 9. Follow-up, 22 Oct 2026 (badge, globe pointer, footer brackets)

- Removed the floating "Simulated / not live telemetry" badge (markup, styles and stale phone-note comment). The seal's `aria-label` and the canvas artwork labels still identify the map as simulated.
- The hero globe now eases its yaw and pitch toward the pointer on fine, hovering pointers (`lerp` 0.06; about 1.1 rad total yaw and 0.7 rad total pitch), while keeping the slow autospin and the 17° base tilt. Land, coastlines, nodes and arcs use the dynamic camera pitch. Reduced motion stays static; touch pointers keep autospin without needing hover.
- Restored the original blue corner path in `cyberhub-lockup-on-dark.svg`; the asset is now byte-identical to `HEAD` (only the path had been removed).
- `tests/test_build.py` now asserts the badge text is absent while the accessible simulation label remains, and that the footer lockup keeps the blue corner path.
- Checks actually run here with the Node 24 runtime: `npm run check`, `npm test` (55 Python + 13 Node tests), `npm run build`, and `git diff --check`. Browser/mouse verification was left to the supervisor and is not claimed here.

## 10. Geography, dragging and sign-off follow-up, 22 Oct 2026

- Removed both canvas annotation groups shown in the user's screenshots. The accessible simulation description remains.
- Replaced hand-traced land with vendored Natural Earth 1:110m country polygons, including national boundaries, multipolygons and holes. The globe fetches its geometry from the same site. The importer rounds to four decimal places and preserves original precision when rounding would collapse a small island.
- Added mouse/touch dragging with pointer capture, persistent orientation and grab feedback. Existing mouse-follow motion remains; reduced motion suppresses automatic motion while allowing intentional dragging.
- Latest intelligence is now a large, high-contrast report panel with the original data-backed headline, source link and publication date.
- Both footer lockups use equal responsive frames and identical 22px corner lengths / 1.5px strokes. Shared CSS replaces embedded SVG corners so scaling cannot change their size. Frames align on desktop and stack on phones.
- Reasonix objective: `cyberhub-20261022-geography-drag-intel-footer`. Flash implemented the UI and importer but its rounded tiny island failed validation. One Pro recovery corrected precision handling; it stopped at its step limit before regeneration/checks. Both executions reported errors and were confirmed stopped. The supervisor regenerated the asset using the worker's importer, corrected attribution and a desktop viewport setup in the browser test, then independently verified the final result. No further worker retry was launched.
- Independent checks passed: `npm run check`; 57 Python + 13 Node tests; security and diff checks; root and `/cyberhub` builds with 105 routes / 106 HTML files / 8,530 links / zero link errors; browser smoke at both URL paths. Additional checks cover native mouse/touch dragging, capture release, retained mouse-follow, light mode, headline/link prominence and equal frames/corners at 1440, 1024, 768 and 390px. No browser page errors were observed.
- Every vendored coordinate was independently compared against the downloaded source using the documented transformation: 177 countries, 289 rings, 10,603 coordinates; one ring retains source precision. Reviewed hero, report and footer screenshots are in `outputs/ui-qa-2026-10-22/geography-drag/`, alongside verification records.
- Root preview remains at `http://127.0.0.1:4323/`; the temporary prefix preview was stopped after verification. All changes remain local, uncommitted, unpushed and undeployed. This section supersedes the older hand-traced-map and embedded-bracket implementation notes above.

## 11. Release authorization, 22 Oct 2026

The user explicitly approved committing, pushing and deploying this verified snapshot. Publication uses the existing `Deploy approved release` GitHub Pages workflow from `main`, with `SITE_URL=https://phan-vincent.github.io` and `BASE_PATH=/ciso-cyberhub`. The production-configured local build passes: 105 routes, 106 HTML files, 8,636 links checked and zero link errors. Earlier "uncommitted / unpushed / undeployed" statements describe the pre-release verification snapshots; the release commit and GitHub Actions runs record publication status.

## Growth features (24 Oct 2026)

- **Link previews:** every page has Open Graph and Twitter tags. The cards are 1200×630 PNGs in `public/assets/og/`, one per section. To change the text, edit `scripts/og/cards.json` and run `node scripts/og/render_cards.mjs` (a developer tool that needs Playwright; the site build stays dependency-free). Production builds use `SITE_URL` for absolute image URLs.
- **RSS:** `/feed.xml` lists the latest attributed headlines and is linked from every page head.
- **CyberHub Daily (`/daily/`):** "name the weakness". Each day picks one CISA KEV record whose title names a clear weakness, mapped to 8 families in `hub/daily.py`. The pick is a deterministic hash of the day number, so everyone gets the same puzzle. Puzzle #1 was 23 Oct 2026. Players get 4 tries; each miss sharpens the clue figure, then adds a hint, then narrows to three options. The reveal explains the weakness, how defenders catch it and which CyberHub lessons cover it. There is a share grid (⬛🟦), plus stats, streaks and badges kept in localStorage.
- **Readiness check (`/academy/readiness/`):** 15 questions, three per domain, drawn from `academy.json`. Shows a score band, per-domain bars, up to 5 lessons to review and share text.
- **Role match (`/careers/match/`):** 6 questions with weights in `hub/play.py`. The result links to the career roadmap.
- **Entry points:** homepage "Play it, share it" band; a Daily button on the latest-report card; a menu item; a Play column in the footer; cards on the Resources page.
- **Code:** server markup in `hub/play.py`, client logic in `web/play.ts` (loaded only on these pages, no innerHTML), tests in `tests/test_play.py`.
- **Still to do for reach:** the repo owner must enable "Allow GitHub Actions to create and approve pull requests" (Settings → Actions → General) so the data bot can deliver new headlines and KEV records. A custom domain would also help.

## Internships and AI guides (24 Oct 2026)

- **Internship scanner (`/careers/internships/`):** `hub/internships.py` reads the community SimplifyJobs Summer 2027 list. It keeps active postings within 110 miles of CSUSB (straight-line, from a fixed SoCal city table) plus remote-US roles, flags security and IT roles and new postings, and dedupes. Runs weekly on the Monday schedule (and on manual runs); `publish_data.py` commits `data/internships.json` to main. The page also lists local sources (CSUSB Handshake, San Bernardino County, federal Pathways) and notes CISA's cancelled 2026 CyberCorps internships.
- **AI for builders (`/ai/`):** a secure AI coding cheat sheet and a meta-prompting guide in `hub/guides.py`. `REVIEWED` holds the review date; the page shows "review due" after 90 days. Every statistic is sourced (Veracode 2025, Spracklen et al. USENIX 2025, OWASP Agentic Top 10 2026, OpenSSF, Anthropic, OpenAI, NIST SP 800-218A).

## Labs and learning PR (24 Oct 2026)

- **Linux Lab (`/linux/`):** 36 original levels in 9 modules. Simulated shell in `web/linux.ts`, lessons in `hub/linux.py`. `tests/linux.test.mjs` solves every level. Ranks run Recruit → Operator → Analyst → Hunter → Responder → Root.
- **Trending tools (`/tools/trending/`) and trending open-weight models:** `hub/trending.py` runs weekly in the updater (GitHub search API with the workflow token, plus the Hugging Face models API). It filters out jailbreak kits, "uncensored"/"abliterated"/"dealigned" models, spam and translated re-uploads. Seeded 24 Oct.
- **AI leaderboard (`/ai/models/`):** a dated snapshot of llm-stats.com and the Ollama most-pulled list in `data/ai_leaderboard.json`; refresh it by hand. The trending section updates weekly.
- **Local AI guide (`/ai/local/`):** Ollama install for Windows, macOS, Linux and Docker (tabs default to the visitor's OS), hardware sizing, model picks, commands, API, safety and troubleshooting. Install commands come from the Ollama README.
- **History (`/history/`):** 22 events across 6 eras in `hub/history.py`. Images are fetched by `.github/workflows/assets.yml`, which runs `scripts/fetch_history_images.py` against the Wikimedia Commons API. It accepts only public-domain, CC0, CC BY or CC BY-SA files, records author and license in `data/history_images.json`, and falls back to a typographic plate.

## Organisation, resume tailor and AI workflow (24 Oct 2026)

- **Structure:** `Site.SECTIONS` in `hub/build.py` defines Learn / Tools / AI / Intel / Careers. It drives the header dropdowns, the grouped phone menu, the footer, `/resources/` (directory), `/learn/` and the homepage section rows. The redundant homepage tools grid was removed.
- **Resume tailor (`/careers/resume/`):** `web/resume.ts` + `hub/resume.py`. Runs in the browser: reads .docx with a built-in unzip, matches skills, checks the resume, flags weak bullets and builds a no-fabrication prompt. The optional local tailoring calls the user's Ollama; this page alone allows `connect-src` to localhost:11434. Every internship listing links to it with `?job=<id>`. Tests: `tests/resume.test.mjs`.
- **AI workflow guide (`/ai/workflow/`):** skills (Agent Skills format), saving tokens, the context saver, keeping AI on track, and organisation/scope guidelines. Sources checked 2026-10-24.
- **Learning map:** nodes are draggable, and the info card is draggable (also by arrow keys on its grip) and collapsible, with a Reset layout button. The default layout no longer puts the card over the map.
- **Roadmap:** `docs/ROADMAP.md`.

## What you will defend (24 Oct 2026)

- The five homepage field photos are links to `/defend/<slug>/` (`hub/defend.py`); `/defend/` is the overview, also listed under Learn. Each page: what is inside, how it is attacked, real incidents (linked to `/history/` where an event exists), how defenders protect it, frameworks, practice links, careers and sources.
- Adding a field photo requires a matching entry in `DOMAINS` (`tests/test_defend.py` enforces this).
- Field captions now wrap onto two lines instead of colliding on narrow tiles.

## Shifts, competitions, Networking Lab, cover letters, badges (24 Oct 2026)

- **A day defending it:** `hub/shifts.py` holds a 4-step scenario per `/defend/` guide (exactly one best answer per step, each choice explained); `web/journey.ts` runs it and saves scores to `localStorage['cyberhub:defend']`.
- **Competitions (`/careers/competitions/`):** `hub/competitions.py`. `EVENTS` are dated and marked done/now/upcoming at build time (the nightly rebuild keeps it current); `WINDOWS` are yearly patterns. Update the dates each season from the organisers' sites and bump `CHECKED`.
- **Networking Lab (`/linux/network/`):** 17 levels in `hub/netlab.py`; simulated network and commands (`ip`, `ping`, `traceroute`, `dig`, `nslookup`, `host`, `ss`, `netstat`, `nc`, `curl`) in `web/linux.ts` (`NET_LEVELS`, `netExec`). Same page builders as the Linux Lab (now parameterised). Progress key `cyberhub:netlab`. `tests/linux.test.mjs` solves every level with real commands.
- **Cover letters:** the resume tailor has a "Tailored resume / Cover letter" switch; `coverPrompt` in `web/resume.ts` keeps the no-fabrication rules and marks unknowns as [PLACEHOLDER].
- **Badges (`/progress/`):** `hub/badges.py` + `web/journey.ts` read existing progress keys (Linux, Networking, Academy, readiness, Daily, role quiz, guides, shifts). The printable card is cloned into `#print-root` on `beforeprint`. Badge ids must match in both files (tested).

## Duel, accounts, beginner path, labs, AI pages (24 Oct 2026)

- **Cyber Duel (`/duel/`):** `web/duel.ts`, `hub/duel.py`, questions in `data/duel.json` (+ Academy questions). Seeded rounds so challenge links replay exactly.
- **Accounts (`/account/`):** local-first; Supabase sync turns on when `site.json` has `supabase_url` + publishable `supabase_key`. Setup: `docs/ACCOUNTS.md`, schema `supabase/schema.sql`. Email: `docs/EMAIL.md`.
- **Start here (`/start/`):** `hub/start.py`; quick checks and checklist in `web/journey.ts`.
- **Labs:** SOC Simulator (`web/soc.ts`) and Phishing lab (`web/phish.ts`), pages in `hub/practice.py`; listed on `/labs/`.
- **AI:** Red Team Lab (`web/redteam.ts`), Prompt testing and AI and cyber jobs in `hub/ailab.py`. Daily pulse (`hub/pulse.py` → `data/pulse.json`) runs in the data workflow and is published with the other data files.
- **Work roles (`/careers/roles/`):** `hub/roles.py`. **Tools:** 25 new tools are `pending-review` (badge shown) until the weekly catalog check confirms repository and license.
- **News:** five more RSS/Atom sources in `data/sources.json`, each with a test fixture.

## Glossary, tournament, PowerShell Lab (24 Oct 2026)

- **Homepage:** hero now leads with Start here and Cyber Duel; a "Try it right now" strip links the interactive labs.
- **Glossary (`/glossary/`):** `data/glossary.json` (114 terms) + `hub/glossary.py`; search in `web/journey.ts`.
- **Duel tournament:** bracket helpers `bracket/settle/nextMatch/champion` in `web/duel.ts`; state in `localStorage['cyberhub:tour']`; each match is a Face-off, ties go to most correct answers, then a rematch.
- **PowerShell Lab (`/linux/powershell/`):** `web/pslab.ts` (simulated cmdlets with object pipelines) + `hub/pslab.py` (15 levels). Tests solve every level.
- **Badges:** Windows ready, Analyst on duty, Phish spotter, Prompt breaker; account sync covers the new lab keys.
- **IT track (`/it/`) and IT flashcards (`/it/flashcards/`):** `hub/ittrack.py`, cards in `data/it_cards.json` (Network+ and A+ topics, original wording), spaced repetition in `web/cards.ts`. Duel gained "Networking (Network+)" and "IT support (A+)" categories.
- **Study planner (`/plan/`):** goals and task lists in `hub/plan.py` (built from real page paths; a test checks every link), packing and .ics export in `web/plan.ts`.

## Live rooms (25 Oct 2026)

- **Cyber Duel Live room (`/duel/live/`):** `web/live.ts` + `hub/live.py`. Host screen with a 5-letter code; players join on phones; host scores and broadcasts the leaderboard. Transport is Supabase Realtime public broadcast (`realtime:cyberhub-duel-<CODE>`), implemented with a plain WebSocket (Phoenix v1 JSON). No database writes. Turns on with the same `site.json` Supabase settings; CSP adds the project's `https://` and `wss://` origins.
- Tests: `tests/live.test.mjs` (scoring, codes, channel relay with a fake socket). A browser rehearsal with a mocked Realtime server (host + 3 phones, late join, kick) passed.
