# Plan: avatars and rewards

Status: **plan only, not built** (owner, 1 Oct). The owner's message was cut off at "Pro members";
that part is an open question below.

## Avatars

- **Choose, never upload.** A set of on-brand avatars: mascot variations (colours from our palette,
  a cap, headphones, a hoodie) and tech badges (shield, router, chip, terminal), drawn from the
  mascot's parts and the logo geometry like everything else. No photos (learners may be 12).
- **Default:** the plain mascot. **Starter set:** 6 free (plain mascot, 2 colours, shield, chip,
  terminal); more are unlocked by earning (below).
- **Where:** the header node, the dashboard identity row, `/account`, and the league player card
  (where the tier badge sits today, so the tier moves to a small corner badge). Not on
  certificates.
- **Data:** `profiles.avatar` (an item id, default `mascot`), and `avatar_unlocks (user_id,
  item_id, unlocked_at, reason)` written only by the server (RLS: read own rows). Items are a
  fixed list in code (`src/lib/avatars/items.ts`), so nothing can be unlocked that doesn't exist.
- **Leagues:** other learners see only the avatar id (an item from the fixed list), never anything
  personal; `league_standings()` adds it.

## Rewards (cosmetic, never gambling)

- **When:** a perfect lesson (every core card right first try, which the server can tell from
  `card_completions.xp`), a 7-day streak, a finished module, a finished course.
- **What:** always something: an avatar item, a profile frame or a colour. Never "nothing", never
  XP, never Pro. All cosmetic. Rewards can never be bought, and nothing about them costs money.
- **The full list is always visible** (a "Rewards" page on the profile showing every item, which
  ones you have and how each is earned), so it's never a mystery box.
- **Where:** on the lesson-complete screen (after the celebration step, before "Up next") and the
  profile. Never inside a lesson (minimalism guardrail).

### Recommendation: no spin

A spin wheel is a chance mechanic. Even with free spins and only cosmetic prizes, it looks and
feels like gambling, and Australia's classification rules (since September 2024) treat simulated
gambling in games strictly. For an app marketed to 13-year-olds, and to keep our "honest, no
dark patterns" promise, I'd avoid it. Two alternatives, both fully transparent:
1. **Pick one of three (recommended):** the reward screen shows three items from the list you
   don't have yet; you choose one. A real choice, no chance, still exciting.
2. **A reward track:** each reward unlocks the next item on a visible path (like a battle-pass
   track with no paid tier).

## Server rules

- Rewards are decided on the server when the triggering event is recorded (lesson completion,
  quiz pass, streak milestone), in the same Server Actions, and stored in `reward_grants
  (user_id, trigger, offered[], chosen, granted_at)`; one per trigger, idempotent (a replayed
  lesson never pays twice). The client only sends which offered item it picked.
- Guests: rewards need an account (they're saved to it); the lesson-complete screen tells a
  guest what they'd have earned and offers the free account (no pressure, "Not now" as always).

## Questions for the owner

1. "Pro members…" was cut off: what should Pro members get (an extra choice? a Pro-only frame)?
   Keep it cosmetic and never pay-to-win, as with the league card frame.
2. Pick one of three, or a reward track (or a spin, if you still want it after the note above)?
3. Should the league player card show the avatar instead of the tier badge, or both?
