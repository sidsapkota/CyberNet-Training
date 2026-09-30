-- Profiles: only a display name. Premium is set by the server (Stripe, later), never by users.
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text check (display_name is null or char_length(btrim(display_name)) between 1 and 40),
  is_premium    boolean not null default false,
  learning_mode text not null default 'path' check (learning_mode in ('path', 'explore')),
  created_at    timestamptz not null default now()
);

-- Progress: mirrors the ProgressStore snapshot. XP values are written only by the server.
create table public.card_completions (
  user_id      uuid not null references auth.users (id) on delete cascade,
  lesson_id    text not null,
  card_id      text not null,
  completed_at timestamptz not null,
  xp           integer not null check (xp between 0 and 20),
  primary key (user_id, lesson_id, card_id)
);

create table public.lesson_completions (
  user_id      uuid not null references auth.users (id) on delete cascade,
  lesson_id    text not null,
  completed_at timestamptz not null,
  xp           integer not null check (xp between 0 and 20),
  primary key (user_id, lesson_id)
);

create table public.quiz_attempts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  quiz_id      text not null,
  attempted_at timestamptz not null,
  score        numeric(5, 4) not null check (score between 0 and 1),
  passed       boolean not null,
  xp           integer not null check (xp between 0 and 50),
  answers      jsonb not null default '[]'::jsonb,
  unique (user_id, quiz_id, attempted_at)  -- makes merges idempotent
);
create index quiz_attempts_user_quiz on public.quiz_attempts (user_id, quiz_id);
-- Best score and passedAt are derived from attempts (max score, earliest pass), never stored.

-- Row Level Security: users read only their own rows.
alter table public.profiles           enable row level security;
alter table public.card_completions   enable row level security;
alter table public.lesson_completions enable row level security;
alter table public.quiz_attempts      enable row level security;

create policy "Users read their own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Users update their own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Users read their own card completions" on public.card_completions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users read their own lesson completions" on public.lesson_completions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users read their own quiz attempts" on public.quiz_attempts
  for select to authenticated using ((select auth.uid()) = user_id);

-- Column and table privileges, as a second lock behind RLS:
-- users may change only their display name; progress tables are read-only for them. Writes
-- happen in Server Actions with the secret key, after verifying the session, so XP is always
-- computed on the server from the lesson content.
revoke all on public.profiles, public.card_completions, public.lesson_completions, public.quiz_attempts from anon;
revoke insert, update, delete on public.profiles, public.card_completions, public.lesson_completions,
  public.quiz_attempts from authenticated;
grant update (display_name) on public.profiles to authenticated;

-- A profile row for every new user.
create function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep as little provider data as possible: drop avatar and real-name fields that Google
-- sends, on sign-up and on every later sign-in.
create function public.strip_provider_metadata() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb)
    - 'avatar_url' - 'picture' - 'full_name' - 'name';
  return new;
end;
$$;
create trigger strip_provider_metadata before insert or update of raw_user_meta_data on auth.users
  for each row execute function public.strip_provider_metadata();
