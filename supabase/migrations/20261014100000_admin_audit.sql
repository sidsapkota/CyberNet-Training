-- The admin dashboard's audit log (docs/plans/admin.md): every admin page view and action, who,
-- what and when. Add-only and server-only: written by the server with the secret key after the
-- admin gate; nobody can read or write it through the API (read it in the Supabase dashboard).

create table public.admin_audit (
  id         bigint generated always as identity primary key,
  admin_id   uuid not null,                                  -- kept even if the account goes
  action     text not null check (char_length(action) between 1 and 60),
  target     text check (char_length(target) <= 120),       -- e.g. whose email was revealed
  at         timestamptz not null default now()
);
create index admin_audit_at on public.admin_audit (at desc);

alter table public.admin_audit enable row level security;
revoke all on public.admin_audit from public, anon, authenticated;  -- incl. TRUNCATE, REFERENCES, TRIGGER
