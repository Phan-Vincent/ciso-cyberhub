# Editorial verification and style guide

## Trust states

- **Pending review:** candidate reference only. Do not publish capability, current-version or license claims as established facts.
- **Source-checked:** the named fields were checked against identified official pages on the stated date. Other fields may remain unknown. This is not a security endorsement, independent code audit or test of every feature.
- **Source-reported:** a machine-readable source supplied the record. Attribute it, preserve dates, and do not silently convert it into an independent assertion.
- **Introductory:** a useful lesson exists, but deep objective coverage and independent review are incomplete.
- **Reviewed:** a named subject-matter reviewer has checked the material, its scope, examples and assessment alignment. The initial curriculum has no such sign-off.

A timestamp is not a confidence score. An automated retrieval proves access to a response, not that its security claims are correct. Record the source URL, retrieved_at, last_verified, status and relevant document/version separately. Tool metadata uses `verified_fields` to avoid promoting an entire record from a single checked field.

## Tools

Use official repositories and documentation; inspect license scope, not only a badge. Distinguish core source, bundled components, rule packs, trademarks, hosted offerings and paid editions. Custom licenses must not be casually called OSI approved. Do not guess SPDX expressions, supported platforms, install commands or release versions. A project in maintenance mode is not automatically abandoned. Repository popularity is not an endorsement.

Difficulty, use-case links and study mappings are editorial judgments; label them accordingly. Prefer a narrow accurate record to a filled form containing unsupported metadata. Check source dates quarterly, and flag records older than 90 days for re-verification.

## Curriculum

Map original lessons and questions to objective identifiers in a verified provider document. Link the document; do not reproduce its complete outline or proprietary questions. Record which edition was mapped and whether that edition is currently available. Compare every required subtopic before marking a course complete. Main-objective ID coverage alone is insufficient.

Questions must have one defensible best answer under the stated conditions, plausible distinct distractors, an explanation and a mapped objective. Avoid trivia that does not support a learning outcome. Practice scores are formative; no pass guarantee or equivalence to a provider exam is claimed. Separate recommended experience, formal eligibility, course prerequisites and exam cost.

## News and vulnerability records

Publish links and attribution. The current adapter does not publish excerpts or generated summaries. Any future factual summary needs direct source access, an explicit quotation/redistribution policy and a reviewer for consequential claims. Headline-only access does not support an invented article summary. Publication time, source retrieval time and event time are different fields.

Do not equate CVSS, EPSS and KEV. Record score version and score date when available. A source's evidence of exploitation does not prove the reader's system is compromised. Vendor guidance and applicability must be checked before action. Avoid editorial certainty about actor identity without appropriate evidence.

## Writing and accessibility

Lead with the task and why it matters. Use short, concrete explanations, define acronyms once and provide a checkable expected result. Every lab needs scope, setup, steps, verification, troubleshooting and a further challenge. Use synthetic data where real personal data adds no teaching value. Keep code copyable, commands scoped, and dangerous context explicit. Do not use color alone to communicate status. Provide meaningful link text and test keyboard use.

The Markdown renderer supports a limited safe subset documented in ARCHITECTURE.md. Raw HTML and MDX will not execute. Add metadata through JSON and run validation before submitting a PR.

## Corrections

Open a narrow issue with a source, the affected statement and a proposed correction. Urgent unsafe commands or materially false claims should be withdrawn promptly. Record the reason and correction in Git history; do not backdate verification. Curriculum changes require a reviewer other than the author before the status becomes reviewed.
