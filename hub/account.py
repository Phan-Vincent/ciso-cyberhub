"""Account page (/account/): progress on this device, export/import, and optional sign-in
that syncs progress through Supabase when site.json has supabase_url and supabase_key.
"""
from __future__ import annotations

import re
from html import escape as E

SB_RE = re.compile(r'^https://[a-z0-9]{10,40}\.supabase\.co$')


def supabase(site) -> tuple[str, str]:
    url = (site.config.get('supabase_url') or '').rstrip('/'); key = site.config.get('supabase_key') or ''
    if not url or not key:
        return '', ''
    if not SB_RE.match(url):
        raise ValueError('supabase_url must look like https://<project-ref>.supabase.co')
    if not re.match(r'^[A-Za-z0-9._-]{20,400}$', key) or key.startswith('sb_secret_'):
        raise ValueError('supabase_key must be the public publishable (or anon) key, never a secret/service key')
    return url, key


def account_page(site) -> str:
    email = site.config.get('contact_email', '')
    body = site.heading('Your account', 'Your progress saves on this device automatically. Sign in to back it up and carry it to any computer or phone.', 'CyberHub / Account')
    body += ('<div class="account" id="account">'
             '<section class="ac-card"><h2>On this device</h2><p id="ac-sum" aria-live="polite">Loading…</p>'
             '<div class="rt-actions"><button type="button" id="ac-export">Download my progress</button>'
             '<label class="button" for="ac-import">Load a progress file</label><input id="ac-import" type="file" accept="application/json,.json" class="sr-only"></div>'
             f'<p class="muted">The file holds only your CyberHub progress. Use it to move progress between devices without an account. {site.a("See your badges →", "/progress/")}</p></section>'
             '<section class="ac-card" id="ac-off"><h2>Accounts are coming soon</h2><p>Sign-in is being set up. Until then, everything still saves on this device, and you can move it with a progress file.</p></section>'
             '<section class="ac-card" id="ac-out" hidden><h2>Sign in or create an account</h2>'
             '<p>No password needed: we email you a one-time sign-in link. New email addresses get an account automatically.</p>'
             '<form id="ac-form" class="ac-form" novalidate><label for="ac-mail" class="label">Email</label><input id="ac-mail" type="email" autocomplete="email" maxlength="254" placeholder="you@example.com" required>'
             '<label class="ac-age"><input type="checkbox" id="ac-age"> I am 13 or older</label>'
             '<div class="rt-actions"><button type="submit" class="primary">Email me a sign-in link</button><button type="button" id="ac-google">Continue with Google</button></div></form>'
             '<p class="muted">We store only your email address and your CyberHub progress. No resumes, no names, no tracking. You can delete your account at any time.</p></section>'
             '<section class="ac-card" id="ac-in" hidden><h2>Signed in</h2><p>Signed in as <strong id="ac-email"></strong>. <span id="ac-last" class="label"></span></p>'
             '<p>Your progress syncs automatically as you use CyberHub, and every device keeps its own copy, so it works offline too.</p>'
             '<div class="rt-actions"><button type="button" class="primary" id="ac-sync">Sync now</button><button type="button" id="ac-signout">Sign out</button></div>'
             '<details class="ac-danger"><summary>Delete account</summary><p>Deletes your account and the cloud copy of your progress. Progress on this device stays unless you clear your browser data.</p><button type="button" id="ac-delete">Delete my account</button></details></section>'
             '<p class="label ac-msg" id="ac-msg" role="status" aria-live="polite"></p></div>')
    if email:
        body += f'<p class="notice">Questions, ideas or problems? Email <a href="mailto:{E(email)}">{E(email)}</a>.</p>'
    return body


def build_account(site) -> None:
    site.page('/account/', 'Your account', account_page(site), 'Save, back up and sync your CyberHub progress across devices. Optional; everything works without an account.', 'CyberHub', module='account')
