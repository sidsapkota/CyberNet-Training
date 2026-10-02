# Founding Member (lifetime Pro) and the parent pitch

Status: **built, merged behind `FOUNDER_OFFER` (off in production)** (2 Oct 2026). The database
migration is applied (add-only). What's left for the owner is at the end.

## The offer
- **One payment, lifetime Pro:** `STRIPE_PRICE_FOUNDER` (live: a one-off A$29, GST inclusive). The
  amount is read from Stripe, never written in code. Stripe Checkout in **payment mode** (no
  subscription, no trial); adaptive pricing comes from the account's Checkout setting, as for the
  other plans.
- **Copy, from the live prices (owner):** headline "Lifetime Pro for A$29, less than 4 months of the
  monthly plan", and underneath "A year of monthly is A$95.88. This is A$29, once." Both are worked
  out by `founderCopy` (`src/lib/pro/founder.ts`) from Stripe's founding and monthly prices, so they
  stay true if prices change. Never a made-up "was" price.
- **First 50 buyers, counted for real:** "37 of 50 left" is the database's count (`founder_seats()`),
  on every view (`/api/pro/founder`, never cached). At 50 the offer disappears everywhere.
- **Wording:** "lifetime Pro, for as long as CyberNet Training runs" (never "forever"). Under every
  button: "Under 18? Ask a parent before buying."
- **Who sees it:** guests, free accounts and early-user grant holders. Never anyone with a
  subscription or trial, or a Founding Member (`showFounderOffer`). Buying needs an account and the
  13+ confirmation.

## Seats: never more than 50
- "Get lifetime Pro for A$29" → `startFounderCheckoutAction`: refuses while the offer is off, to a
  subscriber or founder, or without 13+. It creates a Checkout session that expires in 31 minutes
  (Stripe's minimum is 30), expires the learner's earlier founding sessions, then
  `reserve_founder_seat` holds a seat under a lock only if sold + held < 50 (otherwise the session
  is expired and the learner is told the last spots are in checkout).
- **Granting:** the webhook's `checkout.session.completed` claims the seat for a paid payment-mode
  session carrying our metadata (`offer: founder`) and the learner as `client_reference_id`
  (`founderPurchaseOf`). `/pro/welcome` does the same on return. `claim_founder_seat` is idempotent.
- **Refunds (owner):** `charge.refunded` with a **full** refund calls `refund_founder_seat`: Pro and
  the badge end, the seat is free again (the counter counts unrefunded seats), and the cosmetic Pro
  frame is re-stamped. A partial refund keeps the seat.
- **Entitlement:** an unrefunded seat is Pro with no end date (`proStatus` kind `founder`; plan
  line "Founding Member: lifetime Pro, for as long as CyberNet Training runs.").

## Where it shows
- **`/pro`** (and `/pricing`, which redirects there): the offer first and largest, then the plans,
  then the parent pitch.
- **Paywall and daily-limit screens (`ProPitch`):** the founding button is the main one, with the
  comparison and counter; "Or try 7 days free" (the plans) and "Not now" share a row below.
- **Dashboard:** one small line for signed-in free accounts, with ✕ (remembered per device).
- **Badge** ("Founding Member", the logo's shield and the words): dashboard, `/account`, Your plan,
  the welcome page, player cards, and the leaderboard row (the shield beside the name). The
  leaderboard reads it from a new `league_founders()`; `league_standings()` is unchanged.
- **Parent pitch** (`/pro` and the landing page): "Teach your kid to spot scams before they meet
  one." with three true lines from Stay Safe Online, "Start free, no card needed", and "Buying for
  your kid?" (buy on the kid's account, together).

## Events
`founder_viewed` and `founder_clicked` (only `source`: the screen: `pro_page`, `paywall`, `limit`,
`dashboard`), and `founder_purchased` (on `/pro/welcome` once the server has confirmed it).

## Database (applied, add-only: `20261007100000_founding_members.sql`)
`founding_members` and `founder_holds` (RLS on; learners select only their own seat; nobody else
writes), `founder_seats()` (anyone), `reserve_founder_seat`, `claim_founder_seat`,
`refund_founder_seat` (service role only) and `league_founders()` (signed-in learners, their own
league). `check:rls` proves all of it (113 checks).

## Tested
- Unit: copy from live prices (always true), counter, flag, who sees it, Stripe session and refund
  parsing, entitlement (`founder.test.ts`); webhook claim, duplicate, refund, partial refund
  (`webhook.test.ts`).
- `npm run e2e:founder` (36 checks): /pro, paywall, dashboard line, subscriber and founder views,
  badge, refund, events, screenshots at 360×560 and desktop (`.e2e-shots/founder/`). While the flag
  is off it stands in for `/api/pro/founder` in the browser; `E2E_FOUNDER_LIVE=1` uses the real one.
- **Not tested:** a real Stripe Checkout payment end to end. There's no founding price in the Stripe
  sandbox, and creating one was off limits.

## What's left for the owner
1. **Sandbox price for the full test:** in the Stripe **sandbox**, add a one-off A$29 price and put
   its id in `.env.local` as `STRIPE_PRICE_FOUNDER`, with `FOUNDER_OFFER=on`. Then, with
   `stripe listen --forward-to localhost:3000/api/stripe/webhook` running: buy with test card 4242…
   as a throwaway learner → Pro and the badge show, the counter drops by one → the offer is gone for
   them → refund it in the Stripe dashboard → Pro ends and the counter goes back up.
2. **Go live:** in Vercel **Production**, add `FOUNDER_OFFER` = `on` (`STRIPE_PRICE_FOUNDER` is
   already set) and redeploy. To stop the offer at any time, remove it or set it to `off`.
3. **Delayed payment methods:** only instant methods (cards, Apple Pay, Google Pay) grant at once.
   If the account allows bank debits, add `checkout.session.async_payment_succeeded` to the webhook,
   or leave them off.
