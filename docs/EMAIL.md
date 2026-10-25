# The CyberHub email

Shown in the site footer, on `/account/` and on the privacy page. It is one setting:
`contact_email` in `site.json` (currently the suggested `csusb.cyberhub@gmail.com`).

## Create it (free Gmail)

1. Go to <https://accounts.google.com/signup> and create the account. Suggested: **csusb.cyberhub@gmail.com**.
   If it is taken, try `cyberhub.csusb@gmail.com` or `csusbcyberhub@gmail.com`, then change `contact_email`.
2. Recovery options: add two officers' recovery email or phone, so the account survives graduations.
3. **Turn on 2-Step Verification** (Google Account → Security). Prefer passkeys or an authenticator app.
4. Keep the password in a shared password manager that the officers control, not in a document or chat.
5. Use it to sign up for the services CyberHub runs on (Supabase, the domain registrar), so they stay with the club.

## Later: a .org address

Once the club has a .org domain:

- **Receive** at e.g. `hello@your-domain.org` for free with email forwarding (for example Cloudflare
  Email Routing, if the domain's DNS is on Cloudflare): forward it to the Gmail above.
- **Send** as the .org address from Gmail with "Send mail as", which needs an SMTP service that
  supports the domain. Alternatively, check whether the club qualifies for Google Workspace for
  Nonprofits, or ask CSUSB about a student-organization account.
- Then set `contact_email` to the .org address and push.
