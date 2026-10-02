# Prior-knowledge audit (2 October 2026)

**The rule (owner):** every question must be answerable using only what the learner has seen earlier
in that module, or in an earlier module of the same course. No outside knowledge, ever.

**How it's checked, permanently:** every card now lists the concepts it `teaches` (an explainer, a
reveal, or a prompt that explains the idea itself) and every graded card the concepts it `uses`.
`conceptProblems` (`src/lib/content/concepts.ts`) walks each course in order and `concepts.test.ts`
fails if a concept is used before an earlier **core** card (or the card itself) teaches it, only a
bonus card teaches it, or nothing does. `npx tsx scripts/check-concepts.ts [course]` prints the list
while you work. All 613 cards were tagged by four fresh reviewers (one per course, reading in learner
order) and checked by hand.

**Result:** 42 problems found, **all fixed**; the check passes for every course.

## Bits and Binary (the owner's examples)

- **"Which IP address is valid"** (was Bits and Binary card 7) asked about IPv4 before IP addresses
  are taught (module 2). **Moved** to What Is an IP Address?, straight after the explainer that
  teaches IPv4 (four numbers, each one byte, 0 to 255). That lesson keeps 7 core cards, so "Build 192
  in binary" is now a bonus there (module 1 already practises binary), and the module's teaser is now
  "How many bits is the whole address?". The module 1 quiz question "Why can't any part of an IPv4
  address be 300?" became "Why can't one **byte** hold the number 300?", and the recap no longer
  mentions IPv4.
- **Card 8 (bonus), before:** "If each part used **10 bits** instead of 8, what would the largest
  number be?" ("each part" meant an IP address's parts, not taught yet.)
  **After:** "A byte's 8 bits reach **255**. With **10 bits** instead, what's the **largest** number
  you could make?"
- **Card 6 ("make a byte"), before:** "8 bits make a **byte**. Each extra bit doubles the patterns (2,
  4, 8…), so a byte has **256**. What's the **largest** number a byte can hold?" ("has 256" of what?)
  **After:** "A **byte** is 8 bits. Each extra bit **doubles** the on/off patterns (2, 4, 8…), so a
  byte has **256** patterns. The first is `00000000`, which is 0. What's the **largest** number a byte
  can hold?"

## Every problem, worst first

**Blockers: needed something never taught** (fixed by teaching it first, in a reveal or the prompt,
or by rewording so it isn't needed)

| Card | Needed | Fix |
|---|---|---|
| Stay Safe Online 1.1 `swap-myth`, `easy-or-hard`, `friend-taken-over`; Module 1 quiz Q1; Final Q5 | Guessers try common passwords, names and years, and swaps like `@` first | New one-line reveal before the sort; the opener's prompt says names and years go first |
| SSO 1.2 `rank-proofs`; Module 1 quiz Q7 | A passkey is the strongest | The passkey reveal says so |
| SSO 2.1 `prize-email` (the module teaser) | Replying to a scam tells them your address works | Said in the step text |
| SSO 3.2 `switch-it-off` | Permissions can be switched off in Settings | Said in the prompt |
| Inside Your Devices 3.1 `hot-on-the-bed`, 3.2 `too-hot-to-handle` (bonus) | Sudden cold harms devices (fridge, freezer options) | Options swapped for ones the lesson already rules out |
| IYD 3.1 `delete-or-keep` | Setup files aren't needed once an app is installed | Item reworded: "Leftover installers for apps you have" |
| How the Internet Works Module 1 quiz Q1 | Each extra bit doubles the patterns | Back in the byte card's prompt (above) |
| HTIW 3.2 `device-jobs` | What a server is | One sentence in the prompt |
| HTIW 5.3 `order-layers`; Module 5 quiz Q7 | Wi-Fi or a cable is the outermost wrapper | Said in the prompt, and in the 5.3 recap |

**Blockers: taught later than it's used** (fixed by moving the card after its explainer, or a clue in
the prompt)

| Card | Needed (taught at) | Fix |
|---|---|---|
| SSO 1.1 `own-password` | Reusing a password lets one leak open everything (the-leak, later) | Moved after the-leak |
| SSO 1.2 `password-is-enough` | Two-step sign-in (two cards later) | The prompt explains a second proof |
| SSO 1.2 `the-code-text` | A code arrives when someone types your password (recap) | Said in the prompt |
| SSO 2.1 `asks-for-password` | Real companies never ask for secrets (next card) | Moved after it |
| SSO 2.2 `sounds-like-cousin` | A family safe word (module 4) | Explained in the step |
| SSO 2.3 `looks-just-like` | Fake sites copy logos (next card) | Said in the prompt |
| IYD Module 1 quiz Q4 | Open tabs use RAM (module 3) | Item became "The app you're using now" |
| IYD 3.2 `helps-or-harms` | Brightness and location drain the battery (recap) | Said in the prompt |
| How AI Really Works 1.1 `rules-or-learning` | Spam filters and keyboards learn (card 4) | Named in the first explainer |
| AI 2.2 `seen-before` | A model can memorise its photos (card 4) | Said in the prompt |
| AI 5.1 `same-prompt-twice` | Each picture starts from new random static (recap) | Said in the prompt |
| AI 5.3 `no-label`, `clue-or-myth`, `strongest-sign` | A missing AI label proves nothing (recap) | Added to the explainer before them |
| AI 6.2 `app-permissions` | Allow only what an app needs (recap) | Said in the prompt |
| HTIW 3.1 `film-or-game` | Data takes turns on a connection (next card) | Moved after the explainer |
| HTIW 4.2 `fastest-place` | Your device remembers recent answers (next card) | Moved after the explainer |
| HTIW 4.3 `one-or-several` | One name holds several records (next card) | Moved after the explainer |
| HTIW 6.2 `who-can-read` | Plain HTTP is readable on the way (next card) | Moved after the explainer |
| HTIW 6.2 `order-https` | TLS starts after TCP connects (6.3) | Said in the prompt |

**Major: only a bonus card taught it**

| Card | Needed | Fix |
|---|---|---|
| HTIW 5.2 `parcel-or-postcard` | Late live data is useless, so it isn't resent (bonus 3.3) | Said in the prompt |

**Bonus cards** (allowed to lean on bonus cards, but not on later ones): AI 1.1 `does-it-understand`
now says in its prompt that face unlock learned from photos.

## Also found
- **Glossary (fixed):** IYD 3.2 `wont-charge` marked `[[port]]`, whose definition is the networking port; it now says "the charging port" with no mark.
- **Predict-first openers** (the playbook's "predict, then learn") still open lessons, but each now
  gives the clue it needs in its own prompt, so a beginner can reason it out rather than guess.
