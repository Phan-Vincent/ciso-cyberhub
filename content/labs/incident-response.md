## Objectives

Preserve a small evidence set, create a reproducible timeline and recommend a proportionate response. The scenario is a possible unauthorized logon in an isolated training environment. There is no actual malware or compromise to contain.

## Environment and prerequisites

Use an empty local working directory and Python 3. Download [incident.log](/datasets/incident.log), [windows-events.json](/datasets/windows-events.json) and the [manifest](/datasets/manifest.json). Keep originals in an evidence subdirectory and work from copies. A normal laptop is sufficient; memory acquisition tools are not required.

## Response procedure

1. Record the source filenames, acquisition time, operator and SHA-256 digests. Note that the published manifest is a comparison reference, not independent proof of authenticity.
2. Create working copies. Verify their digests against the originals before analysis.
3. Build a timeline of the authentication events and the process example. Preserve the UTC timezone and record identifiers.
4. List two hypotheses: a malicious guessing sequence and a planned login exercise. Identify supporting and conflicting evidence for each.
5. Incorporate the final operator note. Explain why it changes the assessment and what independent confirmation you would seek in a real case.
6. Draft a containment recommendation with an owner and a trigger. Avoid destructive action when evidence only supports a training event.
7. Define a recovery test and a lessons-learned action even if the event is closed as benign.

```python
import hashlib
from pathlib import Path
for name in ('incident.log', 'windows-events.json'):
    print(name, hashlib.sha256(Path(name).read_bytes()).hexdigest())
```

## Verification

A peer should be able to reproduce every timeline statement from a cited record. Original and working-copy digests should match before analysis. The operator note supports a benign training explanation; it is still a claim whose author and authority would need validation in a real investigation. Do not call this synthetic dataset a confirmed breach.

## Troubleshooting

If digests differ, stop and explain the difference before proceeding. Newline conversion, an accidental edit or the wrong download may be responsible. Hashes cannot repair evidence. Keep acquisition facts separate from interpretations and do not silently overwrite originals to make verification pass.

## Further challenge

Write a one-page report with observations, hypotheses, uncertainties, response decision and verification. Then have a peer challenge one conclusion. For future memory-forensics work, use an explicitly licensed training image in an isolated environment; no memory image is redistributed here.
