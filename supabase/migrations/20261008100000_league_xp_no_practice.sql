-- League weekly XP leaves out practice (replays pay toward today's goal only, never total XP), so
-- weekly league XP can never exceed total XP. The same rule as `weeklyXp` in
-- src/lib/leagues/server.ts and `countsForLeague` in src/lib/progress/daily.ts.
-- Same function as 20261006100000_avatar_outfits.sql with one added condition on the join
-- (e.kind <> 'practice'); the signature is unchanged, so it's replaced in place and keeps its grants.
-- Rollback: re-run the definition in 20261006100000_avatar_outfits.sql (without the drop).
create or replace function public.league_standings()
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
    left join public.xp_events e on e.user_id = m.user_id and e.at >= wk.starts and e.at < wk.ends and e.kind <> 'practice'
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
