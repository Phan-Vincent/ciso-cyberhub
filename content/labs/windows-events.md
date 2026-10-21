## Objectives

Correlate failed and successful logons, preserve timestamps and distinguish an alert pattern from a confirmed incident. Work with normalized event data before collecting sensitive logs from an actual endpoint.

## Environment and datasets

Any operating system with Python 3 or a spreadsheet viewer works. Download [windows-events.json](/datasets/windows-events.json) or [windows-events.csv](/datasets/windows-events.csv). These are deliberately synthetic normalized examples, not native EVTX files and not a complete Windows event schema. Download [incident.log](/datasets/incident.log) for later context.

## Guided investigation

1. Preserve the original file and record its digest using the dataset manifest.
2. Sort records by their UTC TimeCreated value and inspect RecordId order.
3. Group the 4625 records by account and source address. Count failures within this small sample.
4. Find the later 4624 event. Record which fields support correlation and which authentication details are missing.
5. Examine the 4688 process event and explain why its name alone does not prove legitimacy or compromise.
6. Read the operator note in incident.log and revise your assessment without deleting the earlier evidence.

```python
import json
from collections import Counter
from pathlib import Path
rows = json.loads(Path('windows-events.json').read_text())
print(Counter(row['EventID'] for row in rows))
```

## Verification and expected reasoning

The sample contains three failed logons, one success and one process-creation example. All five share the synthetic student-lab identity. The later operator note says the sequence was planned training. The initial sequence merited investigation but did not independently prove password guessing. Native Windows interpretation requires provider, logon type, audit configuration and other fields absent here.

## Troubleshooting

Do not import this JSON into an EVTX parser. If a spreadsheet changes timestamps to local time, retain the UTC originals. Field names matter: EventID is numeric in JSON and may be text after CSV import. Match deliberately and document conversions.

## Further challenge

On an owned Windows VM, inspect your own Security log in Event Viewer and compare the available fields with this reduced dataset. Do not upload real account names or workstation details. Produce a timeline with evidence identifiers, a plausible benign explanation, and the additional facts needed for an incident determination.
