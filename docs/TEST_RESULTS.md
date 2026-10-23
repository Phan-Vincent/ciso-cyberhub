# Test and build evidence

Executed in the local verification environment on 2026-10-22 with Python 3.15 and Node 24. No external public deployment was performed by these local verification runs.

## Passed

| Check | Actual result |
| --- | --- |
| `npm run check` | Content schemas, Python AST/JSON/whitespace lint and TypeScript syntax stripping passed |
| `npm test` | 50 Python tests and 12 Node tests passed; 62 total, zero failures |
| Production root build | 104 routes, 105 HTML files including root 404 copy, 3,735,278 bytes total output |
| Project-site build | `/cyberhub` output built and internal paths validated |
| `scripts/check_site.py` | 6,093 local/external link attributes examined; zero broken local paths/fragments or structural errors |
| Determinism | Two builds from identical inputs produced identical file hashes |
| Dataset integrity | SHA-256 manifest and four-packet PCAP structure/IPv4 checksums passed |
| Source guardrails | Official action SHA pins, narrow secret-pattern scan, forbidden sinks and empty dependency inventory passed |
| Workflow/template syntax | YAML parsed successfully; no hosted workflow execution claimed |

The link checker resolves local destinations and fragments. It does **not** claim all external URLs are reachable. The basic accessibility check covers language, one main landmark, one H1, labels, IDs, image alt attributes and safe markup. It is **not** WCAG certification, screen-reader testing or a computed visual contrast/overflow check.

The frontend check strips erasable TypeScript syntax and exercises pure logic with Node's test runner. It is **not** `tsc` semantic type checking. The dependency inventory is empty for the application; Python, Node and Action transitive dependencies still require maintenance. No external vulnerability database audit succeeded or is claimed.

## Important exercised cases

- RSS and Atom parsing, missing/invalid publication times, article-host restrictions and canonical URL deduplication.
- Corrected titles, identical-input idempotency, bounded retention and last-known-good preservation.
- Rejected XML DTD/entity declarations, HTML outage responses, oversized bodies, unsafe URLs and malformed KEV records.
- HTTP 429 retry, long Retry-After deferral, total request budgets and ETag/304 behavior.
- KEV normalization, dated EPSS probabilities, invalid scores, CVSS primary-source selection and unsafe advisory URL removal.
- Malformed enrichment envelope validation (`null`, non-dict, invalid entries) and requirement for matched records before advancing `last_success`.
- Large-file (`>1 MB`) proposal restoration via bounded raw retrieval (`Accept: application/vnd.github.raw+json`).
- Partial source failure preserving existing records and last-success timestamps; feed health reporting both staleness and active errors.
- Isolated fixture refresh runs, dry runs leaving data unchanged, and live refresh refusing educational fixture state.
- Catalog proposals retaining pending-review status and detecting available rename/archive signals.
- Quiz correct/wrong/unanswered scoring, objective references, progress round-trip, corrupt/unknown-schema storage, invalid imported attempts, and Academy lesson completion capped exclusively to the 28 mapped Academy objectives (`100%`).
- Combined query/filter behavior, newest-first `date_added` KEV sorting, unknown metadata and full-site search index coverage.
- Safe Markdown rendering, escaped code, local base paths, missing code-fence rejection, internal links and generated-page semantics.

## Blocked or not run

| Attempt | Observed limitation |
| --- | --- |
| npm Astro package lookup | Original authoring environment returned HTTP 403; dependency-free Python/TS implementation retained |
| Actual `python3 -m hub.ingest` run | Executed locally: 7 requests, 0 failures, 10 headlines and 1,754 KEV records retrieved and enriched |
| Playwright Chromium smoke gate | Requires local Playwright + Chromium installation; run manually before public release |
| GitHub Actions/Pages | No authorized remote repository, workflow execution or deployment available |
| Tool walkthrough execution | Tools not installed; commands and platform instructions still require maintainer reproduction |
| Curriculum review | No independent subject-matter review or current-provider landing-page verification |

## Reproduce the browser gate

On a network-enabled development machine with a reviewed Playwright version and its Chromium browser installed, start the site with `npm run dev`, then run:

```sh
node tests/browser-smoke.mjs
```

If Playwright is installed outside the repository, set `PLAYWRIGHT_MODULE` to its absolute module directory. For a different served origin, set `TEST_ORIGIN`. The script checks navigation, tool filtering, quiz scoring UI, saved completion, flashcards, search, page errors and mobile overflow. It exits on failure; it does not silently mark unavailable browsers as passing.

Additionally check keyboard-only use, screen-reader labels and live regions, 200% zoom, long text, dark/light contrast, offline/error states and actual mobile devices. Record those results before public release.

## Current QA — 22 October 2026 (supersedes the historical not-run browser claims above)

The supervisor independently verified the accepted local implementation on 22 October 2026, after the code worker had safely stopped. This section supersedes the earlier "Playwright Chromium smoke gate … not run" row and the earlier 50 Python / 12 Node counts; those rows remain as the record of that earlier run. The 67 unit and 71 acceptance checks plus motion were rechecked on the final code (see the closing note), while this documentation-only pass reran no tests itself.

| Check | Actual result |
| --- | --- |
| `npm test` | **67 tests passed**: 54 Python + 13 Node |
| `npm run check` | Pass |
| `python3 scripts/security_check.py` | Pass |
| `git diff --check` | Pass |
| Root build | **105 routes, 106 HTML files** |
| Project-site build (`/cyberhub`) | **105 routes, 106 HTML files** |
| `python3 scripts/check_site.py` | **8,530 links, 0 errors** for each build |
| `tests/browser-smoke.mjs` at `http://127.0.0.1:4323` (root) | Pass |
| `tests/browser-smoke.mjs` at `http://127.0.0.1:4324/cyberhub` | Pass |
| Additional acceptance checks | **71/71 passed** at 1440, 1024, 768 and 390 px; zero page errors; all 28 flashcard fronts/backs and all 5 modules in both themes |
| Motion | Globe animated normally; static under reduced motion |
| Header/footer | White and readable |
| Final build output | Root `dist` restored as the final state |

Evidence is stored relative to this file:

- [`../outputs/ui-qa-2026-10-22/verification.json`](../outputs/ui-qa-2026-10-22/verification.json) — all 71 check outcomes (`errors: []`), with screenshot paths normalized to this repository.
- [`../outputs/ui-qa-2026-10-22/motion.json`](../outputs/ui-qa-2026-10-22/motion.json) — reduced motion `static`, normal motion `animated`, footer/header ink white.
- [`../outputs/ui-qa-2026-10-22/hero-1440-dark.png`](../outputs/ui-qa-2026-10-22/hero-1440-dark.png), [`hero-light.png`](../outputs/ui-qa-2026-10-22/hero-light.png), [`hero-390-dark.png`](../outputs/ui-qa-2026-10-22/hero-390-dark.png) and [`footer.png`](../outputs/ui-qa-2026-10-22/footer.png) — reviewed screenshots.

Workers used: a first Flash worker was partial and hit its step limit; a Pro attempt timed out and was safely stopped; after user authorization a fresh Flash worker completed the implementation; the supervisor then ran independent verification. No cost or effort figures are recorded here; the Reasonix ledger and task IDs supply the audit history.

Scope limits: this is **not** full WCAG accessibility certification, screen-reader testing or an expert curriculum review. No deployment was performed by this QA session, and the local changes are not committed, pushed or deployed. The Claude design-artifact URL still returns "Page not found" (HTTP 404) and the Google Drive account is still signed out; no artifact repair or Drive sharing confirmation is claimed.

**Final font fix — 22 October 2026.** A final targeted Flash patch removed the JavaScript font measurement and uses a CSS responsive font size instead. The supervisor independently reran the root browser smoke on that final code — it now includes font stability once fonts are ready, plus the theme toggle and reload — and rechecked the existing 67 unit and 71 acceptance checks and motion; all passed. No additional expert review is claimed.

## Geography and dragging follow-up — 22 October 2026

The final follow-up passes 57 Python + 13 Node tests (70 total), schema/lint/transpilation checks, security checks and `git diff --check`. Both root and `/cyberhub` builds contain 105 routes / 106 HTML files; each link check covers 8,530 links with zero errors. Browser smoke passes at both paths, including themes, flashcards, responsive layout, globe dragging and the latest report panel.

Independent native browser checks verify mouse and touch dragging, retained orientation, pointer capture release outside the canvas, scrolling outside the globe, retained mouse-follow with time frozen, light mode, the original report link, and equal footer frame/corner dimensions at 1440, 1024, 768 and 390px. No page errors were observed. Every coordinate in the local geography asset matches the documented transformation of the downloaded Natural Earth source (177 countries, 289 rings, 10,603 coordinates; one precision fallback).

Evidence and reviewed screenshots: [`../outputs/ui-qa-2026-10-22/geography-drag/results.json`](../outputs/ui-qa-2026-10-22/geography-drag/results.json), `geography-verification.json`, `verification.json`, `hero.png`, `intel.png` and `footer.png` in that folder. Reasonix Flash implemented the changes; one Pro correction fixed a collapsed island ring. Their execution errors remain recorded; supervisor verification establishes acceptance of the resulting files. Nothing was committed, pushed or deployed.
