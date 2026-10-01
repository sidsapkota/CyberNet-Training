-- Usernames, part 2 of 2 (applied once the code that sets usernames through the server is live).
-- Learners can no longer write their own profile row: the username goes through a Server Action
-- with the secret key, so the server's checks can't be skipped. This was the only browser write
-- on profiles (everything else there is already written by Server Actions). display_name is no
-- longer used; it's dropped later with the old league handle columns.
revoke update (display_name) on public.profiles from authenticated;
drop policy "Users update their own profile" on public.profiles;
