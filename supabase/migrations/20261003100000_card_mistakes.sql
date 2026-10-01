-- Mistake review (Pro): the cards a learner got wrong, so they can try them again later.
-- One row per learner and card. Only the fact of a miss is kept: never the wrong answer itself.
-- Recorded for every signed-in learner (a lesson's first wrong try, or a wrong quiz answer, both
-- checked on the server), so the list is already there if they get Pro; only Pro can review it.
-- A right answer in review clears the row (cleared_at); missing it again later brings it back.

create table public.card_mistakes (
  user_id        uuid not null references auth.users (id) on delete cascade,
  lesson_id      text not null check (lesson_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(lesson_id) <= 80),
  card_id        text not null check (card_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(card_id) <= 80),
  misses         smallint not null default 1 check (misses between 1 and 999),
  first_missed_at timestamptz not null default now(),
  last_missed_at timestamptz not null default now(),
  cleared_at     timestamptz,
  primary key (user_id, lesson_id, card_id)
);

-- The review list: a learner's open mistakes, newest first.
create index card_mistakes_open on public.card_mistakes (user_id, last_missed_at desc) where cleared_at is null;

alter table public.card_mistakes enable row level security;
revoke all on public.card_mistakes from anon, authenticated;   -- incl. TRUNCATE, REFERENCES, TRIGGER
grant select on public.card_mistakes to authenticated;

create policy "Learners read their own mistakes"
  on public.card_mistakes for select to authenticated
  using ((select auth.uid()) = user_id);

-- Records a miss: a new row, or one more miss on an existing one (reopened if it was cleared).
-- Server only (secret key), after the server has checked the card exists and the answer was wrong.
create function public.record_mistake(p_user uuid, p_lesson text, p_card text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.card_mistakes (user_id, lesson_id, card_id)
  values (p_user, p_lesson, p_card)
  on conflict (user_id, lesson_id, card_id) do update
    set misses = least(public.card_mistakes.misses + 1, 999),
        last_missed_at = now(),
        cleared_at = null;
$$;

revoke all on function public.record_mistake(uuid, text, text) from public, anon, authenticated;
grant execute on function public.record_mistake(uuid, text, text) to service_role;
