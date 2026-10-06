-- A generated username isn't a pick. Names the app makes up (league placement, the safety scan,
-- after reports) set username_generated = true, and the learner's first real pick is free: it
-- clears the flag without starting the 30-day change lock. Add-only: one column with a default;
-- learners can still only read their own profile row (no new grants), and only the server writes.
alter table public.profiles add column username_generated boolean not null default false;
