## Purpose and scope

Trivy supports multiple scan targets and scanners. Be explicit about which capability you are invoking so the result’s meaning is clear. In this exercise, a filesystem vulnerability scan reads a local project and uses vulnerability data; it does not prove runtime exploitability.

## Prerequisites and safe installation

Use a trusted installation channel linked by the official project. Select an owned, non-sensitive training directory. The first run may download databases; disclose that dependency in your notes. Avoid supplying production secrets or broad filesystem roots. Consult the [official project documentation](https://trivy.dev/latest/docs/) for the current supported platforms and installation procedure. The commands below are teaching workflows; tool execution was not validated in the restricted authoring environment. Record your installed version and check its help before continuing.

## Guided workflow

1. Record the installed version.
2. Request a filesystem vulnerability scan only.
3. Save JSON output outside the target directory.
4. Examine package identities and fixed-version information where supplied.
5. Choose one finding for manual advisory verification and document whether the affected component is deployed.

### Command reference

Run these individually at the corresponding steps, not as an unattended script.

```text
trivy --version
trivy fs --scanners vuln --format json --output ../trivy-results.json .
```

## Verify the result

A valid result should identify the target and any discovered packages or findings. Record the database information reported by your installed version. A vulnerability finding is not a claim that an attacker has exploited your machine.

## Troubleshooting and next challenge

If the database cannot update, report the outage rather than suppressing errors. Some ecosystems require package metadata that is not in a minimal directory. Run a small target first to understand the format and resource requirements.

For your portfolio, save a short explanation of the question you investigated, your input, the tool version, the observations and the limits of your conclusion. Remove private paths and secrets before sharing. Continue with the [related lab](/labs/linux-hardening/).
