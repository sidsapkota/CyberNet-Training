# Plan: avatars and rewards

Status: **plan only, not built** (owner, 2 Oct 2026). Aim: ready before leagues open.
Mockups (360×640): `docs/plans/avatars/*.png` (from `mockups.html`).

## Avatars
- **Choose, never upload.** On-brand items drawn from the mascot's parts and the logo geometry:
  mascot colourways, accessories (cap, headphones, hoodie, glasses, scarf) and tech badges (shield,
  chip, router, terminal, rocket, satellite). No photos, ever (learners may be 12).
- **Starter set (free for everyone):** plain mascot, 2 colourways, shield, chip, terminal.
- **Shown:** header node, dashboard identity row, `/account`, league player cards and rows (beside
  the username; the tier badge moves to a small corner). Never on certificates.

## Reward spin (every spin wins)
- **Earned only by learning:** a perfect lesson (every core card right first time, judged on the
  server from `card_completions.xp`; once per lesson, ever), a finished module, a finished course,
  and streak milestones (7, 30, 100 days). Never for speed, never bought, never for watching ads.
- **Every spin wins:** the server picks, with equal chance, one item from the list you don't own
  yet (Pro-only items excluded). The ring animation just lands on it. When you own everything, a
  spin gives a colour for your node ring instead, so there is never "nothing".
- **Not gambling-like:** no money anywhere; no odds tiers, "rare" or "legendary" labels; no
  near-miss effects or slot imagery; no extra spins for anything but learning; the **full reward
  list is always visible** (Rewards page: every item, which you own, how each is earned). The
  spin is a ring of nodes lighting in sequence (our loading motif), ~1.2 s, a still result under
  reduced motion. *(Even so, a spin is a chance mechanic; my earlier recommendation was "pick one
  of three". Built as you asked, with these limits.)*
- **Where:** the lesson-complete screen (after the celebration, before "Up next") and the Rewards
  page (unspun spins wait there). Never inside a lesson (minimalism guardrail).

## Pro-only cosmetics (a few)
- **3 items:** Holo shield (badge), Circuit crown (accessory), Trace frame (animated node ring, the
  only animated item, 2 beats then still). Shown in the list with the Pro badge.
- **Granted with Pro, never spun:** they unlock while a learner has Pro and stay chosen but
  greyed when it ends (choose another). Spins are the same for everyone, so paying never changes
  a learner's chances. Purple stays reserved for the Quantum tier.

## SQL (not applied; shown for approval)
```sql
-- Avatars and rewards: cosmetic only. Items are a fixed list in code (src/lib/rewards/items.ts);
-- the database stores ids. Only the server writes (secret key); learners read their own rows.
alter table public.profiles
  add column avatar text not null default 'mascot' check (avatar ~ '^[a-z0-9-]{1,40}$');

create table public.reward_items_owned (
  user_id     uuid not null references auth.users on delete cascade,
  item_id     text not null check (item_id ~ '^[a-z0-9-]{1,40}$'),
  source      text not null check (source in ('starter', 'spin', 'pro')),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- One spin per thing earned (the key makes it idempotent), spun later or straight away.
create table public.reward_spins (
  user_id    uuid not null references auth.users on delete cascade,
  earned_for text not null check (earned_for ~ '^(perfect|module|course|streak):[a-z0-9-]{1,80}$'),
  earned_at  timestamptz not null default now(),
  spun_at    timestamptz,
  item_id    text check (item_id ~ '^[a-z0-9-]{1,40}$'),
  primary key (user_id, earned_for)
);

alter table public.reward_items_owned enable row level security;
alter table public.reward_spins       enable row level security;
revoke all on public.reward_items_owned, public.reward_spins from anon, authenticated;
grant select on public.reward_items_owned, public.reward_spins to authenticated;
create policy "read own items" on public.reward_items_owned for select to authenticated using ((select auth.uid()) = user_id);
create policy "read own spins" on public.reward_spins       for select to authenticated using ((select auth.uid()) = user_id);

-- Leaderboards show the avatar id too (an item from the fixed list; nothing personal).
-- league_standings(): add `pr.avatar` to the returned columns (same function otherwise).
```

## Code (when approved)
- `src/lib/rewards/` (pure, tested): item list, `spinsEarned` (perfect lesson, module, course,
  streak rules), `pickReward(owned, random)` (uniform over unowned, never Pro-only), Pro grants.
- Server Actions: `spinRewardAction` (server picks and saves, returns the item), `setAvatarAction`
  (only owned items), `claimSpinsAction` (records earned spins after XP writes).
- UI: `RewardSpin` (lesson-complete step), `/account/rewards` (full list), avatar picker on
  `/account`, `Avatar` component used by the header node, dashboard and player cards.
- Tests: no Pro item from a spin, every spin wins, idempotent earning, perfect-lesson rule;
  `check:rls` (learners can't write items, spins or the avatar); e2e at 360px.

## Open questions
1. Spin as above (with the limits), or switch to "pick one of three"?
2. Streak milestones 7 / 30 / 100: OK?
3. The 3 Pro items: OK, and granted (not spun)?
