## Purpose and scope

Secret scanning finds patterns that may represent sensitive credentials. Findings require investigation, and a clean report is not proof that a repository never held a secret. This walkthrough uses a local directory and avoids uploading any source code or real credentials to a service.

## Prerequisites and safe installation

Install the standalone Gitleaks CLI using the upstream release instructions. Its commercial automation offerings have separate terms; this tutorial uses the CLI. Start with the public CyberHub source directory or another directory you own. Do not manufacture real cloud credentials for testing. Consult the [official project documentation](https://github.com/gitleaks/gitleaks) for the current supported platforms and installation procedure. The commands below are teaching workflows; tool execution was not validated in the restricted authoring environment. Record your installed version and check its help before continuing.

## Guided workflow

1. Record the CLI version and read `gitleaks dir --help` to check supported flags.
2. Run a redacted directory scan and save a JSON report outside any directory that will be published.
3. Check the process exit status as well as the report.
4. Review each finding’s location and context without pasting secret material into an issue.
5. If a real credential is found, revoke or rotate it; deleting one file is insufficient.

### Command reference

Run these individually at the corresponding steps, not as an unattended script.

```text
gitleaks version
gitleaks dir --help
gitleaks dir . --redact --report-format json --report-path ../gitleaks-report.json
```

## Verify the result

A successful scan should produce a report in the requested location. Findings commonly produce a nonzero exit status; distinguish that from an invocation error. Directory scanning does not inspect deleted content in the full Git history.

## Troubleshooting and next challenge

If the `dir` command is unavailable, you have a different CLI generation; use its installed help and official documentation rather than guessing legacy flags. Keep reports private even with redaction enabled because paths and context may still be sensitive.

For your portfolio, save a short explanation of the question you investigated, your input, the tool version, the observations and the limits of your conclusion. Remove private paths and secrets before sharing. Continue with the [related lab](/labs/incident-response/).
