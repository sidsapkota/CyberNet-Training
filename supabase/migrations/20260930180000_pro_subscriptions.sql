-- CyberNet Pro: Stripe subscriptions (TEST MODE) and the early-user grant.
-- Additive only: four new tables, nothing existing changes, so the live site is unaffected.
-- Written only by the server (the Stripe webhook and Server Actions, with the secret key).
-- Learners can read their own subscription and grant, to show their status; never write them.

-- 1. The Stripe customer for each account (server only).
create table public.stripe_customers (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  customer_id  text not null unique check (customer_id ~ '^cus_[A-Za-z0-9]+$'),
  created_at   timestamptz not null default now()
);

-- 2. Subscriptions, copied from Stripe by the webhook. Always re-fetched from Stripe before saving,
--    so duplicate or out-of-order events can't leave stale data.
create table public.subscriptions (
  id                    text primary key check (id ~ '^sub_[A-Za-z0-9]+$'),
  user_id               uuid not null references auth.users (id) on delete cascade,
  customer_id           text not null,
  status                text not null check (status in ('incomplete', 'incomplete_expired', 'trialing',
                          'active', 'past_due', 'canceled', 'unpaid', 'paused')),
  price_id              text not null,
  billing_interval      text check (billing_interval in ('month', 'year')),
  current_period_end    timestamptz,
  trial_end             timestamptz,
  cancel_at_period_end  boolean not null default false,
  started_at            timestamptz not null,
  ended_at              timestamptz,
  synced_at             timestamptz not null default now()
);
create index subscriptions_user on public.subscriptions (user_id);

-- 3. Webhook events already handled (makes the webhook idempotent). Server only.
create table public.stripe_events (
  id            text primary key check (id ~ '^evt_[A-Za-z0-9]+$'),
  type          text not null,
  processed_at  timestamptz not null default now()
);

-- 4. The early-user thank-you: 30 days of Pro, separate from Stripe.
create table public.pro_grants (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  reason      text not null check (reason in ('early_user')),
  starts_at   timestamptz not null default now(),
  expires_at  timestamptz not null,
  thanked_at  timestamptz,          -- when the thank-you was shown
  check (expires_at > starts_at)
);

-- RLS: on everywhere. Learners read only their own subscription and grant; nobody but the
-- service role touches customers or events.
alter table public.stripe_customers enable row level security;
alter table public.subscriptions    enable row level security;
alter table public.stripe_events    enable row level security;
alter table public.pro_grants       enable row level security;
revoke all on public.stripe_customers, public.subscriptions, public.stripe_events, public.pro_grants
  from anon, authenticated;   -- incl. TRUNCATE, REFERENCES, TRIGGER
grant select on public.subscriptions, public.pro_grants to authenticated;
create policy "read own subscriptions" on public.subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "read own pro grant" on public.pro_grants
  for select to authenticated using ((select auth.uid()) = user_id);
