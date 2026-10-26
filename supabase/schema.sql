-- CyberHub accounts: run once in the Supabase SQL editor (Project → SQL Editor → New query).
-- One row of progress per user. Row-level security means each signed-in user can only
-- read, write or delete their own row; the public (publishable/anon) key alone can do nothing.

create table if not exists public.progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint progress_size check (octet_length(data::text) < 200000)
);

alter table public.progress enable row level security;

drop policy if exists "read own progress"   on public.progress;
drop policy if exists "insert own progress" on public.progress;
drop policy if exists "update own progress" on public.progress;
drop policy if exists "delete own progress" on public.progress;
create policy "read own progress"   on public.progress for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own progress" on public.progress for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own progress" on public.progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own progress" on public.progress for delete to authenticated using ((select auth.uid()) = user_id);

-- Let a signed-in user delete their own account (and, by cascade, their progress).
create or replace function public.delete_me() returns void
language sql security definer set search_path = '' as $$
  delete from auth.users where id = (select auth.uid());
$$;
revoke all on function public.delete_me() from public, anon;
grant execute on function public.delete_me() to authenticated;

-- Officers: only these emails can host Cyber Duel live rooms. Add rows in Table Editor → officers.
-- No policies are defined, so the table cannot be read or changed with the public key; the
-- is_officer() function only answers "is the signed-in user an officer?".
create table if not exists public.officers (
  email    text primary key check (email = lower(email)),
  added_at timestamptz not null default now()
);
alter table public.officers enable row level security;

create or replace function public.is_officer() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.officers where email = lower(coalesce((select auth.jwt()) ->> 'email', '')));
$$;
revoke all on function public.is_officer() from public, anon;
grant execute on function public.is_officer() to authenticated;
