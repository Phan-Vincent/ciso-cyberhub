# Automation and source policy

| Workflow | Cadence (UTC) | Writes | Publication |
| --- | --- | --- | --- |
| Validate and build | Pull requests, main pushes, manual | Temporary build output | None |
| Source updates | 02:17, 10:17, 18:17 daily | Intelligence JSON on review branch | Human review, then separate release |
| Catalog and link review | Mondays 06:37 | Repository proposals, discovery queue, rotating link checks | Never auto-promotes tools |
| Curriculum reminder | First of month 07:47 | A review request in maintenance JSON | No automatic curriculum edits |
| Approved release | Manual, main only | Pages artifact | Authorized dispatch/environment |
| Dependabot | Weekly | Action-pin update PRs | Human review |

Weekly/monthly runs also refresh intelligence. Manual source runs perform all maintenance jobs. Schedules are best-effort: GitHub can delay or disable inactive public-repository schedules. View-time freshness labels reveal aging data even if the site itself is not rebuilt. Check Actions logs and review PRs when a source remains stale.

## Network behavior

The feed adapter reads RSS/Atom titles, links and source publication times, never whole articles. It strips markup, checks article hosts, drops tracking parameters, deduplicates canonical URLs and groups retained records into daily publication-date digests. Summaries and technical impact narratives are intentionally absent rather than generated from headlines. The initial sources are CERT/CC and SANS ISC; content policies need a maintainer review before public launch. Other proposed commercial publisher feeds remain deferred.

CISA KEV populates vulnerability identity, vendor/product, inclusion dates and recommended actions. EPSS adds dated probabilities for a bounded 50-record window. NVD adds a preferred available CVSS version, vector, score source and advisory references for up to three oldest-check records each refresh, pacing calls six seconds apart. A KEV-only explorer is not an all-CVE vulnerability database. FIRST queries stay below its documented 2,000-character CVE-list limit. Unknown or unavailable enrichment remains unknown.

Every fetch has a timeout, 8 MB body cap, host allowlist, no redirect following and three-attempt maximum for selected transient failures. A news run allows 45 total requests, including retries. A catalog run checks 20 rotating repositories with up to two requests each, plus one bounded discovery query, under a 55-request unauthenticated budget or a 180-request token budget. A weekly link job checks 20 rotating repository/setup URLs under a 30-request budget. Shared-IP usage may exhaust upstream allowances sooner; errors stay visible rather than bypassing the limit.

ETags are cached locally under `.cache/http/`; that cache is excluded from Git and not persisted by Actions in this release. Errors never clear previously accepted records. Last-attempt, last-success and source errors are distinct. Identical news input keeps stable IDs and first-retrieval provenance. Successful source rechecks update freshness even if the content is unchanged.

## Review behavior

`hub.catalog` never edits `data/tools.json`. It emits changed repository names, archive flags, recent activity and license/release signals into `data/review-queue.json`. GitHub's detected SPDX string is a review hint, not a legal determination. Stars are not safety scores. Inaccessibility or inactivity is a signal for investigation, not proof of abandonment. A 95-entry initial research backlog is unverified, may include renamed repositories or non-open-source projects, and is not included in the public Tool Explorer.

The bot can change only four fixed paths: intelligence, review queue, catalog state and maintenance JSON. It cannot generate workflow files or educational Markdown. Its commits use validated main-branch source plus the data replacements, preserving an open PR's history without force pushing. Human reviewers resolve conflicts and approve publication. The update job's write-scoped token is needed for the PR; no privileged pull-request event is used.

## Reproduction

```sh
python3 -m hub.ingest --dry-run
python3 -m hub.catalog --dry-run
python3 -m hub.maintenance links --dry-run
python3 -m unittest discover -s tests -v
```

To inspect synthetic ingestion safely, use a disposable copy of the source and run `python3 -m hub.ingest --fixtures tests/fixtures`. The output is visibly fixture-mode, and deployment refuses it. Restore a clean source-reported snapshot before live refresh. The fixture suite uses temporary directories and does not change the delivered snapshot.
