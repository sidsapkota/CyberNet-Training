-- Launch prep: age confirmation for accounts, and anonymous feedback.

-- 1. Accounts need age 13+. Only "confirmed" is stored, never a date of birth.
--    Not user-writable (the display_name-only column grant blocks it); the auth
--    callback and confirmAgeAction set it with the secret key.
alter table public.profiles
  add column age_confirmed boolean not null default false;

-- 2. Feedback: anyone can send, nobody can read except the service role.
create table public.feedback (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  message     text not null check (char_length(btrim(message)) between 1 and 1000),
  lesson_id   text check (char_length(lesson_id) <= 80 and lesson_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  rating      smallint check (rating between 1 and 5),
  session_id  uuid not null   -- random per browser tab; not linked to a person or account
);

alter table public.feedback enable row level security;
revoke all on public.feedback from anon, authenticated;   -- includes TRUNCATE, REFERENCES, TRIGGER
grant insert (message, lesson_id, rating, session_id) on public.feedback to anon, authenticated;
create policy "anyone can send feedback" on public.feedback
  for insert to anon, authenticated with check (true);
-- No select, update or delete policies or grants: only the service role can read.

-- Rate limits: at most 5 per session per hour, and 30 per minute across everyone.
create index feedback_session_recent on public.feedback (session_id, created_at desc);

create function public.feedback_rate_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.feedback
      where session_id = new.session_id and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too much feedback from this session. Please try again later.';
  end if;
  if (select count(*) from public.feedback where created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Lots of feedback right now. Please try again in a minute.';
  end if;
  return new;
end $$;
revoke execute on function public.feedback_rate_limit() from public, anon, authenticated;

create trigger feedback_rate_limit before insert on public.feedback
  for each row execute function public.feedback_rate_limit();
