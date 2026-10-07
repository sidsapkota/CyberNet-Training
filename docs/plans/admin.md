# Admin dashboard

Owner's brief, 7 Oct 2026: a private, read-only dashboard at `/admin`. It's the most sensitive page
on the site, so security comes first. The only admin is the owner's account (user id
`cf5b0efc-1c8f-490c-b90d-a1ca081b16e8`, cybernettraining10).

## Access (all on the server)
- **Allowlist by Supabase user id**, from a server-only env var: `ADMIN_USER_IDS` (comma-separated
  ids). It's never matched on an email, and never on anything the browser sends. Without the variable,
  nobody is an admin.
- **One gate, everywhere:** `requireAdmin()` in `src/lib/admin/auth.ts`:
  - It gets the user from the verified session (`auth.getUser()`, never `getSession()`).
  - It checks the allowlist and a recent sign-in (`last_sign_in_at` within 12 hours).
  - Every admin page calls it first, and so does every admin data function in
    `src/lib/admin/server.ts`. That's a second check, so no data call can skip it.
  - The one action (revealing an email) is a route handler that calls it first too.
- **Anyone else gets a plain 404:** signed-out visitors, learners, Pro members, and an admin whose
  session is older than 12 hours. It's the site's normal not-found page, so nothing reveals that
  `/admin` exists.
  - Pages are `noindex`, not linked anywhere, and not in the sitemap.
  - They're also not in `robots.txt`, which would advertise the path.
- **The audit log:** every admin page view and action goes into `admin_audit` (`admin_id`, `action`,
  `target`, `at`). Revealing a learner's email logs whose email it was.
- **Database (add-only):** `admin_audit`, server-only (RLS on, no grants). `check:rls` proves learners
  can't read or write it.
- **Tests:**
  - Unit tests for the allowlist parsing and the 12-hour rule.
  - `e2e:admin` (staging): a guest, a learner and a Pro member get 404 on every admin page and on the
    reveal endpoint, and nothing is logged for them.
  - The same test checks that the admin sees every page, that each view is logged, and that revealing
    an email works and is logged.
  - `server-actions.test.ts` checks every admin page and route calls `requireAdmin()` before anything
    else.

## Pages (read-only: nothing on them changes data)
- **Overview:**
  - total learners; sign-ups per day (last 30 days, a bar chart);
  - active today and in the last 7 days; returning learners (XP on 2 or more days);
  - lessons completed;
  - Pro (subscribers by plan, active early-user grants), Founding Members sold, and founder revenue
    (from `founding_members`).
- **Funnel**, last 7 and 30 days, from our own data:
  - sign-up, first card, first lesson finished, founder checkout started, paid (subscription or
    founder).
  - Visitors, plans viewed and founder clicked are Vercel Analytics events, which we don't store, so
    the page links to Vercel's Events panel for those.
- **Learners:**
  - username, joined, last active, XP, streak, lessons done and Pro status, newest first, 50 a page.
  - The email is hidden; "Show email" reveals one (and logs it).
- **Lessons:** per lesson, learners who started it vs finished it. The cards with the most mistakes
  (`card_mistakes`), and the slowest and most-missed cards (`card_plays`, once card measurements are
  live). Quits are a Vercel event (`lesson_quit`), so the page links there.
- **Leagues:** this week's leagues (players, weekly XP, rank) and last week's results.
- **Feedback:** the latest 50 messages, with lesson and rating.
- **Features:** reminder emails (opted in, sent, opened, returned), challenges (made, played,
  claimed), and the Feed (bytes answered, learners). Each shows "not live yet" until its tables exist.

## What the owner adds
In Vercel, project settings, Environment Variables, add for **Production** only:
`ADMIN_USER_IDS = cf5b0efc-1c8f-490c-b90d-a1ca081b16e8`, then redeploy. Until then, `/admin` is a 404
for everyone, the owner included.

## Effort
About 1.5 days:
1. auth gate, audit table and tests;
2. data functions;
3. the six pages;
4. `e2e:admin`, the gate, then merge.
