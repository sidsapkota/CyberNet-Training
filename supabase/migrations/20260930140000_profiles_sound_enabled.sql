-- Sound effects and haptics preference (default on), synced with the rest of the learner's
-- preferences. Like learning_mode, users can't write it directly: setPreferencesAction does,
-- after verifying the session. The existing column grant (display_name only) already blocks it.
alter table public.profiles
  add column sound_enabled boolean not null default true;
