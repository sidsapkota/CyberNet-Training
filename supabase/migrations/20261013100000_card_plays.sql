-- Card measurements (content quality pass): for each graded card play, how long until the first
-- Check and whether that first answer was right. Anonymous: no user id, no session id, nothing that
-- identifies a learner or a device. Add-only and server-only; the server checks the lesson and card
-- exist before inserting, and a trigger caps the global rate so the table can't be flooded.

create table public.card_plays (
  id         bigint generated always as identity primary key,
  lesson_id  text not null check (char_length(lesson_id) between 1 and 120),
  card_id    text not null check (char_length(card_id) between 1 and 120),
  ms         integer not null check (ms between 0 and 3600000),  -- time to the first Check
  first_try  boolean not null,                                     -- the first answer was right
  quiz       boolean not null default false,
  day        date not null default (now() at time zone 'Australia/Sydney')::date,
  created_at timestamptz not null default now()
);
create index card_plays_day on public.card_plays (day, lesson_id, card_id);
create index card_plays_created on public.card_plays (created_at);

alter table public.card_plays enable row level security;
revoke all on public.card_plays from public, anon, authenticated;  -- incl. TRUNCATE, REFERENCES, TRIGGER

create function public.card_plays_rate_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.card_plays where created_at > now() - interval '1 minute') >= 600 then
    raise exception 'Too many card measurements right now.';
  end if;
  return new;
end $$;
revoke execute on function public.card_plays_rate_limit() from public, anon, authenticated;

create trigger card_plays_rate_limit before insert on public.card_plays
  for each row execute function public.card_plays_rate_limit();
