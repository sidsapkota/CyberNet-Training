# Stay Safe Online, modules 2–4: Lesson Blueprint v1.1 audit

Audited 18 Oct 2026, read-only, in worktree a local copy. Rules: CLAUDE.md "Lesson Blueprint v1.1", "Zero-confusion rule", "Content style guide" and the card table. This CLAUDE.md has no "lesson pattern (HARD RULE" or "Make it feel like a game" section: v1.1 replaced them. Reference: module 1 (`strong-passwords`, `blueprint: "1.1"`).

## Summary

None of the 8 lessons or 3 quizzes in modules 2–4 is built to Blueprint v1.1. None has `"blueprint"`, a Hook, a Play card, an unscored Predict card (`predict: true`) or `showAnswer`. They are the older "learn before you do" lessons. Module 2's lessons are the closest: 8–9 cards, real scenes, good per-option nudges. Two things undercut them:
- **Unreadable scene text.** The `email`, `text-message` and `fake-website` scenes draw text at 7–11 viewBox units, which is roughly 7–11px on a phone. The one clue each lesson depends on, the link or web address, is 7.5px mono.
- **Recall, not thinking.** The "spot the signs" tap card uses the same scene and the same parts the explore card just showed.

Modules 3 and 4 have **no pictures at all**: every card is a text scenario, sort, match or multiple choice. Several lessons pack 2–6 ideas into 9–11 cards. Many scenario steps offer only 2 choices, and the right one is obvious and often the longest. There are also two teach-before-test breaks: the family safe word, and the ACCCE.

Help facts are correct: Kids Helpline 1800 55 1800 (ages 5–25), Lifeline 13 11 14, eSafety, Scamwatch, IDCARE, ACCCE and 000. The "name before the last ending" address rule misleads on `.com.au`, though.

Access:
- Module 2 Spot the Scam: **Pro**. Teaser: `prize-email`.
- Module 3 Guard Your Privacy: **Pro**. Teaser: `band-name-quiz`, a 2-option scenario.
- Module 4 When Things Go Wrong: **free, openToGuests**.

So the weakest-looking content is either what people pay for (modules 2–3) or what a TikTok guest lands on (module 4, which includes deepfakes). Approved v1.1 storyboards already exist in `docs/storyboards/stay-safe-online/` (10 lessons split into 17). The fix is to build them.

Key: **P** pass · **Pa** partial · **F** fail · **R** risk. "Cards" counts all cards (bonus cards included).

---

## Module 2: Spot the Scam (Pro)

| Lesson | Cards | One idea | 6–8 | 8 beats | Predict | Sit+pic+action | 3+ options | No leaks | Feedback | Words | Fit 360×560 | Text ≥14px | Score |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `phishing-emails` | 8 (7+1 bonus) | Pa | P | F | F | Pa | Pa | F | Pa | Pa | R | **F** | **4** |
| `scam-texts-and-calls` | 9 (8+1) | F | F | F | F | Pa | P | F | Pa | P | R | **F** | **3** |
| `fake-websites` | 8 | Pa | P | F | F | Pa | F | F | Pa | P | R | **F** | **3** |
| `spot-the-scam-quiz` (quiz) | 7 | n/a | P (5–8) | n/a | n/a | Pa | P | Pa | n/a (quiz) | F | R | **F** | **5** |

**`phishing-emails`**
- **One idea (Pa):** spotting a phishing email, plus "if you clicked" in `knows-your-name` step 2.
- **Beats (F):** opens on the explore hotspot `meet-the-signs`; no hook or play; no Predict.
- **Picture (Pa):** only the two hotspots have a picture. `type-in-the-button`, `prize-email`, `knows-your-name` and `real-sender` are text only. `type-in-the-button` ("this email's button") only makes sense if you remember the last card.
- **3+ options (Pa):** `knows-your-name` step 1 has 2 choices.
- **Leaks (F):** `spot-the-signs` taps the same `email` scene, and its 5 targets are exactly the 5 parts `meet-the-signs` just glowed. That's recall, not spotting.
- **Feedback (Pa):** hints everywhere and per-option nudges on multiple choice. Scenarios have a hint only, and there's no `showAnswer`.
- **Words (Pa):** `real-sender` (bonus) prompt is 13 words.
- **Fit (R):** `meet-the-signs` callout jobs run to about 30 words (`email-from`). Recap is 45 words.
- **Text size (F):** email scene text is 7.5–10 units, so roughly 7.5–10px. The link address `http://yourbank-verify.example/login` is 7.5px mono.

**`scam-texts-and-calls`**
- **One idea (F):** three ideas: scam texts, scam calls and voice clones (`sounds-like-cousin` repeats 4.2).
- **6–8 (F):** 9 cards.
- **Beats (F):** no hook, play or Predict.
- **Picture (Pa):** only the hotspots have one. `hang-up-or-ok` ("Hang up, or that's OK?") has no situation, picture or verb.
- **Leaks (F):** `spot-the-text` says "the **new** text", but it's the same `text-message` scene, and its targets are the same 3 parts just explored.
- **Content mismatch:** `hang-up-or-ok`'s explanation mentions "controlling your computer" and "secrecy", but no item shows them.
- **Fit (R):** recap is 56 words; `in-your-pocket` is 47 words.
- **Text size (F):** the text-message scene is 200 units wide with text at 7–8.5 units. The link is 7.5px mono.

**`fake-websites`**
- **One idea (Pa):** reading the address, plus the password manager (`manager-stays-quiet`), plus "I typed it in" (`typed-it-in`).
- **3+ options (F):** both steps of `manager-stays-quiet` and both steps of `typed-it-in` have 2 choices.
- **Leaks (F):**
  - `who-gets-it` comes right after the explore callout "it's login-check, not Your Bank", and its right option names "login-check". It's tagged `play: predict` but it's scored and comes after the reveal.
  - `spot-the-site`'s prompt says "Your Bank never asks for your PIN", which hands over one of its 3 targets.
  - `bank-or-not` reuses `read-the-address`'s examples word for word (`login.yourbank.example`, `yourbank-secure.example`).
- **Fit (R):** `read-the-address` is 51 words plus 3 mono lines.
- **Text size (F):** the address bar, the clue the whole lesson rests on, is 7.5px mono.
- **Fact:** "the owner is the name just before the last ending" gives `com` for `yourbank.com.au`. REVIEW.md records `.com.au` as one ending, but the learner is never told that.

**`spot-the-scam-quiz`**
- **Copies:** `q-addresses` repeats `bank-or-not`'s structure, and `q-email-labels` reuses the same email scene, so it rewards memory.
- **Words (F):** prompts of 18 words (`q-bank-call`, `q-padlock-pin`, `q-gift-cards`).
- **Leak:** `q-gift-cards` puts the reason in the right option ("real prizes never cost anything").
- **Text size (F):** same tiny-text email scene.

---

## Module 3: Guard Your Privacy (Pro)

| Lesson | Cards | One idea | 6–8 | 8 beats | Predict | Sit+pic+action | 3+ options | No leaks | Feedback | Words | Fit 360×560 | Text ≥14px | Score |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `your-digital-footprint` | 11 (10+1) | F | F | F | F | F | F | F | Pa | P | R | n/a (no pictures) | **2** |
| `apps-and-wi-fi` | 10 | F | F | F | F | F | F | F | Pa | P | R | n/a (no pictures) | **2** |
| `guard-your-privacy-quiz` (quiz) | 6 | n/a | P | n/a | n/a | F | F | F | n/a | F | P | n/a | **4** |

**`your-digital-footprint`**
- **One idea (F):** six ideas: sharing, digital footprint, security questions, privacy settings, holiday posts, grooming, plus usernames as a bonus.
- **6–8 (F):** 11 cards.
- **Beats (F):** opens cold on the graded sort `share-or-private`. No hook, play or Predict.
- **Picture (F):** no picture on any card.
- **3+ options (F):** `band-name-quiz`, `post-while-away` and `friendly-stranger` have 2 choices each, and the answers are obvious.
- **Leaks (F):** the right option is the long, careful one ("Send nothing, block and report, and tell an adult"). The wrong ones are strawmen ("Share it. It's just a bit of fun").
- **Conversion:** `band-name-quiz` is this Pro module's **teaser card**, so the paywall's sample is a 2-choice, no-brainer card.
- **Fit (R):** recap is 53 words.

**`apps-and-wi-fi`**
- **One idea (F):** two ideas, app permissions and public Wi-Fi.
- **6–8 (F):** 10 cards, 5 of them reveal or explainer cards; `meet-permission` and `meet-while-using` sit back to back.
- **Picture (F):** no pictures.
- **3+ options (F):** both steps of `new-game-asks` have 2 choices.
- **Leaks (F):** right options carry their own reason ("Say no: a drawing game doesn't need them"). `mic-dot` has a throwaway "Ignore it".
- **Fact:** "Changing an important password → better on mobile data" is conservative but in line with cyber.gov.au. The HTTPS nuance that REVIEW.md mentions isn't in the lesson.
- **Fit (R):** recap is 50 words.

**`guard-your-privacy-quiz`**
- **Copies:** `q-quiz-post` re-asks `band-name-quiz`; `q-settings` is `match-settings` flipped round.
- **3+ options (F):** `q-stranger` has 2 choices.
- **Words (F):** explanations of 30, 32 and 27 words (`q-share-or-private`, `q-permissions`, `q-settings`); prompts of 20 and 16 words.

---

## Module 4: When Things Go Wrong (free, open to guests)

| Lesson | Cards | One idea | 6–8 | 8 beats | Predict | Sit+pic+action | 3+ options | No leaks | Feedback | Words | Fit 360×560 | Text ≥14px | Score |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `signs-of-a-hack` | 8 | Pa | P | F | F | F | Pa | Pa | Pa | Pa | **R** | n/a | **3** |
| `deepfake-scams` | 9 (8+1) | Pa | F | F | F | F | P | F | Pa | P | **R** | n/a | **3** |
| `getting-help` | 11 | F | F | F | F | F | P | F | Pa | P | **R** | n/a | **3** |
| `stay-safe-online-final` (quiz) | 8 | n/a | P | n/a | n/a | F | P | Pa | n/a | F | R | n/a | **5** |

**`signs-of-a-hack`**
- **One idea (Pa):** signs of a take-over, plus recovery steps, plus "don't pay" (`pay-to-unlock`). The storyboard splits off `take-back-your-account`.
- **Picture (F):** no pictures.
- **3+ options (Pa):** `weird-messages` step 2 and `recovery-changed` have 2 choices. "That's enough, you're done" is a strawman.
- **Order card:** `order-the-steps` makes "Tell a trusted adult" step 1 of a graded order. Nothing in the lesson's logic makes that order follow, and the hint only justifies recovery coming after the password. Adults will fail it.
- **Words (Pa):** `hacked-or-normal` prompt is 13 words.
- **Fit (R):** `step-by-step` is 68 words.
- **Gap:** ReportCyber (cyber.gov.au) is never mentioned for hacked accounts.

**`deepfake-scams`**
- **One idea (Pa):** voice and face fakes, plus a fake image of you (sextortion), plus the safe word.
- **6–8 (F):** 9 cards.
- **Picture (F):** no pictures, even though this is the most "TikTok-able" topic and it's open to guests.
- **Predict:** `few-seconds-of-voice` is tagged `play: predict` but it's scored.
- **Leaks and teach-before-test (F):**
  - `safe-word-check`: "safe word" appears for the first time in the card that tests it, and "call **him**" has no one to refer to.
  - `fake-image-report` asks you to choose "The app, eSafety, and the ACCCE" before the ACCCE has been named. The longest, "all of the above" option is right.
  - `coach-video`'s step text says "It could be a deepfake", which gives the frame away.
- **Fit (R):** `fake-voices-and-faces` is about 82 words, over even the 80-word help limit. Recap is 63 words.
- **Facts:** OK. Kids Helpline (up to 25) and Lifeline appear together.

**`getting-help`**
- **One idea (F):** saving evidence, helplines, reporting, bank/IDCARE and 000: five services.
- **6–8 (F):** 11 cards, 5 of them reveal or explainer cards.
- **Picture (F):** no pictures.
- **Leaks (F):** hints point straight back to the answer: `who-to-tell` ("The last card named people…"), `where-to-go` ("Look back at the last two cards") and `bank-can-help` ("Why would the lesson say to tell your bank straight away?"). `told-off` and "Ask strangers on an online forum" are joke-level options.
- **Fit (R):** `never-your-fault` is 63 words; recap is 59 words.
- **Fact and rule:** the right option in `who-to-tell` names Kids Helpline without Lifeline, against CLAUDE.md's pairing rule, and no option fits a learner over 25 ("school counsellor").

**`stay-safe-online-final`**
- **Copies:** `q-strong-or-easy` repeats module 1's `easy-or-hard` idea ("Sunsh1ne!" is the same as `symbol-swap`).
- **Leak:** `q-two-step`'s right option echoes the prompt ("codes from a phone app" → "The code from the app on your phone").
- **Words (F):** prompts of 17–20 words (`q-voice-message`, `q-two-step`, `q-code`, `q-trusted`).
- **Order:** `q-music-takeover` again bundles "Tell an adult" into the first step.

---

## Ten biggest weaknesses (worst first, by how likely each makes a new 13+ TikTok learner quit or not sign up)

1. **Scam scenes are unreadable on a phone.** Cards: `phishing-emails/meet-the-signs`, `spot-the-signs`; `scam-texts-and-calls/meet-the-text`, `spot-the-text`; `fake-websites/meet-the-page`, `spot-the-site`; `spot-the-scam-quiz/q-email-labels`. Text is 7–11px, and the deciding address is 7.5px mono. **Fix:** redraw `email`, `text-message` and `fake-website` at 15+ units, like the module 1 `sign-in` scenes, or add zoomed `view`s on the address line.
2. **Modules 3–4 have no pictures at all.** Every card is text, including the deepfake lesson, which guests can open from a video. **Fix:** at minimum add a `hook` card with one full-width picture per lesson now; then build the storyboarded scenes (phone call, social post, café, group chat, help board).
3. **No Hook, Play or unscored Predict in any lesson.** Lessons open cold on a graded card: `share-or-private`, `needs-it`, `hacked-or-normal`, `block-before-saving`, `grandma-call`. **Fix:** rebuild each lesson to its approved storyboard, opening with hook, then play, then a `predict: true` card with "Not sure".
4. **"Spot it" cards are memory tests.** `spot-the-signs` and `spot-the-text` re-tap the exact parts just explored ("the new text" isn't new). `who-gets-it` repeats the callout's "login-check". `bank-or-not` copies `read-the-address`'s examples. **Fix:** test on a second, different email, text or site, with fresh addresses.
5. **2-option, obvious, strawman scenarios.** `band-name-quiz` (the module 3 **Pro teaser**), `post-while-away`, `friendly-stranger`, `new-game-asks`, `manager-stays-quiet`, `typed-it-in`, `recovery-changed`, `q-stranger`. These feel patronising to a 13+ teen or an adult, and the right answer is the long careful one. **Fix:** 3 options, each a real misconception, at similar lengths; pick a stronger teaser card for module 3.
6. **Too many ideas, too many cards.** `your-digital-footprint` (11 cards, 6 ideas), `getting-help` (11 cards, 5 services), `apps-and-wi-fi` (10 cards, 2 ideas), `scam-texts-and-calls` (9 cards, 3 ideas). **Fix:** apply the storyboard splits: `privacy-settings`, `public-wi-fi`, `scam-calls`, `save-the-evidence`.
7. **Teach-before-test breaks in a guest-open lesson.** `deepfake-scams/safe-word-check` uses "safe word" with no intro and "call him" with no one named. `fake-image-report` tests the ACCCE before naming it. **Fix:** add a reveal card ("A **family safe word** is…") and name the caller (e.g. "Dad"); introduce eSafety and the ACCCE in a reveal before the report step.
8. **Long explainers will scroll at 360×560.** `fake-voices-and-faces` (~82 words), `step-by-step` (68), `never-your-fault` (63), recaps of 50–63 words. **Fix:** split each into 1-sentence reveal cards; keep recaps to the takeaway, "Try this" and "Next".
9. **The address rule breaks on Australian sites.** `fake-websites/read-the-address`, `bank-or-not`, `recap`: "name before the last ending" makes `yourbank.com.au` read as `com`. **Fix:** add one example: "`.com.au` counts as one ending: in `yourbank.com.au` the owner is `yourbank`."
10. **The graded hack order forces "tell an adult" first, with no logic behind it.** `signs-of-a-hack/order-the-steps`, `q-music-takeover`. ReportCyber is also missing. **Fix:** order only the logical steps (password → sign out others → recovery details); make telling someone a separate, ungraded line using the v1.1 wording ("With a trusted adult, or on your own if you're 18+"); add cyber.gov.au ReportCyber to `getting-help`.
