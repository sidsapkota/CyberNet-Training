# Module 1 build kit (Lesson Blueprint v1.1)

How module 1 of Stay Safe Online is built from its storyboards. Everyone building a lesson follows
this, so the four lessons look and play like one story.

## Pictures (SVG, in `public/illustrations/sso/`)

- **Drawn for the navy screen panel** (it's navy in both themes). Hex colours only (SVGs can't read
  CSS variables):
  - panel fill `#061630` is the card's background (don't fill the whole SVG; leave it transparent)
  - surfaces `#1d3d6e` (screens, cards), raised `#24507f`, outlines `#6f8fbd`
  - outline / line art `#8be3ff` (the light accessory blue), body fills `#122b52`
  - text `#e6eef9`, muted text `#a3b6d2`
  - good / safe `#3ddc97`, bad / scammer's success `#ff7a7a`, warning `#ffb547`
  - the passphrase key and "lit" things `#00c2ff` (cyan: use sparingly)
- **Size:** `viewBox="0 0 340 H"` with `width="340" height="H"`. Multiple choice and Hook pictures
  are shown about 310px wide on a phone, so **every `font-size` is at least 16** (the test
  `pictureText.test.ts` fails below 14px). Explainer pictures are shown about 294px wide: use
  `viewBox="0 0 320 H"` and font-size 16+.
- **Height budget at 360×560:** a multiple choice card with 3–4 text answers: H ≤ 180. With answers
  on the picture (only "Not sure" below it): H ≤ 230. Hook: H ≤ 260. Explainer (Name it): H ≤ 200.
- **Fonts:** `font-family="'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif"`; passwords and
  codes in `'IBM Plex Mono', ui-monospace, Menlo, monospace`.
- **Characters (draw them the same in every picture):**
  - **Mia:** a simple friendly figure: round head (circle r=14, fill `#f2c6a0`), dark hair cap
    (`#3b2a1f`), hoodie body (rounded rect, fill `#24507f`, outline `#8be3ff`). No face detail beyond
    two dot eyes. Never a real person.
  - **The scammer:** calm and small, never scary: a grey hooded figure (fill `#4a5a72`, outline
    `#a3b6d2`), face hidden in the hood's shadow (`#1d2a3d`), sitting at a small laptop. Always far
    away (one side, often across a dotted line).
  - **Mia's phone:** rounded rect 70×130 rx 12, fill `#1d3d6e`, outline `#6f8fbd`.
  - **The guessing computer** (strong-passwords): a grey laptop (`#4a5a72` body) with a dial and a
    label "Scammer's computer".
  - **Keys:** Mia's passphrase is a cyan key (`#00c2ff`); other passwords are amber `#ffb547` and
    green `#3ddc97` keys.
- **No text a learner needs to read inside the picture if it can be an answer instead.** Text that's
  there is short and 16+.
- **Reveal pictures** (`revealSrc`) show the outcome; they're only ever shown after it's earned.
- **Alt text** says what's drawn (and, for a reveal, what happened), plainly, without giving away a
  graded answer in the first picture's alt.

## Answers on the picture

A multiple choice option with `area: { x, y, w, h }` (percent of the picture) becomes a tap target
over that part of the picture; all options need an area when any has one. Every area must be at
least 44px on a phone: at 310px wide that's at least 15% wide, and at least `44 / (310 × H / 340)`
tall (about 25% for H = 200). Leave a little gap between areas.

## Lesson files

- One file per lesson in `content/courses/stay-safe-online/modules/01-lock-your-accounts/lessons/`,
  `"blueprint": "1.1"`, the same `id` as the storyboard. New lessons: new files with the storyboard's
  id, `order` as in the module (strong-passwords 1, one-password-each 2, two-step-sign-in 3,
  strongest-lock 4, quiz 99), an `icon` from `src/lib/content/lessonIcons.ts` not used by another
  lesson in the module, and an `about` line (10–90 characters).
- **Card types:**
  - Hook: `{ "type": "hook", "situation", "image": { src, alt, width, height } }`.
  - Play: `hotspot` with `"mode": "explore"` on a scene (`home-screen`, `sign-in-options`,
    `sign-in`), or `simulator` with `"mode": "play"` (no `goal`; `prompt` and `explanation` still
    required: the explanation can be one line).
  - Predict: `multiple_choice` with `"predict": true`, 3+ real answers ("Not sure" is added by the
    player, never write it), `explanation` = the storyboard's reveal line WITHOUT "Here's what
    happens…" (the player shows that heading). No `hint`, `nudge` or `showAnswer`.
  - Name it and Wrap: `explainer` (body ≤ 60 words). The Wrap's body: the takeaway, then
    `**Try this:** …`, then a final paragraph `**Next:** …`.
  - Every other graded card: `explanation` = the storyboard's Right line, a `nudge` (or a nudge on
    every wrong multiple-choice option) = the 1st wrong line, and `showAnswer` = the 2nd wrong line.
    No `hint` (blueprint lessons have no Hint button).
- **Concepts** (`teaches` / `uses`): later modules rely on these module 1 concepts, so they must
  still be taught somewhere in module 1 (keep the ids): `length-makes-strong`,
  `names-and-years-guessed-early`, `song-lines-guessed-early`, `passphrase`, `two-step-sign-in`,
  `never-share-sign-in-code`, `change-stolen-password`, `authenticator-app`, `password-manager`.
  Other module 1 concepts: `computers-guess-passwords`, `common-passwords-guessed-early`,
  `data-breach` (the "leak" idea), `password-reuse-risk`, `unique-password-per-account`, `passkey`,
  `passkey-strongest`, `app-codes-beat-text-codes`. A card may only `use` what an earlier card (or
  its own prompt) teaches.
- **Card ids:** keep the storyboard's ids (existing ids keep learners' progress).
- **Checks while you work:** `npx vitest run src/lib/content` (schema, shape, concepts, picture text,
  hints/nudges/showAnswer) and `npm run validate-content`.
