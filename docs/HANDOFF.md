# CyberHub redesign: handoff

This file is for a teammate, or a teammate's Claude session, picking up the CyberHub design work. To a Claude session, say: "Read docs/HANDOFF.md in Phan-Vincent/ciso-cyberhub and continue the design work on the flagship-redesign branch." Last updated 22 Oct 2026.

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
| Redesign work | Branch `flagship-redesign`, **PR #1** https://github.com/Phan-Vincent/ciso-cyberhub/pull/1 (not merged) |
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
  - `npm test` (50 Python + 12 Node tests)
  - `python3 scripts/security_check.py`
  - `python3 -m hub.build`
  - `python3 scripts/check_site.py` (expect 0 errors)
- **Optionally:** `tests/browser-smoke.mjs` with Playwright.

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
| latest | Field photo band, `data/photos.json`, `scripts/fetch_photos.py`, this handoff |

All checks pass. The site builds 105 pages, and the link check is clean. Visual QA was done at 1440, 1024 and 390 px, in light and dark themes and with reduced motion.

**Key files:**
- `hub/build.py`: `page()` shell, `home()` scenes, `resources_page()`
- `web/app.ts`: original logic plus the flagship layer: loader, menu, cursor, reveals, the 3D Core canvas, learning map, machine renders, hash bench, quiz cards
- `web/theme.ts`
- `web/site.css`
- `public/assets/brand/`
- `public/assets/fonts/`

## 6. Photos: one step left for a human

The user asked for real, free-to-use photos in the Awwwards style. The Claude workspace that did this work could not download images because its network blocks image hosts. So:

1. **What exists:**
   - The field band is built and styled.
   - `data/photos.json` lists five Unsplash photos: server aisle, robot arm, circuit board, network cables, old monitor.
   - The band renders only for photos that actually exist in `public/assets/photos/`, so the site looks complete without them.
2. **To finish:**
   - On a normal connection, run `python scripts/fetch_photos.py`.
   - Open each photo's Unsplash page and confirm it is the free **Unsplash License**, not Unsplash+. Swap any that aren't.
   - Commit the JPGs. Keep each under about 400 KB; resize to 1600 px wide if needed.
3. **To swap or add a photo:** edit `data/photos.json` (slot `field`; fields `file`, `id`, `page`, `alt`, `caption`, `note`) and add the matching credit row in `THIRD_PARTY_NOTICES.md`.
4. **Good next slots for photography:**
   - Replace or pair the canvas machine renders in the modules diptych.
   - Add a photo header on `/resources/`.
   - Add a hero backdrop behind the Core. Keep it dark and graded so the type stays readable.

## 7. Open items

1. Fetch and commit the photos (section 6).
2. Review and merge PR #1. CI runs on the PR.
3. The header link points to the CISO **club** site (`site.json` → `club_url`). The user wrote "CISA website"; we read that as CISO. If they meant the US agency, either point it to https://www.cisa.gov/ or add a second link.
4. Update the design-system artifact to the new radius scale (the brand book still says square corners in places).
5. Confirm that the Drive folder's "anyone with the link" sharing is intended.
6. Optional: deploy a preview through the repo's Pages workflow after maintainer approval.

## 8. Working with the user

- They prefer that changes go straight into the GitHub repo, on the PR branch, not into zips or clones.
- They give short direction notes. Apply each note fully, verify visually at desktop and mobile widths, and push.
- They care about the site not looking AI-generated or like a hacker cliché, and about strong contrast between sections.
