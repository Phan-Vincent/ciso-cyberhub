"""A history of cybersecurity: eras, events, and the defenders who answered them.

Images are real archival photos fetched from Wikimedia Commons by
scripts/fetch_history_images.py, which accepts only public-domain or Creative Commons
(BY / BY-SA / CC0) files and records the author and license for each. Until an image is
present the page shows a typographic plate instead, so the page never breaks.
"""
from __future__ import annotations

from html import escape as E

from .common import ROOT, read_json

ERAS = [
    ('signals', 'Before computers', '1834 – 1945', 'Codes, wires and the first people to bend them.'),
    ('mainframes', 'Mainframes and phone lines', '1946 – 1979', 'Shared machines, curious students and a 2600 Hz whistle.'),
    ('networks', 'The network wakes up', '1980 – 1999', 'Worms, laws, the first response teams and hacker culture goes public.'),
    ('internet', 'Crime goes online', '2000 – 2009', 'Mass-mailing worms, organised fraud and the business of breaking in.'),
    ('nations', 'Nations and ransom', '2010 – 2019', 'Cyberweapons, espionage, election interference and ransomware that stops hospitals.'),
    ('supply', 'Trust and supply chains', '2020 – today', 'Attackers go upstream, spyware goes commercial, crypto heists fund states. Then AI arrives.'),
]

# id, era, year, title, story, lesson, image candidates (Commons titles), search fallback, source
EVENTS = [
    ('chappe', 'signals', '1834', 'The telegraph hack', 'Two bankers in Bordeaux bribed operators of France\'s state optical telegraph to slip deliberate "errors" into routine messages, leaking stock-market moves days before the mail coach arrived. It ran for two years before anyone noticed.',
     'Insiders and covert channels are as old as networks.', ['Chappe telegraph.jpg', 'Télégraphe Chappe 1.jpg'], 'Chappe telegraph tower', 'https://en.wikipedia.org/wiki/Fran%C3%A7ois_and_Joseph_Blanc'),
    ('enigma', 'signals', '1932 – 1945', 'Breaking Enigma', 'Polish mathematicians led by Marian Rejewski broke the German Enigma cipher in 1932 and handed their methods to Britain in 1939. At Bletchley Park, Alan Turing and colleagues built electromechanical "bombes" to find daily keys.',
     'Cryptography fails through key handling and repeated patterns, not just maths.', ['Enigma (crittografia) - Museo scienza e tecnologia Milano.jpg', 'EnigmaMachineLabeled.jpg', 'Enigma-Machine.jpg'], 'Enigma machine museum', 'https://en.wikipedia.org/wiki/Cryptanalysis_of_the_Enigma'),
    ('colossus', 'signals', '1944', 'Colossus', 'Engineer Tommy Flowers built Colossus to attack the German Lorenz teleprinter cipher. It is widely regarded as the first programmable electronic digital computer, and its existence stayed secret for decades.',
     'Some of the first computers were built to break security.', ['Colossus.jpg', 'Colossus Mark 2 computer.jpg'], 'Colossus computer Bletchley', 'https://en.wikipedia.org/wiki/Colossus_computer'),
    ('bug', 'mainframes', '1947', 'The first actual bug', 'Operators of the Harvard Mark II taped a moth into the logbook on 9 September 1947 with the note "First actual case of bug being found." Grace Hopper loved telling the story, and the word stuck.',
     'Debugging is finding the difference between what a system should do and what it does.', ['H96566k.jpg', 'First Computer Bug, 1945.jpg'], 'first computer bug moth logbook Harvard Mark II', 'https://en.wikipedia.org/wiki/Software_bug#History'),
    ('eniac', 'mainframes', '1946', 'ENIAC and shared machines', 'ENIAC, programmed largely by six women, filled a room. As machines became time-shared in the 1960s, separating one user\'s data from another\'s became the first computer-security problem, and passwords arrived at MIT\'s CTSS.',
     'Access control was born the moment two people shared one computer.', ['Eniac.jpg', 'ENIAC-changing a tube.jpg', 'Classic shot of the ENIAC.jpg'], 'ENIAC computer programmers', 'https://en.wikipedia.org/wiki/ENIAC'),
    ('phreaks', 'mainframes', '1960s – 1970s', 'Phone phreaks', 'The phone network listened for a 2600 Hz tone to control trunk lines, on the same channel as your voice. Phreaks like John Draper ("Captain Crunch") played it with a toy whistle; "blue boxes" generated the tones electronically.',
     'Mixing control signals with user data is a design flaw that keeps coming back, from phone lines to SQL injection.', ['Blue box at Computer History Museum.jpg', 'Blue Box Phreaking.jpg'], 'phreaking blue box telephone', 'https://en.wikipedia.org/wiki/Blue_box'),
    ('creeper', 'mainframes', '1971', 'Creeper and Reaper', 'Bob Thomas at BBN wrote Creeper, an experimental program that moved between ARPANET computers printing "I\'M THE CREEPER: CATCH ME IF YOU CAN." Reaper was written to chase it down: arguably the first self-replicating program and the first antivirus.',
     'Every offensive idea eventually meets a defensive one.', ['Arpanet logical map, march 1977.png'], 'ARPANET map 1977', 'https://en.wikipedia.org/wiki/Creeper_and_Reaper'),
    ('cuckoo', 'networks', '1986', 'The Cuckoo\'s Egg', 'Astronomer Cliff Stoll chased a 75-cent accounting error at Lawrence Berkeley Lab and uncovered an intruder selling military data to the KGB. His logbook and book became the template for intrusion investigation.',
     'Small anomalies are where investigations start. Log everything.', ['Clifford Stoll.jpg', 'Cliff Stoll 2006.jpg'], 'Clifford Stoll astronomer', 'https://en.wikipedia.org/wiki/The_Cuckoo%27s_Egg_(book)'),
    ('morris', 'networks', '1988', 'The Morris worm', 'A self-spreading program written by graduate student Robert Morris hit an estimated several thousand of the roughly 60,000 computers on the early internet within a day. It led to the first felony conviction under the US Computer Fraud and Abuse Act and to the creation of CERT/CC at Carnegie Mellon.',
     'One bug can take down a network. Coordinated response teams exist because of this day.', ['Morris Worm source code disk.jpg', 'Morris worm disk.jpg'], 'Morris worm', 'https://en.wikipedia.org/wiki/Morris_worm'),
    ('defcon', 'networks', '1993', 'Hacker culture goes public', 'DEF CON held its first meeting in Las Vegas in 1993. Black Hat followed in 1997. Hacker conferences turned underground knowledge into a profession with talks, villages and capture-the-flag contests.',
     'The community shares knowledge in the open, and CTFs train the next generation.', ['DEF CON 26 logo.jpg', 'Defcon.jpg'], 'DEF CON conference crowd', 'https://en.wikipedia.org/wiki/DEF_CON'),
    ('cve', 'networks', '1999', 'A common name for every bug', 'MITRE launched the CVE list so that a vulnerability would have one identifier everyone could use. Today CVE IDs connect vendors, scanners, patches and the KEV list you see on CyberHub.',
     'Shared language makes defence possible at scale.', [], '', 'https://www.cve.org/About/History'),
    ('iloveyou', 'internet', '2000', 'ILOVEYOU', 'An email with the subject "ILOVEYOU" and a script disguised as a love letter spread worldwide in days, overwriting files on millions of Windows PCs.',
     'Attackers target people first. A convincing subject line beats a firewall.', [], '', 'https://en.wikipedia.org/wiki/ILOVEYOU'),
    ('slammer', 'internet', '2003', 'SQL Slammer', 'A 376-byte worm exploited a database bug patched six months earlier and infected about 75,000 servers in roughly ten minutes, slowing parts of the internet and knocking ATMs offline.',
     'Unpatched known vulnerabilities are the cheapest attack there is.', [], '', 'https://en.wikipedia.org/wiki/SQL_Slammer'),
    ('apt1', 'nations', '2013 – 2015', 'China and the theft of secrets', 'Mandiant\'s 2013 APT1 report tied a long-running espionage group to Unit 61398 of China\'s People\'s Liberation Army and documented data stolen from 141 organisations. In 2015 the US Office of Personnel Management disclosed the theft of background-investigation records on about 21.5 million people, which US officials attributed to China; China denied involvement.',
     'Espionage is patient. Attackers want designs, negotiations and people\'s secrets, not just money.', [], 'Mandiant APT1', 'https://en.wikipedia.org/wiki/PLA_Unit_61398'),
    ('stuxnet', 'nations', '2010', 'Stuxnet', 'Malware targeting Siemens industrial controllers sabotaged uranium-enrichment centrifuges in Iran while showing operators normal readings. It is widely considered the first cyberweapon to cause physical destruction.',
     'Industrial systems are targets. Never fully trust what a compromised screen tells you.', ['Siemens Simatic S7-300.jpg', 'Simatic S7-300.jpg'], 'Siemens SIMATIC S7-300 PLC', 'https://en.wikipedia.org/wiki/Stuxnet'),
    ('grid', 'nations', '2015', 'Lights out in Ukraine', 'On 23 December 2015 attackers took remote control of three Ukrainian power companies\' systems and switched off substations, cutting electricity to about 230,000 people for several hours. It was the first confirmed cyberattack to take down a power grid, attributed to Sandworm, a unit of Russia\'s GRU military intelligence that later struck the grid again in 2016.',
     'Critical infrastructure is a battlefield. Defenders practise manual fallbacks for when the screens lie.', [], '', 'https://en.wikipedia.org/wiki/2015_Ukraine_power_grid_hack'),
    ('target', 'nations', '2013', 'The Target breach', 'Attackers entered through credentials stolen from a heating-and-ventilation contractor and installed malware on point-of-sale systems, stealing about 40 million card numbers. Alerts fired, but were not acted on.',
     'Third parties widen your attack surface, and alerts only help if someone responds.', [], '', 'https://en.wikipedia.org/wiki/Target_Corporation#2013_security_breach'),
    ('heartbleed', 'nations', '2014', 'Heartbleed', 'A missing bounds check in OpenSSL (CVE-2014-0160) let anyone read chunks of a server\'s memory, including private keys. It was one of the first bugs with its own name, logo and website, and it showed how much of the internet rests on volunteer-maintained code.',
     'Critical infrastructure can depend on a tiny, underfunded project.', ['Heartbleed.svg'], 'Heartbleed logo', 'https://en.wikipedia.org/wiki/Heartbleed'),
    ('election', 'nations', '2016', 'Hacking an election campaign', 'Russia\'s GRU hacked the Democratic National Committee and the Clinton campaign chairman\'s email and leaked the material through fake personas and WikiLeaks, while the Internet Research Agency ran fake social-media accounts. The bipartisan Senate Intelligence Committee confirmed the interference and the intelligence community\'s assessment that Moscow aimed to harm Clinton and help Trump. Neither assessed whether it changed the result.',
     'Hack-and-leak and disinformation turn stolen data into influence. Phishing one inbox can shape a national conversation.', [], '', 'https://en.wikipedia.org/wiki/Russian_interference_in_the_2016_United_States_elections'),
    ('shadowbrokers', 'nations', '2016 – 2017', 'The Shadow Brokers', 'A group calling itself the Shadow Brokers leaked hacking tools linked to the Equation Group, widely reported to be the NSA\'s elite Tailored Access Operations unit. One leaked exploit, EternalBlue, targeted a Windows file-sharing flaw that Microsoft had patched weeks earlier.',
     'Stockpiled exploits can leak. When they do, everyone who has not patched is exposed.', [], '', 'https://en.wikipedia.org/wiki/The_Shadow_Brokers'),
    ('wannacry', 'nations', '2017', 'WannaCry and NotPetya', 'WannaCry used the leaked EternalBlue exploit to spread ransomware to over 200,000 computers in about 150 countries, disrupting the UK\'s National Health Service. Weeks later NotPetya, disguised as ransomware, destroyed data at global companies.',
     'Patch, segment and back up. The same flaw can be a nuisance or a catastrophe.', [], '', 'https://en.wikipedia.org/wiki/WannaCry_ransomware_attack'),
    ('pegasus', 'supply', '2016 – 2021', 'Pegasus: spyware for hire', 'NSO Group\'s Pegasus could take over a phone through a single message, in later versions with no click at all. Citizen Lab first caught it against a human-rights defender in 2016. In 2021 the Pegasus Project and Citizen Lab exposed its use against journalists and activists, Apple patched the "FORCEDENTRY" zero-click exploit, and the US added NSO to its trade blacklist.',
     'Patch your phone promptly and turn on protections like Lockdown Mode if you are at high risk.', [], '', 'https://en.wikipedia.org/wiki/Pegasus_(spyware)'),
    ('solarwinds', 'supply', '2020', 'SolarWinds', 'Attackers slipped a backdoor into updates for the SolarWinds Orion monitoring software. About 18,000 customers installed it, and a smaller set of government agencies and companies were then quietly targeted. The US government attributed the campaign to Russia\'s SVR foreign intelligence service.',
     'Signed updates from a trusted vendor can still be the attack.', [], '', 'https://en.wikipedia.org/wiki/2020_United_States_federal_government_data_breach'),
    ('colonial', 'supply', '2021', 'Colonial Pipeline and Log4Shell', 'A ransomware attack through a single legacy VPN password without MFA led Colonial Pipeline to shut down fuel delivery on the US East Coast. In December, Log4Shell (CVE-2021-44228) turned a logging library into a remote-control switch for countless servers.',
     'MFA everywhere, and know every library you ship (that is what an SBOM is for).', [], '', 'https://en.wikipedia.org/wiki/Log4Shell'),
    ('xz', 'supply', '2024', 'The xz backdoor', 'Over two years, a contributor gained the trust of the xz compression project and planted a backdoor aimed at SSH servers (CVE-2024-3094). Engineer Andres Freund noticed SSH logins taking half a second too long and caught it before it reached most stable Linux releases.',
     'Open source is people. Curiosity about small anomalies still saves the day.', [], '', 'https://en.wikipedia.org/wiki/XZ_Utils_backdoor'),
    ('lazarus', 'supply', '2022 – 2025', 'North Korea\'s crypto heists', 'North Korean state hackers stole about $620 million from the Ronin bridge in 2022, and in February 2025 about $1.5 billion from the Bybit exchange, the largest cryptocurrency theft on record. The FBI attributed both to North Korea, whose stolen funds UN experts say help pay for its weapons programmes.',
     'Social engineering and supply-chain tricks against developers beat even "secure" wallets. Verify what you sign.', [], '', 'https://en.wikipedia.org/wiki/Lazarus_Group'),
    ('crowdstrike', 'supply', '2024', 'The day the screens went blue', 'A faulty content update to CrowdStrike\'s Falcon sensor crashed about 8.5 million Windows machines on 19 July, grounding flights and disrupting hospitals. It was not an attack, but it showed how much power security software holds.',
     'Resilience means staged rollouts and recovery plans, even for your defences.', [], '', 'https://en.wikipedia.org/wiki/2024_CrowdStrike-related_IT_outages'),
    ('ai', 'supply', '2025 – 2026', 'The AI era', 'AI coding assistants and agents changed how software is written and attacked. OWASP published a Top 10 for agentic applications, and researchers began tracking vulnerabilities traced to AI-generated code. Defenders use the same tools to find bugs faster.',
     'New tools, old lessons: verify inputs, limit privileges, review what ships.', [], '', 'https://genai.owasp.org/2025/12/09/owasp-top-10-for-agentic-applications/'),
]

# An image must mention one of these words in its Commons title or description to be used.
IMAGE_REQUIRE = {
    'chappe': r'chappe|telegra', 'enigma': r'enigma', 'colossus': r'colossus', 'bug': r'bug|mark ii|logbook|moth', 'eniac': r'eniac',
    'phreaks': r'phreak|blue ?box.*(phone|tele|tone|wozniak)|(phone|tele|tone|wozniak).*blue ?box', 'creeper': r'arpanet', 'cuckoo': r'stoll',
    'morris': r'morris worm|morris_worm', 'defcon': r'def ?con', 'stuxnet': r's7|simatic|plc', 'heartbleed': r'heartbleed', 'apt1': r'mandiant|61398',
}

PEOPLE = [
    ('Marian Rejewski', 'Broke Enigma with mathematics in 1932.'), ('Alan Turing', 'Designed the bombe; founded computer science.'),
    ('Grace Hopper', 'Compiler pioneer and the best storyteller in computing.'), ('Cliff Stoll', 'Turned a 75-cent error into the first famous intrusion investigation.'),
    ('Dorothy Denning', 'Created the first model for intrusion detection (1986).'), ('Whitfield Diffie & Martin Hellman', 'Invented public-key key exchange (1976).'),
    ('Ron Rivest, Adi Shamir & Leonard Adleman', 'Created RSA encryption (1977).'), ('Andres Freund', 'Caught the xz backdoor by noticing slow logins.'),
]


def _plate(e, credit, base='') -> str:
    eid, _era, year, title, *_ = e
    img = ROOT / 'public/assets/history' / f'{eid}.jpg'
    if credit and img.exists():
        return (f'<figure class="hx-photo"><img src="{E(base)}/assets/history/{eid}.jpg" alt="{E(credit.get("description") or title)}" loading="lazy" decoding="async">'
                f'<figcaption class="label"><a href="{E(credit["page"])}">{E(credit.get("author") or "Unknown author")} / {E(credit["license"])}</a></figcaption></figure>')
    return f'<div class="hx-plate" aria-hidden="true"><span>{E(year.split(" ")[0])}</span></div>'


def history_page(site) -> str:
    credits = {}
    manifest = ROOT / 'data/history_images.json'
    if manifest.exists():
        credits = read_json(manifest)
    b = site.base
    body = ('<header class="hx-hero"><p class="crumb">History / 1834 – today</p><h1>Every attack<br><span>has a history</span></h1>'
            '<p class="lead">From a bribed telegraph to AI agents: the hacks that shaped cybersecurity, and what defenders learned each time.</p>'
            '<nav class="hx-eras" aria-label="Eras">' + ''.join(f'<a href="#era-{k}"><span class="label">{E(y)}</span>{E(t)}</a>' for k, t, y, _ in ERAS) + '</nav></header>')
    for k, t, y, d in ERAS:
        body += f'<section class="hx-era" id="era-{k}"><div class="hx-era-head"><span class="label">{E(y)}</span><h2>{E(t)}</h2><p>{E(d)}</p></div><ol class="hx-events">'
        for e in [e for e in EVENTS if e[1] == k]:
            eid, _era, year, title, story, lesson, _c, _q, src = e
            plate = _plate(e, credits.get(eid), b)
            body += (f'<li class="hx-event rv" id="{eid}">{plate}<div class="hx-text"><span class="hx-year">{E(year)}</span><h3>{E(title)}</h3><p>{E(story)}</p>'
                     f'<p class="hx-lesson"><span class="label">Lesson</span>{E(lesson)}</p><p class="hx-src label"><a href="{E(src)}">Read more ↗</a></p></div></li>')
        body += '</ol></section>'
    body += ('<section class="hx-people"><h2>People to know</h2><div class="grid two">'
             + ''.join(f'<article class="card"><h3>{E(n)}</h3><p>{E(d)}</p></article>' for n, d in PEOPLE)
             + '</div></section>')
    body += (f'<section class="hx-next"><p class="label">Now make some history</p><h2>The next chapter is written by defenders.</h2>'
             f'<p>{site.a("Start the Linux Lab →", "/linux/", "button primary")} {site.a("Play today’s CyberHub Daily", "/daily/", "button")}</p>'
             '<p class="muted">Photographs from Wikimedia Commons under the licenses shown on each image. Dates and figures follow the linked sources.</p></section>')
    return body


def build_history(site) -> None:
    site.page('/history/', 'A history of cybersecurity', history_page(site), 'From a bribed telegraph in 1834 to AI agents: the hacks that shaped cybersecurity and what defenders learned.', 'Resources')
