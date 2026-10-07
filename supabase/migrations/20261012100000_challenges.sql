-- Challenge a friend: async duels on up to 5 questions from a lesson. Add-only, server-only.
-- A challenge stores which cards were asked and the challenger's right/wrong per card (graded on the
-- server); attempts store each friend's right/wrong, their score and one preset emote. No free text
-- anywhere. Guests can play (player_id null); a signed-in player has one attempt per challenge.

create table public.challenges (
  id         text primary key check (id ~ '^[a-z0-9]{12}$'),
  creator_id uuid not null references auth.users (id) on delete cascade,
  lesson_id  text not null check (char_length(lesson_id) <= 120),
  card_ids   text[] not null check (cardinality(card_ids) between 1 and 5),
  results    boolean[] not null check (cardinality(results) = cardinality(card_ids)),
  score      smallint not null check (score between 0 and 5),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);
create index challenges_creator on public.challenges (creator_id, created_at desc);

create table public.challenge_attempts (
  id           bigint generated always as identity primary key,
  challenge_id text not null references public.challenges (id) on delete cascade,
  player_id    uuid references auth.users (id) on delete set null,
  key          uuid not null default gen_random_uuid(),  -- lets the player's device add an emote or claim it
  results      boolean[] not null check (cardinality(results) between 1 and 5),
  score        smallint not null check (score between 0 and 5),
  emote        text check (emote in ('gg', 'nice-one', 'rematch', 'on-fire', 'wow', 'bring-it')),
  created_at   timestamptz not null default now()
);
create index challenge_attempts_challenge on public.challenge_attempts (challenge_id, created_at);
create unique index challenge_attempts_one_per_player on public.challenge_attempts (challenge_id, player_id) where player_id is not null;

alter table public.challenges enable row level security;
alter table public.challenge_attempts enable row level security;
revoke all on public.challenges, public.challenge_attempts from public, anon, authenticated;  -- incl. TRUNCATE, REFERENCES, TRIGGER
