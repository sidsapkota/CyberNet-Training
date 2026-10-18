# Handover

Read this first in every session. It is replaced, not appended: git keeps the history.
Last updated: 19 October 2026 (evening).

## Report for Sid (19 October 2026)

### Shipped to production
- **`fix-spot-the-ai`** (main `ee9d6e2`). The full gate passed on staging: lint, typecheck, tests, build,
  design QA, `check:rls`, 18 staging e2e suites and the visual QA gate. Then I deployed it with your OK, and
  `npm run e2e:prod-checks` passed all 7 suites. Nothing else went to production.

### Ready for your OK (not merged)
- **`sso-module-1`:** Stay Safe Online module 1 to Blueprint v1.1. The six cards that ran past the bottom
  at 360×560 now fit: two explainers and two questions are shorter, and two quiz pictures are cropped.
  The fit audit passes at all 7 sizes, and nothing in module 1 scrolls on a phone. **Full gate:** GATE_SSO.
  Play: https://cyber-net-training-git-sso-module-1-sidsapkotas-projects.vercel.app/dev/lessons
- **`next-batch`** (Part C, staging only; builds on `sso-module-1`). **Don't ship until you've read the
  parent wording below.** **Gate:** GATE_NEXT.
  - **Home:** the big Continue is the first thing (before the name row and any notice; its picture is short on
    phones so the button is in view at 360×560). Today's bytes sit under it, with how many are left and Play.
  - **Feed:** finite. 3 bytes a day for everyone, then "That's today's bytes. Back tomorrow for 3 more." with
    "Next lesson: …" (guests also get "Create a free account to keep your XP"). The same 3 all day on a device;
    the server pays for 3 at most. The 15-minute break card is gone. The header says "1/3 today".
  - **Founder offer:** ends 30 Nov 2026, 11:59 pm AEDT, the same moment for everyone. /pro shows
    "First 50 learners only · Ends 30 Nov". After the end it hides everywhere and checkout refuses, with no switch.
  - **XP labels:** "XP total" in the header, "Total XP" on the dashboard and player cards, "XP this week" above
    the league table and on each row's screen-reader label, "XP last week" on the result screen, "XP earned" on
    quiz results.
  - **Send to a parent and /parents:** wording below.
- **`first-five`** (Step 2; builds on `next-batch`), in progress:
  - **Landing:** "Learn how tech works by playing with it. Free. For ages 13+.", then a live Stay Safe Online
    byte (lesson 1's password question), then one button into that lesson.
  - **The sign-up gate:** its buttons are in view on a phone.
  - **"Your mistakes" card:** shows the Pro price.
  - **The audit:** `docs/audit.md`, ranked by cost to sign-ups and sales. Per-course tables are in `docs/audit/`.
  - **A test** that keeps `/dev` pages out of production builds.

### Courses: ready for Sid to play
(Each gets the full gate first; preview links go here.)
| Course | Branch | Status |
|---|---|---|
| Stay Safe Online modules 2–4 | `sso-m2`, `sso-m3`, `sso-m4` → merged into `sso-rebuild` | building |
| How AI Really Works module 1 (Spot the AI) | `ai-rebuild` | building |
| How the Internet Works (plan + module 1) | `internet-rebuild` | building |
| Inside Your Devices | none | **blocked: the rebuild branch is only on the Mac** |

### Vercel: point previews at staging (you make these changes; I haven't touched Vercel)
Vercel → project → Settings → Environment Variables. For each variable below, if one entry covers
Production *and* Preview, edit it to **Production only**, then **Add** a new entry for **Preview** only with
the staging value (from the Supabase dashboard, `cybernet-staging` → Project Settings → API):
1. `NEXT_PUBLIC_SUPABASE_URL` = `https://sfacbjpgkbrqmteajmfl.supabase.co`
2. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = staging's publishable key (`sb_publishable_…`)
3. `SUPABASE_SECRET_KEY` = staging's secret key (`sb_secret_…`). Server-only; never a `NEXT_PUBLIC_` name.

Then also:
4. `ADMIN_USER_IDS` (Preview): remove it, or set it to the staging admin test account's id. Production user
   ids don't exist on staging.
5. `RESEND_API_KEY` (Preview): remove it. Outside production, reminders only ever go to the feedback inbox,
   but previews don't need email at all.
6. Leave as they are: the Stripe variables (Preview is already sandbox; live keys are refused outside
   production), `CRON_SECRET` (crons don't run on previews) and `PRO_LAUNCH_AT` (Production only).
7. **Redeploy** the open previews: `NEXT_PUBLIC_` values are baked in at build time.

**Not in Vercel, but needed for sign-in on previews:**
- In the Supabase dashboard for `cybernet-staging` → Authentication → URL Configuration, add
  `https://cyber-net-training-git-*-sidsapkotas-projects.vercel.app/**` to the redirect URLs.
- Google sign-in on previews needs the Google provider set up on staging too; the email code works without it.

### /dev/lessons on production
`https://cybernettraining.com/dev/lessons` returns **404** (checked 19 Oct, as do `/dev/cards`, `/dev/fit` and
`/dev/mascot`). The guarantee is `next.config.ts`:
```ts
const devRoutes = phase === PHASE_DEVELOPMENT_SERVER || process.env.VERCEL_ENV === "preview";
pageExtensions: devRoutes ? ["dev.tsx", "tsx", "ts", "jsx", "js"] : ["tsx", "ts", "jsx", "js"],
```
Every dev page is `page.dev.tsx`, so a production build never compiles it. The production build's route
list has no `/dev` routes. On `first-five`, `src/lib/devRoutes.test.ts` fails if a dev page uses another
extension, or if the config ever lets `dev.tsx` into a production build.

### Parent wording to approve (in `src/lib/pro/parentCopy.ts`; `parentCopy.test.ts` screens it for pressure words)
- **Link under every lifetime button** (was "Can't pay? Send it to a parent"): **Send the details to a parent**
- **Shown to the learner after making the link:** "This link opens a page for a parent or guardian: what
  CyberNet is, what Pro includes, the price and the terms. It works for 7 days and pays once."
- **Text sent with the link** (the adult reads it): "CyberNet Training is a website that teaches online safety and
  how technology works, for ages 13 and up. This page has what its Pro plan includes, the price and the refund
  terms:" + the link.
- **The parent's page (/pay):**
  - **Heading:** "CyberNet Pro: the details".
  - **Intro:** "[username] shared this page. CyberNet Training is a website with short, hands-on lessons on online
    safety and how technology works: passwords and scams, devices, the internet and AI. It's for ages 13 and up,
    and no experience is needed."
  - **What Pro includes:** Unlimited lessons every day · Review your mistakes · Certificates for every course · An
    extra streak freeze. Then: "Without Pro, every course stays free to use, with up to 3 new lessons a day."
  - **Price:** "One payment of A$29. It isn't a subscription: nothing renews and there are no further charges.
    Pro stays on the account for as long as CyberNet Training runs."
  - **Refunds:** "No refunds for a change of mind, except where the law requires one. Your rights under the
    Australian Consumer Law always apply. Questions: hello@cybernettraining.com."
  - **Link:** "Privacy and safety for parents and guardians" → /parents.
  - **Button:** "Pay A$29 with Stripe".
  - **Under it:** "No account needed. Stripe handles the payment and emails you the receipt; CyberNet never sees
    card details. See our Terms and Privacy policy."
  - **Removed:** "[username] asked you to get them…", "Lifetime Pro for [username]" and "securely".
- **/parents** ("For parents and guardians"; linked from /pay; in the sitemap):
  - **Intro:** the same as /pay.
  - **What's free:** the same line as /pay.
  - **What Pro includes:** the same list.
  - **Prices** (from Stripe): Monthly A$7.99 a month; Yearly A$59.99 a year; Lifetime (Founding Member, for
    the first 50 buyers, until 30 November 2026): the price line above.
  - **Cancelling and refunds:**
    - "The first subscription starts with a 7-day free trial; cancel before it ends and nothing is charged."
    - "Subscriptions renew automatically until cancelled. Cancel any time from the account page (Manage
      subscription): Pro stays until the end of the paid period, with no further charges."
    - "Deleting the account cancels any subscription straight away."
    - The refunds line.
  - **Privacy:**
    - "We keep an email address, a made-up username, learning progress and settings. No real names, photos or
      dates of birth."
    - "No ads, no tracking cookies, and we never sell or rent anyone's information."
    - "Card details go to Stripe, never to us."
  - **Safety:**
    - "Accounts are for ages 13 and up. Anyone can try a course's first lesson without an account."
    - "There's no chat, messaging or public profile. Usernames are checked so they can't be real names, contact
      details or rude words, and learners can hide from leaderboards."
    - "Reactions in friend challenges come from a fixed list: there's no free text anywhere."
    - "Reminder emails are off unless the learner turns them on."
    - "Lessons about getting help (after a scam or a hacked account) are always free."
  - **Contact:** hello@, with links to the Privacy policy and Terms.
- **Unchanged:** "Under 18? Ask a parent before buying." stays under the buy buttons. It's advice to the learner,
  not pressure on the adult; say if you want it reworded.

### Decisions I made (say if you'd like any changed)
1. **The Feed's 3 a day apply to guests too** (before, guests had 5 in total and then a sign-up card).
   - A guest's bytes that come across at sign-up: up to 9.
   - The landing byte counts as one of the day's 3.
   - A wrong answer counts as played on that device.
2. **Home for signed-in learners:** the name row, the Founding Member line and the one-time notices moved
   below Continue and today's bytes.
3. **The landing's first byte** is now Stay Safe Online's "pick the strongest password" (lesson 1's
   real-life card) instead of the AI robots, and its button goes into that lesson instead of the Feed. The
   Feed is a small link.
4. **The sign-up gate** dropped "Weekly leagues" (4 perks → 3) so the buttons fit on a phone; the mascot
   hides on screens under 700px tall.
5. **How the Internet Works:** the plan recommends making its free module about the internet itself and
   moving binary later. **That changes what's free, so it's yours to confirm** when you play it.
6. **Branch chain:** `sso-module-1` → `next-batch` → `first-five` → each course branch. Merging in that
   order keeps conflicts away; a course branch can't ship before the ones it builds on.

### Blocked / waiting on you
1. Your OK on `sso-module-1` (once GATE_SSO is in), and on `next-batch` after reading the parent wording.
2. The Vercel Preview changes above, and the staging redirect URL.
3. Inside Your Devices: push its rebuild branch from the Mac.
4. Still open: `ADMIN_USER_IDS` in Vercel Production.


## 0. Built 7 Oct while the owner was away

Plans: `docs/plans/retention-and-fun.md` (parts 1–4 + the content quality pass), `docs/plans/feed.md`, `docs/plans/admin.md`. Each part had its own branch and merged only after lint, typecheck, tests, build, design QA, its own e2e and `e2e:visual-qa:gate` passed on staging; the 7 production check suites passed after every merge. Add-only migrations went to production just before their code (each verified: RLS on, no learner grants), CLI linked back to staging after each.

| Part | Branch | Status |
|---|---|---|
| Visual QA gate (every page and card, phone/tablet/desktop) | `visual-qa` | LIVE `2220e08` |
| Satisfaction boosts: combo ("3 in a row!" + flame), streak grows at lesson end | `satisfaction-boosts` | LIVE `3c570ee` |
| Reminder emails (opt-in only) | `reminder-emails` | LIVE `aed04b2`; migration `20261011100000` on production; nobody opted in yet (existing accounts are off) |
| Challenge a friend (async duel, preset emotes) | `challenge-a-friend` | LIVE `3ac7f88`; migration `20261012100000` |
| Card measurements (anonymous time to first Check + first-try result) | `card-measure` | LIVE `81a0b49`; migration `20261013100000` |
| Content quality engine (play tags, adaptive pacing, worked examples) + Stay Safe Online converted (every lesson has a real PREDICT card) | `content-quality` | LIVE `24bb587` |
| The Feed (30 bytes, landing hero byte, Feed tab, video view) | `the-feed` | LIVE `279d4b5`, flag ON |
| Admin dashboard (`/admin`, read-only) | `admin-dashboard` | LIVE (merged 8 Oct); migration `20261014100000` on production; **waits for `ADMIN_USER_IDS` in Vercel** (section 3) |

- **Card report (weekly, `E2E_ENV_FILE=.env.production-checks npm run report:cards`):** measurements started 7 Oct; no cards have 5+ plays yet. Paste next week's slowest and most-failed cards here.
- **Content quality, next:** How AI Really Works (4/18 lessons meet the target), How the Internet Works (1/17), then Inside Your Devices (0/7, after the Mac branch). Worked examples (binary, IP addresses, passwords) and paced cards aren't used in content yet; the engine and `e2e:pacing` are ready.
- **Decision for the owner:** the combo uses a small amber flame; streaks keep the node-chain icon (brand rule). Say if you want streaks to become a flame too.

### 8 Oct (owner approved)

| Part | Branch | Status |
|---|---|---|
| Send to a parent (`/pay`) | `parent-link` | LIVE `9ac163e`; migration `20261010100000` on production (RLS on, no policies, no learner grants); 7/7 production suites passed |
| Reminder card for existing learners ("Want a reminder before your streak ends?") | `reminder-prompt` | LIVE (merged 8 Oct); no migration; the full gate and `e2e:reminders` 25/25 passed |
| /pro redesign (crowned mascot, one Pro box: Lifetime / Yearly / Monthly, Free vs Pro table), also on `/account/plan`; "Can't pay? Send it to a parent" under every lifetime button (/pro, paywall, daily limit) | `pro-redesign` | LIVE (merged 8 Oct, owner approved); full gate passed (`e2e:plans` 39, `e2e:founder` 66, `e2e:daily-limit`, `e2e:pro-declined`, visual QA); screenshots in `docs/plans/pro-redesign/` |

- **Staging leagues have been open since 6 Oct** (20+ test learners earned XP in one week, so they opened for good, as the rules say). E2e scripts that open the dashboard must call `closeLeaguesWelcome` (`scripts/e2e/lib/welcome.mjs`); `e2e:founder` and `e2e:reminders` now do.

### 18–19 Oct: Lesson Blueprint v1.1 (owner)

| Part | Branch | Status |
|---|---|---|
| Lesson Blueprint v1 in CLAUDE.md (replaces the 7-beat pattern and the 12-word rule; storyboard-first process; changelog), then v1.1 (Predict not scored, 3+ answers, one Try this wording) | `fix-spot-the-ai`, v1.1 on `sso-module-1` | waits for the gate (staging paused) |
| Bug fix: answers never shown before they're earned (multiple-choice reveal pictures only after a right answer; hotspot no longer marks missed parts), Spot the AI card 2's situation line, pictures fill the card with text at 14px+ on a phone (`pictureText.test.ts`) | `fix-spot-the-ai` | lint, typecheck, tests, build pass; **design QA and the visual QA gate wait for staging** (paused, see section 3) |
| Stay Safe Online storyboards (17 lessons + 4 quizzes; 7 splits) | `sso-storyboards` (and `sso-module-1`) | **approved 18 Oct with 3 changes, applied**: review page https://claude.ai/artifact/2QiqWDSdfk7i3raNT74xcv, built by `node scripts/storyboard-page.mjs stay-safe-online` from `docs/storyboards/stay-safe-online/` (`ORDER.json` holds the order and the decisions) |

| Stay Safe Online module 1 built to the storyboards (phase 1) | `sso-module-1` | **on staging, waiting for the owner** (morning report above); not merged |

- **Phase 2 (after the owner plays module 1 and staging is back):** the full gate on `sso-module-1` (design QA, the page half of the visual QA gate, `check:rls`), merge `fix-spot-the-ai` then `sso-module-1` with the owner's OK, then build modules 2–4 the same way (`docs/storyboards/stay-safe-online/build-kit.md` is the recipe; each module needs its scenes and features from the review page's "New things to build"). `scripts/lesson-length-report.mjs` still uses the old 12-word gate: update it for blueprint lessons when convenient (`shape.ts` already has `blueprintShapeProblems`).

## 1. Live on production (https://cybernettraining.com, branch `main`)

- Four courses at the right level: Stay Safe Online (Easy, "Start here"), Inside Your Devices (Easy), How AI Really Works (Medium), How the Internet Works (Hard). Levels (dots + word) and "For ages 13+. No experience needed." everywhere.
- Guests: each course's first lesson and the help module; everything else needs a free account (Google or a 6-digit email code; in-app browsers get the code and an "open in browser" tip).
- Free accounts: any lesson, 3 new lessons a day. CyberNet Pro (Stripe, live): unlimited lessons, Mistake review, certificates, an extra streak freeze; 7-day trial with a reminder email. One-screen `ProPitch`; "What's stopping you?" once a week per device.
- Plans (/pro, /account/plan; `/pricing` now redirects to /pro), Pro identity, no upgrade prompts for members.
- Lesson player: one Check flow, Try again keeps what's right, Back/forward, Listen, Hint, bonus cards, mascot reactions, `lesson_quit`.
- Usernames, avatars v2, daily goals and streaks, certificates, dashboard numbers, course thumbnails (one colour per course).
- **Leagues are LIVE (opened on production 4 Oct, ~10:58 Sydney, `league_state.opened_at` set manually — only 14 of the auto-open threshold of 20 were active that week, so it was forced open on the owner's instruction).** First week was `2026-09-28` (one Packet league). Finalisation runs via the hourly Vercel cron (`/api/cron/leagues`, `5 * * * *`, confirmed firing with 200s). First week-end: Mon 5 Oct 00:00 AEDT = Sun 4 Oct **13:00 UTC** (DST started 4 Oct; all week-boundary maths uses the `Australia/Sydney` named zone, verified — the first week spans the +10→+11 change and lands correctly). Staging mirror `cybernet-staging` has a full rehearsal: `npm run e2e:leagues-rehearsal` (17 checks — finalise a 14-player week via the real cron, promotions, idempotency, reconcile places unplaced earners incl. username generation, next-week fill, 0-XP /leagues). Needs a `CRON_SECRET` in `.env.local` (any ≥16 chars locally).
- **Placement reliability fix (merged 4 Oct):** `onXpEarned` places learners via `after()`, which Vercel can drop — on launch day 6 of 20 active learners were unplaced. Fix: `reconcileCurrentWeek()` in the hourly cron places any current-week XP-earner who isn't a member yet (self-healing within the hour; `placeInWeek` is now shared by it and `onXpEarned`). The 5 unplaced-with-a-username were backfilled by hand on 4 Oct; the 6th (no username) is placed by the cron (which generates one).
- **League XP fix (Finding B, merged and live 6 Oct, `1465fd5`):** weekly league XP leaves out practice (`league_standings()` via `20261008100000_league_xp_no_practice.sql`, and `weeklyXp` in `server.ts`), and "Reset progress" (all, or one lesson) clears the matching `xp_events` while `goal_days` keeps the streak. Closes the reset-and-replay exploit; weekly ≤ total is now an invariant. `npm run e2e:league-xp` (staging only) proves it, and fails on the old code. Production before/after (week of 5 Oct): TurboSocket837 365 → 360 (5 practice XP; total 360, was over), RapidPhoton471 10 → 10; ranks unchanged. Rollback: re-run the `league_standings()` body from `20261006100000_avatar_outfits.sql` (without the drop).
- **Leagues moments (merged 3 Oct):** a one-time full-screen "Leagues are open!" celebration (`LeaguesOpening`, dashboard only — pathname `/` — and once per device; shows for future learners too, so a brand-new learner meets it on their first dashboard visit); live rank on `/leagues` (`LeaguesView` polls each minute, rows animate with `motion` layout, aria-live "You moved up to #N"); and a small "You moved up to #N" moment on the lesson-complete screen (`LeagueRankMoment`, compares against the rank stored per device at the last finished lesson). All leagues-open only, signed-in only, reduced-motion safe; pure rules in `src/lib/leagues/opening.ts` + `rankMoment.ts` (tested). `npm run e2e:leagues` (8 checks: all moments + a live rank rise with no reload, seeds and cleans up a throwaway league on staging, production-guarded) and `e2e:design-qa` now covers `/leagues` signed in (staging only). Fixed the leaderboards toggle to a 44px tap target (also on `/account`). **Known pre-existing (not leagues):** the desktop signed-in header account link is 40px tall (<44) on every signed-in page.
- **Prior knowledge only (merged 2 Oct):** every card is tagged with what it `teaches` and `uses`; `concepts.test.ts` fails if a question needs something not taught earlier (`npx tsx scripts/check-concepts.ts [course]`). 42 problems fixed, all four courses; worst-first list in `docs/plans/prior-knowledge-audit.md`. Bits and Binary: the IP question moved to What Is an IP Address?, card 7 (was 8) asks about a byte with 10 bits.
- **Every option on screen (merged 2 Oct):** `npm run e2e:fit-audit` fails if any control needs scrolling at 360×640 or 360×560; all 614 cards pass. Layout changes (phones only) and shorter content; every content cut is listed in `content/REVIEW.md`; the rules are in CLAUDE.md (simulator controls on list rows, short-screen question size, packet path, 3-bin sorts).
- **Lesson pattern rollout (in progress, owner 3–5 Oct):** every lesson rebuilt to open on an interactive **picture-first "Watch"** (tap/drag/predict/sort/scene/simulator — never an explainer), ≤2 explainers (Name it + recap), read-to-answer cards cut, every question **≤12 words** (a quoted scam message doesn't count) and every feedback **≤2 lines**, and a **"Next:" tease** as the recap's last line (a trailing paragraph, not a 4th bullet). Pattern + gates in CLAUDE.md "The lesson pattern"; scoreboard `docs/plans/lesson-pattern-audit.md` (re-run `node scripts/lesson-pattern-audit.mjs`); length gate `node scripts/lesson-length-report.mjs <course-id> [module-id]`. **Done & live:** the "Spot the AI" pilot (How AI Really Works) and **all 10 Stay Safe Online lessons** (merged 5 Oct, `329c917`; whole-course gate + `e2e:fit-audit` 115/115 at 360×640 and 360×560; help lessons kept calm with help lines verbatim in core cards). **Next: Inside Your Devices** (show 3 samples first).
- **Simulator hotfix (6 Oct, branch `hotfix-simulator-desktop`):** the Power Problems battery simulator broke at tablet and desktop widths (switches drawn over their labels): the phone-only two-column switch grid leaked into wider screens (`[&>div]:col-span-2` beat the `sm:` reset). The grid is now `max-sm:` only; the card's prompt is "Make the battery last 8 hours with music on."; simulator list labels and word-vote messages wrap instead of being cut off; beside a list the device shows only its status at every size. **The fit audit now runs every card at 7 sizes (phone, tablet 768, desktop 1280/1440/1920) and fails on broken layouts** (`scripts/e2e/lib/layout.mjs`: spill, overlap, truncation, doubled controls, sideways scroll), not only on hidden controls.
- **Generated usernames aren't picks (merged and live 6 Oct, `ab291fe`):** pages that only read league data never generate or save a username (`ensurePlayer` modes read / row / place); a name the app makes up sets `profiles.username_generated` (`20261009100000`, on production), and the learner's first real pick is free (no 30-day lock); sign-in still sends them to "Pick a username". Repair skipped: 0 affected. Also: a new Pro member no longer gets the Pro welcome and "Leagues are open!" stacked (the leagues one waits, `useProWelcomeDue`).
- **Visual QA gate (merged 7 Oct, branch `visual-qa`):** `npm run e2e:visual-qa:gate` runs before every merge (staging only): every page, guest and signed in, light and dark, plus every card of every lesson and quiz, at 360x560, 768x1024 and 1440x900, failing on overlap, cut-off text, spill, doubled controls, sideways scroll, broken images, console errors and 404 links. `npm run e2e:visual-qa` is the full sweep (6 sizes) and rewrites the contact sheets in `docs/plans/visual-qa/` (one phone and one desktop sheet per course, plus the pages). The first sweep found and fixed: the tablet header (768–1023px: the logo's words ran under "Dashboard" and the page scrolled sideways; the logo is now just the tile there and the username shows from 1024px), course-card descriptions, the account email and the avatar line cut off with "…" (they wrap now), and `/dev/fit` hydration noise. Cards were already clean after the simulator hotfix.
- **Founder funnel fixes (merged and live 6 Oct, `16028da`):** step events `founder_signup_wall`, `founder_checkout_created`, `founder_checkout_error` (with a reason code), "See it" on the dashboard line sends `founder_line_opened` (no longer counted as `founder_clicked`), guests come back to /pro after sign-in with a one-tap "continue to checkout", the 13+ check is asked right on the button, and errors are friendly with Try again.
- **Production checks:** `npm run e2e:prod-checks` (7 suites against the live site, using `.env.production-checks`, a git-ignored file with only the production Supabase URL, publishable key and secret key). All e2e scripts read settings through `scripts/e2e/lib/env.mjs`, which refuses to mix the live site with staging keys or a local server with production keys.
- Feedback form emails cybernettraining10@gmail.com (`FEEDBACK_INBOX`). Functions run in syd1. Help lines verified.
- **Spot the AI fix (live 19 Oct, `ee9d6e2`):** answers never show before they are earned (every card type), Spot the AI card 2 has its situation line and a readable picture, and Lesson Blueprint v1 is in CLAUDE.md. The full staging gate and the 7 production suites passed.

## 2. Founding Member (merged 2 Oct; the offer is ON in production since about 5 Oct)

One payment (A$29, `STRIPE_PRICE_FOUNDER`) for lifetime Pro, first 50 buyers; `FOUNDER_OFFER=on` is set in Vercel Production (0 seats sold as of 6 Oct). **Funnel problem reported 6 Oct** (6 `founder_clicked`, 1 reached Checkout): see section 3. Details and owner steps: `docs/plans/founding-member.md`; CLAUDE.md "Founding Member".
- Built: seat holds during Checkout, webhook claim (`checkout.session.completed`) and `/pro/welcome` sync, full refund (`charge.refunded`) ends Pro and frees the seat, real counter, copy from live prices ("Lifetime Pro for A$29, less than 4 months of the monthly plan" / "A year of monthly is A$95.88. This is A$29, once."), offer first on /pro, main button on the paywall and daily-limit screens, one dismissible dashboard line, badge (dashboard, account, Your plan, player cards, leaderboard rows), events `founder_viewed` / `founder_clicked` / `founder_purchased`, terms and privacy sections.
- **Already live without the flag:** the parent pitch ("Teach your kid to spot scams before they meet one.", Stay Safe Online, "Buying for your kid?") on /pro and the landing page, `/pricing`, and the new terms/privacy wording.
- Database: `20261007100000_founding_members.sql` applied (add-only; `check:rls` 113/113).
- Tested: unit tests, `e2e:founder` (36 checks, screenshots in `.e2e-shots/founder/`, standing in for the founder API while the flag is off), all gates. **Not tested: a real Stripe Checkout payment** (no founding price exists in the Stripe sandbox, and creating one was off limits).

## 3. Waiting on the owner

0. **Unpause staging:** Supabase paused `cybernet-staging` after about 10 idle days (`npx supabase projects list` shows INACTIVE; its URL doesn't resolve). Press **Restore project** in the Supabase dashboard. Every e2e script and the visual QA gate need it. Free projects pause after a week idle: run any e2e at least weekly to keep it awake.
0. **Stay Safe Online module 1:** play it on the preview (morning report) and say what to change, then whether to merge.

0. **Admin dashboard: add `ADMIN_USER_IDS = cf5b0efc-1c8f-490c-b90d-a1ca081b16e8` in Vercel → project → Settings → Environment Variables, Production only, then redeploy.** Until then `/admin` is a 404 for everyone, you included. Sign in again if your last sign-in is over 12 hours old.
0. **IYD rollout branch:** `rollout-inside-your-devices` (`9c562b7`, the 3 approved samples) isn't on GitHub. Push it from the Mac (`git push -u origin rollout-inside-your-devices`) to continue on Windows. **It also rebuilt Power Problems: when it arrives, merge `main` into it first** so it gets the 6 Oct simulator hotfix (`SimulatorCardView.tsx`, the battery card's prompt) and the 7-size fit audit, and re-run `npm run e2e:fit-audit COURSE=inside-your-devices`. **Seven Feed bytes point at Inside Your Devices cards** (`content/bytes/bytes.json`: phone-ram-swap, apps-need-ram, download-needs-storage, still-there-after-off, more-ghz-more-steps, blanket-slows-it, swollen-battery): if the rebuild removes any of those card ids, `feed.test.ts` fails; re-point the bytes (compact cards that fit 360×560) and run `npm run e2e:feed`.
0. **`.env.local` on Windows** points at staging with the Stripe test key, but holds the **live** price ids, so `/pro` can't read prices locally (start the dev server with the sandbox `STRIPE_PRICE_MONTHLY`/`STRIPE_PRICE_ANNUAL` set in the shell, or fix the file).

1. **Founding Member:** (a) in the Stripe *sandbox*, create a one-off A$29 price, put it and `FOUNDER_OFFER=on` in `.env.local`, run `stripe listen --forward-to localhost:3000/api/stripe/webhook`, then buy as a throwaway learner with card 4242 4242 4242 4242 (Pro, badge, counter −1, offer gone, refund in the dashboard puts it back); (b) to go live, add `FOUNDER_OFFER=on` to Vercel **Production** and redeploy (remove it to stop the offer); (c) bank-debit payment methods would need `checkout.session.async_payment_succeeded` on the webhook (or keep instant methods only).
2. **Optional, for new machines:** add Development values in Vercel (Supabase URL, publishable key, secret key, Stripe *sandbox* keys and prices; never live keys) so `vercel env pull` works. Today Vercel has no Development variables (see section 6).
3. `docs/plans/what-really-happens.md`: approved plan for a new Medium course; the build waits for you.
4. Drop the unused `profiles.display_name`, `profiles.avatar` and `league_players.handle*` columns (a drop: needs your OK on the SQL).
5. Recheck AI lesson 4.3 (product names) by 1 January 2027; an adult or lawyer to review `content/legal/`; playtest with real learners.
6. On hold: the Pro streak-freeze feature and a family plan. **A family-interest line is live on /pro** (merged 3 Oct): one quiet line in the parent section, "Want Pro for your family or household? Email us…" (mailto to `FEEDBACK_INBOX`, subject "Family plan"), with a `family_interest` analytics event on click — gauging demand before building a real family plan. Watch the Events panel and the inbox.

## 4. Rollout — lesson pattern (owner, 3 Oct), in order

Stay Safe Online (done, merged 5 Oct) → **Inside Your Devices (next)** → How AI Really Works → How the Internet Works. One branch per course; rebuild every lesson to the pattern (CLAUDE.md "The lesson pattern"), then pass the whole-course gate + `npm run e2e:fit-audit` (COURSE=…) + `npx tsx scripts/check-concepts.ts <course>` + `node scripts/lesson-length-report.mjs <course>`, and **show the owner 3 sample lessons before each course merges**. Scoreboard: `docs/plans/lesson-pattern-audit.md`. (This supersedes the earlier 2 Oct zero-confusion rollout order; the playbook, `LEARN_FIRST_MODULES` and the beginner audit still apply.)

## 5. Decisions (not in CLAUDE.md or REVIEW.md)

- Every task on its own branch from `main`; merge only when lint, typecheck, tests, build, design QA and `e2e:visual-qa:gate` pass; production checks after each merge, roll back on failure. Show migration SQL before applying it (add-only migrations with RLS and `check:rls` were allowed while the owner was away). Never ask for secrets. Never change Stripe settings, products, webhooks or Vercel env vars without the owner.
- `lesson_quit` data is still tiny: a hint, not proof.

## 6. Setting up on a new machine (Mac)

1. Install Node 24 (`brew install node@24` or nodenv), Git, and the Stripe CLI if you'll test payments (`brew install stripe/stripe-cli/stripe`).
2. `git clone https://github.com/sidsapkota/CyberNet-Training.git && cd CyberNet-Training && npm install`
3. **Environment (`.env.local`):** the names are in `.env.example`.
   - `vercel link` (choose the CyberNet Training project) then `vercel env pull .env.local` only works once Development values exist in Vercel. **Today there are none**, and the Production values are Sensitive (they can't be pulled), so the pull gives you an empty file.
   - So, for now, either copy `.env.local` from the Windows PC privately (AirDrop, a password manager; never email, chat or git), or rebuild it: Supabase → Project Settings → API keys (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`); Stripe dashboard in **sandbox/test mode** (`STRIPE_SECRET_KEY` sk_test_…, the two test price ids, and `STRIPE_WEBHOOK_SECRET` from `stripe listen`). `RESEND_API_KEY` and `CRON_SECRET` aren't needed locally. Never put live Stripe keys in `.env.local` (the app refuses them outside production).
   - Without any env file the app still runs guest-only, which is enough for content work.
4. `npm run dev` → http://localhost:3000 (cards playground at /dev/cards). Before merging: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run e2e:design-qa` (with the dev server running; Playwright scripts use an installed Chrome: `E2E_BROWSER=chrome` on a Mac).
5. Supabase CLI (migrations, types, `check:rls`): `npx supabase login`, then `npx supabase link --project-ref sfacbjpgkbrqmteajmfl` (**staging**; link production only for a change the owner has approved, then link back).
6. **Staging Supabase** (`cybernet-staging`, ref `sfacbjpgkbrqmteajmfl`, same org/region as production): a separate project with no real users, created 2 Oct and set up 3 Oct, `check:rls` 113/113. **Its migration history was tidied on 6 Oct** (the stray versions marked reverted, every repo migration marked applied after checking each one's objects), so `npx supabase db push --linked` works there; all 19 migrations are applied. The Windows CLI is linked to staging. **Anything aimed at production needs the owner's explicit say-so.** Point `.env.local` at it (with Stripe **test** keys) to run signed-in e2e suites that write data — `e2e:leagues` and the signed-in `/leagues` pass of `e2e:design-qa` **require** staging and refuse to run against production (`qyjmowpkdcunkfitbwca`). Production stays the only place for the live site; never seed league data or open `league_state` there.

## 7. Gotchas

- **Previews can't run signed-in checks** (`SUPABASE_SECRET_KEY` is Production only). Run design QA, Back/Listen and mascot against a dev server, and the signed-in suites against a local production build (`npx next start -p 3200`).
- **Run the dev server detached on Windows** (`Start-Process` from PowerShell): a dev server started as a tool background task gets killed mid-run and leaves an orphan node process that answers 500 ("Jest worker…"). Kill it and restart before trusting a run.
- **Worktrees:** parallel branches used `git worktree` folders with a `node_modules` junction (`mklink /J`). Before `git worktree remove`, unlink the junction from Git Bash with `cmd //c "rmdir C:\\path\\node_modules"` (removes only the link) and check the real `node_modules` is still there; PowerShell blocks `cmd /c rmdir` as a protected-path delete. Worktree dev servers need `next dev --webpack` (Turbopack can't follow the junction).
- **`WEBSITE-CONTENT-FOR-AI.md` after a build** shows as modified (line endings only); `git checkout -- WEBSITE-CONTENT-FOR-AI.md` before switching branches.
- **Local `.env.local`** now also holds `ADMIN_USER_IDS` = the staging admin test account (admin-e2e@example.com), for `e2e:admin`. Never put a production id there.
- **The dev server's first request** after an idle spell sometimes 500s ("Unexpected end of JSON input" inside Next's handler); the e2e scripts reload once. It's dev-only.
- **Test dates:** seed "n days ago" by calendar day in the learner's time zone, never by subtracting 24-hour steps: Sydney's daylight-saving days have 23 or 25 hours, so 24-hour steps skip a date in the hour after midnight (it broke `e2e:rewards` on 8 Oct; fixed).
- **Scratchpad launchers** (`dev.cmd`, `fullgate.cmd`) live in the session scratchpad, which can be cleaned between sessions; recreate them from this file's description if missing (`fullgate.cmd <name> [npm scripts...]` runs lint, typecheck, vitest, build, design QA, the extras, then the visual QA gate, logging `STEP <name> <code>`).
- **Stale servers:** on Windows a stopped background `next start` can leave its node process running; it then serves (and re-caches) pages from the old build. Free the port (`netstat -ano`, `Stop-Process`) and rebuild before trusting a run.
- **Turbopack won't follow a `node_modules` junction** in a second worktree (`next dev --webpack` works, or check the branch out in a worktree with real `node_modules`).
- **Vercel's security checkpoint** once challenged this machine after many automated runs: check `X-Vercel-Mitigated` before rolling back.
- **Previews share the production database.** Never leave test leagues or `league_state` open. `check:rls` briefly fills the founding seats with holds (seconds; real buyers would be refused for that moment once the offer is on).
- **Live Stripe keys are in Production only.** Never click a plan button on production.
- **Windows editing:** files are CRLF; Node string replaces must normalise line endings. Bash heredocs break on apostrophes: write scripts with the editor.
- **One working copy:** `C:\Users\siddh\Documents\CyberNet Training App` (`.env.local` = staging; CLI linked to staging). The old worktrees `C:\cnf`, `C:\cnp` and `C:\cnwt` were deleted on 6 Oct (owner's OK). Remove `node_modules` junctions with `cmd /c rmdir`, never `Remove-Item -Recurse`.
- **Content:** never rename or reuse a lesson or card id; run `npm run export:content` after content changes (rewrites `WEBSITE-CONTENT-FOR-AI.md`; a test fails if stale).
- **Deploy status:** `https://api.github.com/repos/sidsapkota/CyberNet-Training/commits/<sha>/statuses`.
