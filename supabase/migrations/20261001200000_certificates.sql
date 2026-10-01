-- Course certificates (Pro). Issued and revoked only by the server (secret key). Owners read their
-- own; the public verification page reads one certificate's public fields through
-- verify_certificate(), and only while it isn't revoked.
create table public.certificates (
  id            text primary key
                  check (id ~ '^CNT-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$'),
  user_id       uuid not null references auth.users (id) on delete cascade,
  course_id     text not null check (course_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(course_id) <= 120),
  name          text not null check (char_length(name) between 1 and 60),
  completed_on  date not null,
  issued_at     timestamptz not null default now(),
  revoked_at    timestamptz,
  check (revoked_at is null or revoked_at >= issued_at)
);
-- One valid certificate per learner per course (re-issuing revokes the old one first).
create unique index certificates_one_active on public.certificates (user_id, course_id) where revoked_at is null;
create index certificates_user on public.certificates (user_id);

alter table public.certificates enable row level security;
revoke all on public.certificates from anon, authenticated;   -- incl. TRUNCATE, REFERENCES, TRIGGER
grant select on public.certificates to authenticated;
create policy "read own certificates" on public.certificates
  for select to authenticated using ((select auth.uid()) = user_id);

-- The public verification page: name, course and date only, for a valid certificate. No user id,
-- email or issue details. Unknown or revoked ids return nothing.
create function public.verify_certificate(p_id text)
returns table (name text, course_id text, completed_on date)
language sql stable security definer set search_path = '' as $$
  select c.name, c.course_id, c.completed_on
  from public.certificates c
  where c.id = upper(trim(p_id)) and c.revoked_at is null
$$;
revoke all on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to anon, authenticated;
