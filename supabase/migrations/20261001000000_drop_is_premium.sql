-- CyberNet Pro is live: access comes from `subscriptions` and `pro_grants`, so the old, never-used
-- `profiles.is_premium` flag goes. Checked before applying: no row had it set, and no view,
-- policy or function depends on it. Run only once the Pro code (which never reads it) is deployed.
alter table public.profiles drop column is_premium;
