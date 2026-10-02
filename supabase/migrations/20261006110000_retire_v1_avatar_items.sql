-- Avatars v2 (step 2 of 2, after the new code is live): retire the v1 items. Checked on 2 Oct 2026:
-- reward_items_owned and reward_spins had 0 rows, so nobody owns a v1 item or has used a spin, and
-- there's nothing to hand back. From here the server only ever saves v2 spin items.
delete from public.reward_items_owned
  where item_id not in ('beanie', 'headband', 'headset', 'visor');
-- profiles.avatar is unused from here; drop it in a later migration with display_name.
