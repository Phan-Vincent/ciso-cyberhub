"""What you will defend: one in-depth page per photo on the homepage field band.

/defend/ is the overview; /defend/<slug>/ explains each domain: what it is, what is inside,
how it is attacked, real incidents, how defenders protect it, where to practise on
CyberHub, careers, and sources. Facts are dated and sourced; reviewed with the AI guides.
"""
from __future__ import annotations

from html import escape as E

from .common import ROOT, read_json
from .guides import _sources, _toc
from .shifts import shift_html

# slug, photo caption (matches data/photos.json), title, one-line promise, lead
DOMAINS = [
    {
        'slug': 'infrastructure', 'caption': 'Infrastructure',
        'title': 'Infrastructure: servers, cloud and identity',
        'lead': 'The racks in the photo are where an organisation keeps its data, runs its applications and records what happens: who logged in, what changed, what left the building. Attackers come for what is stored there. Defenders protect it, and they rely on its logs to see the attack happening.',
        'what': [
            ('Servers and virtual machines', 'Physical machines in a data centre, or virtual ones in AWS, Azure or Google Cloud, run websites, databases, email and business apps.'),
            ('Identity systems', 'Active Directory, Entra ID, Okta and similar services decide who can log in and what they can reach. Attackers aim for these first, because taking one over gives them everything it controls.'),
            ('Storage and backups', 'Databases, file shares and object storage (like S3 buckets) hold the data. Backups are what you recover from after ransomware.'),
            ('Logging and monitoring', 'Every system writes events. A SIEM (Splunk, Elastic, Microsoft Sentinel) collects them so analysts can search across everything at once.'),
            ('Management tools', 'Remote admin, patching, monitoring and backup software reach every machine. If an attacker takes one over, they reach every machine too.'),
        ],
        'attacks': [
            ('Stolen or guessed credentials', 'Phished passwords, reused passwords and accounts without MFA are the most common way in.'),
            ('Unpatched internet-facing software', 'VPNs, file-transfer apps and web servers with known bugs. CISA\'s Known Exploited Vulnerabilities (KEV) catalog lists the ones attackers are actually using.'),
            ('Cloud misconfiguration', 'Public storage buckets, over-permissive roles and exposed management ports.'),
            ('Supply chain', 'A trusted vendor\'s update or tool is compromised, and every customer installs it.'),
            ('Ransomware and extortion', 'Steal data, encrypt systems, delete backups, then demand payment.'),
        ],
        'incidents': [
            ('2019', 'Capital One', 'A misconfigured web application firewall in AWS let an attacker request cloud credentials and copy data on about 106 million people in the US and Canada.', ''),
            ('2020', 'SolarWinds Orion', 'Attackers attributed to Russia\'s foreign intelligence service hid a backdoor in an IT-monitoring product update. About 18,000 customers installed it; US agencies were among the few the attackers then went after.', 'solarwinds'),
            ('2023', 'MOVEit Transfer', 'The Cl0p gang used a SQL injection zero-day (CVE-2023-34362) in a file-transfer server to steal data from thousands of organisations without encrypting anything.', ''),
            ('2024', 'Change Healthcare', 'Attackers logged in to a remote-access portal that had no MFA, using stolen credentials. The ransomware attack disrupted US pharmacy and insurance claims for weeks and exposed data on about 190 million people.', ''),
        ],
        'defend': [
            ('Know what you have', 'Keep an asset inventory of servers, cloud accounts and admin accounts. You cannot protect what you cannot list.'),
            ('MFA everywhere, phishing-resistant for admins', 'Security keys or passkeys for anyone with privileged access. MFA alone would have stopped several of the breaches above.'),
            ('Patch by real risk', 'Fix internet-facing and KEV-listed vulnerabilities first, within days, not months.'),
            ('Least privilege', 'Separate admin accounts, short-lived cloud credentials and no standing access to everything.'),
            ('Log, centralise and alert', 'Forward authentication, admin and cloud audit logs to a SIEM and write detections for what attackers actually do.'),
            ('Backups you have tested', 'The 3-2-1 rule: three copies, two kinds of media, one offline or immutable. Practise restoring them.'),
        ],
        'frameworks': 'NIST Cybersecurity Framework 2.0 (Govern, Identify, Protect, Detect, Respond, Recover), CIS Critical Security Controls v8, and the cloud provider\'s shared responsibility model.',
        'practice': [('Linux Lab', '/linux/'), ('Windows event logs lab', '/labs/windows-events/'), ('Detection engineering lab', '/labs/detection-engineering/'), ('Incident response lab', '/labs/incident-response/'), ('Vulnerability feed', '/vulnerabilities/')],
        'careers': ['SOC analyst', 'Systems administrator', 'Cloud security engineer', 'Identity and access management (IAM) engineer', 'Incident responder'],
        'sources': [
            ('NIST Cybersecurity Framework 2.0', 'https://www.nist.gov/cyberframework', '2024'),
            ('CIS Critical Security Controls v8', 'https://www.cisecurity.org/controls', ''),
            ('CISA Known Exploited Vulnerabilities catalog', 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog', ''),
            ('CISA advisory AA23-158A: Cl0p and MOVEit', 'https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-158a', '2023'),
            ('CISA: SolarWinds supply-chain compromise', 'https://www.cisa.gov/news-events/news/joint-statement-federal-bureau-investigation-fbi-cybersecurity-and-infrastructure-security', '2021'),
            ('US HHS OCR: Change Healthcare cyberattack FAQ', 'https://www.hhs.gov/hipaa/for-professionals/special-topics/change-healthcare-cybersecurity-incident-frequently-asked-questions/index.html', ''),
        ],
    },
    {
        'slug': 'operational-technology', 'caption': 'Operational technology',
        'title': 'Operational technology: systems that move things',
        'lead': 'Operational technology (OT) is the computers that run the physical world: robot arms on a production line, pumps at a water plant, breakers on the power grid, conveyors in a warehouse. In IT, a breach loses data. In OT, it can stop the water, cut the power or hurt someone.',
        'what': [
            ('PLCs (programmable logic controllers)', 'Small, rugged computers that read sensors and drive motors, valves and robot arms. They often run for 15 to 20 years or more.'),
            ('HMIs and SCADA', 'Human-machine interfaces are the operator screens. SCADA systems supervise equipment spread across a city or a pipeline.'),
            ('Safety instrumented systems (SIS)', 'Independent controllers that shut a process down before it becomes dangerous. They are the last line of defence.'),
            ('Industrial protocols', 'Modbus, DNP3, EtherNet/IP and others were designed for closed networks and many have no authentication: any device that can reach a controller can tell it what to do.'),
            ('The Purdue model', 'A reference architecture that layers OT from field devices (level 0) up to business IT (levels 4 and 5), with a buffer zone (DMZ) between them.'),
        ],
        'attacks': [
            ('IT first, OT second', 'Most OT incidents start as ordinary IT intrusions or ransomware that reach, or force a shutdown of, the plant.'),
            ('Exposed remote access', 'Vendor VPNs, remote desktop tools and HMIs reachable from the internet, often with default or shared passwords.'),
            ('Insecure-by-design protocols', 'No authentication means "write this value to the valve" is accepted from anyone on the network.'),
            ('Pre-positioning', 'State actors quietly gain access to critical infrastructure to be ready for disruption in a future conflict.'),
        ],
        'incidents': [
            ('2010', 'Stuxnet', 'A worm built to sabotage Iran\'s uranium enrichment reprogrammed Siemens PLCs to damage centrifuges while showing operators normal readings.', 'stuxnet'),
            ('2015', 'Ukraine power grid', 'Attackers used stolen credentials to open breakers remotely, leaving about 225,000 customers without power for hours. It was the first confirmed cyberattack to cause a blackout.', 'grid'),
            ('2017', 'TRITON / TRISIS', 'Malware targeted the safety instrumented system at a Saudi petrochemical plant, an attack on the controllers that exist to prevent explosions and deaths.', ''),
            ('2021', 'Colonial Pipeline', 'Ransomware hit the company\'s IT network through an old VPN account without MFA. The pipeline was shut down as a precaution, causing fuel shortages along the US East Coast.', 'colonial'),
            ('2023', 'Unitronics PLCs at US water utilities', 'Iran-linked actors defaced internet-exposed PLCs that still had default passwords, including one at the Municipal Water Authority of Aliquippa, Pennsylvania.', ''),
            ('2024', 'Volt Typhoon', 'US agencies warned that China state-sponsored actors had pre-positioned in US communications, energy, water and transportation networks.', ''),
        ],
        'defend': [
            ('Safety and availability first', 'In OT the priorities run safety, then availability, then integrity and confidentiality. Never scan or patch a live process without the operators.'),
            ('Segment IT from OT', 'Firewalls and a DMZ between business IT and the plant, with only the connections the process needs.'),
            ('Lock down remote access', 'No HMIs or PLCs on the internet. Vendor access goes through a monitored jump host, with MFA, and is switched off when not in use.'),
            ('Change default passwords', 'The 2023 water-utility attacks needed nothing more than the factory default.'),
            ('Passive monitoring', 'OT-aware network monitoring watches industrial protocols without touching fragile devices.'),
            ('Manual fallback', 'Plans and practice for running the process by hand if the network goes down.'),
        ],
        'frameworks': 'ISA/IEC 62443 (industrial automation security), NIST SP 800-82 Rev. 3 (Guide to OT Security, 2023), and MITRE ATT&CK for ICS.',
        'practice': [('Packet analysis lab', '/labs/packet-analysis/'), ('Wireshark tutorial', '/tutorials/wireshark/'), ('Zeek tutorial', '/tutorials/zeek/'), ('Cyber history: Stuxnet to Colonial', '/history/')],
        'careers': ['ICS/OT security analyst', 'Controls engineer with a security focus', 'Critical-infrastructure incident responder', 'OT network engineer'],
        'local': 'The Inland Empire runs on OT: some of the largest warehouse and logistics hubs in the country, regional water and power utilities, rail yards and manufacturing. These employers need people who understand both IT and the plant floor.',
        'sources': [
            ('NIST SP 800-82 Rev. 3: Guide to Operational Technology Security', 'https://csrc.nist.gov/pubs/sp/800/82/r3/final', '2023'),
            ('ISA/IEC 62443 series overview', 'https://www.isa.org/standards-and-publications/isa-standards/isa-iec-62443-series-of-standards', ''),
            ('MITRE ATT&CK for ICS', 'https://attack.mitre.org/matrices/ics/', ''),
            ('CISA: Cyber-attack against Ukrainian critical infrastructure (IR-ALERT-H-16-056-01)', 'https://www.cisa.gov/news-events/ics-alerts/ir-alert-h-16-056-01', '2016'),
            ('CISA advisory AA23-335A: IRGC-affiliated actors exploit PLCs in multiple sectors', 'https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-335a', '2023'),
            ('CISA advisory AA24-038A: Volt Typhoon', 'https://www.cisa.gov/news-events/cybersecurity-advisories/aa24-038a', '2024'),
            ('CISA free ICS training', 'https://www.cisa.gov/ics-training-available-through-cisa', ''),
        ],
    },
    {
        'slug': 'hardware', 'caption': 'Hardware',
        'title': 'Hardware: trust starts at the chip',
        'lead': 'Every security control in software relies on the layers underneath it: the processor, the firmware that starts the machine, the chips that store keys. If those layers are compromised, the operating system can be lied to, and antivirus cannot see the attacker. Hardware security is about making the bottom of that stack trustworthy.',
        'what': [
            ('Firmware (UEFI/BIOS)', 'The first code that runs when a machine powers on. It starts the operating system, so malware there loads before any defence.'),
            ('Secure Boot and measured boot', 'Secure Boot only starts code signed by trusted keys. Measured boot records each step so it can be checked later.'),
            ('TPM and secure elements', 'A Trusted Platform Module stores keys and boot measurements in tamper-resistant hardware. Windows 11 requires TPM 2.0; BitLocker and passkeys use it.'),
            ('The processor', 'Modern CPUs speed up by guessing ahead (speculative execution). Guesses leave traces in the cache that can leak secrets.'),
            ('Embedded and IoT devices', 'Routers, cameras and controllers run firmware that is rarely updated and often has debug ports left on the board.'),
        ],
        'attacks': [
            ('Firmware implants and bootkits', 'Malware in UEFI or the boot process survives reinstalling the operating system and replacing the disk.'),
            ('Side channels', 'Timing, cache, power or radio leaks reveal secrets without breaking the encryption itself.'),
            ('Supply chain tampering', 'Counterfeit parts, or devices modified before they arrive.'),
            ('Physical access', 'Debug ports (JTAG, UART), DMA over Thunderbolt or PCIe, and removing the storage chip to read it directly.'),
        ],
        'incidents': [
            ('2018', 'Spectre and Meltdown', 'Researchers showed that speculative execution in most modern processors could leak memory across security boundaries. Fixing it took microcode, OS and browser changes, some at a performance cost.', ''),
            ('2018', 'LoJax', 'ESET found the first UEFI rootkit seen in the wild, attributed to Russia\'s APT28. It survived OS reinstalls and hard-drive replacement.', ''),
            ('2023', 'BlackLotus', 'A UEFI bootkit sold on criminal forums bypassed Secure Boot on fully patched Windows 11 by abusing an old, still-trusted vulnerable boot loader (CVE-2022-21894).', ''),
            ('2016', 'Mirai', 'Hundreds of thousands of cameras and routers with factory-default passwords were turned into a botnet that knocked major websites offline.', ''),
        ],
        'defend': [
            ('Turn on Secure Boot and the TPM', 'Then use them: full-disk encryption (BitLocker, FileVault, LUKS) bound to the TPM.'),
            ('Update firmware, not just software', 'BIOS/UEFI, device firmware and CPU microcode updates fix real vulnerabilities. Track them like any other patch.'),
            ('Keep revocation lists current', 'Secure Boot only helps if known-bad boot loaders are revoked (the DBX list). BlackLotus abused a revoked-in-theory, still-trusted loader.'),
            ('Buy from trusted sources', 'Approved suppliers, inspection on arrival, and hardware bills of materials.'),
            ('Lock physical access', 'Firmware passwords, disabled unused ports and debug interfaces, and locked rooms for servers.'),
        ],
        'frameworks': 'NIST SP 800-193 (Platform Firmware Resiliency: protect, detect, recover), NIST SP 800-147 (BIOS protection), and Trusted Computing Group TPM 2.0 specifications.',
        'practice': [('Hashing on Bench 01 (homepage)', '/#labs'), ('OpenSSL tutorial', '/tutorials/openssl/'), ('YARA tutorial', '/tutorials/yara/'), ('Linux Lab', '/linux/')],
        'careers': ['Hardware security engineer', 'Embedded and firmware security engineer', 'Reverse engineer', 'Product security (PSIRT) engineer'],
        'sources': [
            ('NIST SP 800-193: Platform Firmware Resiliency Guidelines', 'https://csrc.nist.gov/pubs/sp/800/193/final', '2018'),
            ('Meltdown and Spectre (research site)', 'https://meltdownattack.com/', '2018'),
            ('ESET: LoJax, first UEFI rootkit found in the wild', 'https://www.welivesecurity.com/2018/09/27/lojax-first-uefi-rootkit-found-wild-courtesy-sednit-group/', '2018'),
            ('ESET: BlackLotus UEFI bootkit', 'https://www.welivesecurity.com/2023/03/01/blacklotus-uefi-bootkit-myth-confirmed/', '2023'),
            ('NSA: BlackLotus mitigation guide', 'https://media.defense.gov/2023/Jun/22/2003245723/-1/-1/0/CSI_BlackLotus_Mitigation_Guide.PDF', '2023'),
            ('Trusted Computing Group: TPM 2.0', 'https://trustedcomputinggroup.org/resource/tpm-library-specification/', ''),
        ],
    },
    {
        'slug': 'networks', 'caption': 'Networks',
        'title': 'Networks: every packet crossed a wire',
        'lead': 'Every attack crosses a network at some point: the phishing email arrives, the malware calls home, the stolen data leaves. Network defenders control what is allowed to connect to what, and they watch the traffic, which is the record of what actually happened.',
        'what': [
            ('Switches, routers and cabling', 'The patch panel in the photo connects devices to switches; routers move traffic between networks. VLANs split one physical network into several logical ones.'),
            ('Firewalls and edge devices', 'Firewalls, VPN gateways and load balancers sit at the boundary. They are internet-facing, so they are a top target.'),
            ('Core services', 'DNS turns names into addresses, DHCP hands out addresses, and BGP routes traffic between the networks that make up the internet.'),
            ('Wireless', 'Wi-Fi extends the network past the walls. WPA3 and 802.1X decide who can join.'),
            ('Monitoring', 'Flow records, packet captures and sensors such as Zeek and Suricata show who talked to whom, when and how much.'),
        ],
        'attacks': [
            ('Exploiting edge devices', 'Bugs in VPNs, firewalls and routers give attackers a foothold that most endpoint tools cannot see.'),
            ('Lateral movement', 'On a flat network, one infected laptop can reach every server.'),
            ('Eavesdropping and spoofing', 'Unencrypted protocols, rogue Wi-Fi, ARP and DNS spoofing.'),
            ('Denial of service', 'Floods of traffic, often from botnets, take services offline.'),
            ('Command and control', 'Malware hides its traffic in normal-looking web or DNS requests.'),
        ],
        'incidents': [
            ('2016', 'Mirai and Dyn', 'A botnet of hijacked IoT devices flooded the DNS provider Dyn, making sites such as Twitter, Reddit and Netflix unreachable for parts of the US.', ''),
            ('2024', 'Ivanti Connect Secure', 'Chained zero-days in a widely used VPN gateway (CVE-2023-46805 and CVE-2024-21887) led CISA to order federal agencies to disconnect affected devices.', ''),
            ('2024', 'Salt Typhoon', 'US officials disclosed that China state-sponsored actors had broken into multiple US telecommunications providers\' networks, prompting new guidance on hardening network infrastructure.', ''),
            ('1988', 'The Morris worm', 'One self-spreading program slowed a large share of the early internet and led to the first computer emergency response team (CERT).', 'morris'),
        ],
        'defend': [
            ('Segment the network', 'Separate users, servers, management and guests. Allow only the flows each needs.'),
            ('Zero trust', 'Do not trust a device because it is "inside". Verify the user and device on every request.'),
            ('Patch and harden the edge first', 'Firewalls, VPNs and routers get updates within days, management interfaces off the internet, and logs sent somewhere central.'),
            ('Encrypt in transit', 'TLS 1.3, SSH and WPA3; retire Telnet, FTP and SMBv1.'),
            ('Watch the traffic', 'Collect flow logs and DNS logs, and run network detection (Zeek, Suricata) where it matters most.'),
            ('Protect DNS', 'Filtering resolvers block known-bad domains and log every lookup.'),
        ],
        'frameworks': 'NIST SP 800-207 (Zero Trust Architecture), CISA\'s Zero Trust Maturity Model, and CIS Controls 12 and 13 (network infrastructure and monitoring).',
        'practice': [('Packet analysis lab', '/labs/packet-analysis/'), ('Wireshark tutorial', '/tutorials/wireshark/'), ('Nmap tutorial', '/tutorials/nmap/'), ('Zeek tutorial', '/tutorials/zeek/'), ('Linux Lab (networking levels)', '/linux/')],
        'careers': ['Network engineer', 'Network security engineer', 'SOC analyst', 'Penetration tester', 'Network operations (NOC) technician'],
        'sources': [
            ('NIST SP 800-207: Zero Trust Architecture', 'https://csrc.nist.gov/pubs/sp/800/207/final', '2020'),
            ('CISA Zero Trust Maturity Model', 'https://www.cisa.gov/zero-trust-maturity-model', '2023'),
            ('CISA Emergency Directive 24-01: Ivanti Connect Secure', 'https://www.cisa.gov/news-events/directives/ed-24-01-mitigate-ivanti-connect-secure-and-ivanti-policy-secure-vulnerabilities', '2024'),
            ('CISA: Enhanced visibility and hardening guidance for communications infrastructure', 'https://www.cisa.gov/resources-tools/resources/enhanced-visibility-and-hardening-guidance-communications-infrastructure', '2024'),
            ('CISA alert TA16-288A: Heightened DDoS threat posed by Mirai', 'https://www.cisa.gov/news-events/alerts/2016/10/14/heightened-ddos-threat-posed-mirai-and-other-botnets', '2016'),
        ],
    },
    {
        'slug': 'legacy-systems', 'caption': 'Legacy systems',
        'title': 'Legacy systems: still running, still exposed',
        'lead': 'Old systems rarely get switched off. A medical device certified on Windows 7, a payroll system written in COBOL, a factory controller from 2004: they keep working, so they keep running, long after the vendor stops fixing them. Finding and protecting them is a large part of everyday defensive work.',
        'what': [
            ('End-of-life operating systems', 'Windows 7 lost support in January 2020 and Windows 10 in October 2025 (paid Extended Security Updates aside). Unsupported systems get no new security fixes.'),
            ('Mainframes and COBOL', 'Banks, insurers and governments still run core systems on mainframes and decades-old code, maintained by a shrinking pool of experts.'),
            ('Embedded and medical devices', 'Imaging machines, lab analysers and building controllers are certified as a whole, so upgrading the OS can mean recertifying the device.'),
            ('Forgotten servers and "shadow IT"', 'The test server nobody turned off, an old website and a vendor appliance in a closet all count.'),
            ('Old protocols', 'SMBv1, TLS 1.0, NTLM and Telnet linger because something still depends on them.'),
        ],
        'attacks': [
            ('Known, never-fixed vulnerabilities', 'Attackers do not need a zero-day when public exploits for old bugs still work.'),
            ('Worms', 'Self-spreading malware tears through networks full of the same unpatched system.'),
            ('Weak legacy authentication', 'Old protocols leak or accept hashes, and old apps often store passwords in plain text.'),
            ('Unknown assets', 'Systems missing from the inventory are missed by patching and monitoring too.'),
        ],
        'incidents': [
            ('2017', 'WannaCry', 'Ransomware spread through EternalBlue, an exploit for SMBv1 that Microsoft had patched two months earlier. In the UK, NHS hospitals cancelled about 19,000 appointments.', 'wannacry'),
            ('2017', 'Equifax', 'A web application ran a version of Apache Struts that had not been patched for a known critical flaw (CVE-2017-5638) for months. Attackers took personal data on about 147 million people.', ''),
            ('2020', 'Unemployment systems in the pandemic', 'Several US states\' decades-old COBOL benefit systems struggled under record claims, and they had to call retired programmers back to help.', ''),
            ('2003', 'SQL Slammer', 'A 376-byte worm infected tens of thousands of unpatched database servers within about ten minutes. The patch had been out for six months.', 'slammer'),
        ],
        'defend': [
            ('Inventory continuously', 'Discover everything on the network and in the cloud, and record its owner, purpose and support end date.'),
            ('Isolate what cannot be patched', 'Put it on its own network segment, allow only the connections it needs, and keep it off the internet.'),
            ('Compensating controls', 'Application allow-listing, extra monitoring and virtual patching on firewalls or web application firewalls.'),
            ('Buy time, then migrate', 'Extended security updates where offered, alongside a funded plan and a date to replace the system.'),
            ('Turn off old protocols', 'Disable SMBv1, TLS 1.0/1.1 and NTLM where possible, after testing what breaks.'),
            ('Prioritise with KEV', 'If a legacy system has a CISA KEV-listed vulnerability, treat it as urgent.'),
        ],
        'frameworks': 'CISA Binding Operational Directive 23-01 (asset visibility), CIS Controls 1 and 2 (enterprise and software asset inventory), and CISA\'s "Bad Practices" list, which names unsupported software.',
        'practice': [('Vulnerability feed', '/vulnerabilities/'), ('Linux hardening lab', '/labs/linux-hardening/'), ('Grype tutorial', '/tutorials/grype/'), ('Trivy tutorial', '/tutorials/trivy/'), ('Cyber history: WannaCry', '/history/#wannacry')],
        'careers': ['Vulnerability management analyst', 'Systems administrator', 'IT asset manager', 'Security engineer (healthcare or government)', 'Mainframe security specialist'],
        'sources': [
            ('Microsoft: Windows 10 end of support', 'https://www.microsoft.com/en-us/windows/end-of-support', '2025'),
            ('CISA: Bad Practices', 'https://www.cisa.gov/BadPractices', ''),
            ('CISA BOD 23-01: Improving asset visibility and vulnerability detection', 'https://www.cisa.gov/news-events/directives/bod-23-01-improving-asset-visibility-and-vulnerability-detection-federal-networks', '2022'),
            ('UK National Audit Office: Investigation, WannaCry cyber attack and the NHS', 'https://www.nao.org.uk/reports/investigation-wannacry-cyber-attack-and-the-nhs/', '2017'),
            ('US GAO: Actions taken by Equifax and federal agencies (GAO-18-559)', 'https://www.gao.gov/products/gao-18-559', '2018'),
        ],
    },
]


def _photos() -> dict:
    out = {}
    for p in read_json(ROOT / 'data/photos.json'):
        if p.get('slot') == 'field' and (ROOT / 'public/assets/photos' / p['file']).is_file():
            out[p['caption']] = p
    return out


def slug_for(caption: str) -> str:
    for d in DOMAINS:
        if d['caption'] == caption:
            return d['slug']
    return ''


def _hero(site, d, photo) -> str:
    if not photo:
        return ''
    b = site.base
    return (f'<figure class="df-hero"><img src="{E(b)}/assets/photos/{E(photo["file"])}" alt="{E(photo["alt"])}" decoding="async">'
            f'<figcaption class="label">Photo: <a href="{E(photo["page"])}">{E(photo["by"])}</a> / Unsplash License</figcaption></figure>')


def domain_page(site, i: int, photos: dict) -> str:
    d = DOMAINS[i]
    a = site.a
    n = len(DOMAINS)
    toc = [('what', 'What is inside'), ('attacks', 'How it is attacked'), ('incidents', 'Real incidents'), ('defend', 'How defenders protect it'),
           ('day', 'A day defending it'), ('practice', 'Practise it here'), ('careers', 'Careers')]
    body = site.heading(d['caption'], d['lead'], f'Defend / {i + 1:02d} of {n:02d} / {d["title"].split(": ")[1].capitalize()}')
    body += _hero(site, d, photos.get(d['caption']))
    body += f'<div class="guide" data-defend-page="{E(d["slug"])}">' + _toc(toc) + '<article class="guide-body">'
    body += ('<section id="what"><h2><span class="label">01</span>What is inside</h2><dl class="df-list">'
             + ''.join(f'<div><dt>{E(t)}</dt><dd>{E(x)}</dd></div>' for t, x in d['what']) + '</dl></section>')
    body += ('<section id="attacks"><h2><span class="label">02</span>How it is attacked</h2><div class="flags">'
             + ''.join(f'<div class="flag"><b>{E(t)}</b><p>{E(x)}</p></div>' for t, x in d['attacks']) + '</div></section>')
    inc = ''
    for year, t, x, hx in sorted(d['incidents'], key=lambda r: r[0]):
        more = f' {a("Read the story →", "/history/#" + hx)}' if hx else ''
        inc += f'<li><span class="df-year label">{E(year)}</span><div><h3>{E(t)}</h3><p>{E(x)}{more}</p></div></li>'
    body += f'<section id="incidents"><h2><span class="label">03</span>Real incidents</h2><ol class="df-incidents">{inc}</ol></section>'
    body += ('<section id="defend"><h2><span class="label">04</span>How defenders protect it</h2><ol class="steps">'
             + ''.join(f'<li><b>{E(t)}.</b> {E(x)}</li>' for t, x in d['defend']) + '</ol>'
             f'<p class="callout"><b>Frameworks to know:</b> {E(d["frameworks"])}</p></section>')
    body += (f'<section id="day"><h2><span class="label">05</span>A day defending it</h2><p>Four decisions from a real kind of shift. Pick what you would do; each choice is explained.</p>{shift_html(site, d["slug"])}</section>')
    body += ('<section id="practice"><h2><span class="label">06</span>Practise it here</h2><p>Free, in your browser, on CyberHub:</p><div class="df-links">'
             + ''.join(a(f'{t} →', u, 'button') for t, u in d['practice']) + '</div></section>')
    local = f'<p class="callout">{E(d["local"])}</p>' if d.get('local') else ''
    body += ('<section id="careers"><h2><span class="label">07</span>Careers</h2><p>People who defend this every day:</p><div class="job-tags">'
             + ''.join(f'<span class="tag">{E(c)}</span>' for c in d['careers']) + f'</div>{local}'
             f'<p>{a("Career roadmaps →", "/careers/", "button primary")} {a("Internships near CSUSB →", "/careers/internships/", "button")}</p></section>')
    body += _sources(d['sources'])
    prev_d, next_d = DOMAINS[(i - 1) % n], DOMAINS[(i + 1) % n]
    body += (f'<nav class="df-pager" aria-label="Other domains">{a("← " + prev_d["caption"], "/defend/" + prev_d["slug"] + "/")}'
             f'{a("All five", "/defend/")}{a(next_d["caption"] + " →", "/defend/" + next_d["slug"] + "/")}</nav>')
    body += '</article></div>'
    return body


def overview_page(site, photos: dict) -> str:
    b = site.base
    body = site.heading('What you will defend', 'Security is not one job. It is protecting five very different kinds of systems, each with its own attacks, history and careers. Pick one to see what is inside, how it is attacked and how defenders protect it.', 'Learn / What you will defend')
    body += '<div class="df-grid">'
    for i, d in enumerate(DOMAINS):
        p = photos.get(d['caption'])
        img = f'<img src="{E(b)}/assets/photos/{E(p["file"])}" alt="" loading="lazy" decoding="async">' if p else ''
        note = E(p['note']) if p else ''
        body += (f'<a class="df-card" href="{E(b)}/defend/{E(d["slug"])}/">{img}<span class="label">{i + 1:02d} / {E(d["caption"])}</span>'
                 f'<strong>{note}</strong><span class="df-sum">{E(p.get("desc", "") if p else "")}</span><span class="df-go label">Read the guide →</span></a>')
    body += '</div>'
    return body


def build_defend(site) -> None:
    photos = _photos()
    site.page('/defend/', 'What you will defend', overview_page(site, photos), 'Infrastructure, operational technology, hardware, networks and legacy systems: what each is, how it is attacked and how defenders protect it.', 'Learn')
    for i, d in enumerate(DOMAINS):
        site.page(f'/defend/{d["slug"]}/', d['title'], domain_page(site, i, photos), d['lead'].split('. ')[0] + '.', 'Learn', module='journey')
