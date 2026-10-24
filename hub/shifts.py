"""'A day defending it': a short, branching shift on each /defend/ page. Every step has three
choices with exactly one best answer; the others are partly right or make things worse.
Rendered as HTML; web/journey.ts runs it and saves the score in this browser only.
"""
from __future__ import annotations

from html import escape as E

# slug -> (role, setting, steps, debrief, lab (title, path))
# step: (time, situation, [(choice, verdict 'best'|'ok'|'bad', why)])
SHIFTS = {
    'infrastructure': ('SOC analyst, night shift', 'A university with 20,000 accounts in the cloud.', [
        ('02:07', 'The SIEM alerts: "Impossible travel". j.martinez signed in from Riverside, then six minutes later from an address in another country. The second sign-in passed MFA.', [
            ('Close it. MFA was approved, so it must be her.', 'bad', 'Approval does not prove who approved. Attackers spam push prompts until a tired user taps "Approve" (MFA fatigue), or steal a session token.'),
            ('Open the sign-in logs: device, IP reputation and how the MFA was approved.', 'best', 'Right. Ten minutes of evidence first: it tells you whether this is travel, a VPN or an attacker.'),
            ('Disable every account in the organisation until morning.', 'bad', 'That stops 20,000 people working and destroys trust in the SOC. Contain what you have evidence for.'),
        ]),
        ('02:15', 'The logs show 23 push prompts in ten minutes before the approval. The new session has just created an inbox rule that forwards all mail to an outside address.', [
            ('Email j.martinez to ask whether it was her, and wait for a reply.', 'bad', 'The attacker is reading that inbox. You would warn them and wait for an answer that may come from them.'),
            ('Revoke her sessions, reset the password, remove the forwarding rule and make her re-register MFA.', 'best', 'Right. Cut off access, undo what the attacker set up, and make sure the stolen factor cannot be reused. Contact her by phone in the morning.'),
            ('Delete her mailbox so nothing else can leak.', 'bad', 'That destroys evidence and her work, and does not remove the attacker\'s access token.'),
        ]),
        ('02:40', 'The account is contained. Was she the only one?', [
            ('Search the SIEM for the same attacker IP and for other users with bursts of push prompts.', 'best', 'Right. Attackers rarely target one person. Scoping is what turns an alert into an investigation.'),
            ('Block that whole country at the firewall and close the ticket.', 'ok', 'It may slow this attacker, but they can switch to a VPN in minutes, and it blocks legitimate students abroad. Scope first.'),
            ('Close the ticket: one account, contained.', 'bad', 'You do not know it was one account until you look.'),
        ]),
        ('06:55', 'Day shift arrives in five minutes.', [
            ('Write a timeline: alerts, evidence, actions, attacker IP and open questions. Hand it over in person.', 'best', 'Right. A clear timeline is the most valuable thing you produce all night. It is also what auditors and lawyers will read.'),
            ('Skip the notes. Everything is in the SIEM.', 'ok', 'The data is there; your reasoning is not. The day shift will redo your work.'),
            ('Say "all handled" and go home.', 'bad', 'Open questions become forgotten questions.'),
        ]),
    ], 'Push-bombing users until they approve (MFA fatigue) was part of the 2022 Uber breach. The fix is phishing-resistant MFA (passkeys, security keys) and number matching on push prompts.', ('Incident response lab', '/labs/incident-response/')),

    'operational-technology': ('OT security analyst', 'A regional water utility in the Inland Empire.', [
        ('06:40', 'An operator calls: the HMI shows the chemical dosing setpoint was changed overnight. Nobody on shift changed it.', [
            ('Remote into the controller from your laptop and change it back yourself.', 'bad', 'You do not know the process state, and you would be making changes to a live system you do not operate. Operators control the process.'),
            ('Work with the operators: switch dosing to local or manual control at the safe level the procedure gives, and confirm with water-quality tests.', 'best', 'Right. Safety first, using the plant\'s own procedures. In OT, the people who run the process lead the response.'),
            ('Pull the network cable on the whole control system.', 'ok', 'Sometimes necessary, but it can also remove the operators\' view of the process. It is their call, made with you, not yours alone.'),
        ]),
        ('07:30', 'The process is safe. Now, how did the change happen?', [
            ('Run a full, aggressive Nmap scan of the control network to see what is there.', 'bad', 'Aggressive scans have crashed fragile PLCs. In OT, discovery is passive or carefully planned with operators.'),
            ('Collect HMI audit logs and remote-access logs, and start a passive packet capture.', 'best', 'Right. Logs and passive monitoring show who connected and what they sent, without touching the controllers.'),
            ('Reboot the controller to clear anything malicious.', 'bad', 'That interrupts the process and wipes evidence from memory.'),
        ]),
        ('09:10', 'The logs show a vendor remote-access tool connected at 02:13 with a shared "vendor" account. It has no MFA and is reachable from the internet.', [
            ('Disable that remote-access path, rotate the shared credentials and call the vendor.', 'best', 'Right. Close the door that was used, then rebuild vendor access properly: named accounts, MFA, a monitored jump host, switched on only when needed.'),
            ('Change the password but keep the tool open to the internet.', 'ok', 'Better than nothing, but the exposure that made this possible is still there.'),
            ('Leave it. The vendor needs access for support.', 'bad', 'Then so does the attacker.'),
        ]),
        ('11:00', 'Leadership asks who needs to know.', [
            ('Follow the incident plan: report to CISA, notify the state and water regulators as required, and brief leadership.', 'best', 'Right. Reporting brings help and warns other utilities that may be hit the same way.'),
            ('Tell IT only, quietly, to avoid bad press.', 'bad', 'Hiding incidents at water utilities can break reporting rules and leaves others exposed.'),
            ('Tell IT and wait to see if it happens again.', 'ok', 'IT needs to know, but this is a safety incident with outside reporting duties.'),
        ]),
    ], 'In 2023, attackers changed displays on internet-exposed PLCs at US water utilities that still used default passwords (CISA advisory AA23-335A). Exposed remote access is the most common way into OT.', ('Packet analysis lab', '/labs/packet-analysis/')),

    'hardware': ('Infrastructure security engineer', 'A company with 200 physical servers.', [
        ('10:00', 'A vendor advisory: the baseboard management controller (BMC), the separate chip that lets admins manage a server remotely, has a firmware bug that allows remote takeover. It is being exploited.', [
            ('Patch the operating system on every server tonight.', 'bad', 'The BMC runs its own firmware, below the OS. An OS update does not touch it.'),
            ('Find which servers have that BMC and whether their management ports are reachable from user networks or the internet.', 'best', 'Right. Inventory and exposure tell you what is urgent. An internet-reachable BMC is an emergency.'),
            ('Wait for the quarterly maintenance window.', 'bad', 'Actively exploited means attackers are using it now.'),
        ]),
        ('10:45', 'Three servers have their BMC on the general office network.', [
            ('Move the BMC interfaces to an isolated management network now, then schedule firmware updates.', 'best', 'Right. Isolation removes the exposure in minutes. Firmware updates need testing and a maintenance window.'),
            ('Flash new firmware on all three right now, during business hours.', 'ok', 'Fixes the bug, but a failed flash can leave a server unbootable. Isolate first, then update carefully.'),
            ('Power off the three servers.', 'bad', 'They run business services, and the BMC may still be powered while the server is off.'),
        ]),
        ('15:20', 'During the update, one firmware file\'s SHA-256 hash does not match the hash on the vendor\'s site.', [
            ('Flash it anyway. It is probably a download glitch.', 'bad', 'A hash mismatch means the file is not what the vendor published. It might be corrupt, or tampered with.'),
            ('Stop. Download it again from the vendor\'s official site, verify again, and report the mismatch.', 'best', 'Right. Verifying the hash is exactly how you catch tampering in the supply chain.'),
            ('Use a copy someone posted on a forum instead.', 'bad', 'Untrusted firmware is the definition of a supply-chain risk.'),
        ]),
        ('17:00', 'All three are patched and isolated.', [
            ('Add BMC firmware to the asset inventory and patch process, and forward BMC logs to the SIEM.', 'best', 'Right. Firmware has to be tracked and patched like any other software.'),
            ('Write it in your own notebook for next time.', 'ok', 'Better than nothing, but the team cannot see your notebook.'),
            ('Done. Move on.', 'bad', 'The next firmware advisory will start from zero again.'),
        ]),
    ], 'Firmware sits below every other defence. NIST SP 800-193 sums up the goal: protect firmware, detect when it changes, and be able to recover.', ('OpenSSL tutorial (hashes)', '/tutorials/openssl/')),

    'networks': ('Network administrator', 'A school district office with 300 staff.', [
        ('13:55', 'The help desk is flooded: "The internet is down!"', [
            ('Reboot the core switch.', 'bad', 'That takes down everything, including what still works, and tells you nothing.'),
            ('From one affected laptop: check its IP and gateway, ping the gateway, ping a public IP, then look up a name.', 'best', 'Right. Each step tests one layer. Where it fails tells you where the problem is.'),
            ('Open a ticket with the internet provider.', 'ok', 'Possibly needed later, but you do not yet know the problem is theirs.'),
        ]),
        ('14:05', 'Pinging an IP address works, but names do not resolve. The laptop\'s DNS server is an address you do not recognise, handed out by a second DHCP server on the network.', [
            ('Find the rogue DHCP server through the switch tables and shut down its switch port.', 'best', 'Right. A rogue DHCP server can send every user\'s DNS to an attacker. Find it and cut it off.'),
            ('Set DNS by hand on every laptop.', 'ok', 'It works around the symptom for the laptops you reach, not the cause.'),
            ('Ignore it. The internet works if you type IP addresses.', 'bad', 'And whoever runs that DNS server can redirect logins to fake sites.'),
        ]),
        ('14:30', 'The port leads to a small unknown device behind a TV in a conference room.', [
            ('Photograph it in place, unplug it, and bag and label it for investigation.', 'best', 'Right. Preserve the evidence and record who handled it. It might be a mistake, or a planted device.'),
            ('Factory-reset it to see what it is.', 'bad', 'That wipes exactly the evidence you need.'),
            ('Leave it plugged in so you can watch what it does.', 'ok', 'Watching can be useful for experienced investigators on an isolated network. On the live network it keeps attacking users.'),
        ]),
        ('16:00', 'Make sure it cannot happen again.', [
            ('Turn on DHCP snooping and port security (or 802.1X) on the switches, and alert on new DHCP servers.', 'best', 'Right. The switches then only allow DHCP replies from your real server, and only known devices on each port.'),
            ('Lock the conference room.', 'ok', 'Physical security helps, but there are network ports in every room.'),
            ('Put up a sign: "Do not plug in devices".', 'bad', 'Attackers do not read signs.'),
        ]),
    ], 'Rogue DHCP and DNS servers are a classic man-in-the-middle setup. Switch features such as DHCP snooping, port security and 802.1X shut them down.', ('Networking Lab: DNS', '/linux/network/dns/')),

    'legacy-systems': ('Hospital IT security analyst', 'A community hospital.', [
        ('09:00', 'A vulnerability scan flags an MRI workstation: Windows 7, SMBv1 enabled, years without security updates.', [
            ('Upgrade it to a supported Windows version yourself this afternoon.', 'bad', 'Medical devices are certified as a whole. An unapproved change can break the device or void its clearance. The vendor must approve updates.'),
            ('Contact the device vendor and clinical engineering, and ask for approved patches or an upgrade path.', 'best', 'Right. Medical device security is a partnership between IT, clinical engineering and the vendor.'),
            ('Ignore it. It has worked for years.', 'bad', 'It is exactly the kind of system WannaCry spread through in 2017.'),
        ]),
        ('11:30', 'The vendor says no upgrade until next year.', [
            ('Move it to its own network segment that only talks to the imaging server, and block SMB from everywhere else.', 'best', 'Right. If you cannot patch it, isolate it. Fewer connections means fewer ways in.'),
            ('Turn it off until it can be upgraded.', 'bad', 'Patients need scans. Security has to work with patient care.'),
            ('Install extra security software the vendor does not support.', 'ok', 'Extra monitoring is a good idea, but only with the vendor\'s approval; otherwise it can break the device.'),
        ]),
        ('15:10', 'An alert: a staff laptop is scanning the network on port 445 (SMB), the way worms spread.', [
            ('Isolate the laptop with endpoint tools, and check the firewall logs to confirm the MRI segment blocked it.', 'best', 'Right. Contain the source, then verify that your isolation actually worked.'),
            ('Disconnect the MRI immediately, even mid-scan.', 'bad', 'If segmentation is working, the MRI is safe, and a patient is in the scanner. Check first.'),
            ('Email all staff about the virus.', 'ok', 'Awareness helps, but containment comes first.'),
        ]),
        ('17:00', 'Plan for next year.', [
            ('Record the end-of-support date, get leadership to sign off the risk, and fund a replacement plan.', 'best', 'Right. Accepted risk needs an owner, an end date and money behind the fix.'),
            ('Extend the exception every year.', 'bad', 'That is how a 2009 system ends up running in 2030.'),
            ('Ask IT to remember to check next year.', 'ok', 'Without an owner and budget, it slips.'),
        ]),
    ], 'In 2017 WannaCry spread through SMBv1 on unpatched Windows machines; in England\'s NHS about 19,000 appointments were cancelled. Isolation and asset tracking are how hospitals live with devices they cannot patch.', ('Vulnerability feed', '/vulnerabilities/')),
}


def shift_html(site, slug: str) -> str:
    if slug not in SHIFTS:
        return ''
    role, setting, steps, debrief, (lab_t, lab_u) = SHIFTS[slug]
    out = (f'<div class="shift" id="shift" data-shift="{E(slug)}" data-max="{2 * len(steps)}"><div class="shift-head"><span class="label">You are</span><strong>{E(role)}</strong><span>{E(setting)}</span></div>'
           '<noscript><p class="notice">The shift is interactive and needs JavaScript. The answers are explained under each choice.</p></noscript>')
    for i, (time, situation, choices) in enumerate(steps):
        opts = ''.join(f'<li><button type="button" class="shift-opt" data-v="{E(v)}">{E(c)}</button><p class="shift-why" hidden><b>{ {"best": "Best move.", "ok": "Partly right.", "bad": "This makes it worse."}[v] }</b> {E(why)}</p></li>' for c, v, why in choices)
        out += (f'<section class="shift-step" data-step="{i}"{" hidden" if i else ""}><p class="shift-time label">{E(time)} · Step {i + 1} of {len(steps)}</p><p class="shift-sit">{E(situation)}</p>'
                f'<p class="label">What do you do?</p><ol class="shift-opts">{opts}</ol><button type="button" class="primary shift-next" hidden>{"Next →" if i < len(steps) - 1 else "End of shift →"}</button></section>')
    out += (f'<section class="shift-end" hidden><p class="label">End of shift</p><p class="shift-score" aria-live="polite"></p><p>{E(debrief)}</p>'
            f'<p>{site.a("Practise it: " + lab_t + " →", lab_u, "button primary")} <button type="button" class="shift-again">Play again</button></p></section></div>')
    return out
