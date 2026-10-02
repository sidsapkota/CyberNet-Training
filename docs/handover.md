# Handover

Read this first in every session. It is replaced, not appended: git keeps the history.
Last updated: 2 October 2026 (end of the day).

## 1. Live on production (https://cybernettraining.com, branch `main`)

- Four courses at the right level: Stay Safe Online (Easy, "Start here"), Inside Your Devices (Easy), How AI Really Works (Medium), How the Internet Works (Hard). Levels (dots + word) and "For ages 13+. No experience needed." everywhere.
- Guests: each course's first lesson and the help module; everything else needs a free account (Google or a 6-digit email code; in-app browsers get the code and an "open in browser" tip).
- Free accounts: any lesson, 3 new lessons a day. CyberNet Pro (Stripe, live): unlimited lessons, Mistake review, certificates, an extra streak freeze; 7-day trial with a reminder email. One-screen `ProPitch`; "What's stopping you?" once a week per device.
- Plans (/pro, /account/plan; `/pricing` now redirects to /pro), Pro identity, no upgrade prompts for members.
- Lesson player: one Check flow, Try again keeps what's right, Back/forward, Listen, Hint, bonus cards, mascot reactions, `lesson_quit`.
- Usernames, avatars v2, daily goals and streaks, leagues (hidden until 20 learners earn XP in a week), certificates, dashboard numbers, course thumbnails (one colour per course).
- **Prior knowledge only (merged 2 Oct):** every card is tagged with what it `teaches` and `uses`; `concepts.test.ts` fails if a question needs something not taught earlier (`npx tsx scripts/check-concepts.ts [course]`). 42 problems fixed, all four courses; worst-first list in `docs/plans/prior-knowledge-audit.md`. Bits and Binary: the IP question moved to What Is an IP Address?, card 7 (was 8) asks about a byte with 10 bits.
- **Every option on screen (merged 2 Oct):** `npm run e2e:fit-audit` fails if any control needs scrolling at 360×640 or 360×560; all 614 cards pass. Layout changes (phones only) and shorter content; every content cut is listed in `content/REVIEW.md`; the rules are in CLAUDE.md (simulator controls on list rows, short-screen question size, packet path, 3-bin sorts).
- Feedback form emails cybernettraining10@gmail.com (`FEEDBACK_INBOX`). Functions run in syd1. Help lines verified.

## 2. Behind a flag: Founding Member (merged 2 Oct, OFF in production)

One payment (A$29, `STRIPE_PRICE_FOUNDER`, already in Vercel Production) for lifetime Pro, first 50 buyers. All the code is live but hidden: `/api/pro/founder` answers `null` until **`FOUNDER_OFFER=on`** is set. Details and owner steps: `docs/plans/founding-member.md`; CLAUDE.md "Founding Member".
- Built: seat holds during Checkout, webhook claim (`checkout.session.completed`) and `/pro/welcome` sync, full refund (`charge.refunded`) ends Pro and frees the seat, real counter, copy from live prices ("Lifetime Pro for A$29, less than 4 months of the monthly plan" / "A year of monthly is A$95.88. This is A$29, once."), offer first on /pro, main button on the paywall and daily-limit screens, one dismissible dashboard line, badge (dashboard, account, Your plan, player cards, leaderboard rows), events `founder_viewed` / `founder_clicked` / `founder_purchased`, terms and privacy sections.
- **Already live without the flag:** the parent pitch ("Teach your kid to spot scams before they meet one.", Stay Safe Online, "Buying for your kid?") on /pro and the landing page, `/pricing`, and the new terms/privacy wording.
- Database: `20261007100000_founding_members.sql` applied (add-only; `check:rls` 113/113).
- Tested: unit tests, `e2e:founder` (36 checks, screenshots in `.e2e-shots/founder/`, standing in for the founder API while the flag is off), all gates. **Not tested: a real Stripe Checkout payment** (no founding price exists in the Stripe sandbox, and creating one was off limits).

## 3. Waiting on the owner

1. **Founding Member:** (a) in the Stripe *sandbox*, create a one-off A$29 price, put it and `FOUNDER_OFFER=on` in `.env.local`, run `stripe listen --forward-to localhost:3000/api/stripe/webhook`, then buy as a throwaway learner with card 4242 4242 4242 4242 (Pro, badge, counter −1, offer gone, refund in the dashboard puts it back); (b) to go live, add `FOUNDER_OFFER=on` to Vercel **Production** and redeploy (remove it to stop the offer); (c) bank-debit payment methods would need `checkout.session.async_payment_succeeded` on the webhook (or keep instant methods only).
2. **Optional, for new machines:** add Development values in Vercel (Supabase URL, publishable key, secret key, Stripe *sandbox* keys and prices; never live keys) so `vercel env pull` works. Today Vercel has no Development variables (see section 6).
3. `docs/plans/what-really-happens.md`: approved plan for a new Medium course; the build waits for you.
4. Drop the unused `profiles.display_name`, `profiles.avatar` and `league_players.handle*` columns (a drop: needs your OK on the SQL).
5. Recheck AI lesson 4.3 (product names) by 1 January 2027; an adult or lawyer to review `content/legal/`; playtest with real learners.
6. On hold: the Pro streak-freeze feature and a family plan.

## 4. Rollout (owner, 2 Oct), in order

Stay Safe Online (live) → **How AI Really Works (next)** → How the Internet Works → the rest of Inside Your Devices. Each course: `LEARN_FIRST_MODULES` in `src/lib/content/shape.ts`, the playbook, `docs/plans/zero-confusion-audit.md`, one short question per card, every card fitting 360×560 (the fit audit now enforces it), a beginner audit, merge when checks pass.

## 5. Decisions (not in CLAUDE.md or REVIEW.md)

- Every task on its own branch from `main`; merge only when lint, typecheck, tests, build and design QA pass; production checks after each merge, roll back on failure. Show migration SQL before applying it (add-only migrations with RLS and `check:rls` were allowed while the owner was away). Never ask for secrets. Never change Stripe settings, products, webhooks or Vercel env vars without the owner.
- `lesson_quit` data is still tiny: a hint, not proof.

## 6. Setting up on a new machine (Mac)

1. Install Node 24 (`brew install node@24` or nodenv), Git, and the Stripe CLI if you'll test payments (`brew install stripe/stripe-cli/stripe`).
2. `git clone https://github.com/sidsapkota/CyberNet-Training.git && cd CyberNet-Training && npm install`
3. **Environment (`.env.local`):** the names are in `.env.example`.
   - `vercel link` (choose the CyberNet Training project) then `vercel env pull .env.local` only works once Development values exist in Vercel. **Today there are none**, and the Production values are Sensitive (they can't be pulled), so the pull gives you an empty file.
   - So, for now, either copy `.env.local` from the Windows PC privately (AirDrop, a password manager; never email, chat or git), or rebuild it: Supabase → Project Settings → API keys (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`); Stripe dashboard in **sandbox/test mode** (`STRIPE_SECRET_KEY` sk_test_…, the two test price ids, and `STRIPE_WEBHOOK_SECRET` from `stripe listen`). `RESEND_API_KEY` and `CRON_SECRET` aren't needed locally. Never put live Stripe keys in `.env.local` (the app refuses them outside production).
   - Without any env file the app still runs guest-only, which is enough for content work.
4. `npm run dev` → http://localhost:3000 (cards playground at /dev/cards). Before merging: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run e2e:design-qa` (with the dev server running; Playwright scripts use an installed Chrome: `E2E_BROWSER=chrome` on a Mac).
5. Supabase CLI (migrations, types, `check:rls`): `npx supabase login`, then `npx supabase link --project-ref qyjmowpkdcunkfitbwca`.

## 7. Gotchas

- **Previews can't run signed-in checks** (`SUPABASE_SECRET_KEY` is Production only). Run design QA, Back/Listen and mascot against a dev server, and the signed-in suites against a local production build (`npx next start -p 3200`).
- **Stale servers:** on Windows a stopped background `next start` can leave its node process running; it then serves (and re-caches) pages from the old build. Free the port (`netstat -ano`, `Stop-Process`) and rebuild before trusting a run.
- **Turbopack won't follow a `node_modules` junction** in a second worktree (`next dev --webpack` works, or check the branch out in a worktree with real `node_modules`).
- **Vercel's security checkpoint** once challenged this machine after many automated runs: check `X-Vercel-Mitigated` before rolling back.
- **Previews share the production database.** Never leave test leagues or `league_state` open. `check:rls` briefly fills the founding seats with holds (seconds; real buyers would be refused for that moment once the offer is on).
- **Live Stripe keys are in Production only.** Never click a plan button on production.
- **Windows editing:** files are CRLF; Node string replaces must normalise line endings. Bash heredocs break on apostrophes: write scripts with the editor.
- **Worktrees:** `C:\cnf` (dev server 3002), `C:\cnp` (old pilot), `C:\cnwt` (old uncommitted SSO edits; leave it). Remove `node_modules` junctions with `cmd /c rmdir`, never `Remove-Item -Recurse`.
- **Content:** never rename or reuse a lesson or card id; run `npm run export:content` after content changes (rewrites `WEBSITE-CONTENT-FOR-AI.md`; a test fails if stale).
- **Deploy status:** `https://api.github.com/repos/sidsapkota/CyberNet-Training/commits/<sha>/statuses`.
