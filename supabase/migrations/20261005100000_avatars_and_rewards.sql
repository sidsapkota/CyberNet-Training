-- Avatars and rewards: cosmetic only. Items are a fixed list in code (src/lib/rewards/items.ts);
-- the database stores ids. Only the server writes (secret key); learners read their own rows.
-- Spins are earned by finishing a module or a course, and at 7, 30 and 100-day streaks.

alter table public.profiles
  add column avatar text not null default 'mascot' check (avatar ~ '^[a-z0-9-]{1,40}$');

create table public.reward_items_owned (
  user_id     uuid not null references auth.users on delete cascade,
  item_id     text not null check (item_id ~ '^[a-z0-9-]{1,40}$'),
  source      text not null check (source in ('starter', 'spin', 'pro')),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- One spin per thing earned (the key makes it idempotent), spun later or straight away.
create table public.reward_spins (
  user_id    uuid not null references auth.users on delete cascade,
  earned_for text not null check (earned_for ~ '^(module|course|streak):[a-z0-9-]{1,80}$'),
  earned_at  timestamptz not null default now(),
  spun_at    timestamptz,
  item_id    text check (item_id ~ '^[a-z0-9-]{1,40}$'),
  primary key (user_id, earned_for)
);

alter table public.reward_items_owned enable row level security;
alter table public.reward_spins       enable row level security;
revoke all on public.reward_items_owned, public.reward_spins from anon, authenticated;
grant select on public.reward_items_owned, public.reward_spins to authenticated;
create policy "read own items" on public.reward_items_owned for select to authenticated using ((select auth.uid()) = user_id);
create policy "read own spins" on public.reward_spins       for select to authenticated using ((select auth.uid()) = user_id);

-- Leaderboards show the avatar id too (an item from the fixed list; nothing personal). The
-- return type changes, so the function is replaced.
drop function public.league_standings();
create function public.league_standings()
returns table (rank integer, handle text, tier text, weekly_xp integer, pro boolean, is_me boolean, avatar text)
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
    select coalesce(pr.username, p.handle) as handle, p.tier, m.user_id, pr.avatar,
           coalesce(sum(e.xp), 0)::integer as weekly_xp,
           max(e.at) as last_at,
           coalesce(p.pro_cosmetic_until > now(), false) as pro
    from public.league_members m
    join me on m.league_id = me.league_id
    join public.league_players p on p.user_id = m.user_id
    join public.profiles pr on pr.id = m.user_id
    cross join wk
    left join public.xp_events e on e.user_id = m.user_id and e.at >= wk.starts and e.at < wk.ends
    where p.show_on_leaderboards or m.user_id = (select auth.uid())
    group by pr.username, p.handle, p.tier, m.user_id, p.pro_cosmetic_until, pr.avatar
  )
  select (row_number() over (order by weekly_xp desc, last_at asc nulls last, handle))::integer,
         handle, tier, weekly_xp, pro, user_id = (select auth.uid()), avatar
  from rows
  where exists (select 1 from public.league_state s where s.opened_at is not null)
$$;
revoke all on function public.league_standings() from public, anon;
grant execute on function public.league_standings() to authenticated;
