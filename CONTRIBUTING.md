# Contributing to CyberHub

Choose a narrow issue with a clear outcome. Read docs/EDITORIAL.md and docs/ARCHITECTURE.md before adding sources or content.

1. Create a branch from main. Never commit credentials, real student data, unauthorized packet captures, malware binaries or exam dumps.
2. Tool changes belong in data/tools.json with exact evidence URLs and field-specific verification. New automated discoveries stay pending until a human checks them.
3. Content lives in content/<section>/<slug>.md with a corresponding data/content.json record. Map objective IDs through data/academy.json. Use original questions and synthetic examples.
4. Run `npm run check`, `npm test`, `npm run build`, `python3 scripts/check_site.py` and `python3 scripts/security_check.py`. For UI changes, run browser-smoke.mjs and manual keyboard/mobile checks on a machine with a browser installed.
5. Submit a PR explaining the problem, change, source evidence, verification and limits. A separate reviewer should verify curriculum and licensing claims.
6. Do not mark a pathway complete based only on passing schema checks. Resolve all substantive subobjectives and obtain independent sign-off.

Use the issue templates for tool submissions, curriculum and defects. Keep source and publication dates separate. Update relevant documentation and fixtures when behavior changes. Do not add dependencies without a maintained upstream source, license review, lockfile and security evaluation.

By contributing original software you agree to its MIT license; original educational prose and synthetic datasets use CC BY 4.0. Clearly identify third-party content and permissions before proposing inclusion.
