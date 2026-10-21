# CISO CyberHub

A working static cybersecurity learning hub for a proposed student-maintained CISO community project. This repository complements https://www.ciso-csusb.org/; it does not replace that site or claim university or club authorization.

**Release 0.1.0: working foundation, not the completed production scope.** The local build produces 98 routes. Live source acceptance, browser QA, deeper curriculum review and public deployment are still blocked or incomplete. See [coverage](docs/COVERAGE.md) and [test evidence](docs/TEST_RESULTS.md).

## Run locally

Prerequisites: Python 3.12+ and Node.js 24. No `npm install`, API key, account or paid service is required to build and browse the core site.

```sh
npm run check
npm test
npm run build
python3 -m http.server 4321 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:4321. Use `npm run dev` to build and serve in one command. Stop with Ctrl+C; after edits, rebuild and refresh. There is no development hot reload. Directly opening index.html through file:// does not support the JSON fetches and root-relative navigation; use the local server.

## Included

- 27 tool records with field-specific upstream evidence, license distinctions, filters and detail pages.
- 10 substantial tool walkthroughs; external tool execution remains to be checked by a maintainer.
- 28 original Security+ introductory lessons mapped to SY0-701 main objectives, 28 questions and 28 flashcards.
- Timed/untimed quizzes, rationales, domain feedback, completion tracking, export/import and reset.
- Five guided labs with original synthetic PCAP, JSON/CSV logs and harmless detection fixtures.
- Eleven role roadmaps and a beginner path.
- RSS/Atom, CISA KEV, FIRST EPSS and bounded NVD adapters, last-success tracking and a review queue.
- 21 additional certification planning records, explicitly unverified and incomplete.
- Static full-site search, dark/light modes, mobile CSS, semantic HTML and local-only progress.
- CI, review-PR automation, scheduled maintenance and a manual approved-release Pages workflow.

## Intentional stack deviation

The requested Astro/Starlight packages could not be downloaded: the environment returned HTTP 403 from registry.npmjs.org. This implementation instead uses a Python standard-library static generator and TypeScript compiled with Node 24's built-in type stripping. There are **zero package dependencies**. It builds without network access. This is an environment-driven alternative, not a claim that a custom renderer is generally better than Starlight. The content is Markdown plus JSON to preserve a migration path. See [architecture](docs/ARCHITECTURE.md).

## Source updates

```sh
python3 -m hub.ingest --dry-run
python3 -m hub.ingest
python3 -m hub.catalog --dry-run
python3 -m hub.maintenance links --dry-run
python3 -m hub.maintenance certifications
```

These commands only change local data when not in dry-run mode. No script merges or deploys changes. Network endpoints were denied in the authoring environment, so the delivered live dashboard correctly shows no retrieved records and the actual failures. Integration fixtures are used only by tests. Do not publish them as live reporting.

## Repository map

| Path | Purpose |
| --- | --- |
| `hub/` | Build, Markdown rendering, data validation and ingestion |
| `web/` | TypeScript behavior and CSS |
| `content/` | Original lessons, tutorials, labs and career guides |
| `data/` | Curated records, objective mappings, source state and review queue |
| `public/datasets/` | Original synthetic lab artifacts and SHA-256 manifest |
| `scripts/` | Output checks, controlled PR creation and release checks |
| `tests/` | Unit/integration tests and optional browser smoke test |
| `docs/` | Architecture, coverage, deployment, maintenance and limitations |
| `.github/` | Pinned workflows and contribution templates |

The software is MIT licensed; original prose and synthetic datasets are CC BY 4.0. Third-party material retains its own terms. No exam dumps or full source articles are included.

## Release documentation

Read [deployment](docs/DEPLOYMENT.md), [automation](docs/AUTOMATION.md), [maintainer onboarding](docs/MAINTAINERS.md), [editorial policy](docs/EDITORIAL.md), [backlog](docs/BACKLOG.md), [CONTRIBUTING](CONTRIBUTING.md), and [SECURITY](SECURITY.md).

The supplied `repository.bundle` preserves local Git history. To recover a Git checkout from the packaged deliverable:

```sh
git clone repository.bundle cyberhub-checkout
```

Alternatively, use the included source tree. No external repository or public website was created or pushed.
