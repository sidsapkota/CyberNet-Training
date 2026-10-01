-- Daily lesson limit: free accounts open up to 3 new lessons a day (Pro: unlimited).
-- The "day" is the learner's own day (profiles.time_zone, else Sydney), and a time zone can change
-- at most once every 7 days, so switching zones can't reset the day for extra lessons.

-- 1. Time zone changes: at most once every 7 days, enforced here. A change that comes too soon is
--    kept as the old value (not an error), because the server updates the zone alongside XP writes,
--    which must never fail over it.
alter table public.profiles add column time_zone_changed_at timestamptz;

create function public.limit_time_zone_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.time_zone is distinct from old.time_zone then
    if old.time_zone is not null
       and old.time_zone_changed_at is not null
       and old.time_zone_changed_at > now() - interval '7 days' then
      new.time_zone := old.time_zone;
      new.time_zone_changed_at := old.time_zone_changed_at;
    else
      new.time_zone_changed_at := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger limit_time_zone_changes
  before update of time_zone on public.profiles
  for each row execute function public.limit_time_zone_changes();

-- 2. Lessons opened, one row per learner, day and lesson.
create table public.lesson_opens (
  user_id   uuid not null references auth.users (id) on delete cascade,
  day       date not null,
  lesson_id text not null check (lesson_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  opened_at timestamptz not null default now(),
  primary key (user_id, day, lesson_id)
);

alter table public.lesson_opens enable row level security;
revoke all on public.lesson_opens from anon, authenticated;
grant select on public.lesson_opens to authenticated;

create policy "Learners read their own lesson opens"
  on public.lesson_opens for select to authenticated
  using ((select auth.uid()) = user_id);

-- 3. Counts a new lesson for today if there's room. Opening the same lesson again today is free.
--    Locked per learner, so two tabs can't both take the last place. Takes the browser's time zone
--    (already validated by the server) so the day is right before any XP; the 7-day rule applies.
create function public.open_lesson(p_user uuid, p_lesson text, p_limit int, p_time_zone text default null)
returns table (allowed boolean, used int, day date)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tz text;
  v_day date;
  v_used int;
begin
  if p_lesson !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or p_limit < 0 then
    raise exception 'open_lesson: bad arguments';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('lesson_opens'), pg_catalog.hashtext(p_user::text));

  if p_time_zone is not null then
    update public.profiles set time_zone = p_time_zone
      where id = p_user and time_zone is distinct from p_time_zone;
  end if;

  select pr.time_zone into v_tz from public.profiles pr where pr.id = p_user;
  begin
    v_day := (pg_catalog.now() at time zone coalesce(v_tz, 'Australia/Sydney'))::date;
  exception when others then
    v_day := (pg_catalog.now() at time zone 'Australia/Sydney')::date;
  end;

  select count(*) into v_used from public.lesson_opens o where o.user_id = p_user and o.day = v_day;

  if exists (select 1 from public.lesson_opens o where o.user_id = p_user and o.day = v_day and o.lesson_id = p_lesson) then
    return query select true, v_used, v_day;
    return;
  end if;

  if v_used >= p_limit then
    return query select false, v_used, v_day;
    return;
  end if;

  insert into public.lesson_opens (user_id, day, lesson_id) values (p_user, v_day, p_lesson);
  return query select true, v_used + 1, v_day;
end;
$$;

revoke all on function public.open_lesson(uuid, text, int, text) from public, anon, authenticated;
grant execute on function public.open_lesson(uuid, text, int, text) to service_role;
