## Purpose and scope

A port scan reports observations about reachability and service exposure. This tutorial stays on the loopback address of your own machine and uses one port. It does not authorize scanning campus or third-party infrastructure. Nmap has a custom license; inspect the upstream terms before redistributing it.

## Prerequisites and safe installation

Use the official Nmap installation instructions for your operating system. You also need Python 3 and an empty training directory. Confirm that port 8765 is not already used by a service you depend on. No root privileges are required for the TCP connect scan here. Consult the [official project documentation](https://nmap.org/book/man-port-scanning-techniques.html) for the current supported platforms and installation procedure. The commands below are teaching workflows; tool execution was not validated in the restricted authoring environment. Record your installed version and check its help before continuing.

## Guided workflow

1. Run the scan before starting a service and record the state of port 8765.
2. In a second terminal, run the Python server from an empty directory. The bind address keeps it local.
3. Repeat the same scan and compare the state.
4. Stop the server with Ctrl+C and repeat once more.
5. Save the commands, timestamps and three observations in a short report.

### Command reference

Run these individually at the corresponding steps, not as an unattended script.

```text
nmap -sT -Pn -p 8765 127.0.0.1
python3 -m http.server 8765 --bind 127.0.0.1
nmap -sT -Pn -p 8765 127.0.0.1
```

## Verify the result

When the server is running and listening, the scan should report that local TCP port open. When it is absent, the result depends on the host firewall but commonly becomes closed. An open port is not itself a vulnerability; it identifies a reachable listener.

## Troubleshooting and next challenge

If the state never changes, verify that you started the server on the same host, used the right port, and stopped the correct process. Do not expand the target range to solve a local setup problem.

For your portfolio, save a short explanation of the question you investigated, your input, the tool version, the observations and the limits of your conclusion. Remove private paths and secrets before sharing. Continue with the [related lab](/labs/linux-hardening/).
