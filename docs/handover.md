# Handover

Read this first in every session. It is replaced, not appended: git keeps the history.
Last updated: 2 October 2026.

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
- Daily goals and streaks; leagues (hidden until 20 learners earn XP in one week); certificates.
- Help lines: Kids Helpline and Lifeline (verified), eSafety, ACCCE, Scamwatch, IDCARE, ReportCyber, 000.

## 2. Open branches

- `mistake-review`: queue item 2 (below). Preview URLs follow `https://cyber-net-training-git-<branch>-sidsapkotas-projects.vercel.app`.

## 3. In progress

Mistake review (item 2): migration written, SQL shown to the owner, **not applied** until they approve.

## 4. Queue (in order)

1. **B: Mistake review** (Pro). Show the SQL before applying. When it ships, add "Review your mistakes" to the Pro benefits (`ProPitch`).
2. **C: Streak freeze** (Pro). Show the SQL before applying. (Pro already allows holding 3 freezes instead of 2.)
3. Family plan: **on hold**, don't build.

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
- **Dev server:** if pages show a Next.js "Jest worker" error, the dev server on port 3000 has gone stale; stop its process and run `npm run dev` again.
- **Committing one course while others are mid-edit:** build a worktree at a short path (e.g. `C:\cnwt`; long paths fail), link `node_modules` with a junction, and remove that junction with `cmd /c rmdir`, never `Remove-Item -Recurse` (it would delete the real `node_modules`).
- **Content:** never rename a published lesson or card id, and never reuse a removed id. Run `npm run export:content` after any content change (a test checks it). Multiple-choice option text is plain text (no backticks). Help information must be in core cards.
- **First-screen checks:** Instagram's in-app browser leaves about 360×560 for the page.
- **Deploy status:** `https://api.github.com/repos/sidsapkota/CyberNet-Training/commits/<sha>/statuses`.
