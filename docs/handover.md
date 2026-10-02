# Handover

Read this first in every session. It is replaced, not appended: git keeps the history.
Last updated: 1 October 2026.

## 1. Live on production (https://cybernettraining.com, branch `main`)

- Four courses, all rewritten at the right level: Stay Safe Online (Easy, "Start here"), Inside Your Devices (Easy), How AI Really Works (Medium), How the Internet Works (Hard).
- Course levels (dots + word) and "For ages 13+. No experience needed." everywhere.
- Guests: each course's first lesson and the help module; everything else needs a free account.
- Accounts: Google, email 6-digit code; in-app browsers (Instagram, TikTok…) get the code and an "open in browser" tip.
- Free accounts: any lesson, 3 new lessons a day. CyberNet Pro (Stripe, live): unlimited, certificates, extra streak freeze; 7-day trial with a reminder email 3 days before it ends.
- One-screen Pro pitch (`ProPitch`) on every Pro screen; annual preselected. "Not now" asks "What's stopping you?" once a week per device (`pro_declined`: `reason` + `source` = screen `paywall`/`limit`/`pro_page`; Skip sends `skipped`). Read it in Vercel → Analytics → Events.
- Lesson player: Back/forward (read-only), Listen (browser speech), bonus cards, mascot reactions, `lesson_quit` event.
- "Start here" lesson (`strong-passwords`): a one-drag win first and a one-tap card second; no how-to-play panel on a newcomer's very first card in any lesson.
- AI lesson 4.3 age rules checked 1 October 2026 (ChatGPT, Copilot, Claude, Gemini), recorded in REVIEW.md.
- Mistake review (Pro, merged 1 Oct): wrong lesson answers and wrong quiz answers are saved for every signed-in learner (server re-grades, content ids only); free learners see the count on the dashboard with a Pro button; Pro reviews at /review with hints and practice XP. "Review your mistakes" replaced the streak freeze in `ProPitch`. Confirmed on production with `E2E_BASE_URL=https://cybernettraining.com npm run e2e:mistake-review` (14/14), including the dashboard sideways-scroll fix.
- Functions run in **syd1** next to Supabase (moved from iad1 on 1 Oct). Production medians (`npm run e2e:latency`, 7 samples): lesson save 2,757 → 392 ms, lesson fetch 842 → 196 ms, dashboard drawn 1,434 → 397 ms.
- Plans and Pro identity (merged 1 Oct): /pro is the Free/Pro plans section, /account/plan "Your plan", Pro node frame and lit badge, a once-per-device welcome after upgrading, no upgrade prompts for members, `plans_viewed` / `plan_selected`. Confirmed on production with `E2E_BASE_URL=https://cybernettraining.com npm run e2e:plans` (29/29; the Pro pick is skipped there because it would open a live checkout).
- **Analytics fix (1 Oct):** events sent as a page first loads (`lesson_start` on deep links and reloads, `paywall_viewed`, `limit_reached`, `signup_prompt_viewed`) were dropped before; numbers before 1 Oct undercount them.
- The extra streak freeze is live: Pro holds 3, free 2 (checked on production 1 Oct with 21-day streaks). Queue item C, the Pro streak-freeze feature, is separate and on hold.
- Plans polish (merged 1 Oct): equal-height plan cards side by side, "Pricing" / "Your plan" in the header nav and tab bar (`plans_viewed` source `nav`), loading screens for server-rendered routes, pressed nav states, and the profile icon prefetches the whole account page. Account page on production (`npm run e2e:account-speed`, median of 6, tap → content): before 322 ms desktop / 536 ms throttled-4G phone; after 63 ms / 62 ms. Server alone ~160–200 ms either way. Guests opening /account, /account/plan or /review now get a 200 that redirects to sign in inside the stream (a loading screen starts streaming first; meta-refresh fallback), not a 307.
- Mascot motion (merged 1 Oct): reactions on SVG parts (feedback mascot blinks, hops on right, head tilt on wrong; each under 600 ms; no idle loop), and the "security scan" (under 1.2 s) at lesson complete, /pro/welcome and the Pro welcome moment. Reduced motion: still expressions. Try them at /dev/mascot on a preview.
- Daily goals and streaks; leagues (hidden until 20 learners earn XP in one week); certificates.
- Help lines: Kids Helpline and Lifeline (verified), eSafety, ACCCE, Scamwatch, IDCARE, ReportCyber, 000.

- **Feedback emails** (merged 2 Oct; production checks passed: mascot 5/5, plans 38/38, mistake review 14/14, guest gate 11/11, `e2e:feedback-form` on production; no runtime errors after one real send): each feedback message is still stored in the table and now also emailed to cybernettraining10@gmail.com (`FEEDBACK_INBOX` in `src/lib/site.ts`; switch to hello@ once ImprovMX forwarding works) with the lesson, page, rating, time and signed-in yes/no. Capped at 12 emails an hour plus one "more are waiting" note. Only production has `RESEND_API_KEY`, so emails only arrive from production. Two test rows starting "[test]" were stored on 2 Oct (one from a local build, one real send on production, which should have arrived in the inbox; check spam if not).

## 2. Open branches

- `avatars-rewards` (owner approved 2 Oct; merge after checks): avatars (fixed list, never photos), reward spins for finished modules and courses and 7/30/100-day streaks (every spin wins, server-picked, never bought), 3 Pro-only items while Pro, Rewards page, avatar picker, avatars in leagues. SQL applied (`20261005100000_avatars_and_rewards.sql`); `check:rls` 99/99.

- `hero-prototypes` (**don't merge into lessons yet: owner reviews `/dev/hero` first**): 3D phone (React Three Fiber), packet race (Matter.js), train the model (gestures), with juice (Howler sprite of synthesised sounds, haptics), fallbacks and `npm run e2e:hero-perf`. Results and the recommendation (3D behind a "See it in 3D" button) are in `docs/plans/juice-and-heroes.md`.
- `ldyd-pilot` now also has the **train_model redesign** (real pictures, problem first, one change, live flip in lessons, "?" until Check in quizzes; all 11 AI cards fit 360×560; beginner audit done and fixed) and `docs/plans/zero-confusion-audit.md` (all courses vs the zero-confusion rule and playbook: worst 25 cards, 26 lessons needing a real-life opener, "Try this" endings for every lesson). Before/after screenshots: `docs/plans/train-model/`. Follow-up: the train_model how-to-play demo still shows abstract dots.

- **Usernames live (2 Oct):** one public username replaced the display name and league handle (server-checked word filters with disguise handling, suggestion + Shuffle at sign-up, first change free then every 30 days). Both migrations applied; the scan gave 6 accounts generated names and replaced 1 failing name (counts only). `check:rls` 92/92; production checks passed (usernames 11/11, mascot, plans, mistake review, guest gate, feedback). `display_name` and `league_players.handle*` are unused: drop them in a later migration.

- **Live 2 Oct:** the wording pass, the player layout (Listen in the header, Hint in the footer, teardown and simulator layout) and fit-560 (every card fits 360×560: tighter chrome on phones, Skip in the bonus row, one-line instructions, smaller minimum scenes). Production checks passed on cybernettraining.com each time; the earlier rollback is resolved (the deploy was promoted and auto-promotion works again).
- **Plans waiting for the owner:** `docs/plans/what-really-happens.md` (new Medium course, plan only) and the usernames plan + SQL (not applied).

- `ldyd-pilot` (**don't merge: owner reviews first**): "learn before you do" pilot. Three new card types (`reveal`: tap to learn, ungraded; `true_false`; `fill_gap`), time-based lesson rules for listed modules (`LEARN_FIRST_MODULES`: 3–5 min of core cards, ≥60% hands-on by time, ≥3 styles), and Inside Your Devices module 1 rewritten (lessons 4.5, 3.2 and 3.5 min; quiz 8 questions). Depth-not-exam-prep applied. Removed card ids are listed in REVIEW.md (never reuse them). **Player layout (2 Oct, also on this branch, applies to every course):** Listen is an icon in the header (speed in the lesson menu), Hint is a footer button beside Back with its cost ("costs 5 XP"), the teardown's step count sits on the scene panel and its safety note is one paragraph, and simulator outputs sit side by side on phones. Result: **every module-1 card fits 360×640** (was 15 over); 13 are still 10–76px over at 560 (Instagram browser). The fit audit now opens the preview share link (`E2E_SHARE_URL`) and fails loudly on a login page; `LESSONS=` limits it. Preview: `https://cyber-net-training-git-ldyd-pilot-sidsapkotas-projects.vercel.app` (Vercel login), the module at `/course/inside-your-devices`. The layout change could ship on its own branch ahead of the pilot if wanted.

- `player-flow-fixes`: the player feedback rounds (one Check flow with no early reveals; Try again clears only what's wrong, Check waits for a change; scenes fit the screen with pinned callouts and "glowing" parts; footer Back; tap-the-trace card list; lesson menu; "Up next" step; glossary full names and one-sentence definitions; themed wrong-answer animations; `about` lines for every lesson; fit audit + `/dev/fit`). **Don't merge until the owner has seen it.** Preview URLs follow `https://cyber-net-training-git-<branch>-sidsapkotas-projects.vercel.app` (behind Vercel login; scripts use a share link).

## 3. In progress

- **Plans waiting for the owner** (don't build yet): `docs/plans/learn-before-you-do.md` (new card types, time-based lessons, pilot on Inside Your Devices module 1) and `docs/plans/avatars-and-rewards.md` (recommends "pick one of three" over a spin). Both list questions for the owner.
- **Content fit:** `npm run e2e:fit-audit` finds 446 of 570 cards don't fit 360×640 (long prompts/options, big sorts, scenarios). Fixed course by course in the "learn before you do" rollout; the pilot takes Inside Your Devices module 1 to zero.
- **Listen voice fix** (macOS novelty voices): waiting for the owner's ranking (their message was cut off).

## 4. Queue (paused)

1. **Streak freeze** (Pro): **on hold until data says otherwise.** Don't build. Watch `pro_declined` reasons and the Pro funnel first. (Pro already holds 3 freezes instead of 2.) Show the SQL before applying if it's ever picked up.
2. Family plan: **on hold**, don't build.

## Overnight log (1–2 Oct, owner asleep; decisions made on my recommendation)

- **Previews can't run signed-in checks:** `SUPABASE_SECRET_KEY` is set for Production only, so on every preview `/api/lessons` (non-guest lessons for signed-in learners), Pro checks, Mistake review and the guest merge return 500. Not a code bug (production returns 200 for the same calls). I may not change env vars, so for merges: preview-capable checks run against the preview (design QA, Back/Listen, mascot), and the checks needing the secret key (Mistake review, plans, guest gate, "What's stopping you?") run against a **local production build** (`next start`) of the same commit. Owner may want to add the key to Preview (note: previews share the production database).
- **Back/Listen on the preview** failed once (Listen pressed while the card was still sliding in), then passed twice: script timing, not the app.
- **player-flow-fixes:** fixes from the four beginner audits added before merging (text scenes never shrunk; taps go to the drawn part; simulator keeps moves; drag/binary wait for a real change; drag announcements by label; course final named; content: too-hot safety line, backticks in options). Merged after: lint, typecheck, 959 tests, build, design QA on the preview (clean), mascot + Back/Listen on the preview, Mistake review 14/14, plans 39/39, guest gate 11/11, pro-declined on a local production build.
- **Mac voice fix** (`mac-voice-fix`): the owner's ranking message was cut off at "prefer voices with", so I used my proposed ranking: never a novelty voice (their list plus Grandma, Grandpa, Rocko, Sandy, Shelley, Reed, Eddy, Flo); the learner's locale first (en-AU, en-GB, other English), then quality words (Premium/Enhanced/Natural/Neural), well-known system voices, Google/Microsoft, then on-device; none suitable means the browser default.
- **Depth, not exam prep** (owner, 2 Oct): added to CLAUDE.md's content guide (on `wording-pass` and `ldyd-pilot`), the plan and the wording brief; the running wording agents and the pilot agent were told to apply it and flag exam-style cards.
- **IYD module 2 wording:** the memory-leak meter's label became "RAM apps want (laptop has 8 GB)" (the model never caps RAM in use, so it showed 13.1 GB of 8). Accepted; a proper fix would cap or explain overflow in the `task-manager` model. "Process" lost its definition in the frozen-app prompt; I put it back.
- **Wording pass, How the Internet Works:** every prompt is now one short question (with one teaching line first where a term is new). Fit at 360×640: 131 of 183 cards still overflow (most of what's left is layout: two-line options, the Hint row, packet_path and sort_bins). Exam-prep fixes: DNS record match now gives each record's job, kinds-of-address gives the private ranges, which-door says 443 is "the usual HTTPS port", protocol-jobs describes each job. **Still exam-like, flagged for the learn-first rollout:** quiz protocol-jobs (bare IMAP/SMTP/DNS/TCP answers), quiz handshake-order (SYN/SYN-ACK/ACK), server-roles + dns-quiz server-jobs (root/TLD/authoritative), ports meet-ports + colon-443 (port numbers as facts). The shrinking-drive bonus now gives the 1,024 fact in its prompt (easier, but teach-before-test). REVIEW.md updated for dropped claims.
- **Wording pass merged, then ROLLED BACK (2 Oct, about 01:15 Sydney):** gate passed before the merge (lint, typecheck, 966 tests, build, design QA on the preview, Back/Listen 13/13 and mascot 14/14 on the preview). After merging (`1fe5830`, deployment `dpl_8bUW…`) every production check failed, because **Vercel's Security Checkpoint started challenging this machine's IP** (`X-Vercel-Mitigated: challenge`, 403 to curl and headless Edge) after a night of automated runs. It wasn't the code: fetched from Vercel's side, the wording deploy served lessons with their cards (200) and no attack mode is active. Your rule says roll back on any failed check, so I did an instant rollback to `dpl_Ej5…` (`359583f`: feedback emails live, old wording). **State now:** `main` contains the wording merge but production serves `359583f`, and Vercel won't auto-promote new `main` deploys until one is promoted. **To finish (morning):** from a browser or IP that isn't challenged, run `E2E_BASE_URL=https://cybernettraining.com npm run e2e:prod-mascot` (plus plans, mistake-review, guest-gate, feedback-form) against the wording deploy, then promote `dpl_8bUW…` (or the latest `main` deploy) in Vercel → Deployments. Or revert the merge if you'd rather not ship it.
- **Old worktree at `C:\cnwt`** (detached at 03b1ee2) has uncommitted Stay Safe Online edits from an earlier session; left untouched. The pilot uses `C:\cnp`.
- **"Secret Codes":** no request by that name ever reached me (the messages I got were cut off in places). Nothing planned; owner to resend.

## 5. Waiting on the owner

- Recheck AI lesson 4.3 (product names, makers, age rules) by 1 January 2027, then every 3 months.
- Have an adult (ideally a lawyer) review the privacy and terms drafts (`content/legal/`).
- Playtest the courses with real learners (audits by AI overstate beginner ability).

## 6. Recent decisions (not in CLAUDE.md or REVIEW.md)

- Workflow: every task on its own branch from `main`, send the preview URL, merge only when the owner says so. Show migration SQL before applying it. The owner enters all keys; never ask for secrets in chat.
- `lesson_quit` data is still tiny (4 quits, 3 on `strong-passwords` card 1): treat it as a hint, not proof.
- The daily limit had no grandfathering (short notice only).

## 7. Gotchas

- **Previews share the production Supabase database.** `check:rls` cleans up after itself; never leave test leagues or `league_state` open.
- **Live Stripe keys are in Vercel Production only.** Local and previews use the sandbox; never test against live mode. Stripe's own trial-reminder email is off (ours replaces it).
- **Windows editing:** PowerShell `Get-Content`/`Set-Content` can mangle UTF-8 (`→` becomes `â†’`). Edit files with the editor tools, Python (`encoding="utf8"`) or Node. In bash heredocs, backslashes in Python strings break (`\U…`).
- **Absolute positioning escapes scrollers that aren't positioned:** an `sr-only` span inside the dashboard's course carousel made the whole page scroll 623px sideways at 360px (fixed with `relative` on the carousel). Element-rect checks miss it; the e2e scripts now bisect by hiding elements.
- **Server actions run one at a time per page:** a full page load cancels any still queued. E2E scripts must wait for the database write, not a fixed delay. Keep functions in `syd1` (`vercel.json`); in iad1 each save took ~3 s.
- **Analytics in e2e scripts:** record calls to `window.va` from an init script and block Vercel's script (see `e2e:plans`): works on production without sending test events. Never click a plan button on production (live Stripe).
- **Dev server:** if pages show a Next.js "Jest worker" error, the dev server on port 3000 has gone stale; stop its process and run `npm run dev` again.
- **Committing one course while others are mid-edit:** build a worktree at a short path (e.g. `C:\cnwt`; long paths fail), link `node_modules` with a junction, and remove that junction with `cmd /c rmdir`, never `Remove-Item -Recurse` (it would delete the real `node_modules`).
- **Content:** never rename a published lesson or card id, and never reuse a removed id. Run `npm run export:content` after any content change (a test checks it). Multiple-choice option text is plain text (no backticks). Help information must be in core cards.
- **First-screen checks:** Instagram's in-app browser leaves about 360×560 for the page.
- **Deploy status:** `https://api.github.com/repos/sidsapkota/CyberNet-Training/commits/<sha>/statuses`.
