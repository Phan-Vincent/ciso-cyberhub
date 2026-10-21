## Purpose and scope

ZAP can observe browser traffic through a proxy. Begin with passive inspection of a disposable local service. Passive analysis does not intentionally attack endpoints, but the browser still sends ordinary requests. Keep all navigation inside your owned test scope.

## Prerequisites and safe installation

Install ZAP through its official distribution. Start a Python HTTP server from an empty training directory bound to 127.0.0.1 on port 8765. Use the browser launched from ZAP’s manual exploration interface so proxy settings do not affect your everyday browser profile. Consult the [official project documentation](https://www.zaproxy.org/getting-started/) for the current supported platforms and installation procedure. The commands below are teaching workflows; tool execution was not validated in the restricted authoring environment. Record your installed version and check its help before continuing.

## Guided workflow

1. Set the manual exploration URL to your loopback server.
2. Launch the disposable browser and make one request.
3. Inspect the request method, path, response status and headers in history.
4. Review passive alerts and distinguish observations from confirmed impact.
5. Close the disposable browser, stop the server and discard the session when finished.

### Command reference

Run these individually at the corresponding steps, not as an unattended script.

```text
python3 -m http.server 8765 --bind 127.0.0.1
```

## Verify the result

You should see the request and response in ZAP history. A missing header on a training server is an observation whose significance depends on application context. Do not run active scans or automated exploration against university systems.

## Troubleshooting and next challenge

If history is empty, confirm that you used the ZAP-launched browser and that the server is reachable. Do not install a proxy certificate in a permanent system trust store for this HTTP-only exercise.

For your portfolio, save a short explanation of the question you investigated, your input, the tool version, the observations and the limits of your conclusion. Remove private paths and secrets before sharing. Continue with the [related lab](/labs/packet-analysis/).
