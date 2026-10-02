-- Avatars v2 (step 1 of 2, before the code ships; additive only, so the live code keeps working).
-- An outfit is up to 5 item ids (one per slot) from the fixed list in code (src/lib/rewards/items.ts).
-- Only the server writes it (secret key), after checking the learner owns every item.
alter table public.profiles
  add column outfit text[] not null default '{}'
  check (cardinality(outfit) <= 5 and array_to_string(outfit, ',') ~ '^([a-z0-9-]{1,40}(,[a-z0-9-]{1,40})*)?$');

-- Leaderboards show the outfit too (item ids from the fixed list; nothing personal). Same function
-- as 20261005100000 plus one column; the return type changes, so it's dropped and recreated.
drop function public.league_standings();
create function public.league_standings()
returns table (rank integer, handle text, tier text, weekly_xp integer, pro boolean, is_me boolean, avatar text, outfit text[])
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
    select coalesce(pr.username, p.handle) as handle, p.tier, m.user_id, pr.avatar, pr.outfit,
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
    group by pr.username, p.handle, p.tier, m.user_id, p.pro_cosmetic_until, pr.avatar, pr.outfit
  )
  select (row_number() over (order by weekly_xp desc, last_at asc nulls last, handle))::integer,
         handle, tier, weekly_xp, pro, user_id = (select auth.uid()), avatar, outfit
  from rows
  where exists (select 1 from public.league_state s where s.opened_at is not null)
$$;
revoke all on function public.league_standings() from public, anon;
grant execute on function public.league_standings() to authenticated;
