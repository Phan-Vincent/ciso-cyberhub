# Turning on CyberHub accounts (Supabase)

CyberHub works without accounts: progress saves in each browser, and students can move it with
**Download my progress / Load a progress file** on `/account/`. Accounts add a cloud backup that
syncs progress across devices. Every device still keeps its own copy, so the site keeps working
offline and nothing is lost if the database is down.

What is stored: the student's **email address** and their **CyberHub progress** (labs,
lessons, badges, duel stats). Never resumes, names or tracking data. Accounts are 13+.

## 1. Create the project (about 10 minutes, free)

1. Sign in at <https://supabase.com> with the CyberHub Gmail (see `docs/EMAIL.md`). Turn on 2-step verification.
2. **New project**: name `cyberhub`, region **West US**, and generate a strong database password.
   Store it in a password manager; do not put it in the repo or chat.
3. Wait for the project to finish setting up.

## 2. Create the table (one paste)

1. Open **SQL Editor → New query**.
2. Paste everything in [`supabase/schema.sql`](../supabase/schema.sql) and press **Run**.
   It creates one `progress` table with **row-level security**: each signed-in user can read
   and change only their own row. It also adds `delete_me()` so users can delete their account.

## 3. Sign-in settings

1. **Authentication → Sign In / Providers → Email**: keep it on (CyberHub uses one-time email links, no passwords).
2. **Authentication → URL Configuration**:
   - **Site URL**: `https://phan-vincent.github.io/ciso-cyberhub/account/` (change when the .org domain is live)
   - **Redirect URLs**: add the same address, and later the .org one, e.g. `https://YOUR-DOMAIN.org/account/`
3. Optional, later: **Google** sign-in needs a Google Cloud OAuth client. The button only works after this is set up.

## 4. Email delivery before launch

Supabase's built-in sender only allows a few sign-in emails per hour. That is fine for testing,
but before the school launch, set **Authentication → Emails → SMTP settings** to a real sender
(for example a free transactional email service, or the CyberHub Gmail with an app password)
and edit the **Magic Link** template so it says "CyberHub".

## 5. Connect the site

1. **Project Settings → API Keys**: copy the **Project URL** (`https://xxxx.supabase.co`) and the
   **publishable key** (`sb_publishable_…`; older projects call it the `anon` key).
   These two are designed to be public; the database rules above protect the data.
   **Never** use the `secret` / `service_role` key. The build refuses it.
2. Put them in `site.json`:
   ```json
   "supabase_url": "https://xxxx.supabase.co",
   "supabase_key": "sb_publishable_..."
   ```
3. Commit and push. The deploy adds the project to the site's security policy and turns on sign-in.

## 6. Test

1. Open `/account/`, tick "I am 13 or older", enter your email and click **Email me a sign-in link**.
2. Click the link in the email. You return to `/account/` signed in, and your progress syncs.
3. Open the site on a phone, sign in with the same email: the same progress appears.
4. In Supabase **Table Editor → progress**, you should see one row per user.

## Notes

- Free projects pause after about a week with no activity; resume from the dashboard. Upgrade
  only if the site outgrows the free tier.
- Turning accounts off: empty `supabase_url` and `supabase_key` and push. Local progress keeps working.
- The same project can later power **live online Cyber Duels** (Supabase Realtime), so students
  can duel from their own phones at events.
