# Technical architecture

## Decision and boundaries

CyberHub is a static site: visitors read HTML, CSS, small JavaScript modules and local JSON. There is no server-side application, database, authentication service, analytics collector or AI dependency. External source retrieval happens in a Python process controlled by maintainers or scheduled GitHub Actions, never in visitors' browsers.

The planned Astro + Starlight installation was blocked by HTTP 403 from the npm registry. A dependency-free static generator was selected to deliver code that can actually be built in this environment. Its disadvantages are explicit: a limited Markdown dialect, no MDX, no Starlight ecosystem, no TypeScript semantic type checker, and more rendering maintenance. The original content and JSON schemas are portable to Astro later; do not maintain two partially tested frontend stacks.

## Data flow

1. Curated JSON and original Markdown are reviewed source inputs.
2. `hub.validate` checks required metadata, enumerations, references, quiz answers and URLs.
3. `hub.build` renders escaped HTML and generates a local search index; Node strips TypeScript types.
4. Structural checks validate internal paths, fragments, basic semantics and security policy.
5. An authorized release uploads only `dist/` to GitHub Pages.
6. Browsers read static content; optional progress lives in versioned local storage, namespaced by deployment path.

A second pipeline fetches bounded HTTPS sources, normalizes records, retains provenance and errors, and writes only JSON. The scheduled job proposes those files on one review branch. A human merge is required, followed by an explicit release dispatch. This deliberately means scheduled refresh does not imply the public dashboard is automatically republished.

## Trust model

Untrusted RSS, repository metadata and vulnerability descriptions are data. They never become Markdown, source files, command strings or workflow code. HTML output escapes strings and client UI uses `textContent`, not `innerHTML`. A restrictive meta CSP permits only local scripts/styles/data. GitHub Pages does not let this project set arbitrary response headers; frame-ancestors cannot be enforced through a meta policy. The site contains no sensitive application session, but a host supporting headers would permit stronger framing controls.

The ingestion client accepts configured HTTPS hosts, forbids cross-host redirects entirely, limits response size to 8 MB, imposes timeouts, caps total requests and retries selected transient errors. Long Retry-After values defer work. ETags reduce body transfer when cache files are reused locally; the supplied ephemeral CI workflow does not persist the HTTP cache across runs. No secrets are written into data files. GitHub tokens are sent only to api.github.com.

Live source state is separate from educational fixtures. A live refresh refuses to operate on fixture-mode snapshots to prevent mixed provenance. Tests use temporary directories. Public deployment refuses fixture mode. Failure timestamps do not replace last-success timestamps. Unknown CVSS, EPSS, version, license or operating-system values stay null.

## Content model

`data/content.json` owns routes and metadata; corresponding `.md` files own lesson bodies. The executable validator is the authoritative schema for this release. It validates primary objective references, not comprehensive subobjective teaching coverage. Tool records distinguish source-checked fields from editorial recommendations; a source-checked record is not an endorsement.

The Markdown subset supports paragraphs, headings, flat lists, fenced code, links, bold and inline code. Raw HTML and MDX are escaped. It intentionally does not claim CommonMark compatibility. Tables and layouts belong in the trusted builder. The parser should be replaced by a maintained parser during an Astro migration, rather than expanded into a complex custom interpreter.

## Search, progress and performance

Search indexes generated page text locally. Tool filters combine query terms and field filters, retain shareable URL parameters and show a no-match state. Without JavaScript, tool listings and learning content remain readable. Quizzes use original client-side question data, so answers are inspectable; this is a learning aid, not an assessment security boundary. Timed practice uses an absolute deadline to account for background-tab timer throttling.

Progress schema version 1 has bounded lesson IDs and the last 50 attempts. Import validates shape and drops malformed entries; export enables manual backup. There is no account sync. A browser that blocks storage still supports the activities but cannot persist progress.

## Scale and zero-cost budget

GitHub's official documentation checked on 2026-10-21 says standard GitHub-hosted Actions runners are free for public repositories, and Pages is available for public repositories on GitHub Free. Pages has a 1 GB published-site limit and a soft 100 GB/month bandwidth limit. Use a public club-controlled repository, standard Linux runners, no paid runners and one-day deployment artifact retention. No custom domain is required.

The current build is below 1 MB before compression. The in-page tool filter is suitable for a small catalog, not an unlimited one. At approximately 1,000 records, measure browser DOM and search cost; paginate the static directory and shard search by section before it becomes sluggish. News is bounded to 3,000 retained records, grouped by publication date. Older records fall out of the active archive; Git history is not a convenient long-term query interface. Introduce year-sharded archives and a stable retention policy before promising permanent history. NVD enrichment rotates three oldest-check records each refresh and can lag a large catalog; EPSS is limited to the newest 50 KEV entries. Increasing coverage must preserve provider budgets and visible score age.

No dependency-free design guarantees unlimited free hosting. Monitor output bytes, bandwidth and runner behavior each term. If limits approach, remove large assets, shard archives and reduce polling before introducing any optional alternative host.

## Primary references

- https://docs.github.com/en/billing/concepts/product-billing/github-actions
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- https://docs.github.com/en/actions/reference/security/secure-use
- https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- https://api.first.org/epss/
- https://api.first.org/
- https://nvd.nist.gov/developers/vulnerabilities
- https://starlight.astro.build/manual-setup/
- https://docs.astro.build/en/guides/deploy/github/
