## Objectives

Inventory exposed services, make a reversible permission change, and verify that a control behaves as intended. A scanner score is supporting context, not the pass criterion.

## Environment and prerequisites

Use a disposable Linux VM you administer, with approximately 2 GB RAM and 10 GB disk. Take a snapshot and confirm console access. Avoid changing the host that provides your current remote session. Python 3 and standard Linux utilities are sufficient for the core exercise; Lynis is optional.

## Step-by-step exercise

1. Record the operating-system version, active user, listening ports and enabled services. Save the baseline in your working directory.
2. Create a training directory under your own home and a harmless note inside it. Record the directory permissions.
3. Set directory permissions to owner-only and verify the resulting mode. Explain which principals can traverse it and why file permissions alone are not the whole access story.
4. Start a local Python web server from a separate empty directory, binding to 127.0.0.1 on port 8765.
5. Inspect listening sockets and confirm the bind address. Use the local-only Nmap tutorial if installed.
6. Stop the service, check the socket again, and record the change. Remove only your created training files when done.

```sh
id
ss -lnt
systemctl list-unit-files --state=enabled
mkdir -p "$HOME/cyberhub-training"
chmod 700 "$HOME/cyberhub-training"
stat -c '%a %n' "$HOME/cyberhub-training"
python3 -m http.server 8765 --bind 127.0.0.1
```

## Verification

The directory mode should be 700. While the server is running, the listener should use 127.0.0.1:8765; a wildcard address indicates a different exposure. After stopping it, that listener should disappear unless another process uses the port. These checks demonstrate a narrow baseline, not complete system hardening.

## Troubleshooting

A distribution without systemd will not support systemctl; record its service manager and use its documented inspection command. A busy port requires checking the owning process rather than killing an unknown service. Never disable SSH, networking or firewall access as an unexplained trial-and-error fix.

## Further challenge

Run a Lynis audit using upstream instructions and select one recommendation you understand. Write a change plan, rollback procedure and independent verification. Keep the VM isolated and review findings manually before changing configuration.
