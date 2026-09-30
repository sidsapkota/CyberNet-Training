-- First-time "how to play" coach panels the learner has already seen (card-type keys such as
-- "sort_bins" or "hotspot-label"), synced like the other preferences. Like learning_mode and
-- sound_enabled, users can't write it directly: setPreferencesAction does, after verifying the
-- session. The existing column grant (display_name only) already blocks direct writes.
alter table public.profiles
  add column coach_seen text[] not null default '{}',
  add constraint profiles_coach_seen_size check (cardinality(coach_seen) <= 32);
