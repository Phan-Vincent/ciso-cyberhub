# Deployment guide

## Local build or any static host

Install Python 3.12+ and Node 24, then run `npm run check`, `npm test`, `npm run build`, and `python3 scripts/check_site.py`. Serve `dist/` with `python3 -m http.server 4321 --bind 127.0.0.1 --directory dist`. All runtime assets are local; a source outage cannot prevent this build.

The source archive includes a prebuilt root-path `dist/` for convenience. Use a local HTTP server, not file://. When running tests, the integration suite builds with `/cyberhub` to verify project-site paths; run `npm run build` afterward for the default local root URL.

## Approved GitHub Pages deployment

1. Obtain club permission for its name, branding and public repository. Use a club-controlled organization with at least two maintainers. Do not represent the project as university endorsed without authorization.
2. Create a public repository whose default branch is `main`. Import the source and local Git history if desired. No credentials or private data belong in the repository.
3. In Settings → Pages, select GitHub Actions as the publishing source. Use standard GitHub-hosted Linux runners. Enable Actions permissions for the pinned official actions.
4. Create repository variable `SITE_URL` with the origin, such as `https://your-org.github.io`. This example is a placeholder to replace; the generator requires a real configured HTTPS origin for deployment.
5. For a project repository named `cyberhub`, set `BASE_PATH=/cyberhub`. For an organization root site or approved custom domain, leave `BASE_PATH` empty. Do not put the repository path in SITE_URL as well.
6. Protect `main`: require reviews and the validation workflow. Configure the `github-pages` environment with approved reviewers where available. Add real CODEOWNERS after deciding maintainer teams.
7. Run the browser smoke suite, manual accessibility checks and live integration acceptance on a network-enabled machine. Review `docs/COVERAGE.md`; this release does not satisfy the full original production scope.
8. Review/update the independent-project wording in `site.json` only when authorization exists. Run `Deploy approved release` manually from `main`. The workflow validates, tests and uploads `dist/`, then requests Pages deployment.
9. Verify the deployed home, tool filters, practice quiz, lesson completion, flashcards, search, downloads, 404 behavior and subdirectory URLs. Confirm no fixture data appears.

No deployment or external repository creation was performed in the authoring environment. The workflow has not run on GitHub yet. The first hosted run must confirm action inputs, repository permissions and Pages configuration.

## Automated updates

The update workflow can create a review PR only if repository settings permit GitHub Actions to create pull requests. It uses the built-in token, not a paid service or personal token. GitHub may suppress further workflow events from bot-created changes; maintainers may need to trigger validation or push an approved follow-up commit before merging.

The scheduled job runs code from `main`, restores only allowlisted JSON from the open review branch, and never executes that branch's code. The proposal commit takes its source tree from `main` and only substitutes the allowlisted data. All publication remains manual in this candidate. Keep main protected and review any workflow changes separately.

## Rollback and recovery

Revert the faulty source or data change through a reviewed PR and dispatch deployment again. Build from the last known-good revision if ingestion is broken; cached approved data is sufficient. Preserve the last-success provenance instead of inventing a refresh time. Re-clone the repository and run a clean build at least once each term. Export browser progress before switching origin or base path, because storage namespaces differ.

## Release blockers

Live CISA, FIRST and GitHub API retrievals returned 403 in this environment. Chromium was absent and its download was denied, so actual browser checks were not run. Astro/Starlight installation was denied. These are recorded limitations, not successful integrations. The source code and offline tests remain runnable without those services.
