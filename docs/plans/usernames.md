# Usernames: one public identity

Status: **approved and built** (2 Oct 2026). SQL part 1 (`20261004100000_usernames.sql`, additive) applied before the code; part 2 (`20261004110000_usernames_server_only.sql`, removes the learner's profile write) applied once the code is live. Owner's changes: generated names (not display names), and one change every 30 days (first one free) instead of one ever.

## What changes for learners

- **Sign-up:** the "pick a name" step becomes "Pick a username", prefilled with a fun suggestion
  ("PacketPilot482", two brand words and up to 3 digits) and a Shuffle button. "Use this" keeps
  the suggestion, so skipping is one tap. Rules shown under the field: 3–20 letters, numbers or
  underscores.
- **Everywhere:** header (desktop name, initial node), dashboard identity line with the Pro badge,
  `/account`, leagues (rows, your card, other players' cards, reports), the Mistake review finish
  screen, the trial-reminder email ("Hi PacketPilot482"). Nothing from Google is ever shown (the
  provider-metadata trigger already strips names).
- **Changing it:** in `/account`: sign-up's pick doesn't count, the first change is free, then one
  every 30 days. A name replaced after 3 reports, or by the safety scan, gives the change back. Leagues lose their own "change handle"
  box (one place to change it).
- **Certificates:** unchanged: "Name on certificate" is chosen at issue. It is no longer prefilled
  from the old display name (a username isn't a real name).

## Rules (server-side, `src/lib/usernames/check.ts`, pure and tested)

Run on sign-up, on every change, when generating, after reports and in the one-off scan. The
browser only shows hints; the Server Action decides.

1. **Shape:** 3–20 characters, `A–Z a–z 0–9 _`, at most 3 digits in total (no phone numbers or
   birth years), not only underscores or digits.
2. **Unique** ignoring case (database index; "That username is taken." is the one specific error).
3. **Words**, after normalising: lower case; leetspeak mapped (`0→o 1→i/l 3→e 4→a 5→s 7→t 8→b
   9→g $→s @→a`); underscores and other separators removed; repeated letters collapsed
   (`fuuuck`); each variant searched as a substring, so words hidden inside longer names are
   caught. Lists: swears, slurs and hate terms, sexual terms, drugs, violence and self-harm. A
   short allow-list stops well-known false positives (Scunthorpe problem: "assassin", "classic",
   "grape", "Sussex", "therapist", "cocktail", "shitake"…), checked in tests. `obscenity` stays as
   a second layer.
4. **Reserved / impersonation:** admin, administrator, mod, moderator, staff, support, official,
   cybernet, cybernettraining, team, helpdesk, system, root, owner, teacher, security, verified,
   and lookalikes after normalising (`adm1n`, `0fficial`).
5. **Personal info:** gmail, hotmail, outlook, yahoo, icloud, email, phone, mobile, http, www,
   dotcom, insta, snapchat, tiktok, discord, whatsapp, telegram, kik, dm me, add me, call me,
   real name, my name is… (the existing contact and social list).
6. **Messages:** a rejected word gets only "Try a different username." Shape problems say which
   rule (length or characters), never which word.

### Tricky examples the tests will cover (all must be rejected, unless marked allowed)

- Leetspeak and symbols: `sh1t`, `a55hat`, `fuk_u`, `b1tch3s`, `n00b_k1ller` (violence: kill)
- Separators: `f_u_c_k`, `s_h_i_t_head` (underscores are the only separator the shape allows;
  dots and dashes are rejected by the shape first)
- Repeated letters: `fuuuuck`, `shiiiit`, `asssss`
- Hidden inside a name: `CoolPenisMan`, `xXweedXx`, `HitlerFan`, `BigDrugDealer`, `KillYourself7`
- Slurs and hate terms (a list in code, never shown in the UI or in logs)
- Sexual terms: `sexyboy`, `horny_gamer`, `p0rn`
- Impersonation: `admin`, `Adm1n_Team`, `CyberNetSupport`, `0fficial`, `mod_sam`, `staff`,
  `cybernet_training`
- Personal info: `sam_gmail`, `jo0412345`, `callme_now`, `wwwsite`, `snap_ella`, `realname_jo`
- **Allowed (false-positive guards):** `Assassin_99`, `ClassicGamer`, `GrapeJuice`, `Scunthorpe`,
  `Therapist`, `Cocktail`, `Sussex_Fan`, `Shitake`, `Hello_World`, `PacketPilot482`

## Existing accounts (12 today: 5 with a league handle, 9 with a display name, 3 with neither)

- League handles become usernames in the SQL migration (they are already public and filtered).
- **Everyone else gets a generated username, not their display name.** Display names were
  promised as private ("It's shown only to you"), may be real names, and learners can be 13.
  Turning them public without asking could expose a child's real name. Their one free change lets
  them pick their old name if they want it. *(The request said "convert their display name"; this
  is my one deviation. Say if you'd rather convert them.)*
- A one-off script (`scripts/migrate-usernames.ts`, secret key) then fills the empty ones and
  re-checks **every** username with the new rules, replacing failures with a generated name
  (change given back). It logs only counts: "checked 12, generated 7, replaced 0".
- `display_name` and the handle columns stay for one release (unused), then a later migration
  drops them.

## Code

- `src/lib/usernames/` (check, normalise, generate, word lists; tests with tricky examples).
- `src/app/actions/account.ts`: `setUsernameAction` (Server Action, secret key, after
  `requireUserId()`; the change-once rule; maps the unique violation to "taken").
- `AuthProvider` loads `username`; `afterSignInPath` checks `username` instead of `display_name`.
- Leagues: `ensurePlayer` uses the username (giving a generated one if somehow empty);
  `reportHandle` → reports a username, auto-replaces at 3 reporters (as now); settle tie-break by
  username; `LeagueSettings` keeps only "Show me on leaderboards".
- Trial reminder email, check:rls (no profile writes for learners; usernames not readable by others
  except via `league_standings`), e2e seeding, privacy policy (the username is public in leagues),
  CLAUDE.md, handover.

## Order

1. Owner approves the SQL → apply it (`apply_migration`) and regenerate types.
2. Deploy code that reads `username` (falls back to "Learner" when empty).
3. Run the one-off script on production; log the counts in the handover.
4. Preview link for review; merge after OK.
