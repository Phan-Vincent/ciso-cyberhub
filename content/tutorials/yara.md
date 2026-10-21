## Purpose and scope

YARA identifies byte or text patterns. A match is a rule result, not a verdict that a file is malicious. Use a harmless marker to understand the matching pipeline without downloading malware. The original YARA project is in maintenance mode; evaluate current upstream guidance before choosing it for a new operational deployment.

## Prerequisites and safe installation

Install YARA from the upstream instructions or a trusted system package. Create an empty working directory. Download training.yar, positive.txt and negative.txt from the detection-engineering lab. Inspect all three in a text editor before running the rule. Consult the [official project documentation](https://yara.readthedocs.io/en/stable/writingrules.html) for the current supported platforms and installation procedure. The commands below are teaching workflows; tool execution was not validated in the restricted authoring environment. Record your installed version and check its help before continuing.

## Guided workflow

1. Read the rule condition and predict which file will match.
2. Run the rule against positive.txt, then negative.txt.
3. Change one character in a copy of the positive marker and run it again.
4. Add the original marker to a different harmless file and observe a match.
5. Explain why a generic marker is not a reliable malware-family identifier.

### Command reference

Run these individually at the corresponding steps, not as an unattended script.

```text
yara training.yar positive.txt
yara training.yar negative.txt
```

## Verify the result

Only positive.txt should produce the TrainingMarker rule name for the unmodified fixtures. An empty output on the negative sample means no match, provided the command itself completed successfully. Syntax errors must not be treated as clean results.

## Troubleshooting and next challenge

If both files match, inspect accidental edits or broad conditions. If neither matches, check the case-sensitive marker and path. Build negative tests from realistic benign files before operational deployment.

For your portfolio, save a short explanation of the question you investigated, your input, the tool version, the observations and the limits of your conclusion. Remove private paths and secrets before sharing. Continue with the [related lab](/labs/detection-engineering/).
