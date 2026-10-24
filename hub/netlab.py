"""CyberHub Networking Lab: the first IT-track lab. Same in-browser practice shell as the
Linux Lab (web/linux.ts NET_LEVELS) with simulated network commands: ip, ping, traceroute,
dig, nslookup, host, ss, nc and curl, plus subnetting worked out by hand.
Level ids here must match NET_LEVELS in web/linux.ts (tests check this).
"""
from __future__ import annotations

from html import escape as E

from .linux import index_page, module_page

PATH, KEY = '/linux/network/', 'cyberhub:netlab'

MODULES = [
    ('connection', 'Your connection', 'Before you troubleshoot anything, know your own address, your way out and who answers your DNS questions.', [
        ('net-my-ip', 'What is my IP address?', ['Every device on a network has an IP address. `ip addr` (short: `ip a`) lists each network interface: `lo` is the loopback that only talks to itself, and `eth0` is the real network card.', 'Look for the `inet` line under `eth0`. The part before the slash is the address; the number after it (`/24`) is the prefix, which says how big the local network is.'],
         'Find the IPv4 address of `eth0` and submit it (without the /24).', ['ip a', 'The line starts with inet, under eth0.']),
        ('net-gateway', 'Find the way out', ['Your machine can talk directly to devices on its own subnet. Everything else goes to the default gateway, a router. `ip route` (short: `ip r`) shows the routing table.', 'If the gateway is wrong or down, the internet "is down" for this machine, even though the local network works.'],
         'Submit the IP address of the default gateway.', ['ip route', 'It is on the line starting with "default via".']),
        ('net-resolver', 'Who answers DNS?', ['DNS turns names like `portal.ciso.lab` into IP addresses. Linux finds its DNS server in `/etc/resolv.conf`. Attackers who change this file can send every lookup to a server they control.'],
         'Submit the IP address of this machine\'s DNS server.', ['cat /etc/resolv.conf', 'The nameserver line.']),
    ]),
    ('reachability', 'Is it up?', 'The first two questions in every outage: can I reach it, and if not, where does the path break?', [
        ('net-ping-down', 'Which server is down?', ['`ping` sends small echo requests and waits for replies. `-c 2` stops after two. Replies mean the host is reachable; "Destination Host Unreachable" or 100% packet loss means it is not (or it is blocking ping, which some firewalls do).', 'The short names in `~/servers.txt` work because `/etc/resolv.conf` adds `ciso.lab` to them.'],
         'One server in `~/servers.txt` is not answering. Submit its short name.', ['cat ~/servers.txt', 'ping -c 2 web01, then the others.']),
        ('net-traceroute', 'Where does the path break?', ['`traceroute` lists every router (hop) between you and a destination. Each line is one hop. `* * *` means no reply from that hop. When every line after a certain hop is stars, traffic is dying just past the last router that answered.', 'This tells you whose network to call: yours, your provider\'s or the destination\'s.'],
         'The partner VPN at `vpn.partner.example` is unreachable. Submit the IP of the last hop that replies.', ['traceroute vpn.partner.example', 'The last line with an address before the stars.']),
    ]),
    ('dns', 'DNS', 'Names, mail servers and verification records, and how attackers abuse them.', [
        ('net-dig-a', 'Look up an address', ['`dig name` asks DNS for the A (IPv4 address) record. The answer is in the ANSWER SECTION. `dig name +short` prints just the address, which is handy in scripts.'],
         'Submit the IP address of `grades.ciso.lab`.', ['dig grades.ciso.lab +short']),
        ('net-dig-mx', 'Where does email go?', ['MX records say which servers accept email for a domain. Each has a preference number: the lowest number is tried first. Phishing investigations often start here.'],
         'Submit the hostname of the preferred mail server for `ciso.lab` (no trailing dot).', ['dig ciso.lab MX', 'Lowest preference number wins.']),
        ('net-dig-txt', 'Read the TXT records', ['TXT records hold free text: email security policies (SPF, DMARC), and verification codes that prove a domain owner set up a service. Attackers read them to learn which cloud services an organisation uses.'],
         'A verification code is stored in the TXT records of `_verify.ciso.lab`. Submit the flag.', ['dig _verify.ciso.lab TXT']),
        ('net-hosts-poison', 'The poisoned hosts file', ['Before asking DNS, the system checks `/etc/hosts`. An entry there wins over DNS. Malware adds lines to send a bank or login page to an attacker\'s server, so the address in the browser looks right while the server is fake.', '`ping` uses the hosts file, but `dig` asks DNS directly. Comparing them reveals the trick.'],
         'Something is wrong with `login.bank.example` on this machine. Submit the IP address it is being redirected to.', ['cat /etc/hosts', 'Compare with dig login.bank.example +short.']),
    ]),
    ('ports', 'Ports and connections', 'Which services are listening, who is connected, and what a web server gives away.', [
        ('net-listening', 'What is listening?', ['A port is a numbered door on a machine. `ss -tlnp` lists TCP (`t`) ports that are listening (`l`), as numbers (`n`), with the process (`p`). Know what should be there: 22 is SSH, 80 and 443 are web, 5432 is PostgreSQL.', 'A strange port owned by an oddly named process is a classic backdoor.'],
         'One listening port does not belong. Submit the port number.', ['ss -tlnp', 'Which process name looks like it is pretending to be something else?']),
        ('net-established', 'Who is connected?', ['`ss -tanp` shows all TCP connections, including established (ESTAB) ones. A shell process connected out to an internet address on port 4444 is a textbook reverse shell: the attacker\'s machine is the remote end.'],
         'Submit the remote IP address of the reverse shell.', ['ss -tanp', 'Look for the bash process and the :4444 port.']),
        ('net-port-check', 'Is the database reachable?', ['`nc -zv host port` tries to open a TCP connection without sending data: "succeeded" means the port is open, "refused" means the host answered but nothing listens there. You can list several ports at once.', 'Only scan systems you are authorised to test. This is your lab.'],
         '`db01` runs one database. Check 3306 (MySQL), 5432 (PostgreSQL), 1433 (SQL Server) and 27017 (MongoDB), and submit the open one.', ['nc -zv db01 3306 5432 1433 27017']),
        ('net-curl-headers', 'What the server gives away', ['`curl -I` fetches only the HTTP response headers. Headers reveal the server software and version, which attackers match against known vulnerabilities, and sometimes debugging data that should never reach production.'],
         'Inspect the headers of `http://intranet.ciso.lab/` and submit the flag that leaked.', ['curl -I http://intranet.ciso.lab/', 'Look for a header starting with X-.']),
    ]),
    ('subnetting', 'Subnetting by hand', 'The maths behind every firewall rule and network plan. Read `~/question.txt`, work it out, then submit.', [
        ('subnet-hosts', 'How many hosts?', ['An IPv4 address has 32 bits. A `/26` prefix uses 26 bits for the network, leaving 32 − 26 = 6 bits for hosts: 2⁶ = 64 addresses.', 'Two are reserved: the first is the network address and the last is the broadcast address. So a /26 has 64 − 2 = 62 usable hosts. Formula: 2^(32 − prefix) − 2.'],
         'Read `~/question.txt` and submit the number of usable hosts.', ['cat ~/question.txt', '2 to the power of (32 minus the prefix), minus 2.', 'Useful powers: 2⁸=256, 2⁹=512, 2¹⁰=1024.']),
        ('subnet-network', 'Find the network address', ['Subnets come in blocks of equal size. A /27 block is 2⁵ = 32 addresses, so in the last octet the networks start at 0, 32, 64, 96, 128, 160, 192 and 224.', 'To find the network of `192.168.5.77/27`: 77 falls in the block starting at 64, so the network is `192.168.5.64`.'],
         'Read `~/question.txt` and submit the network address.', ['Block size = 2^(32 − prefix).', 'Round the last number down to a multiple of the block size.']),
        ('subnet-broadcast', 'Find the broadcast address', ['The broadcast address is the last address in the block: network address + block size − 1. For `192.168.5.77/27` the network is .64 and the block is 32, so the broadcast is `192.168.5.95`.'],
         'Read `~/question.txt` and submit the broadcast address.', ['First find the network address.', 'Add the block size, then subtract 1.']),
        ('subnet-same', 'Same subnet?', ['Two hosts can talk directly only if they are on the same subnet: same network address under the same mask. Otherwise traffic goes through a router, where firewalls can filter it. This is the idea behind network segmentation.'],
         'Read `~/question.txt` and submit `yes` or `no`.', ['Work out the network address of each host.', 'Same network address means yes.']),
    ]),
]

RANKS = [(0, 'Unplugged'), (3, 'Connected'), (6, 'Resolver'), (10, 'Port watcher'), (13, 'Subnetter'), (17, 'Network engineer')]


def level_ids() -> list[str]:
    return [lv[0] for _, _, _, levels in MODULES for lv in levels]


def _intro(site):
    def f(total: int) -> str:
        body = site.heading('Networking Lab', f'Learn how networks really work by troubleshooting one: {total} levels in {len(MODULES)} modules on a simulated network. Addresses, routes, DNS, ports and subnetting. Runs in your browser.', 'Labs / Networking')
        body += ('<div class="lx-hero"><pre class="lx-teaser" aria-hidden="true">student@hub01:~$ dig ciso.lab MX +short\n20 mx2.ciso.lab.\n10 mx1.ciso.lab.\nstudent@hub01:~$ submit mx1.ciso.lab\n✔ Correct.</pre>'
                 '<ul class="lx-points"><li><b>The commands you will use at work.</b> <code>ip</code>, <code>ping</code>, <code>traceroute</code>, <code>dig</code>, <code>ss</code>, <code>nc</code> and <code>curl</code>, on a practice network.</li>'
                 '<li><b>Security in every level.</b> Poisoned hosts files, backdoor ports, reverse shells and leaky headers.</li>'
                 f'<li><b>The IT track starts here.</b> Pairs with Network+ and with {site.a("the Linux Lab", "/linux/")}.</li></ul></div>')
        return body
    return f


def build_netlab(site) -> None:
    notice = '<p class="notice">Original CyberHub material. Nothing touches a real network: every address, server and reply is simulated in your browser. Progress stays in this browser.</p>'
    site.page(PATH, 'Networking Lab', index_page(site, MODULES, PATH, KEY, RANKS, _intro(site), 'net-index', notice),
              'Learn networking by troubleshooting a simulated network: IP addresses, routes, DNS, ports and subnetting, in your browser.', 'Labs', module='linux')
    for i, (mid, title, desc, _levels) in enumerate(MODULES):
        site.page(f'{PATH}{mid}/', f'Networking Lab: {title}', module_page(site, i, MODULES, PATH, KEY, 'Networking Lab'), desc, 'Labs', module='linux')
