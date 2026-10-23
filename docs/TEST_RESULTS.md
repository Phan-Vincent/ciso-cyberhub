# Test and build evidence

Executed in the local verification environment on 2026-10-22 with Python 3.15 and Node 24. No external public deployment was performed.

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
