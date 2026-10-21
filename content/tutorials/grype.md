## Purpose and scope

Grype matches package information to vulnerability data. A match is a starting point for triage: package identity, installed version, ecosystem and advisory scope all matter. A database timestamp is essential context for a clean or noisy result.

## Prerequisites and safe installation

Install the CLI using the upstream instructions. Produce training-sbom.json with the Syft tutorial. Grype’s vulnerability database may need a network download, so this step is not guaranteed to work offline on first use. Keep results local. Consult the [official project documentation](https://github.com/anchore/grype) for the current supported platforms and installation procedure. The commands below are teaching workflows; tool execution was not validated in the restricted authoring environment. Record your installed version and check its help before continuing.

## Guided workflow

1. Check the tool version and database status.
2. Scan the saved SBOM without changing the inventory.
3. For one match, inspect package version, vulnerability identifier, fix information and matching explanation.
4. Open the original advisory and confirm its applicability.
5. Record uncertainty and test remediation rather than closing the issue solely from an installer exit code.

### Command reference

Run these individually at the corresponding steps, not as an unattended script.

```text
grype version
grype db status
grype sbom:../training-sbom.json -o json > ../training-vulnerabilities.json
```

## Verify the result

You should obtain structured output or an explicit database/input error. An empty match list can mean no known matches in the loaded database; it does not establish the software is free from vulnerabilities.

## Troubleshooting and next challenge

If database access fails, record the failure and the last available database age. Do not label an aborted scan clean. If package coordinates are incomplete, improve the SBOM before treating matching output as authoritative.

For your portfolio, save a short explanation of the question you investigated, your input, the tool version, the observations and the limits of your conclusion. Remove private paths and secrets before sharing. Continue with the [related lab](/labs/incident-response/).
