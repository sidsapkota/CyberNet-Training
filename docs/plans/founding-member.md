# Plan: Founding Member (lifetime Pro) and the parent pitch

Status: **plan for approval** (owner, 2 Oct 2026). Nothing built. Goal: a first sale this weekend.

## The offer
- **One payment, lifetime Pro:** the price is `STRIPE_PRICE_FOUNDER` (the owner sets it; the amount is
  read from Stripe and shown, never written in code, like the other plans). Stripe Checkout in
  **payment mode**, no subscription, no trial; adaptive pricing the same way as the other plans
  (the account's Checkout setting; no per-session override).
- **First 50 buyers, counted for real:** "37 of 50 left" is computed from the database on every
  view. No timers, no "only today", no fake scarcity. When 50 are sold the offer disappears everywhere
  and the normal plans show, automatically.
- **Wording:** "Lifetime Pro, for as long as CyberNet Training runs" (never "forever"). Under every
  Founding Member button: "Under 18? Ask a parent before buying."
- **Who sees it:** guests and signed-in learners without Pro. **Not** shown to anyone with an active
  subscription (or a trial), or who is already a Founding Member. Buying needs an account and the
  13+ confirmation, as for the other plans.

## Never more than 50 (the seat ledger)
Stripe can't stop two people paying for the last seat at the same moment, so seats are **held**
while someone is in Checkout:
1. "Become a Founding Member" calls `startFounderCheckoutAction`: refuses if the learner has Pro (a
   subscription, a trial or a founding seat) or hasn't confirmed 13+; then `reserve_founder_seat`
   holds a seat for that Checkout session, under a database lock, only if
   `sold + held < 50`. The Checkout session expires after 30 minutes (Stripe's minimum), and so does
   the hold.
2. The counter shows seats left = 50 − sold. If every remaining seat is held by someone in Checkout,
   the button says "The last spots are in checkout right now. Check back in 30 minutes." (true, and
   it clears itself).
3. Expired sessions can't be paid, so at most 50 payments can ever complete.

## Granting Pro (webhook, idempotent)
- **The live webhook already receives `checkout.session.completed`** (checked read-only on the
  endpoint: no Stripe change needed). Today the handler ignores payment-mode sessions; it will call
  `claim_founder_seat` when the session's price is `STRIPE_PRICE_FOUNDER`, `mode` is `payment`,
  `payment_status` is `paid`, and `client_reference_id` is a learner. The claim is idempotent (one
  seat per learner and per Checkout session; a repeat event changes nothing), and the event is
  recorded once in `stripe_events` as now.
- **`/pro/welcome` syncs too** (as for subscriptions): it re-fetches the session from Stripe, checks
  it belongs to the signed-in learner and is paid, then claims the seat, so Pro shows at once even if
  the webhook is a few seconds behind.
- **Entitlement:** a founding seat (not refunded) is Pro with no end date (`proLine`: "Founding
  Member: lifetime Pro"). Subscriptions and the early-user grant work as now.
- **Delayed payment methods:** if the account allows any (bank debits and similar), Stripe sends
  `checkout.session.async_payment_succeeded` instead, which the endpoint **doesn't** receive. Cards,
  Apple Pay and Google Pay complete straight away. Either keep only instant methods on (no change),
  or add that event to the endpoint (**owner action**; I won't touch the webhook settings).
- **Refunds:** the endpoint doesn't receive refund events. A refund (handled by you in Stripe, under
  the Australian Consumer Law) is marked in the database (`refunded_at`), which ends the Pro; the seat
  isn't resold (the counter counts sales).

## Badge
A small "Founding Member" badge (the shield mark and the words; never colour alone) beside the name
on `/account` and the dashboard, and on the learner's leaderboard row and player card. No new avatar
item. `league_standings()` returns a `founder` flag (public: it's a badge, like Pro).

## Where it shows
- **`/pro`** (the page the nav's "Pricing" opens; **`/pricing` becomes a redirect to it**, since you
  call it that): the Founding Member card first and largest, above monthly and annual, with the real
  counter. When sold out, the page is exactly as today.
- **Paywall and daily-limit screens (`ProPitch`):** the main button becomes "Become a Founding
  Member: A$29 once" (the price from Stripe) with "37 of 50 left"; the 7-day trial becomes a small
  link below it. Still one screen at 360×640 and 360×560, "Not now" always there.
- **Dashboard:** one line for signed-in free learners: "Founding Member: lifetime Pro for A$29 · 37
  left. See it" with a ✕ that hides it on this device.

## Parent pitch
- **On `/pro` and the landing page**, a short section: "Teach your kid to spot scams before they meet
  one." Three true lines from Stay Safe Online: spotting fake messages, texts and websites; strong
  passwords and two-step sign-in; deepfake voice and video scams, and where to get help. Plus "Start
  free: the first and last modules are free, no card needed." No claims we don't have (no parent
  dashboard, no progress reports).
- **"Buying for your kid?"** (a link that opens a short panel): accounts belong to learners 13+, so a
  parent buys on their kid's account: sign in together (or the kid signs in), then pay on that
  account. The receipt goes to the account's email. Ask before buying if you're under 18.

## Tracking
`founder_viewed` (the offer was on screen; `source`: the screen), `founder_clicked` (the button),
`founder_purchased` (on `/pro/welcome`, after the server confirms the payment). Same rules as the
other events (at most `lesson`/`course` and `source`; nothing personal).

## Terms and refunds
`content/legal/terms.md`: a "Founding Member (one-off purchase)" section: what it is (lifetime Pro
for as long as CyberNet Training runs, one per account, not transferable), that it's a one-off
payment with nothing recurring, that the Australian Consumer Law guarantees still apply (refunds
for major failures), and how to ask for a refund. The privacy policy adds "your Founding Member
purchase (date, amount, Stripe payment ID)".

## Database (shown for approval; not applied)
```sql
-- Founding Member: one-off lifetime Pro, at most 50 seats. Only the server writes (secret key).
create table public.founding_members (
  seat                smallint primary key check (seat between 1 and 50),
  user_id             uuid unique references auth.users on delete set null,  -- a deleted account keeps its seat sold
  checkout_session_id text not null unique,
  payment_intent_id   text unique,
  amount_total        integer not null check (amount_total >= 0),
  currency            text not null check (currency ~ '^[a-z]{3}$'),
  purchased_at        timestamptz not null default now(),
  refunded_at         timestamptz
);

-- A seat held while someone is in Checkout (expires with the session).
create table public.founder_holds (
  checkout_session_id text primary key,
  user_id             uuid not null references auth.users on delete cascade,
  expires_at          timestamptz not null
);

alter table public.founding_members enable row level security;
alter table public.founder_holds    enable row level security;
revoke all on public.founding_members, public.founder_holds from anon, authenticated;
grant select on public.founding_members to authenticated;
create policy "read own founding seat" on public.founding_members
  for select to authenticated using ((select auth.uid()) = user_id);

-- The public counter: numbers only, for everyone (the offer shows to guests).
create function public.founder_seats()
returns table (sold integer, held integer, total integer)
language sql stable security definer set search_path = '' as $$
  select (select count(*)::int from public.founding_members),
         (select count(*)::int from public.founder_holds where expires_at > now()),
         50
$$;
grant execute on function public.founder_seats() to anon, authenticated;

-- Hold a seat for a Checkout session: refused when sold + held >= 50 or the learner already has one.
-- Claim it once paid: idempotent per learner and per session. Both: one lock, secret key only.
create function public.reserve_founder_seat(p_user uuid, p_session text, p_expires timestamptz) returns boolean ...;
create function public.claim_founder_seat(p_user uuid, p_session text, p_payment text, p_amount integer, p_currency text) returns smallint ...;
revoke all on function public.reserve_founder_seat(uuid, text, timestamptz), public.claim_founder_seat(uuid, text, text, integer, text) from public, anon, authenticated;
grant execute on function public.reserve_founder_seat(uuid, text, timestamptz), public.claim_founder_seat(uuid, text, text, integer, text) to service_role;

-- league_standings(): the same function plus a `founder` boolean (dropped and recreated in one
-- transaction, security definer, same search_path, revoke and grant).
```
`check:rls` gains: learners can't insert or update seats or holds, can read only their own seat, the
counter works for guests, a 51st seat is refused, and a second claim by the same learner changes
nothing.

## Testing (Stripe test mode, never live)
On a local production build with test keys and `stripe listen` forwarding to it, a throwaway learner:
buy with a test card → the webhook claims the seat → Pro shows, the counter drops by one, the badge
shows on the account page and the leaderboard row → a second "Become a Founding Member" is refused
(and the offer is gone for them). Plus: a learner with a subscription never sees the offer; with 50
seats sold (test data, cleaned up) the offer disappears; a hold blocks the 51st checkout.
Screenshots of `/pro` and the paywall at 360×560 and desktop before merging.

## What I need from you
1. **A test-mode price** for local testing: a one-off A$29 price in the Stripe sandbox, with its ID in
   `.env.local` as `STRIPE_PRICE_FOUNDER` (and the live price in Vercel Production when we ship).
   I won't create products or touch env vars.
2. **Delayed payment methods:** keep only instant methods, or add
   `checkout.session.async_payment_succeeded` to the webhook endpoint?
3. **The SQL above:** OK to apply when the code is ready (with your approval, as always)?
4. **`/pricing`:** a redirect to `/pro` (recommended), or rename the page?
