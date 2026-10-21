# Maintainer onboarding and long-term plan

## Ownership

Use a club-controlled public GitHub organization when authorized. Maintain at least two active administrators, require MFA, and avoid one graduating student's account becoming the only recovery path. Record ownership in the club's approved internal process; do not commit recovery codes or private contact details.

The project needs platform engineers, tool researchers, curriculum authors, intelligence/source reviewers and content reviewers. One person can hold several roles, but an author should not provide the sole independent review of their own course. Add real team names to CODEOWNERS after the organization exists; no fictional approvers are supplied.

## First maintainer session

1. Read README, ARCHITECTURE, COVERAGE and SECURITY.
2. Build from a clean clone with Node 24 and Python 3.12. No npm packages should be needed.
3. Run tests and both root and project-subdirectory builds. Inspect the site in a real browser.
4. Reproduce one lab using an installed upstream tool. Record version-specific corrections.
5. Run a live source dry run and inspect actual source responses, terms and freshness.
6. Confirm GitHub Actions permissions, branch protection and the release environment.
7. Rehearse rollback from a deliberately broken change on a non-production branch.

## Operating rhythm

Daily or at each club work session: inspect source freshness and source-review PR failures. A temporarily unavailable source must not force a fabricated update. Merge only reviewed records, then dispatch an authorized release when needed. This candidate intentionally does not promise unattended public publication.

Weekly: rotate review of new tool proposals, inspect unreachable/renamed repositories, accept or reject discovered projects, and review Dependabot action updates. Check that the source-review PR is not growing beyond a manageable size.

Monthly: reconcile certification names, versions, eligibility and official objectives; inspect the generated reminder and record who checked which source. Sample quiz rationales and verify a lab on a clean machine. Review output size, request budgets and account billing settings.

Each term: rotate administrative access, recruit a second reviewer, document outstanding exceptions and perform a clean build/deployment/rollback drill. Export a repository bundle and keep an approved backup. Confirm that departing members' tokens and organization access are removed without locking out the club.

## Sustainability measures

Measure review latency, source error age, number of stale tool records, test failures, unresolved content corrections and percentage of curriculum independently reviewed. Do not use fabricated page-view or threat counters. A useful maintenance goal is a small trusted core with visible unknowns, not a continually growing unreviewed catalog.

Prioritize work in BACKLOG.md. Promote new features only when their owner, tests and handoff instructions exist. Remove sources whose terms or reliability are unsuitable. Keep all essential functions usable without paid services, personal API keys or mandatory student accounts.
