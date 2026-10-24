"""CyberHub Linux Lab: an original, story-driven Linux track in the spirit of hands-on
"dojo" courses. Lessons are written for CyberHub; practice runs in a simulated shell in the
browser (web/linux.ts). Level ids here must match LEVELS in web/linux.ts (tests check this).
"""
from __future__ import annotations

from html import escape as E
import re

# Each level: id, title, lesson paragraphs, goal, hints. `code` spans use backticks in text.
MODULES = [
    ('shell-basics', 'Shell basics', 'Your first minutes on hub01, the CISO practice server.', [
        ('first-command', 'Your first command', ['A shell reads a line you type, runs the program you named, and prints what it says back. On a server you will investigate, the first question is always: who am I logged in as?', 'The program `whoami` answers that.'],
         'Run `whoami`.', ['Type the word whoami and press Enter.']),
        ('echo', 'Say something', ['`echo` prints its arguments. It looks trivial, but you will use it to write files, check variables and build scripts.', 'Arguments are separated by spaces. Quotes keep words together: `echo "two words"`.'],
         'Print exactly: `hello, hub01`', ['echo hello, hub01', 'Quotes are optional here, but they never hurt.']),
        ('manual', 'Read the manual', ['Nobody memorises every option. Professionals look things up. On this lab box `man <command>` shows a short manual, and `help` lists every command available.'],
         'Open the manual for `ls`.', ['man followed by the command name.']),
        ('read-the-flag', 'Capture your first flag', ['Flags are secret strings like `CISO{...}` hidden on the box. Finding one proves you did the task. `cat` prints a file to the screen.', 'Files are named by paths. `/flag` is a file called flag at the very top of the filesystem.'],
         'Print `/flag` and submit what you find with `submit <flag>`.', ['cat /flag', 'Copy the whole CISO{...} string, braces included.']),
    ]),
    ('navigation', 'Finding your way', 'The filesystem is a tree. Learn to move around it without getting lost.', [
        ('where-am-i', 'Where am I?', ['Every shell has a current working directory. Commands that take a relative path start from there. `pwd` prints it.'], 'Print your working directory.', ['pwd stands for print working directory.']),
        ('change-directory', 'Go to the logs', ['`cd` changes directory. Servers keep logs in `/var/log`, so an investigator lives there.', 'Your prompt shows where you are after each move.'], 'Change into `/var/log`.', ['cd /var/log']),
        ('absolute-paths', 'Absolute paths', ['A path starting with `/` is absolute: it works from anywhere. Case files are often buried deep.'], 'Read the flag in `/opt/cases/2026/october/ir-17/` and submit it.', ['You can cat the full path without cd-ing first.', 'cat /opt/cases/2026/october/ir-17/flag']),
        ('home-sweet-home', 'There is no place like ~', ['Your home directory is `/home/student`. The shell lets you write it as `~`, and `cd` with no arguments takes you there. You start this level somewhere else.'], 'A teammate left a handoff note in a folder in your home directory. Find the flag in it.', ['cd ~ then ls.', 'The note is in ~/notes/']),
        ('hidden-files', 'Hidden files', ['Names that start with a dot are hidden from a plain `ls`. Config files and things people want to hide live there. `ls -a` shows everything.'], 'Find the hidden file in your home directory and submit its flag.', ['ls -a ~', 'Hidden files still open with cat.']),
        ('dot-dot', 'Climbing up', ['`..` means the parent directory and `.` means the current one. `cd ../..` climbs two levels. You start this level deep inside `/opt/drop`.'], 'Somewhere above you is a file called `marker`. Read it and submit the flag.', ['Use ls .. to look one level up.', 'It is two levels up: cd ../..']),
    ]),
    ('reading-files', 'Reading evidence', 'Logs are long. Read only the part that matters.', [
        ('head', 'The top of the file', ['`head` prints the first lines of a file (10 by default). `head -n 1` prints just one. Boot logs record what happened first.'], 'The flag is the first line of `/var/log/boot.log`.', ['head -n 1 /var/log/boot.log']),
        ('tail', 'The end of the file', ['`tail` prints the last lines. The newest events in a log are at the bottom, so this is the command you will use most during an incident.'], 'The flag is the last line of `/var/log/app.log`.', ['tail -n 1 /var/log/app.log']),
        ('count-lines', 'Counting', ['`wc -l` counts lines. Quick sizing tells you whether a log is worth reading by hand or needs filtering.'], 'How many lines are in `/var/log/dns.log`? Submit the number.', ['wc -l /var/log/dns.log', 'Submit only the number.']),
        ('grep', 'Search with grep', ['`grep PATTERN file` prints only matching lines. It is the single most useful tool for log work. Add `-i` to ignore case and `-n` for line numbers.'], 'A beacon left a flag somewhere in `/var/log/proxy.log`, which has 1,500 lines. Find it.', ['Flags contain CISO.', 'grep CISO /var/log/proxy.log']),
    ]),
    ('files', 'Making and moving files', 'Set up a case folder and keep evidence tidy.', [
        ('mkdir', 'Make a case folder', ['`mkdir` creates a directory. `mkdir -p a/b/c` creates the whole chain at once.'], 'Create a directory called `cases` in your home directory.', ['mkdir ~/cases']),
        ('touch', 'Start the report', ['`touch` creates an empty file, or updates the time on an existing one.'], 'Create an empty file `~/cases/report.txt`.', ['touch ~/cases/report.txt']),
        ('copy', 'Copy the evidence', ['`cp source destination` copies. If the destination is a directory, the file keeps its name. Never work on original evidence; work on a copy.'], 'Copy `/opt/evidence/capture.pcap` into `~/cases/`. The original must stay where it is.', ['cp /opt/evidence/capture.pcap ~/cases/']),
        ('move', 'Rename the draft', ['`mv` moves and renames. Renaming is just moving to a new name in the same folder.'], 'Rename `~/cases/draft.txt` to `~/cases/final-report.txt`.', ['mv old-name new-name']),
        ('remove', 'Clean up carefully', ['`rm` deletes, and there is no recycle bin. Check what a pattern matches with `ls` before you delete with it.'], 'Delete every `.tmp` file in `~/scratch` but keep `keep.txt`.', ['ls ~/scratch/*.tmp first.', 'rm ~/scratch/*.tmp']),
    ]),
    ('wildcards', 'Wildcards', 'Let the shell type file names for you.', [
        ('star', 'The star', ['`*` matches any run of characters in a file name. The shell expands it before the command runs, so `cp *.log dest/` copies every log.'], 'Make `~/logs` and copy every `.log` file from `/var/log/edge/` into it. Leave the README behind.', ['mkdir ~/logs first.', 'cp /var/log/edge/*.log ~/logs/']),
        ('brackets', 'Brackets and question marks', ['`?` matches exactly one character. `[0-9]` matches one character from a set or range. Together they let you be precise.'], 'In `~/exports`, delete `report_0.csv` through `report_9.csv` but keep `report_final.csv`.', ['report_[0-9].csv matches one digit only.', 'rm ~/exports/report_[0-9].csv']),
    ]),
    ('pipes', 'Pipes and redirection', 'Chain small tools into answers.', [
        ('redirect', 'Write to a file', ['`>` sends a command\'s output into a file instead of the screen. It replaces whatever was there.'], 'Create `~/status.txt` containing exactly `incident logged`.', ['echo "incident logged" > ~/status.txt']),
        ('append', 'Append, do not overwrite', ['`>>` adds to the end of a file. Timelines grow; they never get rewritten.'], 'Add the line `09:15 host isolated` to `~/timeline.txt` without losing the first line.', ['Use >> not >.', 'echo "09:15 host isolated" >> ~/timeline.txt']),
        ('pipe-count', 'Count failed logins', ['`|` feeds one command\'s output into the next. `grep` finds lines, and `wc -l` counts them. This is how you size a brute-force attempt in seconds.'], 'How many "Failed password" lines are in `/var/log/auth.log`? Submit the number.', ['grep "Failed password" /var/log/auth.log | wc -l']),
        ('top-talker', 'Find the top attacker', ['Real triage: which IP failed the most? Pull out the IP column with `cut -d \' \' -f N`, then `sort | uniq -c` counts repeats, and `sort -nr | head -n 1` shows the winner.'], 'Submit the IP address with the most failed logins in `/var/log/auth.log`.', ['Look at one Failed line and count the space-separated fields to the IP.', 'The IP is field 11.', "grep Failed /var/log/auth.log | cut -d ' ' -f 11 | sort | uniq -c | sort -nr | head -n 1"]),
    ]),
    ('finding', 'Finding things', 'Search the whole box, not just one folder.', [
        ('find', 'Find a leaked key', ['`find PATH -name PATTERN` walks a directory tree. Put patterns in quotes so the shell does not expand them first. Add `2>/dev/null` to hide "Permission denied" noise.'], 'Someone left a `.key` file somewhere on the server. Find it and submit the flag inside.', ['find / -name "*.key" 2>/dev/null', 'Then cat the path it prints.']),
        ('grep-recursive', 'Search inside every file', ['`grep -r PATTERN DIR` searches every file under a directory. It shows the file name with each match, which tells you where the secret leaked.'], 'One of the configs under `/srv/config` contains a token with a flag. Find it.', ['grep -r CISO /srv/config']),
    ]),
    ('permissions', 'Permissions', 'Who can read, write and run what. The heart of Linux security.', [
        ('read-permissions', 'Read the permission bits', ['`ls -l` shows a mode like `-rw-r--r--`: the file type, then read/write/execute for the owner, the group and everyone else. A `w` in the last three means anyone on the system can change the file.'], 'One file in `~/configs` is world-writable. Submit its name.', ['ls -l ~/configs', 'Look for rw- at the end of the permission string.']),
        ('chmod-private', 'Lock down a private key', ['`chmod` changes modes. In numeric form each digit is read(4) + write(2) + execute(1) for owner, group and others. SSH refuses keys that others can read, so private keys should be `600`.'], 'Make `~/.ssh/id_ed25519` readable and writable by you only.', ['chmod 600 ~/.ssh/id_ed25519']),
        ('run-script', 'Make it executable', ['A script only runs if it has the execute bit. `chmod +x file` adds it, and `./file` runs a file in the current directory.'], 'Run `~/tools/triage.sh` and submit the flag it prints.', ['It is not executable yet: chmod +x', 'cd ~/tools then ./triage.sh']),
        ('sudo', 'Use sudo responsibly', ['Some files belong to root and are closed to everyone else. On this box you are allowed to use `sudo`, which runs one command as root. Use it for that one command, then go back to being you.'], 'Read `/root/incident-key.txt` and submit the flag.', ['A plain cat will be denied.', 'sudo cat /root/incident-key.txt']),
    ]),
    ('environment', 'Environment and processes', 'Variables, the PATH and what is running.', [
        ('env-var', 'Environment variables', ['Programs get settings from environment variables. `env` lists them and `echo $NAME` prints one. Secrets leak this way too.'], 'A variable on this box holds a flag. Find it.', ['env', 'echo $CASE_TOKEN']),
        ('export', 'Set a variable', ['`export NAME=value` sets a variable for this shell and the programs it starts. No spaces around the equals sign.'], 'Set `CASE_ID` to `IR-2026-17`.', ['export CASE_ID=IR-2026-17']),
        ('path', 'The PATH', ['When you type a command name, the shell looks for it in each folder listed in `$PATH`, in order. That is why tools in odd places "do not exist" until you add them. Attackers abuse PATH order, so know what is on yours.'], 'The SOC tool `ioc-check` is installed in `/opt/soc/bin`. Make it runnable by name, run it and submit its flag.', ['echo $PATH to see the list.', 'export PATH=$PATH:/opt/soc/bin then ioc-check']),
        ('processes', 'Stop a cryptominer', ['`ps` lists running processes with their PIDs. `kill PID` stops one. Read the command line before you kill anything; not everything strange is malicious.'], 'Something is mining cryptocurrency under your account. Stop it, but leave the web server running.', ['ps', 'Look for the process talking to a mining pool, then kill its PID.']),
        ('who-has-a-shell', 'Who can log in?', ['`/etc/passwd` lists every account, one per line, fields separated by `:`. The last field is the login shell. Service accounts should have `nologin`; a surprise `/bin/bash` deserves a question.'], 'One unexpected account has a real login shell. Submit its username.', ['grep /bin/bash /etc/passwd', 'root, student and analyst are expected.']),
    ]),
]


def _md(text: str) -> str:
    return re.sub(r'`([^`]+)`', lambda m: f'<code>{m.group(1)}</code>', E(text))


def level_ids() -> list[str]:
    return [lv[0] for _, _, _, levels in MODULES for lv in levels]


def index_page(site) -> str:
    total = len(level_ids())
    body = site.heading('Linux Lab', f'Learn the Linux command line by doing it: {total} levels in {len(MODULES)} modules, each a small case on a practice server. Runs in your browser; nothing to install.', 'Labs / Linux')
    body += ('<div class="lx-hero"><pre class="lx-teaser" aria-hidden="true">student@hub01:~$ grep "Failed password" /var/log/auth.log | wc -l\n214\nstudent@hub01:~$ submit 214\n✔ Correct.</pre>'
             '<ul class="lx-points"><li><b>Real commands.</b> A simulated shell with pipes, redirection, wildcards, permissions, sudo, variables and processes.</li>'
             '<li><b>Fresh flags.</b> Every level generates new data and flags, so the only way through is to do it.</li>'
             '<li><b>Security first.</b> Every module is framed as investigation work on a CISO server.</li></ul></div>')
    body += '<ol class="lx-modules" id="linux-index">'
    for i, (mid, title, desc, levels) in enumerate(MODULES):
        ids = ','.join(lv[0] for lv in levels)
        dots = ''.join(f'<i data-lv="{lid}" title="{E(lt)}"></i>' for lid, lt, *_ in levels)
        body += (f'<li><a class="lx-mod" href="{E(site.base)}/linux/{mid}/"><span class="label">{i + 1:02d} / Module</span><strong>{E(title)}</strong><span class="lx-desc">{E(desc)}</span>'
                 f'<span class="lx-dots" aria-hidden="true">{dots}</span><span class="label lx-count"><span data-mod-count="{ids}">0/{len(levels)}</span> levels</span></a></li>')
    body += '</ol><p class="notice">Original CyberHub material, inspired by hands-on "dojo" style courses. When you are ready for a real machine, try it in a virtual machine or the CyberHub labs. Progress stays in this browser.</p>'
    return body


def module_page(site, mi: int) -> str:
    mid, title, desc, levels = MODULES[mi]
    body = site.heading(title, desc, f'Linux Lab / Module {mi + 1:02d}')
    nav = ''.join(f'<button type="button" class="lx-step" data-goto="{lid}"><span class="label">{k + 1:02d}</span>{E(lt)}</button>' for k, (lid, lt, *_) in enumerate(levels))
    body += f'<div class="lab-shell" id="lab"><nav class="lx-steps" aria-label="Levels">{nav}</nav><div class="lx-grid"><div class="lx-lessons">'
    for k, (lid, lt, lesson, goal, hints) in enumerate(levels):
        body += (f'<section class="lx-level" data-level="{lid}"{" hidden" if k else ""}><p class="label">Level {k + 1:02d} of {len(levels):02d}</p><h2>{E(lt)}</h2>'
                 + ''.join(f'<p>{_md(p)}</p>' for p in lesson)
                 + f'<p class="goal"><b>Goal:</b> {_md(goal)}</p><p class="level-done label" hidden>★ Complete</p>'
                 + '<details class="lx-hints"><summary>Hints</summary><ol class="hint-list">' + ''.join(f'<li>{_md(h)}</li>' for h in hints) + '</ol></details></section>')
    nxt = f'{site.base}/linux/{MODULES[mi + 1][0]}/' if mi + 1 < len(MODULES) else f'{site.base}/linux/'
    body += ('</div><div class="lx-term"><div class="term-bar label"><span>student@hub01</span><span class="term-actions"><button type="button" id="lab-reset">Reset level</button></span></div>'
             '<div class="term-out" id="term-out" role="log" aria-live="polite" aria-label="Terminal output"></div>'
             '<form class="term-form" id="term-form" autocomplete="off"><label class="term-ps1" id="term-ps1" for="term-in">student@hub01:~$ </label>'
             '<input id="term-in" class="term-in" type="text" spellcheck="false" autocapitalize="off" autocorrect="off" aria-label="Type a command and press Enter"></form></div></div>'
             f'<div class="lx-foot"><button type="button" id="lab-prev">← Previous</button><span class="label" id="lab-status"></span><button type="button" class="primary" id="lab-next">Next level →</button></div>'
             f'<noscript><p class="notice">The practice terminal needs JavaScript. The lessons above still work as a reading guide.</p></noscript></div>'
             f'<p class="lx-next-mod">{site.a(("Next module: " + MODULES[mi + 1][1] + " →") if mi + 1 < len(MODULES) else "Back to all modules →", nxt.replace(site.base, "", 1), "button")}</p>')
    return body


def build_linux(site) -> None:
    site.page('/linux/', 'Linux Lab', index_page(site), 'Learn the Linux command line with original, security-themed levels in an in-browser practice shell.', 'Labs', module='linux')
    for i, (mid, title, desc, levels) in enumerate(MODULES):
        site.page(f'/linux/{mid}/', f'Linux Lab: {title}', module_page(site, i), desc, 'Labs', module='linux')
