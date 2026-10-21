## Objectives

Build a deterministic pattern rule, demonstrate positive and negative behavior, and describe false-positive limits. Learn why a single matching event is not a correlation rule.

## Environment and prerequisites

For the executable path, install the original YARA CLI through its official documentation. The fixture data is harmless text and can be read without YARA. Download [training.yar](/datasets/training.yar), [positive.txt](/datasets/positive.txt), [negative.txt](/datasets/negative.txt), and optionally [training-sigma.yml](/datasets/training-sigma.yml).

## Guided exercise

1. Inspect the two text fixtures and predict the result of the TrainingMarker rule.
2. Run YARA separately against each file. Record stdout, stderr and exit status.
3. Make a copy of the positive file and change one character in the marker. Run again and explain the result.
4. Add the unchanged marker to an unrelated harmless text file. Explain why this creates a match without demonstrating malicious behavior.
5. Open the Sigma example. It matches individual Windows Security events with EventID 4625; it does not implement a time window, failure threshold or account grouping.
6. Write a separate design for a correlation rule, specifying grouping fields, time window, threshold, suppression and expected false positives. Do not claim the simple YAML already implements it.

```sh
yara training.yar positive.txt
yara training.yar negative.txt
```

## Verification

TrainingMarker should match positive.txt and not negative.txt. A syntax or execution error is neither a positive nor a clean negative. The Sigma example would conceptually select three failure records from the supplied Windows dataset, but deployment needs a compatible backend and tested field mappings. No native SIEM conversion is included in this release.

## Troubleshooting

Check case, encoding and copied quotes when a marker fails to match. Verify the installed tool’s syntax rather than suppressing errors. If a rule is too broad, add a relevant condition and retest both positive and benign samples.

## Further challenge

Write three additional negative fixtures, including one with a near-match string. Keep the rule purpose and limitations alongside the test data. Submit your rule, expected outcomes, observed outcomes, tool version and a short explanation of what the rule cannot establish.
