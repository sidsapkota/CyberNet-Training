# CyberNet audit: ready for new users from videos?

19 October 2026. Scored against Lesson Blueprint v1.1 (CLAUDE.md), with Stay Safe Online module 1 as the
proven pattern. The per-lesson tables are in `docs/audit/` (one file per course).

**Method.**
- **The first five minutes:** played as a brand-new visitor on a phone (360×640 and 360×560, a fresh
  browser) on staging: landing, sign-in, first lessons, Home, the Feed, the Pro locks, /pro and the
  start of checkout.
- **Lessons:** every lesson and quiz in every course was read card by card against the v1.1 checklist:
  - one idea, 6–8 cards, the 8 beats, an unscored Predict card;
  - situation + picture + action, 3+ believable options, no answer leaks;
  - hint and 2nd-wrong feedback;
  - nothing scrolling at 360×560, and text of 14px or more.

## The headline

Only **Stay Safe Online module 1** (5 lessons, rebuilt on `sso-module-1`) meets v1.1.

| Course | Lessons | Score | What's missing everywhere |
|---|---|---|---|
| Stay Safe Online modules 2–4 | 8 + 3 quizzes | 2–4 (quizzes 4–5) | Hook, Play, Predict, `showAnswer`; modules 3–4 have no pictures; scam scenes have 7–11px text |
| How AI Really Works | 18 + 6 quizzes | 2–6 (1.1: 5) | Hook, Predict; 17 of 18 lessons have no picture; ~20 prompts give the answer away |
| How the Internet Works | 17 + 6 quizzes | 3–6 (avg 4.3; quizzes 6.8) | Hook, Predict, Try this; one picture in the course; memorising acronyms and ports |
| Inside Your Devices (main) | 7 + quizzes | 3–4 (quizzes 6) | Hook, Predict; 3 lessons of 12–16 cards; ~25 text-only questions |

Most cards have a hint and a nudge, and the facts are accurate apart from the bugs listed below. The problem is
the shape. The lessons were written to the older "learn before you do" pattern: they're wordy, mostly
pictureless, and often open on a question with no situation or on a wall of text.

## Weaknesses, ranked by what they cost us in sign-ups and sales

1. **A video visitor doesn't find out what CyberNet is, and is led into the Feed instead of a lesson.** The
   landing's first screen was an AI-course byte with no heading, and its button went to the Feed. *Fixed on
   `first-five`:* a one-line heading, a byte from Stay Safe Online lesson 1 (the proven one) and one button
   into that lesson.
2. **The sign-up gate hid its buttons below the fold on a phone** (a big mascot plus 4 perks), so "Create a
   free account" showed no way to do it without scrolling. *Fixed on `first-five`:* a smaller mascot (hidden
   below 700px tall), 3 perks, and the 13+ box and Google button in view at 360×640.
3. **The free lesson guests play first in three of the four courses is the weakest content:**
   - AI 1.1 "Spot the AI": 2 options, a 20-word prompt, and a picture that shows the answer.
   - Internet 1.1: binary maths, not the internet.
   - Devices 1.1: 16 cards, about 11 minutes, no hook.

   A visitor from an AI or internet video meets these first. → Rebuilt first in each course (Step 3).
4. **How the Internet Works gives nothing about the internet away free.** Only module 1 (Binary and Data)
   is free, so a "how the internet works" viewer gets binary, and everything about the internet is Pro.
   → Plan: in the rebuild, module 1 (free) becomes "a message's journey" and binary moves later. **This
   changes what's free, so it's for Sid to confirm or veto when he plays it.**
5. **The scam scenes are unreadable on a phone** (`email`, `text-message`, `fake-website`: text at 7–11px, and
   the deciding web address at 7.5px). These are Stay Safe Online's paid lessons and the main reason to buy
   it. → Redraw for 15px+ in the module 2 rebuild.
6. **No Hook, Play or unscored Predict outside module 1.** Lessons open on a graded card or a 42–53-word
   explainer; the learner is tested before they've seen anything happen. → Every rebuilt lesson.
7. **Text-only "worksheet" questions:** about 50 in the internet course, about 25 in devices, and nearly all
   of AI modules 2–6 and Stay Safe Online modules 3–4 (including the deepfake lesson guests can open from a
   video). → One recurring picture or character per lesson, with the answers drawn on the picture where possible.
8. **The prompt gives the answer away** on about 20 AI cards and several devices and Stay Safe Online ones;
   "spot it" cards re-test the exact parts just explored. → The rule moves into "Name it", after Predict;
   tests use a new example.
9. **Two-option and strawman choices** (true/false and 2-way scenario steps in Stay Safe Online modules
   3–4 and devices, including the module 3 Pro teaser `band-name-quiz`). → 3 believable options each; a stronger teaser.
10. **Pro locks without a price:** the dashboard's "Your mistakes" card said "Review with Pro" and nothing
    else. *Fixed on `first-five`:* "Review them with Pro, from A$5 a month". The daily-limit screen, the
    paywall and /pro already show what you get, the price and one button.
11. **Long lessons with several ideas:**
    - AI: 1.3, 4.2, 4.3, 6.2.
    - Internet: four lessons with 2–3 ideas each.
    - Stay Safe Online: `your-digital-footprint`, `getting-help`.
    - Devices: three lessons of 12–16 cards.

    → Split, one idea each (the storyboards already do this for Stay Safe Online: 10 lessons → 17).
12. **Memorising instead of understanding** in the internet course (DNS record types, SYN/SYN-ACK/ACK, ports
    80/443, SMTP/IMAP, status-code digits), which the style guide bans. → Cut or reframe in the rebuild.

## Content bugs found (fix in each course's rebuild)

- **AI:** 8 explanations or nudges mention options that were cut: `check-or-fine`, `which-apps-use-ai`,
  `kind-of-tool`, `always-true`, `help-or-harm`, `real-or-suspicious-review`, `type-or-keep`, `needs-it`.
  REVIEW.md's 4.2 and 4.3 notes are stale.
- **Internet:**
  - 5.1's `netstat` card has port 80 where the module quiz's `reply-port` says 443.
  - 3.1 `count-packets`' explanation contradicts its prompt.
  - 3.1 opens on "So…".
  - 5.2 `parcel-or-postcard` mentions items it doesn't have.
- **Devices:**
  - `speaker-turns` says three apps would "clash", but operating systems mix sound.
  - `too-hot-to-handle` warns about a freezer option that no longer exists.
  - The course final's `q-phone-safe-order` reads like a how-to for opening a phone, which the safety rule bans.
- **Stay Safe Online:**
  - The address rule ("the name just before the last ending") misreads `yourbank.com.au`.
  - Two cards test things not taught yet: the family safe word and ACCCE.
  - ReportCyber isn't mentioned.

## The first five minutes (walkthrough notes)

- **Landing:** see 1. Course cards, "How it works" and the parent section below are fine. The privacy line
  still said "display name"; *fixed on `first-five`* to "made-up username".
- **Sign-in page:** clear. The 13+ box and Google are in view; the email box is below the fold at 640px
  (acceptable: Google is the main path).
- **First lesson (Stay Safe Online 1.1):** a Hook card with one picture and "Start" is strong, and it fits.
- **Gated lesson 2 as a guest:** see 2.
- **Home (returning):** Continue is now first, with today's bytes under it (`next-batch`).
- **The Feed:** 3 a day, then "That's today's bytes" with a next-lesson button (`next-batch`).
- **Pro locks:**
  - The daily-limit screen and the paywall show what you get, the price and one big button, plus "Not now"
    and the trial link.
  - The comparison line under the price is wordy ("less than 4 months of the monthly plan" plus "A year of
    monthly is A$95.88. This is A$29, once.") but true.
- **/pro:** one box, the price, one button; the Free vs Pro table below. Good.
- **Checkout:** starts on Stripe's page (not paid; sandbox).

## Plan (Steps 2–4)

- **Step 2 (`first-five`):**
  - Landing, the sign-up gate and the Pro-lock price (done).
  - Then the first free lesson of AI and the internet course, rebuilt with their courses.
- **Step 3, one branch per course, free lessons first:**
  1. Stay Safe Online modules 2–4, from the approved storyboards.
  2. AI module 1 (Spot the AI).
  3. Inside Your Devices: skipped, because its rebuild branch is only on the Mac.
  4. How the Internet Works.
  5. The rest of How AI Really Works.
- **Step 4:** each course gets the full gate, then goes on the handover's "ready for Sid to play" list
  with its preview link.
