# The Feed

Owner's brief, 7 Oct 2026: a TikTok-style stream of tiny interactive "bytes" that hooks new visitors
and leads them into lessons. Built behind a flag on staging, then shipped. Same rules as
`docs/plans/retention-and-fun.md` (staging, full gate and visual QA, add-only migrations, roll back on
failure).

## What a byte is
One screen, 15–30 seconds:
1. **Hook:** one surprising line, at most 12 words ("Your password could be guessed in 2 seconds.").
2. **One interaction:** tap, drag or predict, using our existing card types: multiple choice (with a
   picture), true or false, fill the gap, next word, flip the bits, sort (small), tap a part, fix the
   model.
3. **Instant reveal:** one-tap types check themselves the moment you tap; drag and build types have a
   Check button. Right answers get the cyan pulse, a "+5 XP" pop and the mascot's hop. Wrong answers
   get a soft shake, the right answer shown, and the card's one-line explanation. No Try again: the
   Feed moves on.
4. **Go deeper:** a link to the lesson the byte came from.

## The stream
- `/feed`: a full-height vertical stream, one byte per screen. Swipe up or down (CSS scroll snap), or
  use the arrow keys and Next and Back buttons on desktop and for accessibility.
- Never autoplay or auto-advance: the learner always moves on.
- **A "Feed" tab** in the header and the phone tab bar.
- **First thing new visitors see:** the landing page's hero becomes a live byte (playable right there)
  with "Keep going" into `/feed`. The rest of the landing page stays below for parents and search
  engines. Returning learners still get the dashboard.
- **Guests:** the first 5 bytes need no account. The 6th screen is the sign-up card: "Sign up to keep
  your streak and progress", plus Not now, which goes to a lesson. Guest byte XP is kept locally and
  merged on sign-up like lessons.
- **Variety:**
  - Topics are mixed from all four courses.
  - About 1 in 10 bytes is **rare** (a "Rare byte" chip and +15 XP instead of +5). Rare bytes are fixed
    in the content (marked `rare`), so they're the same for everyone: no gambling-like odds, and nothing
    is bought.
- **Light personalisation:** courses you've finished lessons in, or tapped Go deeper on, come up a bit
  more often. The mix is a seeded shuffle per learner per day (no randomness during render).
- **Wellbeing:** after 15 minutes in one session, a friendly card: "Nice work. Take a break?" ("Keep
  going" or "Done for now"). It's dismissible and shows once per session. No timers, counts or fake
  urgency anywhere.

## XP, streaks and leagues
- A right answer on a byte you haven't answered right before earns **5 XP** (rare: 15). Replays earn
  nothing.
- **Capped at 50 XP a day from bytes,** so the Feed can't be farmed. After the cap the bytes still play,
  with a quiet "Today's Feed XP is maxed. Lessons still earn XP."
- **Server-checked:** `answerByteAction` re-grades the answer with `src/cards/grading.ts`. It records
  the play and an XP event (kind `card`, card id `byte:<id>`, lesson id = the byte's lesson), so bytes
  count toward the daily goal, streaks and leagues with no change to existing rules. Total XP adds the
  byte XP, so weekly ≤ total still holds.
- **Database (add-only):** `byte_plays` (`user_id`, `byte_id`, `day`, `correct`, `xp`, `at`; primary
  key `user_id` + `byte_id`, so XP is paid once ever). Learners can select their own rows; only the
  server writes. `check:rls` covers it.

## Content: 30 starter bytes
- `content/bytes/*.json`: `{ id, hook, from: { lesson, card }, rare?, video? }`. A byte points at an
  existing interactive core card, so the card is the interaction and its explanation is the reveal.
- **The loader checks:**
  - the card exists and is a type the Feed supports;
  - the hook is 12 words or fewer;
  - the card stands on its own (no "the email above" references; reviewed by hand);
  - ids are unique and at most 1 in 6 is rare.
- **Lesson-pattern rules:** picture first, under 12 words, one idea.
- 30 bytes spread across the four courses (about 8 each), chosen from cards that already pass the
  360×560 fit audit.

## Export as video
- `/feed/video/[id]`: a 9:16 frame (1080×1920 scaled to the window), big text, and the interaction
  playing itself: hook, a pointer taps the right answer, the reveal animates, then the logo and
  cybernettraining.com.
- It loops slowly so it can be screen-recorded for TikTok and Reels.
- Not indexed. It's not linked in the app, only from the Feed's own share menu for the owner.

## Tracking
- `byte_viewed` (byte's lesson as `lesson`)
- `byte_answered` (`source`: right or wrong)
- `byte_go_deeper`
- `feed_session_length` (bucketed: `source` = "under-1m", "1-5m", "5-15m", "15m-plus"; sent when the
  Feed is left)
- `feed_signup`

Same two-property limit as every other event.

## Free and Pro
The Feed is free and unlimited for everyone; Pro is unchanged (unlimited lessons). Go deeper follows
the usual lesson rules (guest gate, daily limit), so the Feed is the way into lessons.

## The flag
`FEED_ENABLED` in `src/lib/feed/config.ts`: false hides the tab, the route (404) and the landing hero
byte. On staging and in the dev server, `?feed=1` previews it. Shipping is a one-line change, after the
gate passes.

## Effort and order
About 5–7 days:
1. bytes schema and the 30 bytes;
2. the stream, guest flow and wellbeing card;
3. XP and the table;
4. landing hero and tab;
5. video view;
6. e2e `npm run e2e:feed` (swipe, keyboard, the 5-byte gate, XP cap, wellbeing card, events, 360×560
   and desktop).

**Moves:** share of new visitors who interact (`byte_answered` per landing visit), Go-deeper rate into
lessons, day-2 return.
