# Handover

Read this first in every session. It is replaced, not appended: git keeps the history.
Last updated: 2 October 2026.

## 1. Live on production (https://cybernettraining.com, branch `main`)

- Four courses at the right level: Stay Safe Online (Easy, "Start here"), Inside Your Devices (Easy), How AI Really Works (Medium), How the Internet Works (Hard). Levels (dots + word) and "For ages 13+. No experience needed." everywhere.
- Guests: each course's first lesson and the help module; everything else needs a free account (Google or a 6-digit email code; in-app browsers get the code and an "open in browser" tip).
- Free accounts: any lesson, 3 new lessons a day. CyberNet Pro (Stripe, live): unlimited lessons, Mistake review, certificates, an extra streak freeze; 7-day trial with a reminder email 3 days before it ends. One-screen `ProPitch`; "Not now" asks "What's stopping you?" once a week per device (`pro_declined`).
- Plans (/pro, /account/plan), Pro identity (node frame, badge, welcome moment), no upgrade prompts for members.
- Lesson player: one Check flow, Try again keeps what's right, Back/forward (read-only), Listen in the header, Hint in the footer, bonus cards, mascot reactions and the security scan, `lesson_quit`.
- Usernames are the one public identity (server-checked filters, 30-day changes). **Avatars v2** (merged 2 Oct): the avatar is the mascot dressed up, 12 accessories in 5 slots (free cap, glasses, hoodie; spin beanie, headband, headset, visor; scarf at 7 days, grad cap for a course, jetpack at 30 days; Pro crown and cape), the avatar page at /account/rewards, spins only while something is left to win ("N spins saved for new items"). Both migrations applied (`profiles.outfit` with a shape check; v1 items retired). `profiles.avatar` is unused. Daily goals and streaks; leagues (hidden until 20 learners earn XP in one week); certificates.
- Feedback form stores each message and emails it to cybernettraining10@gmail.com (`FEEDBACK_INBOX`; switch to hello@ once ImprovMX forwarding works), at most 12 an hour.
- **Learn before you do** (card types `reveal`, `true_false`, `fill_gap`; time-based lessons via `LEARN_FIRST_MODULES` in `src/lib/content/shape.ts`): Inside Your Devices module 1 (pilot) and all of Stay Safe Online. The train_model redesign (pictures, problem first) and See it in 3D on the phone explore card are live.
- Functions run in **syd1** next to Supabase. Help lines: Kids Helpline with Lifeline (verified), eSafety, ACCCE, Scamwatch, IDCARE, ReportCyber, 000.

## 2. Rollout (owner, 2 Oct), in order

Stay Safe Online → How AI Really Works → How the Internet Works → the rest of Inside Your Devices. Each course: add its modules to `LEARN_FIRST_MODULES` (3–5 min of core cards, ≥60% hands-on by time, ≥3 styles, a "Try this:" recap), the playbook (real-life opener, predict then play, wrong answers teach), the fixes in `docs/plans/zero-confusion-audit.md`, one short question per card, the packet race / fruit trainer where they fit (`src/components/hero/`; they'd need a small guided "play" card type), every card fitting 360×560 (`npm run e2e:fit-audit`; `SHOT_VP=560` saves screenshots at 560), a beginner audit (fresh agent, answers hidden), then merge when checks pass. No subagents unless a course is too big alone.

- **Stay Safe Online:** live (merged 2 Oct), audited (105/105 right first time; fixes applied; see REVIEW.md "Learn-before-you-do rollout"). All 140 cards fit 360×640 and 360×560. Shared player changes: tighter phone spacing on choices, sorts, matches, scenarios and hotspots; simulator switches two to a row when there are 3+; readable scenes drawn between 1× and 1.25×; scene callouts always pinned inside the panel; the explore "All parts explored" chip removed (the line above says it). Gate: lint, typecheck, 1059 tests, build, design QA, Back/Listen, mascot; guest gate, Mistake review, pro-declined and plans on a local production build.
- **Next: How AI Really Works** (18 lessons, 6 quizzes). Every lesson is under 3 min of core cards by the time rules and lacks a "Try this" line.

## 3. In progress and queued (owner, 2 Oct)

- **Dashboard numbers (found 2 Oct, waiting on the owner):** Activity bars and course rings count only finished lessons and passed quizzes, while XP and the streak count every card, so a learner with cards done but no finished lesson sees 0 bars and 0% (the owner's account: 13 cards, 75 XP, no finished lesson). Proposed: bars from the XP ledger per day, rings from core cards done.
- **Next: `course-thumbnails`** (owner's brief, 2 Oct): one accent colour and one hero object per course (the mascot from avatars v2), same line weight, subtle hover/tap motion, used on the catalog and course headers, plus a template for future courses; side-by-side at desktop and 360×560 in light and dark before merging. Flag first: the suggested purple (AI) is reserved for the Quantum tier, and green (Stay Safe Online) is our "correct answer" colour.

## 4. Waiting on the owner

- `docs/plans/what-really-happens.md`: approved plan for a new Medium course; the build waits for the owner.
- Drop the unused `profiles.display_name`, `profiles.avatar` and `league_players.handle*` columns: needs a migration (show the SQL first).
- Recheck AI lesson 4.3 (product names, makers, age rules) by 1 January 2027, then every 3 months.
- An adult (ideally a lawyer) to review the privacy and terms drafts (`content/legal/`).
- Playtest with real learners (AI audits overstate beginner ability: the SSO audit got 105/105 and called some cards too easy).
- Queue on hold: the Pro streak-freeze feature and a family plan. Don't build.

## 5. Decisions (not in CLAUDE.md or REVIEW.md)

- Every task on its own branch from `main` with a preview; merge only when checks pass; production checks after each merge, roll back on failure. Show migration SQL before applying it. Never ask for secrets.
- `lesson_quit` data is still tiny: a hint, not proof.

## 6. Gotchas

- **Previews can't run signed-in checks:** `SUPABASE_SECRET_KEY` is Production only, so secret-key flows return 500 on previews. Run design QA, Back/Listen and mascot against a dev server or preview (they need `/dev/cards`), and guest gate, Mistake review, plans and pro-declined against a local production build (`npx next start -p 3200`).
- **Vercel's security checkpoint** once challenged this machine's IP after many automated runs (403s). If every production check fails at once, look at `X-Vercel-Mitigated` before rolling back.
- **Previews share the production Supabase database.** Never leave test leagues or `league_state` open.
- **Live Stripe keys are in Production only.** Never click a plan button on production.
- **Windows editing:** files are CRLF in the working tree; Node string replaces must normalise line endings (or use the editor tools). PowerShell `Set-Content` mangles UTF-8.
- **Worktrees:** `C:\cnf` is the rollout worktree (dev server on 3002), `C:\cnp` the old pilot one. `C:\cnwt` holds old uncommitted SSO edits; leave it. Remove `node_modules` junctions with `cmd /c rmdir`, never `Remove-Item -Recurse`.
- **Content:** never rename a published lesson or card id, and never reuse a removed id. Run `npm run export:content` after any content change: it rewrites `WEBSITE-CONTENT-FOR-AI.md` (repo root), the one file the owner gives another AI to draft videos (the build regenerates it and a test fails if it's stale; `docs/content-export.md` is gone). Help numbers use non-breaking spaces. Help information must be in core cards.
- **Server actions run one at a time per page;** e2e scripts must wait for the database write, not a fixed delay.
- **Deploy status:** `https://api.github.com/repos/sidsapkota/CyberNet-Training/commits/<sha>/statuses`.
