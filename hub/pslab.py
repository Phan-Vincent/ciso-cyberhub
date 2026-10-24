"""CyberHub PowerShell Lab: Windows investigation in a simulated PowerShell (web/pslab.ts).
Same page builders as the Linux Lab. Level ids must match PS_LEVELS (tests check this)."""
from __future__ import annotations

from .linux import index_page, module_page

PATH, KEY = '/linux/powershell/', 'cyberhub:pslab'

MODULES = [
    ('basics', 'PowerShell basics', 'Find your way around a Windows machine from the command line.', [
        ('ps-whoami', 'Who am I?', ['PowerShell is Windows\' command line and scripting language. Every investigation starts by confirming which account you are using.', '`whoami` prints your domain and user name. `$env:USERNAME` reads the same thing from an environment variable.'],
         'Run `whoami`.', ['Type whoami and press Enter.']),
        ('ps-location', 'Where am I?', ['PowerShell commands are called cmdlets and follow a Verb-Noun pattern: `Get-Location`, `Get-ChildItem`, `Stop-Process`. Many have short aliases borrowed from Linux and DOS, such as `pwd`, `ls` and `dir`.'],
         'Show your current location with `Get-Location`.', ['Get-Location (or its alias pwd).']),
        ('ps-list', 'List a folder', ['`Get-ChildItem` lists what is inside a folder (aliases: `ls`, `dir`). Add `-Recurse` to look inside every subfolder too. Case files on this box are in `C:\\Cases`.'],
         'Find the handoff note somewhere under `C:\\Cases` and submit its flag.', ['Get-ChildItem C:\\Cases -Recurse', 'Then Get-Content on the file you find.']),
        ('ps-hidden', 'Hidden files', ['Windows hides files that have the Hidden attribute. `Get-ChildItem -Force` shows them; the `h` in the Mode column marks them. Attackers and nosy users both like hidden files.'],
         'A hidden file in your Documents folder holds a flag. Submit it.', ['Get-ChildItem ~\\Documents -Force', 'Get-Content the hidden file.']),
        ('ps-tail', 'The end of a log', ['`Get-Content` reads a file (aliases: `cat`, `type`). On a long log, `-Tail 5` shows only the last five lines, where the newest events are.'],
         'The last line of `C:\\Logs\\app.log` holds a flag. Submit it.', ['Get-Content C:\\Logs\\app.log -Tail 1']),
    ]),
    ('investigate', 'Investigate a machine', 'Processes, services and accounts: the first things to check on a suspicious host.', [
        ('ps-search', 'Search a log', ['`Select-String` is PowerShell\'s grep: it prints only lines that match a pattern. `Select-String -Pattern token -Path C:\\Logs\\web.log`.'],
         'Somebody requested an admin page with a token in `C:\\Logs\\web.log`. Find it and submit the flag.', ['Select-String -Pattern admin -Path C:\\Logs\\web.log']),
        ('ps-process', 'Stop a cryptominer', ['`Get-Process` lists running programs with their process ID (Id). `Stop-Process -Id 1234` stops one. Sort by CPU to spot something burning the processor: `Get-Process | Sort-Object CPU -Descending`.'],
         'A cryptominer is running. Stop it, and nothing else.', ['Get-Process | Sort-Object CPU -Descending', 'Stop-Process -Id <its Id>']),
        ('ps-service', 'A suspicious service', ['Services run in the background and often start with Windows, which makes them a favourite way for malware to stay installed. `Get-Service` lists them. Look for a name that does not match its description or does not belong.'],
         'One running service was added by an attacker with a generic description. Submit its Name.', ['Get-Service', 'Which Name is not a real Windows service and has DisplayName "Windows Helper"?']),
        ('ps-users', 'Who can log in?', ['`Get-LocalUser` lists the accounts on this computer and whether they are enabled. Attackers add accounts so they can come back later.'],
         'Find the enabled account that should not be there and submit its name.', ['Get-LocalUser', 'Administrator and Guest are disabled; student and analyst are expected.']),
        ('ps-admins', 'Who is an administrator?', ['Members of the local Administrators group can do anything on the machine. `Get-LocalGroupMember -Group Administrators` lists them. Normal users should not be there.'],
         'Find the account that was quietly added to Administrators and submit its user name (without the computer name).', ['Get-LocalGroupMember -Group Administrators']),
    ]),
    ('forensics', 'Windows forensics', 'Event logs, persistence, file hashes and network connections.', [
        ('ps-events', 'Count failed logons', ['Windows writes security events to the Security log. Event ID 4625 is a failed logon and 4624 a successful one. `Get-WinEvent -FilterHashtable @{LogName=\'Security\'; Id=4625}` pulls just the failures; pipe into `Measure-Object` to count them.'],
         'How many failed logons (4625) are in the Security log? Submit the number.', ["Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625} | Measure-Object"]),
        ('ps-persistence', 'Run keys', ['Programs listed under the registry key `HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run` start every time the user logs in. Malware adds itself here. A program running from `AppData\\Roaming` with an odd name is a red flag.'],
         'Find the suspicious Run key entry and submit its Name.', ['Get-ItemProperty HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run']),
        ('ps-tasks', 'Scheduled tasks', ['Scheduled tasks run programs on a timer or at logon, which also makes them a classic persistence method. `Get-ScheduledTask` lists them. Hidden, encoded PowerShell in a task is a strong sign of compromise.'],
         'One task runs hidden, encoded PowerShell. Submit its TaskName.', ['Get-ScheduledTask', 'Look at the Action column.']),
        ('ps-hash', 'Match a file hash', ['A SHA-256 hash is a file\'s fingerprint. Threat intelligence feeds share hashes of known-bad files. `Get-FileHash` computes them so you can compare.'],
         'Threat intel lists one bad hash in `C:\\Cases\\ioc.txt`. Which file in `~\\Desktop\\Downloads` matches? Submit its file name.', ['Get-Content C:\\Cases\\ioc.txt', 'Get-ChildItem ~\\Desktop\\Downloads | Get-FileHash']),
        ('ps-network', 'Who is it talking to?', ['`Get-NetTCPConnection -State Established` lists live network connections and the process (OwningProcess) behind each one. `rundll32` talking to an unknown internet address on an unusual port deserves a closer look.'],
         'Submit the remote IP address that the suspicious process is connected to.', ['Get-NetTCPConnection -State Established', 'Match OwningProcess with Get-Process.']),
    ]),
]
RANKS = [(0, 'New hire'), (3, 'Help desk'), (6, 'Sysadmin'), (10, 'SOC analyst'), (13, 'Investigator'), (15, 'Domain admin')]


def level_ids() -> list[str]:
    return [lv[0] for _, _, _, levels in MODULES for lv in levels]


def _intro(site):
    def f(total: int) -> str:
        body = site.heading('PowerShell Lab', f'Investigate a Windows machine from the command line: {total} levels in {len(MODULES)} modules on a simulated PC. Files, processes, services, accounts, event logs and persistence.', 'Labs / PowerShell')
        body += ('<div class="lx-hero"><pre class="lx-teaser" aria-hidden="true">PS C:\\Users\\student&gt; Get-WinEvent -FilterHashtable @{LogName=\'Security\'; Id=4625} | Measure-Object\n\nCount    : 87\n\nPS C:\\Users\\student&gt; submit 87\n✔ Correct.</pre>'
                 '<ul class="lx-points"><li><b>The Windows half of the job.</b> Most companies run Windows; SOC analysts and help desk staff use PowerShell daily.</li>'
                 '<li><b>Real cmdlets and pipelines.</b> <code>Get-Process</code>, <code>Get-WinEvent</code>, <code>Select-String</code>, <code>Where-Object</code> and more, on a practice box.</li>'
                 f'<li><b>Pairs with.</b> {site.a("Windows event logs lab", "/labs/windows-events/")} and the {site.a("SOC Simulator", "/labs/soc/")}.</li></ul></div>')
        return body
    return f


def build_pslab(site) -> None:
    notice = '<p class="notice">Original CyberHub material. A simplified PowerShell simulated in your browser: no real Windows machine is touched. Progress stays in this browser.</p>'
    site.page(PATH, 'PowerShell Lab', index_page(site, MODULES, PATH, KEY, RANKS, _intro(site), 'ps-index', notice),
              'Learn Windows investigation with PowerShell: files, processes, services, accounts, event logs and persistence, in a simulated shell.', 'Labs', module='pslab')
    for i, (mid, title, desc, _levels) in enumerate(MODULES):
        site.page(f'{PATH}{mid}/', f'PowerShell Lab: {title}', module_page(site, i, MODULES, PATH, KEY, 'PowerShell Lab', 'PS C:\\Users\\student'), desc, 'Labs', module='pslab')
