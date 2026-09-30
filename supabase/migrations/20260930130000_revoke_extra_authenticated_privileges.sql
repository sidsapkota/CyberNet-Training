-- Hardening: Supabase grants `authenticated` TRUNCATE, REFERENCES and TRIGGER on new public tables
-- by default. None are reachable through the API today, but TRUNCATE ignores Row Level Security,
-- so remove them. Users keep only SELECT (own rows, via RLS) and UPDATE (display_name) from the
-- first migration.
revoke truncate, references, trigger on public.profiles, public.card_completions,
  public.lesson_completions, public.quiz_attempts from authenticated;
