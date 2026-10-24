# CyberHub roadmap

Goal: **the definitive free CSUSB resource**, spanning multiple professional clubs and disciplines, starting from cybersecurity.

## Now (shipped)

- Five-section structure (Learn, Tools, AI, Intel, Careers), generated from `Site.SECTIONS` in `hub/build.py`. Add a page to a section there and it appears in the header dropdown, phone menu, footer and `/resources/` directory.
- Weekly internship scanner near CSUSB, plus the **resume tailor** (`/careers/resume/`). The tailor runs in the browser, matches skills, flags weak bullets and produces a no-fabrication AI prompt. The private option uses the student's own Ollama.
- Linux Lab, Daily puzzle, readiness check, role match, AI guides, AI leaderboard, trending tools, cyber history.
- What you will defend (five guides with interactive shifts), Competitions, Networking Lab (first IT-track lab), cover letters in the resume tailor, and badges with a printable completion card.

## Next (immediate)

- **Resume tailor v2:** save several tailored versions per internship; export to .docx (a minimal zip writer, no dependencies).
- **Internship scanner v2:** add local employers that rarely appear on national lists (county, city, hospitals, school districts, Esri) through official RSS/JSON feeds where available; keyword alerts as an RSS feed per filter.

## Mid-term: expand into IT

Reuse the existing engines so each new discipline costs content, not code:

| Engine | Cyber today | IT expansion |
| --- | --- | --- |
| Practice shell (`web/linux.ts`) | Linux Lab | Windows/PowerShell Lab, Networking Lab (ping, ip, dig, subnetting) |
| Flashcards and readiness check | Security+ | A+ (Core 1/2), Network+, Cloud fundamentals |
| Daily puzzle | Name the weakness (KEV) | "Name the port/protocol", "Fix the config" |
| Role match and roadmaps | 12 security roles | Help desk, sysadmin, network, cloud and DevOps roles |
| Internship scanner | Security and IT flag | Category filters per discipline |

Done: Networking Lab (`/linux/network/`). Next: a Network+ flashcard deck, a Windows/PowerShell Lab, then the IT roles.

## Future: a hub of hubs across CSUSB clubs

- **Structure:** one `SECTIONS` entry per discipline or club (Cyber, IT, Software, Data/AI, Cloud, Business tech). Each club owns its section's content through pull requests reviewed by its officers.
- **Shared engines:** labs, puzzles, flashcards, career tools and the internship scanner work for every section.
- **Governance:** a `CONTRIBUTING` path per club, a faculty-review badge on checked content, and a content-freshness check (the 90-day review dates already used in the AI guides).
- **Identity:** a custom domain (for example `hub.ciso-csusb.org`), a neutral umbrella name if clubs beyond CISO join, and per-club colour accents inside the same design system.
- **Reach:** Spanish versions of the most-used pages (CSUSB is a Hispanic-Serving Institution) and a Discord bot that posts the Daily.

## Principles (do not break)

Free, no account, privacy-first (nothing personal leaves the browser), sourced and dated facts, strict CSP, zero runtime dependencies, accessible (axe clean), works on phones.
