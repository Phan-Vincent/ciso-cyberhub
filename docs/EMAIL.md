# The CyberHub email

Shown in the site footer, on `/account/` and on the privacy page. It is one setting:
`contact_email` in `site.json` (currently `csusb.cyberhub@proton.me`).

## The account (Proton Mail)

The club uses **csusb.cyberhub@proton.me**, which also owns the CyberHub Supabase project.

1. Recovery options: add two officers' recovery email or phone, so the account survives graduations.
2. **Turn on two-factor authentication** (Settings → Account and password). Prefer a security key or an authenticator app.
3. Keep the password in a shared password manager that the officers control, not in a document or chat.
4. Use it to sign up for the services CyberHub runs on (Supabase, the domain registrar), so they stay with the club.

## Later: a .org address

Once the club has a .org domain, Proton can host it as the club's address (custom domains need a paid
Proton plan; check Proton's current plans), or forward it for free with a service such as Cloudflare
Email Routing to the Proton address above. Then set `contact_email` to the .org address and push.

## Sign-in emails for student accounts

Supabase sends the sign-in links. Its built-in sender is limited to a few emails per hour, so before
a school launch set **Authentication → Emails → SMTP settings** to a transactional email service.
Proton's own SMTP sending is limited to paid plans with a custom domain, so a free transactional
service is usually simpler.
