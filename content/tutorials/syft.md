## Purpose and scope

A software bill of materials is an inventory, not a vulnerability assessment. Syft discovers package information in a chosen target and records it in a structured format. The result depends on supported package ecosystems and which files are visible; an incomplete filesystem can yield an incomplete inventory.

## Prerequisites and safe installation

Install Syft from the official repository instructions and verify the release according to upstream guidance. Use a small local project you own. This example scans a directory without pulling a container image or granting access to a Docker socket. Consult the [official project documentation](https://github.com/anchore/syft) for the current supported platforms and installation procedure. The commands below are teaching workflows; tool execution was not validated in the restricted authoring environment. Record your installed version and check its help before continuing.

## Guided workflow

1. Read the installed version and command help.
2. Scan the directory to a JSON SBOM outside the scanned directory.
3. Open the JSON and locate the target description and artifacts list.
4. Pick one package and trace it back to the manifest or installed metadata that supports it.
5. Note unresolved versions and files outside the chosen scope.

### Command reference

Run these individually at the corresponding steps, not as an unattended script.

```text
syft version
syft dir:. -o syft-json > ../training-sbom.json
```

## Verify the result

The output should be parseable JSON. A directory without recognized packages may legitimately have an empty artifact list. Preserve the tool version and target context so another person can reproduce the inventory.

## Troubleshooting and next challenge

If expected packages are missing, check the target path and whether dependencies are actually installed or represented in a supported manifest. Do not invent versions to fill gaps. Use the Grype tutorial to explore the separate matching stage.

For your portfolio, save a short explanation of the question you investigated, your input, the tool version, the observations and the limits of your conclusion. Remove private paths and secrets before sharing. Continue with the [related lab](/labs/linux-hardening/).
