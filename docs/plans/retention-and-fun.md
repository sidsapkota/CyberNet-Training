# Retention and fun

Owner's brief, 7 Oct 2026. **Why:** 80% of learners who start a lesson finish it and 85% of cards are
answered right first time, but only 24% come back on a second day (3 learners active in the last 48 hours).
The lessons work. Nothing brings people back, and the cards are often too easy to feel like a game.

**Status:** parts 1–3 and the content quality pass were approved to build while the owner is away (rules
below). Part 4 is a plan only. The Feed has its own plan: `docs/plans/feed.md`.

**Rules while the owner is away:** one branch per part, built and tested on staging. Only add-only
migrations (new tables or columns with defaults, RLS on, covered by `check:rls`) may go to production.
Merge only when lint, typecheck, tests, build, design QA, the visual QA gate and the part's e2e pass,
then run the production checks; on failure, roll back and note why. Never email a real learner as a
test (test emails go only to cybernettraining10@gmail.com). No Stripe or Vercel env changes: if a part
needs a new env var, stop it and say exactly what to add.

**A note on measuring:** with a handful of active learners a day, a change in any rate this month is
mostly noise. Each part names the metric it should move; read them over weeks, not days.

## Build order

| # | Part | Effort | Moves | Why this order |
|---|---|---|---|---|
| 0 | Visual QA gate (finish, merge) | 0.5 day | quality | Every later merge needs it |
| 1 | Satisfaction boosts (part 3) | 1 day | lesson finish rate, day-2 return | Small, no database, makes every lesson feel better at once |
| 2 | Reminder emails (part 1) | 2–3 days | day-2 return (24%) | The only part that reaches people who've left |
| 3 | Challenge a friend (part 2) | 4–5 days | new learners per active learner | Growth loop; biggest build |
| 4 | The Feed (`docs/plans/feed.md`) | 5–7 days | first-visit engagement, day-2 return | New front door; builds on 1–3 |
| 5 | Content quality pass: measuring, then pacing, then conversions | 2 days + ~1 day per course | first-try accuracy (85% is too easy), time per card | Data first, so conversions start from evidence |
| 6 | Part 4 content direction (toys, missions, daily review) | plan only | | Waits for the owner |

## Part 1: streak and league reminder emails (opt-in)

**What:** at most one short email a day, only to learners who ticked "Email me before my streak or league
ends":
- **Streak:** "Your 3-day streak ends tonight" (or "Keep your 1-day streak going" on day 2, the day that matters
  most), sent at about 7 pm in the learner's time zone, only if they have a streak worth keeping and **no
  XP today**.
- **League:** "Your league ends in 6 hours. You're #4", sent on Sunday at 6 pm Sydney (6 hours before the
  Monday reset), only while leagues are open, only to learners in a league this week with XP, and only
  if it's between 8 am and 9 pm where they are.

**Consent (Australian Spam Act 2003):**
- **Consent:** express, never assumed. The box is **unticked** on the "Pick a username" sign-up step and on
  `/account`. Existing accounts are **not** opted in. We record when consent was given.
- **Sender identified:** from "CyberNet Training <noreply@cybernettraining.com>", reply-to
  hello@cybernettraining.com, and a footer naming CyberNet Training and how to contact us.
- **Unsubscribe:** one tap. The link in every email turns reminders off straight away (no sign-in),
  plus `List-Unsubscribe` and `List-Unsubscribe-Post` headers so Gmail and Apple Mail show their own
  one-click button. The link keeps working indefinitely (the law asks for at least 30 days).
- Never more than one a day (a database rule, not just code), and never promotional (no Pro pitch in
  reminders).

**How:**
- A new hourly cron route `/api/cron/reminders` (added to `vercel.json`, checked with the existing
  `CRON_SECRET`) works out who is due:
  - streaks use `computeStreak` from `goal_days`, plus "any `xp_events` today" in the learner's own day;
  - league rank uses the same rule as `league_standings()`.
- Pure rules sit in `src/lib/reminders/` (who, which email, the text) and are unit tested.
- Emails go through Resend (`RESEND_API_KEY` is already in Production, so no new env var). Outside
  production, they're only ever sent to cybernettraining10@gmail.com; anyone else is a dry run.

**Tracking:**
- `reminder_sent`: one row per email.
- `reminder_opened`: a 1×1 image that marks the row. Apple Mail opens every image itself, so treat opens
  as a rough count.
- `reminder_returned`: the email's button goes through `/api/email/go`, which marks the row and
  redirects to the lesson (same-site only). This is the number to trust.
- All three are also sent as Vercel events, with the email kind as `source`.

**Database (add-only):**
- `profiles.reminder_emails boolean default false`, `profiles.reminder_consent_at timestamptz`, and
  `profiles.email_token uuid default gen_random_uuid()` (the unsubscribe key).
- New table `reminder_emails`: `id`, `user_id`, `kind` (`streak`/`league`), `day` (the learner's date),
  `key` (random), `sent_at`, `resend_id`, `opened_at`, `returned_at`. Unique on (`user_id`, `day`):
  one a day.
- Server-only (RLS on, no grants to learners).
- `check:rls` proves learners can't read or write any of it, and can't opt themselves in except through
  the Server Action.

**Privacy policy:** add the reminder emails, consent and the open/return tracking.

**Effort:** 2–3 days. **Moves:** day-2 return (24%), and second-week return.

## Part 2: challenge a friend (async duel)

**What:** after finishing a lesson, a signed-in learner taps **Challenge a friend**. They play a quick
quiz of up to 5 questions from that lesson (one try each, quiz rules), then get a link to share. The
friend opens it, with no account needed: "PacketPilot482 scored 4/5 on Phishing Emails. Can you beat
it?" They play the same questions. Two mascots face each other (the challenger's avatar outfit, and the
plain mascot for the friend). Health bars drop on wrong answers: the friend's after each answer, the
challenger's as each of their recorded answers is revealed. Then a short result screen (win, draw, or
"So close"), one preset emote, and "Sign up to save your score and challenge back".

**Safety:**
- **No free text anywhere.**
- Emotes are a fixed list: "GG", "Nice one", "Rematch?". Pro learners get animated ones ("On fire",
  "Wow", "Bring it"), checked on the server.
- The link and page show only the challenger's **username and avatar outfit**: never an email, a real
  name or anything else.
- Links are unguessable (random 12-character ids), expire after 30 days and aren't indexed
  (`noindex`, `robots.txt` disallows `/c/`).
- Attempts are capped per challenge (100) so a link can't be flooded.

**How:**
- `/challenge/new/[lesson]` (signed in, lesson finished, or "challenge back" from a challenge they played)
  picks up to 5 interactive core cards from the lesson (the later ones: the easy win and the twist).
- The server re-grades the answers with `src/cards/grading.ts`, stores the challenge and returns the
  link (Share sheet or Copy).
- `/c/[id]` is the friend's page. Answers are re-graded on the server. A guest's attempt key is kept on
  the device, so after signing up their score is claimed by the new account and "Challenge back" opens.
- The challenger sees each friend's score and emote on `/c/[id]` and in a "Challenges" row on `/account`.
- Cards in a challenge are shown to anyone with the link, like a teaser card (up to 5 cards of a lesson).

**Tracking:** `challenge_created`, `challenge_opened`, `challenge_completed`, `challenge_signup` (with
`lesson`).

**Database (add-only):**
- `challenges`: `id` text primary key, `creator_id`, `lesson_id`, `card_ids` text[], `results`
  boolean[], `score`, `created_at`, `expires_at`.
- `challenge_attempts`: `id`, `challenge_id`, `player_id` (null for guests), `key` (random), `results`,
  `score`, `emote`, `created_at`.
- Server-only. `check:rls` proves learners can't read or write either table.

**Effort:** 4–5 days. **Moves:** new visitors who arrive from a learner (`challenge_opened` per
`challenge_created`) and sign-ups from challenges (`challenge_signup`).

## Part 3: satisfaction boosts

**What:**
- **Combo:** from the 3rd card in a row right first time, the footer shows "3 in a row!" with a small
  flame (lucide `Flame`, amber, the one place a flame is used), then "4 in a row!", and so on. A wrong
  answer resets it quietly (no "combo lost").
- **Sound and haptics:** the correct sound gets a rising extra note as the combo grows (capped), and a
  light double buzz. Both follow the sound switch; under reduced motion nothing pops or buzzes.
- **End of lesson:**
  - XP counts up (already there), and the best combo shows if it reached 3.
  - When this lesson met today's goal, the streak grows on screen: the streak count ticks from N-1 to N
    and the node-chain icon grows and lights.
  - The mascot celebrates (already there).
  - **Decision for the owner:** the brand rules say the streak icon is a node chain and never a flame,
    so I kept the chain for streaks and used the flame only for combos. Switching streaks to a flame is
    a small change if you want it.

**How:** pure combo rules in `src/lib/combo.ts` (tested); `LessonRun` keeps the count for the visit;
`FeedbackFooter` shows the chip; `LessonComplete` shows the best combo and the streak growth; a new
`combo` sound in `src/lib/sound.ts`. **Database:** none. **Effort:** 1 day. **Moves:** lesson finish
rate (80%), cards per session, day-2 return.

## Part 4: content direction (plan only, waiting for the owner)

### Lessons without a real toy
A **toy** is something you play with that reacts live: a simulator, a model to train, a word predictor,
bits to flip, a terminal, a network to route through, a device to take apart. 27 of 52 lessons have
none (table at the end). The weakest 10, each with a proposed toy (Inside Your Devices is left out
because its rebuild is on the Mac branch):

| Lesson | Proposed toy |
|---|---|
| Spot the AI (AI) | Two machines get the same weird input (a green apple): the recipe-follower breaks, the one that learned from examples copes. Tap inputs and watch both. |
| Writing Good Prompts (AI) | Prompt builder: tap ingredients (who it's for, the task, a detail, the format) and watch a pre-written answer get better with each one. |
| How AI Makes Pictures (AI) | Noise to picture: drag a slider through the clean-up steps and watch a picture appear from static (pre-drawn frames). |
| Spotting AI Fakes (AI) | Magnifier: drag a lens over a drawn "AI photo" and tap the giveaways (hands, melted text, odd shadows). |
| Cloned Voices and Faces (AI) | Phone call simulator: a "family member" calls asking for money; asking the family code word reveals the fake. |
| Meet IPv6 (Internet) | Address counter: slide from 32 to 128 bits and watch the number of addresses grow (per person, per grain of sand). |
| HTTPS and the Padlock (Internet) | Café snooper: switch HTTPS on and off and watch what someone on the same Wi-Fi sees (readable vs scrambled). |
| TCP and UDP (Internet) | Lossy network: send a file and a video call over a network that drops packets; TCP waits and resends, UDP glitches but keeps going. |
| Scam Texts and Calls (Safe) | Inbox you clean up: report and block texts and watch the inbox empty; a scam caller's countdown shows the pressure trick. |
| Apps and Wi-Fi (Safe) | Permission switches: turn an app's permissions on and off and watch what it can see (your location dot, contacts, photos). |

### A one-line mission per course
- **Stay Safe Online:** "Become the person scammers give up on."
- **Inside Your Devices:** "Fix your own phone's problems before anyone else has to."
- **How AI Really Works:** "Know exactly when to trust AI, and when not to."
- **How the Internet Works:** "Follow one message from your thumb to a server and back."

### A daily 3-minute spaced review
- **What:** "Today's review": 3 cards from lessons you finished, picked by spaced repetition (a card
  comes back after 1, 3, 7, 16 and 35 days; a wrong answer sends it back to 1). Free accounts get the
  3-card review every day; Pro starts with their mistakes (the full Mistake review), then the due cards.
- **Rewards and reminders:** it pays practice XP toward the daily goal, so it keeps a streak alive in
  3 minutes. The streak reminder email can link straight to it ("Your 3-minute review is ready").
- **Database (add-only):** `review_cards` (`user_id`, `lesson_id`, `card_id`, `box` 1–5, `due_day`,
  `last_seen_at`), server-only.
- **Effort:** 2–3 days. **Moves:** day-2 and day-7 return, streak length.

## Content quality pass (owner, 7 Oct 2026)

**Why:** 85% first-try accuracy means most cards feel like reading checks. Learners should predict,
build and see consequences, not just recognise labels.

### 1. Audit: every card tagged
Every graded card gets one of four tags:
- **RECOGNISE:** pick or sort labels (multiple choice, true or false, fill the gap, match, sort, tap a
  part).
- **PREDICT:** guess before seeing (a "what happens if…?" question, or next-word "which word comes
  next").
- **BUILD:** make something (flip bits, type a value, put steps in order, label training examples).
- **CONSEQUENCE:** your action visibly changes something (simulators, teardowns, routes, terminals,
  scenarios, fixing a model, the temperature slider).

How the tags are set:
- Explainers, reveals, photos and explore cards are teaching, not counted.
- The tag comes from the card type and its prompt (`src/lib/content/play.ts`, pure and tested), and an
  optional `play` field on a card overrides it.
- `npx tsx scripts/play-audit.ts` writes `docs/plans/play-audit.md` (per lesson %, per course totals).

**Results, 7 Oct (core cards, lessons only):**

| Course | Recognise | Predict | Build | Consequence | Lessons meeting the target |
|---|---|---|---|---|---|
| Stay Safe Online | 47% | 2% | 4% | 47% | 1 of 10 |
| Inside Your Devices | 54% | 0% | 6% | 40% | 0 of 7 |
| How AI Really Works | 54% | 9% | 11% | 26% | 4 of 18 |
| How the Internet Works | 48% | 2% | 34% | 16% | 2 of 17 |

PREDICT is almost missing everywhere. That's the biggest gap.

### 2. Target and conversions
- **Target, per lesson:** at least one PREDICT, at least one BUILD or CONSEQUENCE, and RECOGNISE no more
  than half the graded cards.
- **Enforced in tests per course** once that course is converted (`PLAY_TARGET_COURSES` in
  `load.test.ts`), so it can't slip back.
- **Weakest cards first:**
  - A sort that only checks vocabulary becomes a sort with a visible consequence. A new `sort_bins`
    option, `scene`, shows a picture that changes as items move: an inbox that empties as scams go to
    Junk, a lock that closes as safe habits go in. It shows the result of the sort, not whether it's
    right; right and wrong still come only after Check.
  - A multiple choice that asks for a definition becomes a "what happens if…?" PREDICT with a reveal
    picture.
- **Order:** Stay Safe Online, How AI Really Works, How the Internet Works. Inside Your Devices waits
  for the Mac branch, which is rebuilding it.
- Each course goes through the whole-course gate, the fit audit and a beginner read, then merges on
  its own.

### 3. Worked example, then fade
For multi-step skills (binary, IP addresses, passwords), three cards in a row: one **solved** (the steps
shown and the answer filled in, tap through each step), one **half done** (the first steps filled in and
locked, finish it), then one **alone**. Built as an optional `worked` field on `binary_toggle` and
`numeric_input`: `steps` (short markdown lines) and `given` (how many steps or bits are already done
and locked). `worked.given = all` is the solved card (ungraded, like a reveal). Convert Bits and Binary,
Bytes and Hex, What Is an IP Address? and Strong Passwords.

### 4. Adaptive pacing
- **Skip the easy win:** cards can carry `pace: "easy"`. If the first 3 graded cards of a visit are all
  right first time, the next `easy` card is skipped. It's marked done with no XP, and the trace shows it
  as skipped.
- **One more example after a miss:** cards can carry `pace: "extra"`. An extra card is shown only
  straight after a wrong answer on the card before it (a second worked example), and is otherwise
  skipped.
- Neither kind is required for lesson completion, on the server (`authority.ts`) or in `state.ts`.
- Time estimates count `easy` cards but not `extra` ones.
- **Rule:** an `easy` or `extra` card never teaches a concept that a later card uses, since it may be
  skipped (enforced in `concepts.ts`).

### 5. Measure it
- Every graded card play records **time to first Check** and **right first time**, for guests and
  learners alike.
- Stored anonymously: no user id, just lesson, card, milliseconds, first-try result and the day.
- **Database (add-only):** table `card_plays`. Inserted by a route (`/api/card-plays`) with the secret
  key; capped per request and rate-limited globally like feedback.
- `npm run report:cards` lists the 10 slowest and 10 most-failed cards per course for the last 7 days.
  It reads production through `.env.production-checks`, never writes, and its summary goes in the
  handover each week.
- **Moves:** first-try accuracy should come down from 85% toward about 70–75% (challenging, not
  frustrating), while lesson finish stays at 80% or more.

## Appendix: per-lesson audit (7 Oct 2026, core graded cards)

| Course | Lesson | Toy | Recognise | Predict | Build | Consequence | Meets target |
|---|---|---|---|---|---|---|---|
| stay-safe-online | strong-passwords | yes | 0% | 25% | 0% | 75% | yes |
| stay-safe-online | two-step-sign-in | no | 20% | 0% | 20% | 60% | no |
| stay-safe-online | phishing-emails | no | 50% | 0% | 0% | 50% | no |
| stay-safe-online | scam-texts-and-calls | no | 75% | 0% | 0% | 25% | no |
| stay-safe-online | fake-websites | no | 50% | 0% | 0% | 50% | no |
| stay-safe-online | your-digital-footprint | no | 40% | 0% | 0% | 60% | no |
| stay-safe-online | apps-and-wi-fi | no | 60% | 0% | 0% | 40% | no |
| stay-safe-online | signs-of-a-hack | no | 50% | 0% | 17% | 33% | no |
| stay-safe-online | deepfake-scams | no | 40% | 0% | 0% | 60% | no |
| stay-safe-online | getting-help | no | 80% | 0% | 0% | 20% | no |
| inside-your-devices | whats-in-the-box | yes | 60% | 0% | 0% | 40% | no |
| inside-your-devices | memory-vs-storage | yes | 67% | 0% | 0% | 33% | no |
| inside-your-devices | meet-the-cpu | yes | 80% | 0% | 0% | 20% | no |
| inside-your-devices | meet-the-os | yes | 25% | 0% | 0% | 75% | no |
| inside-your-devices | files-and-folders | no | 60% | 0% | 20% | 20% | no |
| inside-your-devices | slow-and-full | yes | 20% | 0% | 20% | 60% | no |
| inside-your-devices | power-problems | yes | 60% | 0% | 0% | 40% | no |
| how-ai-really-works | spot-the-ai | no | 100% | 0% | 0% | 0% | no |
| how-ai-really-works | patterns-everywhere | yes | 25% | 0% | 50% | 25% | no |
| how-ai-really-works | what-ai-cant-do | no | 50% | 0% | 0% | 50% | no |
| how-ai-really-works | training-data | yes | 25% | 25% | 25% | 25% | yes |
| how-ai-really-works | testing-a-model | yes | 60% | 0% | 40% | 0% | no |
| how-ai-really-works | bias-in-bias-out | yes | 50% | 0% | 0% | 50% | no |
| how-ai-really-works | next-word-machines | yes | 20% | 40% | 40% | 0% | yes |
| how-ai-really-works | temperature | yes | 40% | 20% | 0% | 40% | yes |
| how-ai-really-works | made-up-answers | yes | 40% | 20% | 0% | 40% | yes |
| how-ai-really-works | writing-good-prompts | no | 80% | 0% | 0% | 20% | no |
| how-ai-really-works | checking-ais-work | no | 50% | 0% | 25% | 25% | no |
| how-ai-really-works | ai-tools-today | no | 40% | 20% | 0% | 40% | yes |
| how-ai-really-works | how-ai-makes-pictures | no | 60% | 20% | 20% | 0% | no |
| how-ai-really-works | cloned-voices-and-faces | no | 60% | 0% | 0% | 40% | no |
| how-ai-really-works | who-made-this | no | 75% | 0% | 0% | 25% | no |
| how-ai-really-works | spotting-ai-fakes | no | 80% | 0% | 0% | 20% | no |
| how-ai-really-works | what-not-to-share | no | 50% | 0% | 0% | 50% | no |
| how-ai-really-works | fair-and-honest-use | no | 75% | 0% | 0% | 25% | no |
| how-the-internet-works | bits-and-binary | yes | 0% | 0% | 100% | 0% | no |
| how-the-internet-works | bytes-file-sizes-and-hex | no | 20% | 0% | 80% | 0% | no |
| how-the-internet-works | what-is-an-ip-address | yes | 60% | 0% | 20% | 20% | no |
| how-the-internet-works | public-and-private-addresses | yes | 60% | 0% | 20% | 20% | no |
| how-the-internet-works | meet-ipv6 | no | 80% | 0% | 20% | 0% | no |
| how-the-internet-works | why-data-travels-in-packets | no | 40% | 20% | 40% | 0% | yes |
| how-the-internet-works | routers-and-hops | yes | 40% | 0% | 20% | 40% | no |
| how-the-internet-works | different-roads-same-destination | yes | 25% | 0% | 50% | 25% | no |
| how-the-internet-works | names-and-numbers | yes | 60% | 0% | 20% | 20% | no |
| how-the-internet-works | the-lookup-journey | yes | 40% | 0% | 40% | 20% | no |
| how-the-internet-works | dns-records-and-tools | yes | 60% | 0% | 20% | 20% | no |
| how-the-internet-works | ports | yes | 40% | 0% | 40% | 20% | no |
| how-the-internet-works | tcp-and-udp | no | 60% | 20% | 20% | 0% | no |
| how-the-internet-works | protocols-as-shared-rules | no | 50% | 0% | 50% | 0% | no |
| how-the-internet-works | http-requests-and-responses | yes | 60% | 0% | 20% | 20% | no |
| how-the-internet-works | https-and-the-padlock | no | 80% | 0% | 20% | 0% | no |
| how-the-internet-works | what-happens-when-you-type-a-url | yes | 20% | 0% | 20% | 60% | no |
