-- One public username per learner. It replaces the private display name and the league handle,
-- and it is set only by the server, after its checks (shape, uniqueness, word filters), so the
-- filters can't be skipped from the browser.

-- 1. The username, its shape, and uniqueness ignoring case.
alter table public.profiles
  add column username text,
  -- One change after the username is first set (sign-up's pick doesn't count). A name replaced
  -- after reports, or by the safety scan, gives the change back.
  add column username_change_used boolean not null default false,
  add constraint profiles_username_shape
    check (username is null or username ~ '^[A-Za-z0-9_]{3,20}$');

create unique index profiles_username_key on public.profiles (lower(username));

-- 2. Existing league handles become usernames: they're already public, filtered and unique
--    ignoring case. (Everyone else gets a generated name from the one-off script, which then
--    re-checks every username with the new rules.)
update public.profiles p
set username = lp.handle
from public.league_players lp
where lp.user_id = p.id and p.username is null;

-- 3. Learners can no longer write their own profile row: usernames go through a Server Action
--    with the secret key. (display_name is no longer used; it's dropped in a later migration.)
revoke update (display_name) on public.profiles from authenticated;
drop policy "Users update their own profile" on public.profiles;

-- 4. Leaderboards show the username. The handle columns stay for one release, empty for new
--    players, and are dropped with display_name later.
alter table public.league_players
  alter column handle drop not null,
  alter column handle_key drop not null;

create or replace function public.league_standings()
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
    select coalesce(pr.username, p.handle) as handle, p.tier, m.user_id,
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
    group by pr.username, p.handle, p.tier, m.user_id, p.pro_cosmetic_until
  )
  select (row_number() over (order by weekly_xp desc, last_at asc nulls last, handle))::integer,
         handle, tier, weekly_xp, pro, user_id = (select auth.uid())
  from rows
  where exists (select 1 from public.league_state s where s.opened_at is not null)
$$;
revoke all on function public.league_standings() from public, anon;
grant execute on function public.league_standings() to authenticated;
