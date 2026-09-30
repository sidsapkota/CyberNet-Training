# Stripe checklist: CyberNet Pro (TEST MODE ONLY)

Everything here is **test mode**. The code refuses live keys (`sk_live_…`, `rk_live_…`), and Pro
stays on the `pro` branch and its preview until you decide to go live. Nothing in this checklist
takes real money.

**You enter every key yourself.** Never paste a key into a chat, an issue or a commit. `.env.local`
is git-ignored; Vercel keeps its copies encrypted.

The settings the app reads (all server-only, never `NEXT_PUBLIC_`):

| Variable | Looks like | Where it comes from |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` | Stripe → Developers → API keys (step 3) |
| `STRIPE_PRICE_MONTHLY` | `price_…` | the monthly price (step 2) |
| `STRIPE_PRICE_ANNUAL` | `price_…` | the annual price (step 2) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` | `stripe listen` locally (step 4), or the preview's webhook endpoint (step 6). **They're different.** |
| `PRO_LAUNCH_AT` (optional) | `2026-10-01T00:00:00+10:00` | when Pro launches; accounts made before it get 30 days of Pro free. Leave it unset while testing unless you're testing that grant. |

## 1. Test mode on
1. Sign in to <https://dashboard.stripe.com>. Business name **CyberNet Training**, country
   **Australia**, currency **AUD**.
2. Make sure you're in a **sandbox / Test mode** (the toggle or sandbox picker at the top). The
   dashboard shows "Test mode" or the sandbox name. Stay there for every step below.

## 2. Product and prices
1. **Product catalogue → Add product**: name **CyberNet Pro**, description "Every module of every
   course". No image needed.
2. Add two **recurring** prices in **AUD**:
   - **A$7.99 per month**
   - **A$59.99 per year**
   (Placeholders; change them any time. The site reads the real amounts from Stripe and works
   out the annual saving itself, so nothing in the code needs to change.)
3. Don't add a trial in Stripe: the site adds the 7-day trial at checkout, only for a first
   subscription.
4. Copy each price's id (`price_…`, from the price's "…" menu). Price ids aren't secret, but keep
   them with the other settings.

## 3. API key
1. **Developers → API keys** (test mode): copy the **Secret key** (`sk_test_…`).
2. ➜ **Now add to `.env.local`** (in the project folder, next to the Supabase settings):
   ```
   STRIPE_SECRET_KEY=sk_test_…
   STRIPE_PRICE_MONTHLY=price_…
   STRIPE_PRICE_ANNUAL=price_…
   ```
   Don't add them to Vercel yet (step 7).

## 4. Webhooks on your computer (Stripe CLI)
1. Install the Stripe CLI (<https://docs.stripe.com/stripe-cli>) and run `stripe login` (it opens
   the browser; pick the same sandbox).
2. In one terminal, run:
   ```
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   It prints a signing secret, `whsec_…`. It stays the same for this computer.
3. ➜ **Now add to `.env.local`**: `STRIPE_WEBHOOK_SECRET=whsec_…` (the one `stripe listen`
   printed), then restart `npm run dev`.
4. Keep `stripe listen` running while you test locally; it forwards Stripe's events to the app.

## 5. Customer portal (test mode)
**Settings → Billing → Customer portal**:
1. Allow: **cancel subscriptions** (at the end of the period), **update payment methods**,
   **switch plans** between the two CyberNet Pro prices.
2. Business information: privacy policy `https://cybernettraining.com/privacy`, terms
   `https://cybernettraining.com/terms`.
3. Save.

## 6. Webhook endpoint for the `pro` preview
Preview deployments are behind Vercel's login, which would also block Stripe. Vercel's
**Protection Bypass for Automation** lets Stripe through with a secret in the URL:
1. Vercel → project → **Settings → Deployment Protection → Protection Bypass for Automation →
   Add secret**. Copy it. (It only bypasses the login screen; it doesn't unlock anything in the app.)
2. Stripe (test mode) → **Developers → Webhooks → Add endpoint**:
   - URL: `https://cyber-net-training-git-pro-sidsapkotas-projects.vercel.app/api/stripe/webhook?x-vercel-protection-bypass=<that secret>`
   - Events: `checkout.session.completed`, `customer.subscription.created`,
     `customer.subscription.updated`, `customer.subscription.deleted`,
     `customer.subscription.paused`, `customer.subscription.resumed`,
     `customer.subscription.trial_will_end`, `invoice.paid`, `invoice.payment_failed`.
3. Open the endpoint and reveal its **Signing secret** (`whsec_…`). This one is for the preview
   only; don't mix it up with the `stripe listen` one.

## 7. Vercel settings for the `pro` preview only
Vercel → project → **Settings → Environment Variables**. For each variable below: environment
**Preview** only, and **Git branch: `pro`** (never Production, never all previews):
1. ➜ **Now add**: `STRIPE_SECRET_KEY` (the same `sk_test_…`), `STRIPE_PRICE_MONTHLY`,
   `STRIPE_PRICE_ANNUAL`, and `STRIPE_WEBHOOK_SECRET` = **the endpoint's** secret from step 6.
2. Optional: `PRO_LAUNCH_AT` if you want to test the early-user grant.
3. Redeploy the `pro` preview (Deployments → the latest `pro` deployment → Redeploy) so it picks
   them up.

## 8. Sign-in on the preview
Supabase → **Authentication → URL Configuration → Redirect URLs**: add
`https://cyber-net-training-git-pro-sidsapkotas-projects.vercel.app/auth/callback`, so you can
sign in on the preview.

## 9. Test cards (test mode only)
Any future expiry date, any CVC, any postcode.

| Card | What happens |
|---|---|
| `4242 4242 4242 4242` | Succeeds |
| `4000 0025 0000 3155` | Asks for 3D Secure; approve it in the pop-up |
| `4000 0000 0000 9995` | Declined (insufficient funds) |
| `4000 0000 0000 0341` | Saves, then fails when charged (use it to test a failed renewal) |

## 10. End-to-end test (Claude runs it locally; you repeat the main path on the preview)
1. Signed in, 13+ confirmed: a Pro lesson shows the Pro badge and the upgrade sheet; `/pro`
   shows both prices from Stripe with the real annual saving.
2. Checkout with `4242…`: back on `/pro/welcome`, Pro is active straight away (7-day trial for a
   first subscription), and Pro lessons open. Stripe → Webhooks shows the events delivered (200).
3. Customer portal: switch to annual, then cancel; Pro stays until the period ends.
4. Test clocks (Billing → Test clocks) or `stripe trigger invoice.payment_failed`: a failed
   renewal keeps access for about a week while Stripe retries, then ends it.
5. A guest and a signed-in learner without Pro can't open a Pro lesson (`/api/lessons/<id>`
   answers 401/403), and "When Things Go Wrong" and every first module stay free.

## Going live (not now)
Only when you decide: live keys and live prices, a live webhook endpoint on the production
domain, legal pages reviewed for payments, and then merge `pro`. Until then Pro never reaches
`main`.
