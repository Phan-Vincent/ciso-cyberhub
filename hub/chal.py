"""Challenge labs: Packet Lab, Log Hunt, Crypto & Encoding Lab, Secure Code Review.
Synthetic data and engines live in web/chal.ts; these functions only build the page shells.
"""
from __future__ import annotations


def _shell(lab: str, workspace: str, answer: bool = True) -> str:
    form = ('<form class="ch-form" id="ch-form" autocomplete="off"><label class="label" for="ch-a">Your answer</label>'
            '<input id="ch-a" type="text" maxlength="120" spellcheck="false"><button type="submit" class="primary">Check</button></form>') if answer else ''
    return (f'<div class="chal" id="chal" data-lab="{lab}"><div class="ch-top"><nav class="rt-lvls ch-lvls" id="ch-lvls" aria-label="Levels"></nav><span class="label" id="ch-count"></span></div>'
            '<section class="ch-task"><p class="label" id="ch-lvl"></p><p class="ch-q" id="ch-q"></p></section>'
            f'{workspace}{form}<p class="ch-msg" id="ch-msg" role="status"></p>'
            '<div class="ch-help"><button type="button" id="ch-hint">Stuck? Get a hint</button><ol class="ch-hints" id="ch-hints"></ol></div>'
            '<div class="soc-result" id="ch-lesson" hidden><strong>What this teaches</strong><p></p><button type="button" class="primary" id="ch-next">Next level →</button></div>'
            '<noscript><p class="notice">This lab needs JavaScript.</p></noscript></div>')


def pcap_page(site) -> str:
    body = site.heading('Packet Lab', 'Read a network capture like an analyst with Wireshark. Filter the traffic, open packets, and answer what happened on the network.', 'Labs / Packet Lab')
    quick = ''.join(f'<button type="button" data-f="{f}">{f}</button>' for f in ['dns', 'http', 'ftp', 'arp', 'tls', 'tcp.flags.syn == 1', 'ip.addr == 10.0.5.31'])
    ws = ('<section class="pc-ws"><form class="pc-form" id="pc-form" autocomplete="off"><label class="sr-only" for="pc-filter">Display filter</label>'
          '<input id="pc-filter" type="text" spellcheck="false" placeholder="Display filter, e.g. dns or ip.src == 10.0.5.20"><button type="submit">Apply</button><button type="button" id="pc-clear">Clear</button></form>'
          f'<p class="ch-err" id="pc-err" role="alert"></p><div class="pc-quick" aria-label="Example filters">{quick}</div><p class="label" id="pc-count"></p>'
          '<div class="pc-scroll"><table class="pc-table"><thead><tr><th>No.</th><th>Time</th><th>Source</th><th>Destination</th><th>Proto</th><th>Info</th></tr></thead><tbody id="pc-body"></tbody></table></div>'
          '<div class="pc-detail" id="pc-detail" hidden></div>'
          '<details class="ch-ref"><summary>Filter cheat sheet</summary><ul>'
          '<li><code>dns</code>, <code>http</code>, <code>ftp</code>, <code>arp</code>, <code>tls</code>, <code>icmp</code>, <code>tcp</code>, <code>udp</code>: one protocol</li>'
          '<li><code>ip.addr == 10.0.5.31</code>, <code>ip.src</code>, <code>ip.dst</code>: by address</li>'
          '<li><code>tcp.port == 21</code>, <code>tcp.dstport</code>, <code>udp.port</code>: by port</li>'
          '<li><code>tcp.flags.syn == 1</code>, <code>tcp.flags.ack</code>, <code>tcp.flags.reset</code>: TCP flags</li>'
          '<li><code>http.request</code>, <code>http.host contains "x"</code>, <code>http.request.uri</code>, <code>dns.qry.name contains "x"</code></li>'
          '<li><code>frame contains "text"</code>: anywhere in the packet. Combine with <code>&amp;&amp;</code>, <code>||</code>, <code>!</code> and brackets.</li></ul></details></section>')
    body += _shell('pcap', ws)
    body += ('<section class="rt-about"><h2>Practice on the real thing</h2><p>Wireshark is free. Capture only on networks you own or have permission to monitor, or open the public sample captures from the Wireshark wiki. '
             + site.a('Wireshark in the tool explorer', '/tools/wireshark/') + '.</p></section>')
    return body


def hunt_page(site) -> str:
    body = site.heading('Log Hunt', 'A web server was broken into. Search its logs like a SIEM analyst, follow the attacker from the first guess to the backdoor account, and build the timeline.', 'Labs / Log Hunt')
    quick = ''.join(f'<button type="button" data-q="{q}">{q}</button>' for q in ['source=auth', 'source=web', 'action=failed | stats count by user', 'status>=400 | stats count by path', 'source=web | table time,src_ip,path,status'])
    ws = ('<section class="lh-ws"><form class="pc-form" id="lh-form" autocomplete="off"><label class="sr-only" for="lh-q">Search</label>'
          '<input id="lh-q" type="text" spellcheck="false" placeholder="Search, e.g. action=failed | stats count by src_ip"><button type="submit">Search</button></form>'
          f'<p class="ch-err" id="lh-err" role="alert"></p><div class="pc-quick" aria-label="Example searches">{quick}</div><p class="label" id="lh-count"></p><div class="lh-out" id="lh-out" tabindex="0" role="region" aria-label="Search results"></div>'
          '<details class="ch-ref"><summary>Search cheat sheet</summary><ul>'
          '<li>Words match anywhere in the raw line: <code>sudo</code>, <code>"new user"</code></li>'
          '<li><code>field=value</code> (use <code>*</code> as a wildcard), <code>field!=value</code>, <code>status&gt;=500</code>, <code>NOT</code> before a term</li>'
          '<li>Fields: time, source, host, src_ip, user, action, cmd, method, path, status, ua</li>'
          '<li>Pipes: <code>| stats count by src_ip</code>, <code>| head 10</code>, <code>| tail 5</code>, <code>| table time,user,cmd</code></li></ul></details></section>')
    body += _shell('hunt', ws)
    body += ('<section class="rt-about"><h2>Where this leads</h2><p>The same moves work in Splunk, Elastic and Microsoft Sentinel: filter, count, pivot on a value, and build a timeline. Next, write the rule that would have caught this in the '
             + site.a('detection engineering lab', '/labs/detection-engineering/') + '.</p></section>')
    return body


def crypto_page(site) -> str:
    body = site.heading('Crypto & Encoding Lab', 'Analysts decode strings all day: in logs, emails and malware. Build a recipe of steps, CyberChef-style, to recover each flag, and learn which tricks are encoding and which are real encryption.', 'Labs / Crypto & Encoding')
    ws = ('<section class="cr-ws"><div class="cr-grid"><div><label class="label" for="cr-in">Input</label><textarea id="cr-in" rows="4" spellcheck="false"></textarea>'
          '<p class="label">Add a step</p><div class="cr-ops" id="cr-ops"></div></div>'
          '<div><p class="label">Recipe</p><ol class="cr-recipe" id="cr-recipe"></ol><p><button type="button" id="cr-reset">Clear recipe</button> <button type="button" id="cr-hash">SHA-256 the input</button></p>'
          '<p class="label">Output</p><pre class="cr-out" id="cr-out" aria-live="polite"></pre><p class="ch-err" id="cr-err" role="alert"></p></div></div></section>')
    body += _shell('crypto', ws)
    body += ('<section class="rt-about"><h2>Encoding is not encryption</h2><p>Base64, hex, URL encoding and binary only change how bytes are written. ROT13, Caesar and single-byte XOR are toy ciphers. Real protection uses vetted algorithms (AES, ChaCha20) with secret, random keys, and passwords use slow hashes like Argon2. '
             + site.a('CyberChef', '/tools/cyberchef/') + ' does all of this and more.</p></section>')
    return body


def review_page(site) -> str:
    body = site.heading('Secure Code Review', 'Twelve short snippets from apps and cloud configs, each with one real vulnerability. Find the line, then choose the fix that removes the root cause.', 'Labs / Secure Code Review')
    ws = '<section class="rv-ws"><div class="rv-code" id="rv-code" role="group" aria-label="Code"></div><div class="rv-fixes" id="rv-fixes" hidden></div></section>'
    body += _shell('review', ws, answer=False)
    body += ('<section class="rt-about"><h2>Why this matters</h2><p>These are the same bug classes as the OWASP Top 10 and the CWE Top 25. Tools like Semgrep catch many of them automatically, and AI coding assistants write them often, so review every line you ship. See '
             + site.a('Secure AI coding', '/ai/vibe-coding/') + '.</p></section>')
    return body


def ad_page(site) -> str:
    body = site.heading('Active Directory Lab', 'Most school and company networks run on Microsoft Active Directory. Investigate a domain controller\'s security log and follow an attacker from a password spray to owning the domain.', 'Labs / Active Directory')
    quick = ''.join(f'<button type="button" data-q="{q}">{q}</button>' for q in ['event_id=4771 | stats count by src_ip', 'event_id=4624 | table time,user,src_ip', 'event_id=4769 | stats count by enc', 'user=svc_backup', 'cleared'])
    ws = ('<section class="lh-ws"><form class="pc-form" id="lh-form" autocomplete="off"><label class="sr-only" for="lh-q">Search</label>'
          '<input id="lh-q" type="text" spellcheck="false" placeholder="Search, e.g. event_id=4771 | stats count by user"><button type="submit">Search</button></form>'
          f'<p class="ch-err" id="lh-err" role="alert"></p><div class="pc-quick" aria-label="Example searches">{quick}</div><p class="label" id="lh-count"></p><div class="lh-out" id="lh-out" tabindex="0" role="region" aria-label="Search results"></div>'
          '<details class="ch-ref"><summary>Event IDs and search cheat sheet</summary><ul>'
          '<li><b>4624</b> logon succeeded · <b>4771</b> Kerberos pre-auth failed (wrong password) · <b>4768</b> ticket-granting ticket requested · <b>4769</b> service ticket requested</li>'
          '<li><b>4728</b> member added to a security group · <b>4662</b> directory object accessed · <b>1102</b> audit log cleared</li>'
          '<li>Ticket encryption: <code>0x12</code> AES (good), <code>0x17</code> RC4 (weak). PreAuthType <code>0</code> means no pre-authentication.</li>'
          '<li>Fields: time, event_id, dc, user, src_ip, service, enc, preauth, group, member, by, status. Pipes: <code>| stats count by user</code>, <code>| table time,user</code>, <code>| head 10</code></li></ul></details></section>')
    body += _shell('ad', ws)
    body += ('<section class="rt-about"><h2>Defend the domain</h2><p>Strong, unique passwords and MFA stop sprays; long random service-account passwords and AES-only Kerberos blunt Kerberoasting; alerts on Domain Admins changes and replication rights catch the rest. '
             'Microsoft\'s free Sysmon and the open-source BloodHound (used by defenders to find attack paths) are worth learning next.</p></section>')
    return body


def cloud_page(site) -> str:
    body = site.heading('Cloud Security Lab', 'Most cloud breaches are configuration mistakes, not clever hacks. Review real-looking AWS, Azure, Google Cloud and Kubernetes settings, spot the risky line, and pick the right fix.', 'Labs / Cloud Security')
    ws = '<section class="rv-ws"><div class="rv-code" id="rv-code" role="group" aria-label="Configuration"></div><div class="rv-fixes" id="rv-fixes" hidden></div></section>'
    body += _shell('cloud', ws, answer=False)
    body += ('<section class="rt-about"><h2>The shared responsibility model</h2><p>The cloud provider secures the hardware and the platform; you secure your data, identities and settings. '
             'Free tools like Prowler, ScoutSuite and Checkov scan for exactly these mistakes. ' + site.a('Cloud roadmap', '/careers/') + '.</p></section>')
    return body


def build_chal(site) -> None:
    site.page('/labs/active-directory/', 'Active Directory Lab', ad_page(site), 'Investigate a Windows domain controller log: password spraying, Kerberoasting, a Domain Admins change, DCSync and a cleared log.', 'Labs', module='chal')
    site.page('/labs/cloud/', 'Cloud Security Lab', cloud_page(site), 'Spot cloud misconfigurations in AWS, Azure, Google Cloud, Kubernetes and Terraform: public buckets, open ports, disabled logging, stale keys and more.', 'Labs', module='chal')
    site.page('/labs/packets/', 'Packet Lab', pcap_page(site), 'Analyze a network capture in your browser: Wireshark-style filters, a port scan, cleartext FTP, a malware download, DNS tunneling and an ARP sweep.', 'Labs', module='chal')
    site.page('/labs/logs/', 'Log Hunt', hunt_page(site), 'Hunt through SSH and web server logs with SIEM-style searches: brute force, the breach, the payload, the backdoor and web attacks.', 'Labs', module='chal')
    site.page('/labs/crypto/', 'Crypto & Encoding Lab', crypto_page(site), 'Decode Base64, hex, ROT13, Caesar, URL encoding, XOR and layered payloads with a CyberChef-style recipe, then verify a SHA-256 hash.', 'Labs', module='chal')
    site.page('/labs/code-review/', 'Secure Code Review', review_page(site), 'Find the vulnerable line and choose the right fix: SQL injection, XSS, path traversal, command injection, secrets, weak hashing, IDOR, JWT and cloud misconfigurations.', 'Labs', module='chal')
