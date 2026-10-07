-- Reminder emails (opt-in): "Your 3-day streak ends tonight" and "Your league ends in 6 hours".
-- Add-only. Off for everyone by default: only a learner's own tick (a Server Action) turns them on.
-- At most one a day per learner (the unique index), and every email carries a one-tap unsubscribe
-- link keyed by profiles.email_token (no sign-in needed). Learners can't write any of it themselves:
-- profiles has no learner update grant, and reminder_emails is server-only.

alter table public.profiles
  add column reminder_emails boolean not null default false,
  add column reminder_consent_at timestamptz,
  add column email_token uuid not null default gen_random_uuid();

create unique index profiles_email_token_key on public.profiles (email_token);

create table public.reminder_emails (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('streak', 'league')),
  day         date not null,                      -- the learner's own date when it was sent
  key         uuid not null default gen_random_uuid(), -- for the open and return links
  sent_at     timestamptz not null default now(),
  resend_id   text check (char_length(resend_id) <= 100),
  dry_run     boolean not null default false,     -- not delivered (outside production, or no key)
  opened_at   timestamptz,
  returned_at timestamptz
);

-- One a day, per learner (their own date).
create unique index reminder_emails_one_a_day on public.reminder_emails (user_id, day);

alter table public.reminder_emails enable row level security;
revoke all on public.reminder_emails from public, anon, authenticated;  -- incl. TRUNCATE, REFERENCES, TRIGGER
