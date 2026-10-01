-- Weekly leagues and public handles. All writes come from the server (Server Actions and the
-- weekly job, with the secret key). Learners read their own player row and results; they see
-- others only through league_standings(): handle, tier, weekly XP and the Pro cosmetic flag,
-- for their own league this week. Nothing else.

-- 0. The league week starts Monday 00:00 Australia/Sydney (daylight saving handled by Postgres).
create function public.league_week(t timestamptz default now()) returns date
  language sql stable set search_path = '' as $$
  select date_trunc('week', t at time zone 'Australia/Sydney')::date
$$;

-- Weekly XP and the opening threshold read xp_events by time.
create index xp_events_user_at on public.xp_events (user_id, at);
create index xp_events_at on public.xp_events (at, user_id);

-- 1. Each learner's public face in leagues (made on their first XP after launch).
create table public.league_players (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  handle                text not null check (handle ~ '^[A-Za-z][A-Za-z0-9]{2,19}$'),
  handle_key            text not null unique,          -- lower(handle): unique ignoring case
  show_on_leaderboards  boolean not null default true,
  tier                  text not null default 'packet'
                          check (tier in ('packet','switch','router','firewall','server','mainframe','quantum')),
  pro_cosmetic_until    timestamptz,                    -- set from the server's entitlement check
  handle_changed_at     timestamptz,
  created_at            timestamptz not null default now(),
  check (handle_key = lower(handle))
);

-- 2. Leagues: one week, one tier, up to 30 learners.
create table public.leagues (
  id          uuid primary key default gen_random_uuid(),
  week        date not null check (extract(isodow from week) = 1),
  tier        text not null check (tier in ('packet','switch','router','firewall','server','mainframe','quantum')),
  band        text not null check (band in ('light','regular','keen')),
  created_at  timestamptz not null default now()
);
create index leagues_week_tier on public.leagues (week, tier, band);

create table public.league_members (
  week       date not null,
  user_id    uuid not null references auth.users (id) on delete cascade,
  league_id  uuid not null references public.leagues (id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (week, user_id)                           -- one league per learner per week
);
create index league_members_league on public.league_members (league_id);

-- 3. Results, written once per week by the weekly job; weeks already settled.
create table public.league_results (
  week       date not null,
  user_id    uuid not null references auth.users (id) on delete cascade,
  league_id  uuid not null references public.leagues (id) on delete cascade,
  rank       smallint not null check (rank >= 1),
  weekly_xp  integer not null check (weekly_xp >= 0),
  from_tier  text not null check (from_tier in ('packet','switch','router','firewall','server','mainframe','quantum')),
  to_tier    text not null check (to_tier in ('packet','switch','router','firewall','server','mainframe','quantum')),
  seen_at    timestamptz,                               -- the learner has seen their result screen
  primary key (week, user_id)
);
create table public.league_weeks (
  week          date primary key,
  finalized_at  timestamptz not null default now()
);

-- 4. When leagues opened (the first week 20 learners earned XP). A single row.
create table public.league_state (
  id         boolean primary key default true check (id),
  opened_at  timestamptz
);
insert into public.league_state default values;

-- 5. Reports about handles, reviewed in the dashboard.
create table public.handle_reports (
  id                bigint generated always as identity primary key,
  created_at        timestamptz not null default now(),
  reporter_id       uuid references auth.users (id) on delete set null,
  reported_user_id  uuid not null references auth.users (id) on delete cascade,
  handle            text not null check (char_length(handle) between 3 and 20),
  reason            text not null check (reason in ('rude','personal_info','pretending','other')),
  resolved_at       timestamptz
);
create unique index handle_reports_once on public.handle_reports (reporter_id, reported_user_id, handle);

-- RLS on everywhere; no default privileges (incl. TRUNCATE, REFERENCES, TRIGGER).
alter table public.league_players  enable row level security;
alter table public.leagues         enable row level security;
alter table public.league_members  enable row level security;
alter table public.league_results  enable row level security;
alter table public.league_weeks    enable row level security;
alter table public.league_state    enable row level security;
alter table public.handle_reports  enable row level security;
revoke all on public.league_players, public.leagues, public.league_members, public.league_results,
  public.league_weeks, public.league_state, public.handle_reports from anon, authenticated;
revoke all on sequence public.handle_reports_id_seq from anon, authenticated;

-- Learners read only their own player row and their own results.
grant select on public.league_players, public.league_results to authenticated;
create policy "read own league player" on public.league_players
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "read own league results" on public.league_results
  for select to authenticated using ((select auth.uid()) = user_id);

-- Others in your own league, this week: public fields only, hidden learners left out,
-- nothing while leagues are closed. Ranked here, so no timestamps are exposed.
create function public.league_standings()
returns table (rank integer, handle text, tier text, weekly_xp integer, pro boolean, is_me boolean)
language sql stable security definer set search_path = '' as $$
  with me as (
    select m.league_id, m.week
    from public.league_members m
    where m.user_id = (select auth.uid()) and m.week = public.league_week()
  ),
  wk as (
    select (me.week::timestamp at time zone 'Australia/Sydney') as starts,
           ((me.week + 7)::timestamp at time zone 'Australia/Sydney') as ends
    from me
  ),
  rows as (
    select p.handle, p.tier, m.user_id,
           coalesce(sum(e.xp), 0)::integer as weekly_xp,
           max(e.at) as last_at,
           coalesce(p.pro_cosmetic_until > now(), false) as pro
    from public.league_members m
    join me on m.league_id = me.league_id
    join public.league_players p on p.user_id = m.user_id
    cross join wk
    left join public.xp_events e on e.user_id = m.user_id and e.at >= wk.starts and e.at < wk.ends
    where p.show_on_leaderboards or m.user_id = (select auth.uid())
    group by p.handle, p.tier, m.user_id, p.pro_cosmetic_until
  )
  select (row_number() over (order by weekly_xp desc, last_at asc nulls last, handle))::integer,
         handle, tier, weekly_xp, pro, user_id = (select auth.uid())
  from rows
  where exists (select 1 from public.league_state s where s.opened_at is not null)
$$;
revoke all on function public.league_standings() from public, anon;
grant execute on function public.league_standings() to authenticated;

-- Whether leagues are open (only a yes/no, for the nav).
create function public.leagues_open() returns boolean
  language sql stable security definer set search_path = '' as $$
  select opened_at is not null from public.league_state
$$;
revoke all on function public.leagues_open() from public;
grant execute on function public.leagues_open() to anon, authenticated;

-- Server only: place a learner, atomically. One lock per week and tier, so two joins can't
-- create duplicate leagues or pass 30. p_bands is the preference order (own band first).
create function public.join_league(p_user uuid, p_week date, p_tier text, p_bands text[], p_cap integer default 30)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_league uuid;
begin
  perform pg_advisory_xact_lock(hashtext('league:' || p_week::text || ':' || p_tier));
  select league_id into v_league from public.league_members where week = p_week and user_id = p_user;
  if found then return v_league; end if;
  select l.id into v_league
  from public.leagues l
  where l.week = p_week and l.tier = p_tier
    and (select count(*) from public.league_members m where m.league_id = l.id) < p_cap
  order by array_position(p_bands, l.band) nulls last, l.created_at
  limit 1;
  if v_league is null then
    insert into public.leagues (week, tier, band) values (p_week, p_tier, p_bands[1]) returning id into v_league;
  end if;
  insert into public.league_members (week, user_id, league_id) values (p_week, p_user, v_league);
  return v_league;
end $$;
revoke all on function public.join_league(uuid, date, text, text[], integer) from public, anon, authenticated;

-- Server only: settle a week in one transaction. A second run fails on league_weeks' key and
-- changes nothing. p_results = [{user_id, league_id, rank, weekly_xp, from_tier, to_tier}],
-- worked out by the tested TypeScript rules.
create function public.finalize_league_week(p_week date, p_results jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.league_weeks (week) values (p_week);
  insert into public.league_results (week, user_id, league_id, rank, weekly_xp, from_tier, to_tier)
  select p_week, r.user_id, r.league_id, r.rank, r.weekly_xp, r.from_tier, r.to_tier
  from jsonb_to_recordset(p_results)
    as r(user_id uuid, league_id uuid, rank smallint, weekly_xp integer, from_tier text, to_tier text);
  update public.league_players p set tier = r.to_tier
  from jsonb_to_recordset(p_results) as r(user_id uuid, to_tier text)
  where p.user_id = r.user_id;
end $$;
revoke all on function public.finalize_league_week(date, jsonb) from public, anon, authenticated;
