-- Streaks and daily goals. Everything here is written only by Server Actions (secret key).

-- 1. Settings. Not user-writable: the display_name-only column grant already blocks them.
alter table public.profiles
  add column daily_goal smallint not null default 50 check (daily_goal in (20, 50, 100)),
  add column daily_goal_chosen boolean not null default false,
  add column time_zone text check (char_length(time_zone) between 1 and 64);  -- IANA name, checked in the action

-- 2. XP ledger: every XP-earning event, dated in the learner's local day when it happened.
create table public.xp_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  at         timestamptz not null default now(),
  day        date not null,
  time_zone  text not null check (char_length(time_zone) between 1 and 64),
  kind       text not null check (kind in ('card', 'lesson', 'quiz', 'practice')),
  lesson_id  text not null check (char_length(lesson_id) <= 120),
  card_id    text check (char_length(card_id) <= 120),
  xp         smallint not null check (xp between 0 and 50)
);
create index xp_events_user_day on public.xp_events (user_id, day);
-- Practice XP: once per card per day.
create unique index xp_events_practice_once on public.xp_events (user_id, day, lesson_id, card_id)
  where kind = 'practice';

-- 3. Days the daily goal was met (the goal is kept as it was on that day).
create table public.goal_days (
  user_id    uuid not null references auth.users (id) on delete cascade,
  day        date not null,
  time_zone  text not null check (char_length(time_zone) between 1 and 64),
  goal       smallint not null check (goal in (20, 50, 100)),
  met_at     timestamptz not null default now(),
  primary key (user_id, day)
);

-- RLS: read your own rows; no writes for anyone but the service role.
alter table public.xp_events enable row level security;
alter table public.goal_days enable row level security;
revoke all on public.xp_events, public.goal_days from anon, authenticated;  -- incl. TRUNCATE, REFERENCES, TRIGGER
grant select on public.xp_events, public.goal_days to authenticated;
create policy "read own xp events" on public.xp_events
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "read own goal days" on public.goal_days
  for select to authenticated using ((select auth.uid()) = user_id);
