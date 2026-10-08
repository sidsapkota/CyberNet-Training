-- "Send to a parent": a learner makes a one-time link that a parent opens on their own device to pay
-- for the learner's Founding Member seat, without signing in. Add-only: one new table.
-- - Only a hash of the link's secret is stored (sha256, hex); the secret itself is only in the link.
-- - A link works for 7 days and pays once; the purchase is tied to the learner's account.
-- - Server only: RLS on with no policies, and no grants to anon or authenticated, so nobody can read
--   or write links except the server (secret key). Deleting the learner deletes their links.
create table public.founder_parent_links (
  id                  bigint generated always as identity primary key,
  user_id             uuid not null references auth.users on delete cascade,
  token_hash          text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at          timestamptz not null default now(),
  expires_at          timestamptz not null,
  opened_at           timestamptz,
  checkout_session_id text unique check (checkout_session_id ~ '^cs_(test_|live_)?[A-Za-z0-9]+$'),
  paid_at             timestamptz
);
create index founder_parent_links_user on public.founder_parent_links (user_id, created_at);

alter table public.founder_parent_links enable row level security;
revoke all on public.founder_parent_links from public, anon, authenticated;
