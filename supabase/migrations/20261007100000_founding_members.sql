-- Founding Member: a one-off payment for lifetime Pro (for as long as CyberNet Training runs), at
-- most 50 seats. Only adds things: two tables and some functions; nothing existing changes.
--
-- - A seat is held while its buyer is in Stripe Checkout (`founder_holds`, expiring with the
--   session), so two people can never pay for the last seat at once.
-- - The webhook (or /pro/welcome) claims the seat once Stripe says the session is paid.
-- - A full refund (charge.refunded) marks the seat refunded: Pro and the badge end, and the seat
--   is free again, since the counter only counts seats that aren't refunded.
-- - Learners read only their own seat. Everyone (guests too) reads the counter, numbers only.
--   Nobody writes except the server (secret key) through these functions.

create table public.founding_members (
  id                  bigint generated always as identity primary key,
  user_id             uuid not null references auth.users on delete cascade,
  checkout_session_id text not null unique check (checkout_session_id ~ '^cs_(test_|live_)?[A-Za-z0-9]+$'),
  payment_intent_id   text unique check (payment_intent_id ~ '^pi_[A-Za-z0-9]+$'),
  amount_total        integer not null check (amount_total >= 0),
  currency            text not null check (currency ~ '^[a-z]{3}$'),
  purchased_at        timestamptz not null default now(),
  refunded_at         timestamptz
);
-- One live (unrefunded) seat per learner.
create unique index founding_members_one_live_seat on public.founding_members (user_id) where refunded_at is null;

create table public.founder_holds (
  checkout_session_id text primary key check (checkout_session_id ~ '^cs_(test_|live_)?[A-Za-z0-9]+$'),
  user_id             uuid not null references auth.users on delete cascade,
  expires_at          timestamptz not null
);
create index founder_holds_user on public.founder_holds (user_id);

alter table public.founding_members enable row level security;
alter table public.founder_holds enable row level security;
revoke all on public.founding_members, public.founder_holds from public, anon, authenticated;
grant select on public.founding_members to authenticated;
create policy "read own founding seat" on public.founding_members
  for select to authenticated using ((select auth.uid()) = user_id);

-- The counter, for everyone: seats sold (not refunded), seats held by someone in Checkout, and 50.
create function public.founder_seats()
returns table (sold integer, held integer, total integer)
language sql stable security definer set search_path = '' as $$
  select (select count(*)::integer from public.founding_members where refunded_at is null),
         (select count(*)::integer from public.founder_holds where expires_at > now()),
         50
$$;
revoke all on function public.founder_seats() from public;
grant execute on function public.founder_seats() to anon, authenticated;

-- Hold a seat for a Checkout session. Refused (false) when the learner already has a live seat, or
-- every seat is sold or held. The learner's own older holds are released first (the server expires
-- those Checkout sessions in Stripe). One lock for every seat change, so the count is never raced.
create function public.reserve_founder_seat(p_user uuid, p_session text, p_expires timestamptz)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_taken integer;
begin
  if p_user is null or p_session is null or p_expires is null then
    raise exception 'reserve_founder_seat: missing argument';
  end if;
  perform pg_advisory_xact_lock(hashtext('founding_members'));
  delete from public.founder_holds where expires_at <= now() or user_id = p_user;
  if exists (select 1 from public.founding_members where user_id = p_user and refunded_at is null) then
    return false;
  end if;
  select (select count(*) from public.founding_members where refunded_at is null)
       + (select count(*) from public.founder_holds)
    into v_taken;
  if v_taken >= 50 then
    return false;
  end if;
  insert into public.founder_holds (checkout_session_id, user_id, expires_at) values (p_session, p_user, p_expires);
  return true;
end
$$;

-- Claim the seat for a paid Checkout session. Idempotent: the same session again changes nothing.
-- Always records a paid session (its hold guaranteed the seat; Stripe has the money either way),
-- and releases the hold. Returns true when the learner now has a live seat.
create function public.claim_founder_seat(p_user uuid, p_session text, p_payment text, p_amount integer, p_currency text)
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null or p_session is null or p_amount is null or p_currency is null then
    raise exception 'claim_founder_seat: missing argument';
  end if;
  perform pg_advisory_xact_lock(hashtext('founding_members'));
  delete from public.founder_holds where checkout_session_id = p_session;
  if not exists (select 1 from public.founding_members where checkout_session_id = p_session)
     and not exists (select 1 from public.founding_members where user_id = p_user and refunded_at is null) then
    insert into public.founding_members (user_id, checkout_session_id, payment_intent_id, amount_total, currency)
    values (p_user, p_session, p_payment, p_amount, lower(p_currency));
  end if;
  return exists (select 1 from public.founding_members where user_id = p_user and refunded_at is null);
end
$$;

-- A full refund: the seat ends (Pro and the badge go) and is free again. Returns the learner, or
-- null when the payment isn't a founding seat (or was already refunded).
create function public.refund_founder_seat(p_payment text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
begin
  perform pg_advisory_xact_lock(hashtext('founding_members'));
  update public.founding_members set refunded_at = now()
   where payment_intent_id = p_payment and refunded_at is null
  returning user_id into v_user;
  return v_user;
end
$$;

revoke all on function public.reserve_founder_seat(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.claim_founder_seat(uuid, text, text, integer, text) from public, anon, authenticated;
revoke all on function public.refund_founder_seat(text) from public, anon, authenticated;
grant execute on function public.reserve_founder_seat(uuid, text, timestamptz) to service_role;
grant execute on function public.claim_founder_seat(uuid, text, text, integer, text) to service_role;
grant execute on function public.refund_founder_seat(text) to service_role;

-- The Founding Member badge on leaderboards: which names in the caller's league this week are
-- founders (the same people league_standings() shows; nothing else about them).
create function public.league_founders()
returns table (handle text)
language sql stable security definer set search_path = '' as $$
  select coalesce(pr.username, p.handle)
  from public.league_members m
  join public.league_members me on me.league_id = m.league_id and me.week = m.week
  join public.league_players p on p.user_id = m.user_id
  join public.profiles pr on pr.id = m.user_id
  where me.user_id = (select auth.uid()) and me.week = public.league_week()
    and (p.show_on_leaderboards or m.user_id = (select auth.uid()))
    and exists (select 1 from public.founding_members f where f.user_id = m.user_id and f.refunded_at is null)
    and exists (select 1 from public.league_state s where s.opened_at is not null)
$$;
revoke all on function public.league_founders() from public, anon;
grant execute on function public.league_founders() to authenticated;
