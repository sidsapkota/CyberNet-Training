# Plan: avatars v2 (the mascot, dressed up)

Status: **plan for approval** (owner, 2 Oct 2026). Nothing built yet. Art direction:
`docs/brand/avatars.png` (the sheet is at `public/brand/avatars.png` now, which would serve it to the
public; I'll move it to `docs/brand/`, reference only, never shipped).

**What stays from v1 (live):** spins earned only by learning (finish a module, finish a course,
7/30/100-day streaks), the server picks with equal chance, every spin wins, no money, no rarity
labels, the full list always visible, Pro items granted with Pro and never spun, never photos.

## The avatar

- **Is the mascot itself**, drawn by the existing `Mascot` parts (logo-shield head, antenna, big eyes,
  circuit-dot face, waving `happy` pose), so the avatar and the mascot are the same character. No PNG
  is embedded or traced: every accessory is its own small SVG layer in code.
- **Colours:** the mascot's fixed navy fill and cyan line art, on the navy `screen` tile. Accessories
  use two new fixed tokens, a lighter, brighter blue line (`--color-mascot-accessory`, about `#8BE3FF`)
  over a slightly lighter navy fill (`--color-mascot-accessory-fill`, about `#1C3F70`), so they stand
  out from the body. Contrast checked against the tile (target 3:1 or more, like other UI outlines).
- **Two framings from the same layers:**
  - **Full body** (the avatar page preview, the item grid, your own player card).
  - **Bust** (head and shoulders, cropped from the same drawing) for small circles: header node,
    leaderboard rows, other learners' cards. Head and face items show in full; a scarf or hoodie shows
    at the collar; a cape or jetpack peeks out behind the shoulders.
- **Small sizes:** checked at 32px and 24px. At 24px the head, eyes and the head item must read; fine
  detail (circuit dots, the grad cap's tassel, the beanie's ribs) is dropped below 40px rather than
  turning to mush. I'll include a strip of every item at 24, 32 and 48px in the screenshots.

## Slots and stacking

One item per slot, at most 5 worn. A new item replaces whatever is in its slot; every slot can be empty.

| Slot | Items | Stacking |
|---|---|---|
| **Head** | Backwards cap, Beanie, Headband, Headset with mic, Graduation cap, Circuit crown | One at a time (they all sit on the head) |
| **Face** | Round glasses, Visor / VR goggles | One at a time |
| **Neck** | Scarf | Wears with anything |
| **Body** | Hoodie | Wears with anything (the scarf sits over it) |
| **Back** | Jetpack, Cape | One at a time |

The headset is a head item (its band crosses the top of the head, so it clashes with hats). Layer
order, back to front: back item, body, hoodie, scarf, head, face item, head item (a cap brim and the
headset's mic sit in front). So glasses + beanie + scarf + cape all wear together, as you asked.

## Who gets what (for your approval)

| Item | Slot | How you get it | Locked label |
|---|---|---|---|
| Backwards cap | Head | **Free** (everyone) | n/a |
| Round glasses | Face | **Free** | n/a |
| Hoodie | Body | **Free** | n/a |
| Beanie | Head | Spin | "Win it from a spin" |
| Headband | Head | Spin | "Win it from a spin" |
| Headset with mic | Head | Spin | "Win it from a spin" |
| Visor / VR goggles | Face | Spin | "Win it from a spin" |
| Scarf | Neck | **7-day streak** | "7-day streak" |
| Graduation cap | Head | **Finish a course** | "Finish a course" |
| Jetpack | Back | **30-day streak** | "30-day streak" |
| Circuit crown | Head | **Pro** | "Pro" |
| Cape | Back | **Pro** | "Pro" |

- Three free items (one per main slot) so a new learner can dress up straight away.
- **Milestone items are earned, not spun:** reaching the milestone unlocks them for good (worked out
  from progress, like the spins: passed course finals and the longest streak). A longest streak never
  shrinks, so they never disappear. The jetpack stays reachable without paying, so the best-looking
  items aren't all behind Pro.
- **Pro items** (crown, cape) work as now: worn while you have Pro, and when Pro ends they come off
  (the rest of the outfit stays).
- Locked items show in the list as a **dim silhouette** with the label, never hidden.

**Spins with a small pool (honest about it):** a learner can earn up to 26 spins but there are only 4
spin items. A spin is only offered while there's something left to win, so **every spin that's spun
wins**. Spins earned after that are kept ("Saved for new items") and become spinnable when we add
items. No filler prizes. (v1's test that the pool is at least as big as the spins you can earn is
replaced by this rule.) If you'd rather, the scarf and jetpack could go into the spin pool instead.

## The avatar page (`/account/rewards`, renamed "Avatar")

- **Big preview at the top:** the full-body mascot in your outfit, on the navy tile.
- **Slot tabs underneath:** Head, Face, Neck, Body, Back (44px tabs). Each shows its items as tiles;
  tap one to wear it, tap again to take it off. Locked tiles: dim silhouette plus label.
- **Saved on tap**, on the server (only items you own, one per slot). If a save fails, the outfit goes
  back and says so.
- **Equip motion:** the item pops on (a small scale-up with the `PRESS_SPRING`, about 7% overshoot,
  under 300ms) and the mascot gives its short wave (560ms). Nothing waits for it. Under reduced
  motion it just appears.
- **Spins** stay on this page above the tabs ("1 spin waiting: Spin"), with the spin as in v1.
- Mockups at 360×560 and desktop, plus a grid of all 12 items worn, go in `docs/plans/avatars/`
  once you approve this plan.

## Where it shows

The new avatar replaces v1's everywhere: header node and phone tab bar (bust), `/account`, the
dashboard identity row, leaderboard rows (bust, 32px) and player cards (full body for you, bust for
others). Pro members keep the Pro frame around the circle. Never on certificates.

## Database (shown for approval; not applied)

Two small migrations, so production never breaks between steps:

**1. Before the code ships (additive only).** The live code keeps working unchanged.
```sql
-- Avatars v2: an outfit is up to 5 item ids (one per slot), from the fixed list in code
-- (src/lib/rewards/items.ts). Only the server writes it (secret key), after checking ownership.
alter table public.profiles
  add column outfit text[] not null default '{}'
  check (cardinality(outfit) <= 5 and array_to_string(outfit, ',') ~ '^([a-z0-9-]{1,40}(,[a-z0-9-]{1,40})*)?$');

-- Leaderboards show the outfit too (item ids from the fixed list; nothing personal). Same function
-- as now, plus one column; the return type changes, so it's dropped and recreated.
drop function public.league_standings();
create function public.league_standings()
returns table (rank integer, handle text, tier text, weekly_xp integer, pro boolean, is_me boolean, avatar text, outfit text[])
-- … body as in 20261005100000, plus pr.outfit in the select and group by …
revoke all on function public.league_standings() from public, anon;
grant execute on function public.league_standings() to authenticated;
```

**2. After the new code is live (data clean-up).**
```sql
-- v1 items are retired. Spins already used on them are handed back, so learners spin again on the new
-- list (nobody loses a spin), and the old item rows go.
update public.reward_spins
  set spun_at = null, item_id = null
  where item_id is not null
    and item_id not in ('beanie', 'headband', 'headset', 'visor');
delete from public.reward_items_owned
  where item_id not in ('beanie', 'headband', 'headset', 'visor');
-- profiles.avatar is unused from here; drop it in a later migration with display_name.
```

- `reward_items_owned` only ever holds spin items; free, milestone and Pro items are worked out, not
  stored. `check:rls` gains: learners can't write `outfit`, and other learners see only the outfit
  through `league_standings()`.
- Nothing touches Stripe or env vars.

## Code (after approval, on branch `avatars-v2`)

- `src/lib/rewards/items.ts`: the 12 items (`id`, `name`, `slot`, `source`: free / spin / milestone /
  pro, `milestone?`). `rules.ts` (pure, tested): `ownedItems` (free + won + milestones + Pro),
  `wearOutfit` (one per slot, a new item replaces its slot), `effectiveOutfit` (drops Pro items without
  Pro and anything unknown), `pickReward` (unowned spin items only), `spinsAvailable` (the smaller of
  waiting spins and items left).
- `src/components/mascot/outfit/`: one file per accessory, drawn in the head's 64-unit space or the
  body's viewBox, plus `MascotAvatar` (full or bust, any size). Static exports stay unchanged (tested).
- Server: `setOutfit` replaces `setAvatar` (ownership and slot checks), and `getRewards` returns the
  outfit and milestones. The header, leaderboard and player cards switch to `MascotAvatar`.
- Tests: stacking and replacing, Pro items drop when Pro ends, milestone unlocks, every spun spin wins,
  saved spins, the server refuses items you don't own; e2e at 360px (equip, locked tile, spin).
- Screenshots before merging: the avatar page at 360×560 and desktop, the 12-item grid, and the 24/32px
  strip. Then `docs/handover.md`.

## Questions

1. The unlock table above: OK? (In particular crown and cape as Pro, jetpack at a 30-day streak.)
2. Spins with only 4 spin items, kept "saved for new items" once they're all won: OK, or put the
   scarf and jetpack in the spin pool instead of tying them to streaks?
3. Retire v1's items and hand back the spins used on them (as in migration 2): OK?
