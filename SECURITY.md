# Security policy

Version 0.1.0 is a pre-launch foundation. It has local automated checks, not a complete security audit. See docs/TEST_RESULTS.md for exactly what ran.

## Reporting

Once a club-controlled repository exists, enable GitHub private vulnerability reporting and use it for reports containing exploitation detail or sensitive information. Until that channel is configured, contact an authorized maintainer through an established private club channel. No working security email is fabricated in this package. Do not post tokens or personal information in public issues.

Report the affected revision, reproducible scenario, expected/observed behavior, likely impact and a minimal safe example. Test only your own local copy or an explicitly authorized target. A club association does not authorize testing university systems.

## Threat model and controls

Untrusted source content must remain data. The renderer escapes HTML; TypeScript uses textContent; source fetches use configured hosts, no redirects, response-size caps and request budgets. JSON-only update proposals cannot create workflows or executable files. Scheduled execution uses trusted main-branch code, and PR checks have read-only repository permissions. Release permissions are isolated from validation and publication is manual.

The site has no login or server database. Client-side quiz answers are public by design. Browser-local progress is not confidential or tamper-resistant. GitHub Pages hosting metadata and external source websites follow their own policies.

## Limitations and response

Meta CSP cannot enforce frame-ancestors; Pages does not provide arbitrary project-controlled response headers. Network adapter live acceptance and browser E2E remain incomplete in this environment. The bundled source guard only catches narrow secret patterns and unsafe constructs; it is not a full secret scanner. No vulnerable-dependency database scan was run, because no npm/Python packages are included and network access was blocked. Python, Node and official Action runtime dependencies still need maintained updates.

On a confirmed issue, withdraw unsafe content or revert affected code, keep approved cached data available, rotate any exposed credentials, add a meaningful regression test and document the correction. Do not label source retrieval failures as successful updates.
