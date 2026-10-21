## Purpose and scope

Packet analysis explains what was observed on a network link. Begin with an offline capture so you do not collect other people’s traffic. The included capture is synthetic: it contains two DNS queries and two responses using documentation-only IP addresses. It is a teaching artifact, not an incident capture.

## Prerequisites and safe installation

Install Wireshark from its official distribution or a trusted operating-system package source. Open the application as your ordinary user; reading this file does not require capture privileges. Download the training PCAP from the packet-analysis lab and open it with File → Open. Consult the [official project documentation](https://www.wireshark.org/docs/wsug_html/index.html) for the current supported platforms and installation procedure. The commands below are teaching workflows; tool execution was not validated in the restricted authoring environment. Record your installed version and check its help before continuing.

## Guided workflow

1. Set the display filter to `dns` and apply it. All four packets should remain.
2. Use `dns.flags.response == 0` to isolate the two queries.
3. Select a query and expand the DNS details. Record its transaction ID, queried name, source and destination.
4. Match the response using transaction ID and the reversed endpoints.
5. Clear the filter and compare the displayed and total packet counts.

### Command reference

Run these individually at the corresponding steps, not as an unattended script.

```text
dns
dns.flags.response == 0
ip.addr == 192.0.2.10
```

## Verify the result

You should identify two query/response pairs for lab.example. A display filter hides packets from the view; it does not erase them from the capture. Record the destination IP in the answer and distinguish it from the IP address in a DNS response.

## Troubleshooting and next challenge

If the capture is empty, verify that you opened the provided PCAP rather than the accompanying JSON. If a filter is rejected, enter it without surrounding quotes. Never infer application compromise from a DNS lookup alone.

For your portfolio, save a short explanation of the question you investigated, your input, the tool version, the observations and the limits of your conclusion. Remove private paths and secrets before sharing. Continue with the [related lab](/labs/packet-analysis/).
