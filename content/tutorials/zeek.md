## Purpose and scope

Zeek turns observed traffic into structured logs that support analysis. This walkthrough reads the provided offline DNS capture. No live interface capture or privileged network access is needed. The generated logs describe the sample, not a real threat investigation.

## Prerequisites and safe installation

Install Zeek through the official instructions for your platform. Download dns-training.pcap from the packet-analysis lab and place it in a parent directory. Create a fresh output directory to keep generated logs separate from source evidence. Consult the [official project documentation](https://docs.zeek.org/en/current/quickstart.html) for the current supported platforms and installation procedure. The commands below are teaching workflows; tool execution was not validated in the restricted authoring environment. Record your installed version and check its help before continuing.

## Guided workflow

1. Record the version and the SHA-256 of the input file.
2. Run Zeek from the fresh output directory with the offline capture path.
3. Open dns.log as a tab-separated text file.
4. Correlate query names and transaction IDs with the Wireshark observations.
5. Record any differences in representation and missing context.

### Command reference

Run these individually at the corresponding steps, not as an unattended script.

```text
zeek --version
zeek -r ../dns-training.pcap
head -n 15 dns.log
```

## Verify the result

The sample should lead to DNS transaction records when supported by the installed analyzer. Zeek log headers identify field names and types. Preserve them when exporting; positional assumptions without headers make later analysis fragile.

## Troubleshooting and next challenge

If dns.log is absent, inspect stderr, verify the capture path and confirm the file contains UDP DNS traffic. Avoid bypassing checksum checks blindly; identify whether the problem is the file, capture offload or analyzer configuration.

For your portfolio, save a short explanation of the question you investigated, your input, the tool version, the observations and the limits of your conclusion. Remove private paths and secrets before sharing. Continue with the [related lab](/labs/packet-analysis/).
