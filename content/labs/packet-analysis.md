## Objectives

Identify endpoints, distinguish queries from responses, correlate transactions, and explain the limits of packet evidence. This is an offline exercise: no network interface needs to be captured.

## Environment and prerequisites

Use Wireshark on your own computer. A basic laptop with 2 GB of free memory is sufficient for this tiny sample. Download [dns-training.pcap](/datasets/dns-training.pcap) and the [dataset manifest](/datasets/manifest.json). The PCAP is synthetic and contains no real traffic or personal data.

## Step-by-step investigation

1. Hash the file before opening it. Compare with the manifest and keep an original copy.
2. Open the capture in Wireshark as your ordinary user. Record the total number of packets.
3. Filter with `dns.flags.response == 0`. Record each query name, transaction ID, source address and destination address.
4. Change the filter to `dns.flags.response == 1`. Match responses to queries using transaction IDs and endpoints.
5. Expand the answer section. Record the returned address and explain why it differs from the DNS server address.
6. Clear the filter. Write a three-sentence observation using only facts present in the capture.

## Verification

There are four packets: two queries and two responses. The client is 192.0.2.10, the DNS server is 192.0.2.53, and the answer for lab.example is 192.0.2.80. The transactions use IDs 0x1200 and 0x1201. These are documentation addresses and a reserved example name. A DNS reply does not establish that a later connection occurred or that the destination is safe.

## Troubleshooting

If your filter hides everything, clear it and confirm the packet count. A display filter is not a capture filter. If the file will not open, confirm it was downloaded as binary and compare its digest; do not edit the PCAP in a text editor.

## Further challenge and deliverable

Use the Zeek tutorial to create DNS logs from the same sample, then explain one representation difference. Submit a short timeline, the input digest, tool version, and a paragraph separating observation from inference. Do not include unrelated personal captures in your portfolio.
