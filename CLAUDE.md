# CyberNet Training

A Brilliant.org-style interactive learning web app for **IT fundamentals**: hardware, networking,
operating systems, databases, programming logic, cloud and cybersecurity. Learners work through short
lessons made of interactive **cards** and get instant, satisfying feedback.

Audience: everyone from about **age 12 to adults**. See [Content style guide](#content-style-guide).

Current state: guests learn with progress in `localStorage`; learners who sign in (Google or email
magic link) get progress synced to Supabase. Both sit behind the same `ProgressStore` interface. See [Accounts and sync](#accounts-and-sync).
**CyberNet Pro** (Stripe subscriptions) is live: live keys in Vercel Production only; local dev and
previews use the Stripe sandbox. See [CyberNet Pro](#cybernet-pro).
Production is **https://cybernettraining.com** (`src/lib/site.ts`); see [Launch](#launch-domain-seo-analytics-legal-feedback)
and `docs/launch-checklist.md` for the dashboards (Vercel, Supabase, Google, Resend, ImprovMX).
Code is on GitHub: `sidsapkota/CyberNet-Training`, branch `main`.

## Commands

```bash
npm run dev               # dev server on http://localhost:3000; predev prints LAN URLs for other devices
npm run build             # runs validate-content first (prebuild), then next build
npm run lint              # eslint . (Next 16 removed `next lint`)
npm test                  # vitest run
npm run typecheck         # next typegen && tsc --noEmit
npm run validate-content  # validate every JSON file under /content
npm run export:content    # write docs/content-export.md (lesson summaries for videos; no quiz answers)
npm run brand:assets      # regenerate logo SVGs + favicon from src/components/brand/geometry.ts
npm run brand:mascot      # regenerate public/brand/mascot/<expression>.svg from the Mascot parts
npm run check:supabase    # verify the Supabase URL + publishable key in .env.local (health check)
npm run check:rls         # prove users can't read/write each other's rows (needs SUPABASE_SECRET_KEY)
```

All of `build`, `lint`, `test` and `typecheck` must pass with zero errors and warnings.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript (strict, `noUncheckedIndexedAccess`)
- Tailwind CSS v4: CSS-first config, all tokens in `src/app/theme.css`
- `motion` (the current name of Framer Motion; import from `motion/react`)
- dnd-kit (`core`, `sortable`, `modifiers`) for drag-to-order
- Zod v4 for content and stored-progress validation
- `react-markdown` for card text (raw HTML is skipped)
- `lucide-react` icons, always via the wrappers in `src/components/ui/icons.tsx`
- `@radix-ui/react-popover` for the course-path node popovers (focus, Escape, outside click and
  collision-aware positioning); `canvas-confetti` for the module-complete celebration, loaded on
  demand by `src/lib/celebrate.ts`
- IBM Plex Sans + IBM Plex Mono via `next/font/google` (self-hosted at build time)
- `@supabase/supabase-js` + `@supabase/ssr` for auth and synced progress; Supabase CLI via `npx supabase`
- Vitest for unit tests
- Version pins: TypeScript stays on **6.0.x** (typescript-eslint doesn't support 7 yet) and ESLint on
  **9.x** (eslint-plugin-react doesn't support 10 yet).

## Content hierarchy

**Course > Module > Lesson > Cards.** Each module ends with exactly one **quiz**, which is a lesson with
`kind: "quiz"` that reuses the normal card types.

Courses, in catalog order: **Inside Your Devices** (`inside-your-devices`, hardware, the OS and
troubleshooting, built on the hands-on card types), **How the Internet Works**
(`how-the-internet-works`) and **Stay Safe Online** (`stay-safe-online`: passwords and two-step
sign-in, spotting scams, privacy, and what to do when things go wrong; modules 1 and 4 free,
modules 2 and 3 Pro).
Each `module.json` has `"access": "free" | "pro"`. Every course's first module must be free (the
loader checks), and help, reporting and recovery modules are always free. Every Pro module also has
`"teaserCard": { "lesson", "card" }`: one card from its **first lesson** that learners without Pro
can play on the "What's next" screen (`content/teaser.ts`: required on Pro modules, not allowed on
free ones; an interactive **core** card, not a hotspot or teardown). Teasers are deliberately public
(sent with the course outline), so pick one whose prompt sets it up on its own.

```
content/courses/<course-dir>/course.json                   { id, title, description, order }
content/courses/<course-dir>/modules/<module-dir>/module.json   { id, title, description, order }
content/courses/<course-dir>/modules/<module-dir>/lessons/*.json
```

- A lesson file holds `{ id, kind: "lesson" | "quiz", title, order, cards[] }` (plus `icon` for
  lessons). Access comes from its module. Quizzes also
  take `passThreshold` (0 to 1, default 0.7).
- **Lesson icons:** every regular lesson has an `icon` from the allow-list in
  `src/lib/content/lessonIcons.ts` (lucide names, drawn by `LessonIcon` in
  `src/components/ui/icons.tsx` with the brand stroke; `satisfies` keeps the two in sync). Pick one
  that clearly matches the topic, and never the same icon twice in a module (`load.test.ts`). `lock`
  and `check` aren't allowed: they're the node's state badges. Quizzes have no icon; they keep the
  network hub.
- **Parents come from the folder path.** Lesson JSON never repeats `courseId`/`moduleId`.
- **`order` decides sequence.** Folder and file number prefixes (`01-`, `99-`) only make the tree
  readable.
- **Ids:** kebab-case. Lesson ids are global and appear in URLs (`/lesson/<id>`). Card ids only need
  to be unique within their lesson.
- **Progress is keyed on ids. Never rename the id of a published card or lesson.**
- **The loader enforces** (`src/lib/content/load.ts`):
  - every file is valid JSON and passes its schema
  - course, module and lesson ids are unique
  - `order` values are unique within their parent
  - each module has at least one regular lesson and exactly one quiz, and the quiz has the highest order
- **Validation runs** at `prebuild`, in `load.test.ts`, and on every page render. Bad content fails the
  build with messages like `…/01-bits-and-binary.json → cards[3].correctOptionId: …`.

## Architecture

### Cards (`src/cards/`)
Each card type is a self-contained folder:

```
src/cards/<type>/
  schema.ts            Zod schema + TS types (card and answer)
  grade.ts             pure grading + describeAnswer/describeCorrectAnswer
  <Type>CardView.tsx   the React component
  definition.ts        wires the above into a CardDefinition
  grade.test.ts        unit tests
```

- **`types.ts`** holds the card contract:
  - Interactive cards have `initialAnswer`, `isAnswerReady`, `grade`, `describeAnswer`,
    `describeCorrectAnswer` and `Component`. Everything except `Component` must be pure.
  - Static cards (explainer) only have `Component`.
  - Guided cards (hotspot's explore mode) are ungraded but hands-on: `initialState`, `isComplete`
    and `Component`. The player keeps their state like an answer and enables Continue once
    `isComplete`. They pay `XP.explore` once and can't be in quizzes. `getCardDefinition` returns
    the guided definition for explore-mode hotspots, and `isInteractiveCard` is false for them.
- **Card components are controlled.** They receive `{ card, answer, onAnswerChange, status }` and never
  grade themselves. `status` is `answering`, `correct` or `incorrect`; anything other than `answering`
  means read-only.
- **The player owns everything else:** Check, Try again, Continue and Skip buttons, the Enter key,
  feedback, animations, XP and persistence.
- **Shared fields:**
  - `base.ts`: every card has `id` and `difficulty` (`"core" | "challenge"`, required).
  - Every interactive card also has `prompt` and `explanation` (markdown). This is what lets the quiz
    review screen treat every card type the same way.
  - Every interactive card may have a `hint` (≤300, markdown; lessons only, behind a "Hint" button)
    and a `nudge` (≤220, markdown; shown after a wrong attempt in place of "Have another go").
    Multiple-choice options may have their own `nudge` (never the correct option); `nudgeFor()`
    in `src/cards/nudge.ts` picks the picked option's nudge, then the card's.
- **`schema.ts`** is the discriminated union of all card types (registration step 1).
- **`registry.ts`** maps card type → definition (registration step 2). `satisfies` makes the compiler
  catch a missing or mis-keyed entry. The player uses `getCardDefinition(card)`, which erases the
  answer type to `unknown`.

### Card types and data format
All cards have `id` (kebab-case) and `difficulty` (`core` | `challenge`). Interactive cards also have
`prompt` and `explanation` (markdown). Try each one at **`/dev/cards`** (dev server only).

| `type` | Extra fields | Answer (JSON) | Correct when |
|---|---|---|---|
| `explainer` | `title`, `body` (md), `image?` `{src, alt, width, height, caption?}`, `mascot?` (`"presenting"`, safety notes only) | none | read (Continue) |
| `photo` | `title`, `photo` `{src: /photos/…, alt, width, height}`, `caption` (md), `credit` `{author, licence, licenceUrl, sourceUrl, device?}` | none | read (Continue) |
| `multiple_choice` | `options` (2–5 `{id, text, nudge?}`), `correctOptionId` | option id | right option picked |
| `drag_to_order` | `items` (3–7 `{id, label}`, **authored in the correct order**) | item ids | exact order |
| `binary_toggle` | `target` (0–255) | 8 booleans | bits sum to target |
| `numeric_input` | `base` (`decimal` \| `binary` \| `hex`, default decimal), `answer` (number or number[]), `hint?` (md), `unit?` | raw string | parsed value is accepted |
| `match_pairs` | `pairs` (3–6 `{id, left, right}`, unique texts) | `{leftId: rightId}` | every pair matched |
| `packet_path` | `nodes`, `links`, `source`, `destination`, `validPaths` (see below) | node ids from source | equals a valid path |
| `terminal` | `commands`, `success`, `promptLabel?`, `intro?`, `caseSensitive?` (see below) | `{history, response}` | success condition met |
| `hotspot` | `scene`, `view?`, `mode` (`tap` + `targets[]`, `label` + `labels[] {part, label}`, or `explore` + `parts[] {part, job}`) | `{selected[], placed{part: labelIndex}}` (explore: `{seen[]}`) | exactly the targets / every label on its part (explore: not graded) |
| `teardown` | `scene`, `view?`, `actions[] {id, part, verb, after?, nudge}`, `maxNudges?` | `{done[], nudges}` | all actions, each after its `after`, nudges ≤ max |
| `simulator` | `model`, `params`, `controls[]` (toggle/slider/button), `outputs[]` (meter/bar/timer/device/list), `goal.all[]` | `{controlId: value}` | every goal condition holds |
| `scenario` | `start`, `steps[] {id, text, choices[] {id, text, consequence, next \| outcome}}` | choice ids in order | the last choice's outcome is `success` |
| `sort_bins` | `bins[]` (2–3), `items[] {id, label, bin}` (4–10) | `{itemId: binId}` | every item in its bin |

- **`numeric_input`:**
  - Spaces and underscores are ignored.
  - Binary accepts `0b`, and hex accepts `0x` in any case.
  - Decimal accepts `,` thousands separators and a sign.
  - Invalid input (e.g. a `2` in binary) shows a warning and keeps Check disabled, so it never counts
    as a wrong attempt.
  - Binary and hex answers must be whole numbers ≥ 0.
- **`match_pairs`:** the right column is shuffled per card. Wrap technical text in backticks
  (`` `443` ``) for Plex Mono; the same applies to `packet_path` labels.
- **`packet_path`:**
  - `nodes` (2–8): `{ id, kind: device|router|switch|server|internet, label (≤24), address? (≤15, mono),
    col: 0–3, row: 0–3, down? }`, one node per cell.
  - `down: true` draws a node as broken (dashed red outline, cross, "down" tag, dashed links) and
    is never on a valid path. Use it instead of writing "(down)" in the label, so an outage is
    visible, not a reading trick.
  - `links`: `{from, to}`, undirected.
  - `validPaths`: every accepted route, each starting at `source`, ending at `destination`, following
    links and never repeating a node.
  - Narrow screens rotate wide layouts 90°, so keep networks small.
  - Wrong routes animate the packet up to the first wrong hop.
- **`terminal`:**
  - `commands` (1–12): `{ command, aliases?, output (printed verbatim), description? (shown by help) }`.
  - `help`, `clear` and `cls` are built in and can't be redefined.
  - `success` is either `{type: "ran_command", command}` (must be a defined command or alias) or
    `{type: "answer", question, accepted[]}`. Answers are compared trimmed, case-insensitive,
    ignoring a trailing full stop.
  - **Nothing is ever executed:** output is only the card's data, and a test enforces no
    eval/fetch/Function in the terminal code.
  - Outputs must look realistic for the chosen OS and use only documentation addresses.
  - Output keeps its columns (no wrapping) and scrolls inside the terminal box, so tables like
    `netstat` line up on a phone. An `intro` of 3+ lines is treated as saved output the same way;
    shorter intros wrap as prose.
- **Scenes** (`src/cards/shared/scenes/`) power `hotspot` and `teardown`:
  - `manifests.ts` is pure data: part ids, accessible names, hit boxes, draw order, `coveredBy` and
    named `views` (e.g. `open` = cover off), plus an optional `labelAt` point where a label marker
    must not cover the part (file names). `art.tsx` draws each part as its own group.
  - Scenes: `laptop`, `phone`, `file-browser`, and for Stay Safe Online `email`, `text-message`
    and `fake-website`. Generic only: no brands, logos or real designs (a test checks for brand
    names). The three scam scenes show one fictional example each; every address in them uses
    the reserved `.example` domain (a test checks), and each part's name is exactly the text
    shown, so screen readers get the same clues and nothing more.
  - **Self-labelled scenes** (`file-browser`, `email`, `text-message`, `fake-website`) show their
    own text, so they need no explore card first; each clue they test must be taught in an
    explainer before the card (`selfLabelled` in `load.test.ts`).
  - **Realistic but simplified:** part positions follow real devices (a laptop's battery across
    the bottom and a heat pipe from the CPU to the fan; a phone's battery filling most of its body,
    with the processor, RAM and storage chips soldered to one small board). Scenes that stand in for
    real hardware set `simplified: true`, which shows a **"Simplified diagram"** chip on the scene.
  - **Accuracy:** phone RAM and storage are never removable. The laptop is an *example* with a
    removable RAM stick and SSD; any card that shows it says many thin laptops have them soldered.
    Phones are glued shut: phone teardowns start with `heat` then `lift` on the back cover, and a
    screwed bracket holds the battery connector.
  - Parts under a cover that's still on can't be seen, tapped or announced. Schemas check every part
    id, view and visibility at load.
  - Add a scene by adding its manifest and its drawing; `scenes.test.ts` checks every part is drawn.
  - **Each kind of part has one look in every scene,** so learners can tell them apart and a
    phone's parts match a laptop's: CPU = a small shiny die on a square base (no metal lid), with a
    pin-1 mark and contact dots; RAM = a row of identical chips (a stick with gold contacts in the
    laptop, one soldered chip of little squares in the phone); storage = chip with stacked layers
    (on a long, narrow SSD card in the laptop); battery = cells or a pouch with a lightning bolt and
    gold terminal; fan = blades in a housing; heat pipe = a copper tube to metal fins. The bolt and
    stacked layers are teaching marks, not real markings. Gold details use `--color-scene-contact`.
    No text on parts: labels would give answers away.
- **`hotspot`:** tap mode selects exactly `targets` (tap again to unselect). Label mode places label
  chips on numbered spots (spots don't name the part, or the answer would be given away).
  **Explore mode** (not graded, core only) teaches a scene: each tap highlights a part and shows its
  name and one-line `job`; hollow nodes turn into checked ones as parts are explored, and Continue
  unlocks once every listed part has been tapped. Put one before a scene's parts are first tested.
- **`teardown`:**
  - Verbs: `unscrew`, `lift`, `slide-out`, `unplug` (remove), `insert`, `fasten`, `plug-in`
    (refit), and `heat` (prep: "Soften the glue on", for a phone's glued back). A heated part stays
    in place with a warm dashed outline (`--color-scene-heat`) until it's lifted.
  - Tapping a part does its next action if its `after` steps are done; otherwise it shows that
    action's `nudge` and counts it. Lift and slide actions can also be dragged.
  - Every card shows a built-in **"This is a simulation"** safety note. `safety?` (≤240, markdown)
    adds a line to that note, right above the scene: every phone teardown that heats or pries uses
    it to say this can damage the battery and start a fire, which is why repairers use special
    tools and training. Never a how-to. Removed parts go to a "Parts out" tray, which is used for
    refitting.
  - The schema rejects cycles, refits before removal, and acting on parts already off.
- **`simulator`:**
  - `model` names a registered pure function in `src/cards/simulator/models/`: `memory`,
    `cpu-cores`, `thermal`, `task-manager`, `storage`, `battery` or `password` (time to try every
    combination of a random password at an illustrative billion guesses a second; outputs `years`
    and a `strength` list). Each has its own params schema, inputs and outputs, and a unit test.
  - Slider units are trimmed by the schema; the view adds the space (none before `%` or `°`).
  - **Never eval.** Content only configures models, and goals are declarative conditions.
  - Control and output ids are model input/output names (camelCase allowed). The schema checks they
    exist with the right kind.
  - The `device` output is a phone or laptop mockup that stutters as `smooth` drops, with its state
    always in text too.
  - Answers are ready once a control changes. The server re-grades by running the same model.
- **`scenario`:** a wrong ending shows its consequence (that's the teaching). After Check → Try
  again, the failed choice is crossed out and the learner picks again at that step. The schema
  requires every step to be reachable, no loops, and at least one success.
- **`photo`** (static, like an explainer): a real photo that backs up a simplified scene. Rules:
  - **Wikimedia Commons only,** under **CC0, public domain, CC BY or CC BY-SA** (no NC or ND). The
    schema only accepts those licences and a `commons.wikimedia.org/wiki/File:` source.
  - **Saved unmodified** in `public/photos/` (no crops, edits or re-encoding; `next/image` scales
    them). `width`/`height` must be the file's real size, and `load.test.ts` checks the file
    exists, is credited and is used.
  - The card always shows the credit: author, a link to the licence deed, a link to the Commons
    file page ("via Wikimedia Commons") and "Unmodified", as CC BY and CC BY-SA require. The schema
    checks `licenceUrl` is the deed of the licence named; `PhotoCardView.test.ts` checks both links.
    Record `device` (the model shown) when it's known.
  - **Captions describe, never endorse:** name the device plainly ("A Framework Laptop 13 with its
    cover off"), with no wording that implies a link to its maker. `/terms` says product names
    belong to their owners.
  - A photo must agree with what the lesson teaches (e.g. the phone photo shows a phone with a
    glued back, not an older screwed one), and never shows a how-to (temperatures, tools).
  - Check every caption and `alt` against the photo itself. List each photo, with its source,
    author and licence, in `content/REVIEW.md`.
  - **Not counted** in the 8–12 cards per lesson, and never in quizzes.
- **`sort_bins`:** tap an item then a bin, or drag (dnd-kit). Snap sound; wrong items go back to the
  tray after Try again.
- **Enter key:** single-answer text fields (`numeric_input`, the terminal's answer box) carry
  `data-enter-submits`, so Enter runs Check. The terminal's command line keeps Enter for running
  commands.
- **Readiness:** `isAnswerReady(answer, card)` receives the card, so readiness can depend on card
  settings (e.g. the numeric base).

### Dev playground (`/dev/cards`)
- **Dev only:** `src/app/dev/cards/page.dev.tsx` is only a route under `next dev` and on Vercel
  **preview** deployments (`VERCEL_ENV=preview`, behind Vercel's login, so cards can be tried on a
  phone). `next.config.ts` adds the `dev.tsx` page extension only then. Production builds never
  compile it.
- **Also:** `/dev/mascot` shows every mascot expression at 48, 96 and 200px on both canvases, with
  the idle animation and an expression switcher (to see the bounce).
- **What it does:** plays `src/dev/card-samples.ts` (one or more samples per type) through the real
  `LessonRun` / `QuizRun`, as a whole lesson, a whole quiz, or card by card.
- **Throwaway progress:** it uses an in-memory store (`MemoryStorage`), so real progress is never
  touched.
- **When adding a card type,** add a sample. A test checks that every type has one.

### Adding a new card type
1. Create `src/cards/<new-type>/` with `schema.ts` (spread `interactiveCardBase` or `cardBase`, and
   add `type: z.literal("new_type")`), `grade.ts`, the view component, `definition.ts` and
   `grade.test.ts`.
2. Add the schema to the union in `src/cards/schema.ts`.
3. Add the definition to `definitions` in `src/cards/registry.ts`.
   Also add its pure grade function to `src/cards/grading.ts` (the server re-grades quiz answers with it).
4. Add schema cases to `src/cards/schema.test.ts`, a fixture to `src/test/fixtures.ts` and a sample to
   `src/dev/card-samples.ts`, then try it on `/dev/cards`.

Nothing in the player, quiz review, progress or content loader needs to change. If the type isn't
interactive, update `isInteractiveCard` / `InteractiveCard` in `schema.ts`.

**Answers must be JSON-serialisable**, because quiz attempts store them in progress.

### Lesson player (`src/components/player/`)
- **`LessonPlayer`** waits for progress to load (client-only), shows a "locked" gate if needed, then
  renders `LessonRun` or `QuizRun`.
- **`LessonRun`**:
  - Resumes at the first incomplete core card (`resumeIndex`).
  - Wrong answer: "Not quite" with a cross, a short soft shake, the explanation collapsed, and Try again.
  - Right answer: a cyan pulse travels along the progress trace to this card's node, which
    ripples. The footer status node fills with a check, and the explanation and XP earned show.
  - Continue unlocks only after a correct answer. Challenge cards also get a Skip button.
  - **Hints** (`HintReveal`): a "Hint" button under the card, with the cost up front ("Using it:
    +5 XP instead of +10"). Opening it once makes the card pay retry XP. Rules live in
    `src/lib/hints.ts` (`visibleHint`: lessons only, graded cards with a hint, until correct).
  - **Nudges:** a wrong answer shows `nudgeFor(card, answer)` under "Not quite"; the full
    explanation stays collapsed.
  - **How to play** (`src/components/player/coach/`): the first time a learner meets an interaction
    style (`COACH_KEYS` in `src/lib/coach.ts`: every graded type except multiple choice, and each
    hotspot mode separately), an inline panel above the card explains it with a one-shot animated
    demo ("Show again" replays; final frame under reduced motion). "Got it", ✕, Enter (unless
    typed in an answer box), Check or Continue dismiss it for good: `preferences.coachSeen`, synced
    like the other preferences. It also shows in quizzes, which have no hints.
  - Explainers are marked complete when the learner presses Continue.
- **`QuizRun`**:
  - An intro screen, then one attempt per question with right/wrong shown immediately and no
    explanations.
  - Ends on `QuizResults`: score, pass/fail and a review of every question with the learner's answer,
    the correct answer and the explanation.
  - Failing allows a retake. Passing completes the module.
- **Keyboard:**
  - Enter runs the primary action (`useGlobalKeyDown` in `src/lib/keyboard.ts`, capture phase).
  - Digits 1–5 pick multiple-choice options, and 1–8 toggle bits.
  - An element with `data-keyboard-passthrough` claims Enter only when it was reached by keyboard,
    not after a mouse click. The drag list sets it only while an item is being held.
- **Motion:** `MotionConfig reducedMotion="user"` is set in `Providers`. Every custom animation
  also checks `useReducedMotion()` and renders its final state instead. `globals.css` neutralises
  CSS animations and transitions (including the node pulse). See [Brand → Motion](#motion).

### Progress (`src/lib/progress/`)
- **`ProgressStore.ts`** is the persistence interface. It's async, and card and lesson completion are
  idempotent. **Components never touch storage**; they call `useProgress()` →
  `{ store, snapshot }`.
- **`localStorageProgressStore.ts`**:
  - Uses the key `cybernet.progress.v1` and validates with Zod on read, falling back to empty
    progress.
  - Recomputes `totalXp` on every write.
  - Syncs across tabs via the `storage` event.
- **Swapping in Supabase:** implement `ProgressStore`, then pass it as
  `<ProgressProvider store={…}>` in `src/components/Providers.tsx`.
- **Preferences:** the snapshot's `preferences` (`mode: "path" | "explore"`, `sound`, and
  `coachSeen`, the how-to-play panels already dismissed) are saved with
  progress via `store.setPreferences()`, so they sync once progress does. The field is optional in
  stored data (Zod default), so progress saved before it existed still loads. `resetAll` keeps it.
- **Timestamps:** cards and lessons record `completedAt`, and quizzes `passedAt` and attempt `at`.
  `activity.ts` derives the dashboard's per-day activity and totals from them (pure, takes `now`).
- **`xp.ts`** holds every XP rule and number, and callers use it to decide awards:
  - core cards: 10 on the first try, 5 after retries (or after using the hint)
  - challenge cards: 20 on the first try, 10 after retries (or after using the hint)
  - lesson complete: +20
  - quiz first pass: +50
  - explore card (hotspot explore mode) finished: 5; explainers: 0
  - XP is paid once per card, ever
  - **practice XP** (`practiceXp`): replaying a finished graded card pays the retry amount toward
    **today's daily goal only**, never total XP, once per card per day
- **`state.ts`** holds pure derived state, and nothing derived is ever stored:
  - unlocks: lessons in order within a module; the quiz after all of the module's lessons; the next
    module after this module's quiz is passed
  - **Explore mode** (`preferences.mode === "explore"`): nothing is locked, in any order; completion
    and XP work the same. Every state function takes an optional `mode`, defaulting to the
    learner's saved one, so existing callers (like the lesson gate) respect it automatically.
  - statuses, module progress, course progress, the current lesson (`getCurrentLesson`: the first
    item in path order that isn't done or locked), the blocking lesson, and the resume position
  - `snapshotBefore(snapshot, id)`: progress minus one completion, which the path draws first so a
    newly completed node visibly fills in

### Daily goals and streaks (`src/lib/progress/daily.ts`, `streak.ts`)
- **Daily goal:** Casual 20, Regular 50 (default) or Serious 100 XP (`DAILY_GOALS`), in
  `preferences.dailyGoal`. The first lesson- or quiz-complete screen asks once (Regular preselected;
  `dailyGoalChosen`); change it on the dashboard's Today panel or `/account`.
- **The XP ledger:** every XP-earning write also records an **XP event** (`snapshot.xpEvents`:
  `{at, day, tz, kind: card|lesson|quiz|practice, lessonId, cardId?, xp}`), dated with the
  learner's local day **when it happens**. Dates never go backwards (`currentDay`: never earlier than
  the latest event), and old events are never re-dated. The ledger is separate from the completion
  records: total XP never includes practice.
- **Met days:** when a day's XP reaches the goal, the day is recorded in `snapshot.goalDays` with
  the goal and time zone at that moment (`addXpEvent` / `checkGoal`). Lowering the goal can meet
  today straight away.
- **Streaks are calculated, never stored** (`computeStreak`, pure, shared by server and UI):
  - A day counts when its goal was met. Today isn't missed until it's over.
  - Freezes: one each time the streak reaches a multiple of 7, at most 2 held; each missed day uses
    one automatically (a frozen day keeps the streak but doesn't add to it). More missed days than
    freezes restarts the streak.
  - **Fair days:** in one time zone, gaps are counted by calendar date, so daylight saving never
    matters. Across a time zone change, a day is missed only if a full 24 hours (3 hours'
    tolerance) went by between the end of the last met day and the start of the next
    (`missedDaysBetween`), so flying east over the date line can't break a streak.
  - Milestones at 3, 7, 14, 30, 50 and 100 days (`milestoneReached`).
  - `dailyStatus()` / `useDaily()` give today's progress and the streak (the hook re-checks each
    minute, so midnight rolls over without a reload).
- **Where it shows:** a streak pill in the header next to XP (the node-chain `StreakIcon`, lit once
  today's goal is met; no flame); the dashboard's Today panel (goal ring, streak, freezes, this
  month's calendar, "How streaks work", goal setting; a gentle "Fresh start" note after a streak
  ends, never a count of what was lost); in lessons, the "goal" chime plus a "Daily goal reached"
  note in the footer (replays show a "+5 today" pill); a milestone screen before the lesson- or
  quiz-complete screen; "Daily goal reached" on those screens (`DailyGoalSummary`).
- **Guests** keep the ledger in local progress (at most 5,000 events). **Signed in**, Server
  Actions record everything (next section); the browser only sends its time zone.
- **Resets keep the streak:** "Reset progress" clears lessons and XP but keeps the ledger, met days
  and settings.

### Pages
Pages with the site header live in the `src/app/(main)/` route group: a top bar (logo, Dashboard,
Courses, streak, XP, sound, theme) and, on phones, a bottom tab bar (`src/components/nav/SiteNav.tsx`). Lessons
keep their focused player shell.
- `/`: the **landing page** for first-time visitors (`src/components/landing/Landing.tsx`: hero
  with the waving mascot and "Try a lesson free", the two courses, how it works, parents and
  teachers, FAQ), or the **dashboard** for returning learners. The page is static; an inline script
  (`src/lib/home.ts`) sets `data-returning` on `<html>` before first paint when there's guest
  progress or a Supabase auth cookie, and CSS shows one or the other (`HomeSwitch`). The
  dashboard (`src/components/dashboard/Dashboard.tsx`) has a big "Continue" hero for the
  current lesson, real stats (XP, lessons, modules), the Today panel (daily goal and streak), 14 days of activity, a progress ring per
  course, and "Your courses"; its one-button welcome now only shows after a progress reset.
- `/from/<platform>` (and `/from/<platform>/<lesson-id>`): tagged links for videos. Same home
  page (or that lesson), never indexed (canonical is `/` or `/lesson/<id>`); page views then show
  which platform sent people. See [Analytics](#analytics).
- `/leagues`: weekly leagues and player cards (see [Leagues](#leagues)). A 404 until leagues open;
  guests are sent to sign in. Not indexed.
- `/privacy`, `/terms`: rendered from `content/legal/*.md` (see [Legal pages](#legal-pages)).
- `/feedback`: the feedback form (`?lesson=<id>` fills in the lesson).
- `/courses`: **catalog**, a grid of `CourseCard`s (cover, title, one-line description, progress).
  With a single course, a dim "More courses on the way" tile fills the grid.
- `/course/[id]`: **course path** (`src/components/course/CoursePath.tsx`):
  - A Duolingo-style zig-zag of large nodes joined by 45° traces, laid out by
    `src/lib/network/path.ts`. Module banners show only the number and title.
  - Tapping a node opens a popover: title, one generated line (state, `about N min` from
    `estimateMinutes`, or what to finish first) and one button.
  - Locked nodes offer "Open in Explore".
  - Desktop adds a sticky side panel (cover, progress, Path/Explore toggle, up next).
  - Lesson and quiz end screens link back with `?completed=<id>`. The path draws
    `snapshotBefore` for a moment, then the real state, so the node fills and the trace lights.
    The query is then removed.
- `/lesson/[id]`: statically generated for every lesson and quiz (`dynamicParams = false`). ✕
  returns to the course path. **Deep links work for newcomers** (`deepLinkGate` in `state.ts`): a
  learner with no progress plays any lesson they're allowed to open straight away (guests: see
  [Guest sign-up gate](#guest-sign-up-gate)). Learners with progress, in Path mode, see the gate:
  "Play it anyway", "Switch to Explore", or go to the next lesson.
- **Client-only rendering:** progress-dependent pages render the `NetworkMark` loading state until
  progress loads, then draw. This also keeps reduced-motion entrances from mismatching the
  server HTML.
- **Time estimates:** `src/lib/content/estimate.ts` uses a conservative 45 seconds per card, rounded
  to whole minutes. Keep estimates honest; don't hand-write durations.

## Folder structure

```
content/                 lesson content (JSON), see above; glossary.json (shared tap-to-define terms)
public/brand/            logo files (colour, mono, tile, lockups), app-icon PNGs, icon-source.png (original),
                         mascot/<expression>.svg (generated exports)
docs/brand/mascot/       the mascot's AI concept sheet (reference only; not served)
public/illustrations/    SVGs used by explainer cards (drawn for the navy `screen` panel)
scripts/                 validate-content.ts, generate-brand-assets.ts
src/app/                 routes, layout (fonts), globals.css, theme.css (design tokens), icon.svg,
                         apple-icon.png, manifest.ts
src/cards/               card types, contract, union schema, registry; shared/ (seeded shuffle, InlineText)
src/components/player/   lesson/quiz player UI, HintReveal, coach/ (how-to-play panels and demos)
src/components/brand/    logo geometry (single source of truth) and <LogoMark>/<LogoLockup>
src/components/network/  the network motif: NetworkMark, NodeProgress, QuizNetwork
src/components/nav/      site header and phone tab bar
src/components/dashboard/ dashboard (hero, stats, activity, rings, welcome), reset button
src/components/streak/   streak icon (node chain), header pill, Today panel, calendar, goal picker,
                         goal summary for end screens, milestone screen
src/components/course/   course path, path nodes + popovers, mode toggle, course card, catalog
src/components/certificates/ certificate view, issue flow, account list; src/lib/certificates/ rules, server, PDF
src/components/leagues/  tier badges, player card, leagues page view, result screen, settings
src/lib/leagues/         league rules (week, grouping, settling, handles), server code, config
src/components/illustrations/ course covers (CourseCover registry, keyed by course id)
src/components/mascot/   the mascot: geometry + palette, poses, SVG parts, <Mascot>
src/components/ui/       Button, Markdown, icons (lucide wrappers), CountUp, ProgressRing, ThemeToggle
src/lib/content/         schemas, fs loader (load.ts), server accessors (server.ts)
src/lib/progress/        ProgressStore, localStorage impl, provider, xp, derived state
src/lib/keyboard.ts      global keyboard shortcut helpers
src/lib/glossary.ts      glossary schema, lookup and the [[term]] mark syntax (content/glossary.json)
src/lib/coach.ts         how-to-play panel keys and "seen" rules; hints.ts: hint display and XP note rules
src/lib/supabase/        env validation, typed browser/server/admin clients, generated DB types
src/lib/auth/            AuthProvider, verified user id, display-name rules, safe redirects, age.ts (13+ check)
src/lib/site.ts          production URL, name, contact; analytics.ts (events, sources, URL redaction)
src/lib/og.tsx           Open Graph / Twitter image renderer (fonts vendored in assets/og-fonts)
src/components/landing/  landing page, home switch (landing vs dashboard), CTA
src/components/feedback/ feedback form; legal/ legal page layout; nav/SiteFooter.tsx footer
content/legal/           privacy.md and terms.md (drafts; reviewer banner in an HTML comment)
docs/                    launch-checklist.md, email/ (Supabase auth email templates)
src/app/actions/         Server Actions: progress writes (server-side XP), merge, account
src/components/account/  login form, account panel, guest save-progress prompt
supabase/                Supabase CLI project (config.toml; migrations go in supabase/migrations/)
src/lib/network/         pure layout maths for the motif (quiz ring/grid, course path zig-zag + traces)
src/lib/motion.ts        shared springs, easing and stagger for UI motion
src/lib/celebrate.ts     module-complete confetti (brand colours, skipped under reduced motion)
src/test/fixtures.ts     test data builders
src/dev/                 dev-only card samples + playground (served at /dev/cards under next dev)
```

## Conventions

- **Theming:** every visual value is a token in `src/app/theme.css`. Dark mode follows the OS
  unless the toggle sets `data-theme` on `<html>`. See [Brand](#brand).
- **Pure logic goes outside components** (grading, XP, unlocks) and gets a unit test. When you add
  one, test it.
- **`src/lib/content/load.ts`** is framework-agnostic. App code imports `src/lib/content/server.ts`,
  which is `server-only`.
- **Client components** only where needed (`"use client"`). Anything that reads progress renders after
  mount, so avoid hydration mismatches: no `Math.random`/`Date` during render. The drag shuffle is
  seeded from the card id.
- **Mobile-first:** design at 360–390px wide first. Keep tap targets ≥ 44px.
- **Accessibility:** radio/pressed semantics on choices and bits, `aria-live` for feedback, visible
  focus rings, keyboard paths for everything including drag (Space, arrows, Space). **Right/wrong
  is never colour alone:** always a check or cross icon *and* text (`CardStatusNote`, footer
  heading, review badges, quiz network glyphs).

## Environment and Supabase

- **Env files:**
  - `.env.example` is committed and is the template: variable names and comments only, **never
    real values**.
  - Real values go in `.env.local`, which is git-ignored by `.env*` in `.gitignore`. Check with
    `git check-ignore .env.local`.
  - Restart `npm run dev` after editing env files.
- **Variables:**
  - `NEXT_PUBLIC_SUPABASE_URL` is the project URL.
  - `NEXT_PUBLIC_SITE_URL` (optional) overrides the production origin (default
    https://cybernettraining.com).
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is the publishable key (`sb_publishable_…`), called the
    "anon" key in older projects.
  - `SUPABASE_SECRET_KEY` is the **server-only** secret key (`sb_secret_…`). It bypasses RLS. It's
    read only by `src/lib/supabase/admin.ts` (`import "server-only"`), which only Server Actions in
    `src/app/actions/` may import. Tests enforce both rules.
  - **Never put a secret or service_role key in a `NEXT_PUBLIC_` variable.** Those values are
    bundled into browser JavaScript. `parseSupabaseEnv` rejects secret keys.
- **Clients** (`src/lib/supabase/`):
  - `getSupabaseBrowserClient()` (`client.ts`) is for Client Components.
  - `createSupabaseServerClient()` (`server.ts`, `server-only`, cookie-based via `@supabase/ssr`)
    is for Server Components, Server Actions and Route Handlers; create one per request.
  - `createSupabaseAdminClient()` (`admin.ts`, `server-only`) uses the secret key. Only Server
    Actions use it, after `requireUserId()`.
  - All read env through `getSupabaseEnv()` and throw `SupabaseEnvError` with setup instructions
    if values are missing. **Without Supabase env vars the app still builds and runs guest-only**
    (the Proxy, AuthProvider and header all check). Keep it that way.
- **Types:** regenerate `database.types.ts` after any schema change with
  `npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts`.
- **CLI:** use `npx supabase …`. Migrations live in `supabase/migrations/`; create them with
  `npx supabase migration new <name>`. Docker isn't available here, so verify the remote schema
  with `npx supabase db query --linked -f <file>` (catalog queries) rather than `db diff`. If SQL
  was applied by hand in the dashboard, check it matches, then run
  `npx supabase migration repair --status applied <version> --linked`.

## Accounts and sync

### Auth (`@supabase/ssr`, App Router)
- **Sign-in:** Google, or an email magic link (`/login`). **Accounts are 13+:** `/login` requires an
  "I'm 13 or older" checkbox before either button (it leaves a local pending flag, and
  `AgeGate` saves `age_confirmed` via `confirmAgeAction` right after sign-in). Signed-in accounts
  without a confirmation (made before the check) see a one-time full-screen prompt; "I'm under
  13" signs them out. Guests of any age can play. The only personal data we collect is the
  email and a display name. Learners may be 12, so there are no avatars, birthdays or real names:
  - `/account` suggests a nickname.
  - A trigger strips `avatar_url`, `picture`, `full_name` and `name` from auth user metadata.
    Supabase still keeps the provider's data in `auth.identities`, which account deletion removes.
- **`src/proxy.ts`** (Next 16's name for Middleware) refreshes the session cookie on each request
  with `getClaims()`. It doesn't gate pages.
- **`/auth/callback`** exchanges `?code=` (Google, and the default magic-link email, which uses PKCE
  and so needs the same browser) or `?token_hash=&type=` (`verifyOtp`). Redirects only go to
  same-site paths (`safeNextPath`). New users without a display name go to `/account?welcome=1`.
- **Redirect URLs** (Supabase → Auth → URL Configuration): the Site URL is
  `https://cybernettraining.com`, and `https://cybernettraining.com/auth/callback`,
  `http://localhost:3000/auth/callback` and `https://cyber-net-training.vercel.app/auth/callback`
  are allowed (see `docs/launch-checklist.md`, which also covers preview deployments). Any other
  origin (a phone on the LAN) must be added there, or sign-in falls back to the Site URL.
- **Google sign-in** is in Testing mode (only allow-listed test accounts can use it). The
  "Continue with Google" button (`src/components/account/GoogleSignInButton.tsx`) follows Google's
  Sign in with Google branding guidelines, so the app can be published:
  - Google's official full-colour "G" (`public/brand/google/google-g.png`, from Google's asset pack;
    the README there says exactly how, and a test pins the file) at its fixed 20px.
  - Google's light theme (white, `#747775` stroke) or dark theme (`#131314`, `#8E918F` stroke),
    following ours via the `google-*` tokens; Google Sans Medium 14/20 (`next/font`, loaded only
    there); 12px / 10px / 12px padding; 4px corners; 44px tall for our tap targets.
  - It's the one third-party brand in the UI, an exception to the lucide-only icon rule and the
    palette. Don't restyle it to match our buttons, and don't use the `google-*` tokens elsewhere.
- **Identity on the server** comes only from `requireUserId()` (`src/lib/auth/server.ts`), which
  calls `auth.getUser()`. **Never use `getSession()` on the server, and never accept a user id from
  the client.** `src/lib/auth/server-actions.test.ts` checks every action, and that `getSession(`
  appears nowhere in `src/`.
- **`AuthProvider`** (`src/lib/auth/AuthProvider.tsx`) holds the UI's auth state from
  `onAuthStateChange`, plus the display name.
  - It creates the browser client only in effects, so server and client render the same markup.
  - It also chooses the progress store (see below).
  - `useAuth()` exposes the auth state, whether accounts are available, `refreshProfile()` and
    `signOut()`.
- **Header:** guests see "Sign in" (desktop header, and the third phone tab). Signed-in learners
  see their initial as a node, plus their name on desktop, linking to `/account`.
- **`/account`:** edit the display name (via the user's own session, so RLS and the column grant
  apply), sign out, and delete the account after a confirmation step.
- **Account deletion:** `deleteAccountAction` calls `auth.admin.deleteUser`. Every table references
  `auth.users` with `ON DELETE CASCADE`, so the profile and all progress go with it.

### Progress: which store, and who decides XP
- **Guests:** `LocalStorageProgressStore`, unchanged.
- **Signed in:** `SupabaseProgressStore` (`src/lib/progress/supabaseProgressStore.ts`):
  - **Reads** use the browser client with the user's session; RLS limits them to their own rows.
    `rows.ts` maps rows to the snapshot, deriving best score and first pass from attempts.
  - **Writes** call Server Actions (`src/app/actions/progress.ts`). The UI updates optimistically,
    then takes whatever the server stored, and re-reads everything if a write fails.
- **Swapping stores:** `ProgressProvider` accepts a changing store (`null` means not ready), so
  components never know which store is in use.
- **The server is the XP authority** (`src/lib/progress/authority.ts`, pure and tested):
  - **Cards:** XP comes from the content's difficulty and `xp.ts`. The client's number only
    signals first try or retry, so at worst a tampered client earns the first-try amount.
  - **Lessons:** +20, only once every core card is recorded.
  - **Quizzes:** attempts are **re-graded on the server** from their raw answers, using
    `src/cards/grading.ts` (card type → pure grade function, no React). +50 for the first pass
    only.
  - **Daily goals:** each XP-earning action also inserts the XP event, dated **on the server** in
    the learner's time zone (validated IANA name; never earlier than their latest event), and
    inserts the met day when the ledger's total for that day reaches the profile's goal. A card
    that's already complete becomes practice (`practiceXpFor`, once per card per day; a unique
    index backs it up). Actions return `{ completion | attempt, xp: XpWrite }` so the browser store
    swaps its optimistic event for what the server stored.
- **Adding a card type** now includes registering its grader in `src/cards/grading.ts`; the
  compiler enforces it.

### Guest → account merge (`src/lib/progress/merge.ts`, tested)
- **When it runs:** on sign-in, if this browser has guest progress, `mergeGuestProgressAction`
  merges it on the server. The browser then clears local progress (`LocalStorageProgressStore.clear()`).
  If the merge fails, local progress is kept for the next try.
- **Rules:**
  - Cards and lessons: the union, keeping the **earliest** `completedAt` (the activity chart
    depends on it).
  - Quiz attempts: the union, de-duplicated by time, and re-graded.
  - XP is **recomputed** from the content, never added up.
  - Unknown ids are dropped.
  - Path/Explore: the guest's non-default choice wins. Daily goal: the guest's wins if they chose one.
  - Daily-goal ledger (`mergeLedger`): guest events are re-priced from the content, must be
    plausible for their own time and time zone (`plausibleEvent`: not in the future, not
    backdated), and first-time XP (card, lesson, quiz pass) counts once ever across both sides.
    Met days are the **union**: the account's plus each guest met day whose merged XP really
    reaches its goal, so the streak afterwards is at least as long as either.
  - Merging is idempotent, so repeated sign-ins are safe.
- **Save prompt:** guests see "Save your progress?" on the lesson-complete screen when the next
  lesson is one they can play (otherwise the sign-up gate shows there instead). Dismissing it sets
  `cybernet.savePrompt.dismissed`, and it never shows again in that browser.

### Guest sign-up gate
Guests play **each course's first lesson** and every lesson in a module with `"openToGuests": true`
(free modules only; every `alwaysFree` help module must have it, `load.test.ts` checks). Every other
free lesson needs a **free account**; Pro needs Pro. The loader sets `lesson.guests` (and the
outline's), and everything reads it: `lessonAccessLevel()` in `src/lib/pro/access.ts` →
`"guest" | "account" | "pro"`.
- **Enforced on the server:** only guest lessons carry their cards in the static page
  (`publicLesson`); the rest come from `/api/lessons/[id]`, which answers `401 { reason: "account" }`
  to guests. Without Supabase env vars (no accounts possible) free lessons stay open.
- **The screen** (`src/components/account/SignUpGate.tsx`): "Create a free account to keep going.
  Your XP comes with you." (with the lesson's XP on the lesson-complete screen), four perks, the
  shared `SignInOptions` (13+ check, Google, email link) and a plain **Not now**. No timers, counts
  or guilt. Shown on a gated lesson's page, and on the lesson-complete screen when a guest's next
  lesson needs an account. On the course path those nodes carry a person badge and "Create a free
  account".
- **Back to the lesson:** `SignInOptions` saves the path in a one-hour, same-site cookie
  (`cybernet_next`, `src/lib/auth/afterSignIn.ts`) that `/auth/callback` reads and clears; new
  accounts pick a name on `/account?welcome=1&next=…` and carry on there. `/login?next=` works too.
- **Progress:** the usual guest merge, plus `withoutGatedGuestProgress`: guest records on account
  lessons made after `GUEST_GATE_AT` (in `merge.ts`, set when the gate shipped) are dropped, since a
  guest couldn't have played them.
- **Events:** `signup_prompt_viewed` (lesson) when the gate shows, and `signed_up` (the lesson that
  prompted it, kept for a day in localStorage) when a new account has chosen its name.

### Schema (`supabase/migrations/`)
Migrations, all applied to the linked project:
- `20260930120000_accounts_and_progress.sql`: the tables, RLS, grants and triggers.
- `20260930130000_revoke_extra_authenticated_privileges.sql`: removes Supabase's default
  `TRUNCATE`, `REFERENCES` and `TRIGGER` from `authenticated`. TRUNCATE ignores RLS.
- `20260930140000_profiles_sound_enabled.sql`: `profiles.sound_enabled` (default true).
- `20260930150000_profiles_coach_seen.sql`: `profiles.coach_seen` (text[], default empty, at most 32).
- `20260930160000_age_confirmed_and_feedback.sql`: `profiles.age_confirmed`, and the `feedback`
  table with its rate-limit trigger.
- `20260930170000_streaks_and_daily_goals.sql`: `profiles.daily_goal`, `daily_goal_chosen` and
  `time_zone`, and the `xp_events` and `goal_days` tables.
- `20260930180000_pro_subscriptions.sql`: the four Pro tables (see [CyberNet Pro](#cybernet-pro)).
- `20261001000000_drop_is_premium.sql`: drops the unused `profiles.is_premium` (Pro comes from
  subscriptions and grants).
- `20261001100000_leagues.sql`: the league tables and functions (see [Leagues](#leagues)), plus
  `xp_events` indexes on time.
- `20261001200000_certificates.sql`: `certificates` and `verify_certificate()` (see
  [Certificates](#paywall-and-certificates)).

| Table | Holds |
|---|---|
| `profiles` | `id` (= auth user), `display_name` (1 to 40 chars, nullable until chosen), `learning_mode` (`path` or `explore`), `sound_enabled` (default true), `coach_seen` (how-to-play panels dismissed), `age_confirmed` (13+ confirmed; never a date of birth), `daily_goal` (20, 50 or 100; default 50), `daily_goal_chosen`, `time_zone` (IANA name, for dating days) |
| `card_completions` | `(user_id, lesson_id, card_id)` primary key, `completed_at`, `xp` (0 to 20) |
| `lesson_completions` | `(user_id, lesson_id)` primary key, `completed_at`, `xp` (0 to 20) |
| `quiz_attempts` | `id`, `user_id`, `quiz_id`, `attempted_at` (unique per user and quiz), `score` 0 to 1, `passed`, `xp` (0 to 50), `answers` jsonb |
| `xp_events` | `id`, `user_id`, `at`, `day` (local date), `time_zone`, `kind` (`card`, `lesson`, `quiz`, `practice`), `lesson_id`, `card_id?`, `xp` (0 to 50); practice unique per user, day and card |
| `goal_days` | `(user_id, day)` primary key, `time_zone`, `goal` (the goal that day), `met_at` |
| `feedback` | `id`, `created_at`, `message` (1 to 1,000 chars), `lesson_id?` (kebab-case), `rating?` (1 to 5), `session_id` (random per tab). **Not linked to users.** |

- **Not stored:** best score and first pass are derived from attempts, and total XP is summed from
  rows.
- **Triggers:** `on_auth_user_created` creates the profile; `strip_provider_metadata` removes
  avatar and real-name fields.

### Row Level Security rules
- RLS is **on for every table**.
- **Reads:** `authenticated` users may **select only their own rows** (`auth.uid() = user_id`, or
  `= id` for profiles).
- **Writes:**
  - Users may **update only `profiles.display_name`**, on their own row. There's a column-level
    grant and an update policy; `learning_mode`, `sound_enabled`, `coach_seen`,
    `age_confirmed`, `daily_goal`, `daily_goal_chosen` and `time_zone` aren't writable (Server
    Actions set them with the secret key).
  - **`xp_events` and `goal_days` are read-only for learners** (select own rows only, no write
    grants), so nobody can write their own streak.
  - **Certificates:** owners select only their own; nobody writes them except the server (secret
    key). The public page reads one valid certificate's `name`, `course_id` and `completed_on`
    through `verify_certificate(id)` (security definer; nothing for revoked or unknown IDs).
  - **Leagues:** learners select only their own `league_players` row and `league_results`. Other
    learners are visible **only** through `league_standings()` (security definer): rank, handle,
    tier, weekly XP and the Pro flag, for the caller's own league this week, hidden learners left
    out, nothing while leagues are closed. `leagues`, `league_members`, `league_weeks`,
    `league_state` and `handle_reports` are server-only. `join_league` and `finalize_league_week`
    can only be called with the secret key; `leagues_open()` (a yes/no) is open to everyone.
  - **`feedback` is insert-only:** `anon` and `authenticated` may insert only `message`,
    `lesson_id`, `rating` and `session_id` (column grant + an insert policy). Nobody can select,
    update or delete except the service role (read it in the Supabase dashboard). A `security
    definer` trigger limits each session to 5 per hour and everyone to 30 per minute. The
    session id comes from the browser, so the global cap is the real backstop.
  - Progress tables have **no write policies or privileges** for `anon` or `authenticated`. All
    progress writes go through Server Actions with the secret key, so users can never set their
    own XP.
- **`anon`** has no privileges except inserting feedback, and `authenticated` has only `SELECT`
  on its own rows, `UPDATE (display_name)` on profiles, and inserting feedback. The second migration removed Supabase's default `TRUNCATE`,
  `REFERENCES` and `TRIGGER`. New tables get those defaults again, so revoke them in the same
  migration.
- **`npm run check:rls`** proves all of this against the linked project. It uses two throwaway
  users, signed in with admin-generated magic-link tokens, so no emails are sent. It also checks
  the triggers and the delete cascade, then cleans up. Run it after any schema or policy change.
- **Testing sign-in without email:** Supabase's built-in email sender has a low hourly limit. For
  automated tests, use `auth.admin.generateLink()` and open `/auth/callback?token_hash=…&type=magiclink`.

## CyberNet Pro

**Live in production** (live Stripe keys, prices and webhook secret in Vercel **Production** only).
Local dev and previews use the Stripe **sandbox** (test keys; live keys are refused there).
Sandbox setup: `docs/stripe-checklist.md`. `PRO_LAUNCH_AT` in Production marks the launch.

- **What's Pro:** modules with `"access": "pro"`. The first module of each course and every help
  module (e.g. Stay Safe Online's "When Things Go Wrong") are free; tests enforce both.
- **Pro content never reaches the browser without entitlement:** lessons load from
  `/api/lessons/[id]` (`private, no-store`): free lessons for anyone; Pro lessons only after
  `requireUser()` and `getEntitlement()` (401 guest, 403 no Pro). Progress Server Actions check
  entitlement again before writing XP for a Pro lesson (`ProRequiredError`). The guest merge keeps
  Pro progress made before launch, and drops Pro progress from after launch unless the account has
  Pro (`withoutUnentitledPro`), since guests can't open Pro lessons then.
- **Entitlement** (`src/lib/pro/entitlement.ts`, pure, tested): a subscription that's `trialing`,
  `active` or `past_due` whose period hasn't ended (plus `RENEWAL_GRACE_MS`, 2 days), or an
  unexpired early-user grant. `past_due` keeps Pro while Stripe retries a failed renewal; when
  Stripe gives up it cancels, and Pro ends. How long that takes is Stripe's retry setting (Billing →
  Revenue recovery): up to about two weeks, then cancel.
- **Only Stripe grants Pro:** Checkout (`startCheckoutAction`, 7-day trial for a first subscription,
  13+ confirmed) and the Customer Portal (`openPortalAction`) are hosted by Stripe; card details
  never reach us. The webhook (`/api/stripe/webhook`) verifies Stripe's signature first, records
  each event once (`stripe_events`), and always re-fetches the subscription from Stripe before
  saving it, so duplicates and out-of-order events are safe. `/pro/welcome` syncs the session too,
  after checking it belongs to the signed-in learner.
- **Early-user grant:** accounts created before `PRO_LAUNCH_AT` get 30 days of Pro once, on their
  first visit after launch (`pro_grants`), with a one-time thank-you on the dashboard.
- **Keys** (`src/lib/pro/env.ts`, `stripe.ts`): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`, optional `PRO_LAUNCH_AT`; server-only. **Live keys
  are refused everywhere except the production deployment** (`VERCEL_ENV=production`). Amounts
  live in Stripe, never in code (`/pro` reads them and works out the annual saving).
- **UI:** Pro nodes on the course path show the Pro badge in place of the lock and open the upgrade
  sheet; `/pro` (plans, FAQ); `/pro/welcome`; the Pro panel on `/account` (plan in one line from
  `proLine()`, "Manage subscription" → the portal). Deleting an account deletes the Stripe customer
  first, which cancels any subscription.
- **Tables** (`20260930180000_pro_subscriptions.sql`): `stripe_customers`, `subscriptions`,
  `stripe_events`, `pro_grants`. Learners read only their own subscription and grant; nobody but
  the service role writes any of them (`check:rls` proves it). Besides Server Actions, only
  `src/lib/pro/server.ts` (server-only) and the signature-checked webhook may use the secret-key
  client (`server-actions.test.ts`).
- **End-to-end:** with `stripe listen` forwarding to the dev server, a scratch Playwright script
  runs real Checkout and portal pages with test cards and test clocks (monthly with trial, annual
  without, portal cancel, a failed renewal, the grant expiring); see the checklist's step 10.

## Paywall and certificates

Honest conversion: no timers, no fake urgency, no guilt; "Not now" is always there, and "Ask a
parent or guardian before subscribing" is shown to everyone.

- **"What's next"** (`src/components/pro/WhatsNext.tsx`) replaces the bare Pro lock: the next Pro
  module's title, its lessons with their icons, its playable **teaser card** (`TeaserCard`: a
  sandbox, no XP and nothing saved, with the hint and explanation) and one CTA: "Start your 7-day
  free trial" (or "Upgrade to Pro" after a first subscription; guests sign in first). Shown in the
  course path's sheet (Pro nodes), on a Pro lesson's page, and on the quiz-pass screen after the last
  free module.
- **Unlock celebration:** `/pro/welcome` (the mascot celebrating, one confetti burst), then "Keep
  learning" returns to the course the learner was upgrading from (`?unlocked=1`), where the Pro
  nodes light up one by one (120ms apart; the final state at once under reduced motion).
- **Certificates (Pro)** (`src/lib/certificates/`): passing a course final (the last module's quiz,
  judged from server-graded `quiz_attempts`) and having Pro lets the learner create one at
  `/course/<id>/certificate`. The name is theirs to choose (1–60 letters, spaces, apostrophes,
  hyphens and full stops; no digits, emails, web addresses or profanity: `checkCertificateName`),
  never their email. IDs are `CNT-XXXX-XXXX-XXXX` (60 random bits, Crockford base32, unguessable).
  The completion date is the day the final was first passed, in the learner's time zone. One valid
  certificate per course; re-issuing (e.g. a new name) revokes the old ID. Free learners who finish a
  course see a watermarked preview and the upgrade CTA.
- **Sharing:** the PDF (`/api/certificates/<id>/pdf`, owner only; `@react-pdf/renderer`, server-side,
  Plex fonts and the logo geometry, kept out of the server bundle by `serverExternalPackages`), the
  public check page `/certificate/<id>` (name, course, date and ID only; not indexed), and "Add to
  LinkedIn": LinkedIn no longer pre-fills certificates, so the button opens its form and the page
  lists each value with a copy button (`linkedInFields`). Certificates are listed on `/account`.

## Leagues

Weekly leagues and player cards, to bring learners back each week. Pure rules in
`src/lib/leagues/` (tested in `leagues.test.ts`), server code in `src/lib/leagues/server.ts`
(server-only), actions in `src/app/actions/leagues.ts`, UI in `src/components/leagues/`. Every
number is in `src/lib/leagues/config.ts`.

- **The week:** Monday 00:00 **Australia/Sydney** to the next Monday (`leagueWeek`, and the
  database's `league_week()`; daylight saving tested). Weekly XP is every `xp_events` row in that
  window (card, lesson, quiz and practice), summed on the server; never from the client. The page
  shows the reset in the learner's own time zone too.
- **Joining:** a signed-in learner's first XP of the week puts them in a league (`onXpEarned`, run
  with `after()` from `recordXp`, never blocking the XP). Their player row (generated handle, tier
  Packet, shown on leaderboards) is made then. Not playing a week keeps your tier.
- **Grouping:** same tier only, then an activity band from the last 3 weeks' XP (light < 100 a
  week ≤ regular < 400 ≤ keen). `join_league` puts them in the first league of their tier with space
  (under 30), own band first then the nearest, and makes a new league only when all are full, under
  a lock per week and tier (no duplicates, never over 30).
- **Settling** (`settleLeague`, pure): ranked by weekly XP, ties to whoever got there first, then
  the handle. The top 20% move up (at least 1 in leagues of 3+, and only with 50+ XP), the bottom
  15% move down (at least 1 in leagues of 6+). Never above Quantum or below Packet. Hidden learners
  aren't ranked and keep their tier. Vercel Cron calls `/api/cron/leagues` hourly (`vercel.json`;
  `CRON_SECRET`, checked first): `finalizeDueWeeks` settles every finished week since leagues opened,
  each in one transaction (`finalize_league_week`; a second run changes nothing).
- **Hidden until there are players:** leagues (page, nav entry, standings) stay hidden until
  `LEAGUES_MIN_ACTIVE` (20) learners earn XP in one week, then stay open for good (`league_state`).
  No promotions before that, so everyone starts in Packet. **Never add fake or bot players.**
- **Tiers** (lowest first): Packet, Switch, Router, Firewall, Server, Mainframe, Quantum.
  `TierBadge` draws them on the logo's shield (concept: `docs/brand/leagues/tier-badges.png`):
  outline (Packet, Switch), dark-cyan fill (Router, Firewall), reversed bright cyan with a navy icon
  (Server, Mainframe; Mainframe is a wide multi-cabinet unit), purple Quantum. Always shown with the
  tier's name (`TierLabel`), never the badge alone.
- **Player cards** (`PlayerCard`; concept: `docs/brand/leagues/player-card.png`): the avatar circle
  holds the tier badge (**never photos**), the handle, the tier, and on your own card total XP
  (bolt), streak (node chain, no flame) and courses completed. Other learners' cards show only the
  public fields: handle, tier, weekly XP and Pro.
- **Pro is cosmetic only:** no extra XP or ranking advantage. Pro cards get the Pro frame and badge;
  `pro_cosmetic_until` is stamped from `getEntitlement()` (`proCosmeticUntil`).
- **Handles** (`handles.ts`): generated as two brand words and a number ("SwiftRouter42"),
  re-rolled if the filter objects. Learners can change theirs once a week: 3–20 letters and digits,
  starting with a letter, at most 3 digits (no phone numbers or birth years), unique ignoring case,
  no profanity (`obscenity`, with leetspeak) and no names, contact or social words, or staff words.
  The private display name is never public.
- **Safety:** "Show me on leaderboards" (on by default) hides the learner from every public view.
  Any handle in your league can be reported (`handle_reports`, at most 10 a day); when 3 different
  learners report the same handle it's replaced with a generated one (reports are kept). The cron
  emails yesterday's (Sydney) reports to `CONTACT_EMAIL` from 8 am, only on days with reports, via
  Resend (`RESEND_API_KEY`; one idempotency key per day, so hourly retries never send twice).
- **Screens:** `/leagues` (badge, league name, countdown, ranked list with promotion and demotion
  zones marked by arrows and text, your card, settings); a result screen once after each reset
  (promoted: the mascot celebrating, confetti and the new badge; stayed or moved down: gentle).
  Leaderboard settings are also on `/account`. The nav entry (Trophy) shows only to signed-in
  learners once leagues are open.
- **Testing:** `check:rls` proves the league rules with throwaway learners in Quantum leagues (where
  no real learner can be), opening leagues only for a moment and putting `league_state` back.
  Previews share the production database, so never leave leagues open or test leagues behind.

## Brand

### Concept: the network
The logo is a shield containing a hub node joined to four nodes. **Nodes and connections are the
visual language of the whole app:** learning means connecting nodes.
- **Course path:** lessons are large nodes (72px, the quiz hub 96px) zig-zagging down 45° circuit
  traces. States are shown by shape and icon, never repeated words:
  - Every lesson node shows its **lesson icon** (the quiz hub shows the network mark):
  - Done: filled cyan with the icon, plus a small check badge in the corner.
  - Current: a cyan ring, a pulse and a "Start"/"Continue" bubble.
  - Available: a cyan outline with the icon.
  - Locked: dim, with the icon faded and a small lock badge in the corner.
  - Screen-reader labels stay "Lesson 3, Routers and Hops, locked". The popover and the
    lesson-complete screen show the icon beside the title.
  Nodes sit on a solid "lip" (`shadow-node`, `shadow-node-lit`). Connections light up once the node
  before is done.
- **Lesson progress:** `NodeProgress` shows one node per card on a trace. Challenge cards are
  diamonds; skipped challenges are amber outlines.
- **Feedback:** a correct answer sends a pulse along the trace to the card's node (~370ms). A wrong
  answer gives a ~250ms soft shake, with no pulse.
- **Completion:** the mascot celebrates on lesson complete (see [Mascot](#mascot)). Quiz results use a
  ring of question nodes around a hub (`QuizNetwork`), switching to a compact grid above 8
  questions (`QUIZ_RING_MAX`). Passing lights the hub.
- **Loading and empty states** use `NetworkMark` too: `loading` lights nodes in sequence, and `dim`
  marks locked or empty states. Never use grey skeleton blocks.

### Logo
- **Geometry** is on a 64-unit grid in `src/components/brand/geometry.ts`: a symmetric shield,
  hub r=6, four nodes r=4.25 on exact 45° diagonals, and one even stroke (3) for the shield and
  connectors. Everything is drawn from these numbers.
- **In the UI:** `<LogoMark variant="color|mono|tile">` and `<LogoLockup>` (the header).
- **Static files:** `npm run brand:assets` writes
  `public/brand/logo-{color,mono,tile,lockup,lockup-dark}.svg` and `src/app/icon.svg`. The PNG app
  icons (`src/app/apple-icon.png`, `public/brand/icon-192.png`, `icon-512.png`) are rasterised from
  `logo-tile.svg`; re-export them if the geometry changes.
- **Don't** redraw the mark by hand, add effects to it, or recolour it outside cyan, navy or
  `currentColor`. The original artwork is `public/brand/icon-source.png`.

### Colour tokens (`src/app/theme.css`)
All colours are tokens, written as `light-dark(light, dark)`. **Dark (navy) is the flagship
theme**; light mode is the same brand with navy text, cyan accents and off-white surfaces. Every
text pairing meets WCAG AA (≥ 4.5:1), and UI outlines meet 3:1.

| Token | Use |
|---|---|
| `canvas`, `surface`, `surface-raised` | page, cards, hover/inset (navy family) |
| `screen`, `on-screen`, `on-screen-muted` | always-navy panel for illustrations, in both themes |
| `line`, `line-strong` | borders, unlit connections, dim nodes |
| `ink`, `ink-muted`, `ink-faint` | text, from strongest to weakest |
| `accent` | **cyan fill**: primary buttons, lit nodes, progress. Same in both themes |
| `accent-ink` | **cyan as text, strokes, rings or focus outlines** (darker `#006E9E` in light mode) |
| `accent-strong`, `accent-soft`, `on-accent` | hover fill, tinted background, navy text on cyan |
| `success`, `success-soft`, `on-success` | correct answers (mint on navy, green on light) |
| `danger`, `danger-soft`, `on-danger` | wrong answers, errors (coral) |
| `warning`, `warning-soft` | challenge cards, cautions (amber) |
| `grid-dot` | background node-grid texture (never cyan) |

**Rules:**
- **Cyan means interactive or progress, and nothing else.** That covers buttons, focus, current and
  lit nodes, lit connections, XP and "lesson complete". It never goes on headings, icons used as
  decoration, or illustration chrome.
- **Fills vs strokes:** use `accent` for fills and `accent-ink` for text, strokes and rings. Bright
  cyan on white is only 2:1.
- **Correct is mint (`success`), not cyan,** so "right" and "interactive" are never confused.
- **Glow (`shadow-glow`)** is only for lit cyan nodes and the primary button. **One exception:** the
  Pro player card's frame (`drop-shadow-pro`).
- **Purple belongs to the Quantum tier badge alone** (`--color-quantum`, `drop-shadow-quantum`;
  7.3:1 on the badge's navy tile, which is navy in both themes). Never use it anywhere else.
- **Never raw hex in components.** If you need a new colour, add a token (both themes) and check
  its contrast.

### Typography
- **IBM Plex Sans** for all UI text: engineered, very readable, with distinct `Il1` and `0O`.
- **IBM Plex Mono** for technical values only: binary digits, IP addresses, ports, commands,
  place values, XP counts, card numbering and eyebrow labels. Never for sentences.
- **Scale** (tokens `text-*`, 17px body for young readers, ratio about 1.2): `caption` 13,
  `small` 15, `body` 17, `lead` 20, `title` 24, `headline` 30, `display` 38. Headings are Plex Sans
  600 with slight negative tracking. Don't use Tailwind's default `text-sm`, `text-lg`, etc.
- **Token names:** don't create a colour token whose name matches a text-size token (for example
  `--color-display`), because both would generate the same `text-*` utility.

### Shape and spacing
- **Radii:** `rounded-sm` (4px) for chips and key hints, `rounded-control` (8px) for buttons and
  options, `rounded-card` (12px) for cards. These are tighter than typical SaaS, to feel technical.
- **Fully round (`rounded-node`) is only for nodes,** which keeps the node shape special.
- **Spacing:** Tailwind's 4px scale plus the `gutter` and `section` tokens and the `max-w-lesson`,
  `max-w-page` and `max-w-wide` (dashboard, catalog, course path) containers.

### Icons
- **lucide-react only,** imported from `src/components/ui/icons.tsx`, which sets `strokeWidth` 1.75
  and round caps/joins to match the logo. Add new icons there.
- **Custom drawing** is allowed only for the logo, node shapes, the mascot and illustrations (explainer SVGs and
  course covers). No emoji as icons. The only third-party logo is Google's "G" on the sign-in
  button (see Auth).

### Motion
- **Purposeful and quick:** feedback animations stay under 400ms, and celebrations about 1s.
  Easing is `ease-out-quick` (`cubic-bezier(0.22, 1, 0.36, 1)`).
- **Correct:** a pulse along the trace plus a node ripple. **Wrong:** a small shake. Feedback never
  bounces.
- **Springs:** presses, hovers and popovers may use a spring with a small overshoot
  (`PRESS_SPRING`, `POPOVER_SPRING` in `src/lib/motion.ts`, about 7%). Nothing else bounces.
- **Entrances:** dashboard blocks rise in with a 60ms stagger, and path nodes pop in with a 30ms
  stagger, capped so long lists don't drag (`staggerDelay`).
- **Numbers and rings** animate up to their value (`CountUp`, `ProgressRing`) and animate again
  when the value changes.
- **Module complete:** one short confetti burst in brand colours on the quiz pass screen
  (`celebrate()`).
- **The only loops** are the current-node pulse (2.4s), the loading sequence, the slow moving
  part on course covers (the packet, the sliding RAM stick), and the light travelling round the Pro
  player card's frame (`animate-pro-trace`, 7s). Mainframe's lights are static dots.
- **`prefers-reduced-motion`:** every animation must render its final state instantly. Use
  `useReducedMotion()` for motion components; CSS keyframes are neutralised in `globals.css`.

### Mascot
The mascot (called `Mascot` in code; the character's name isn't decided) is the logo come to life.
Reference sheet: `docs/brand/mascot/expression-sheet.png` (AI concept, never shipped).

- **Anatomy** (`src/components/mascot/`, 200 × 232 viewBox):
  - **Head:** the exact logo shield path, scaled 2.3× and tilted per pose.
  - **Face:** built on the logo's nodes. The top two are large eyes (cyan, navy pupils, white
    highlight), the hub is a small nose/core, and the bottom two are cheek lights joined to it by
    the logo's connectors. A small smile sits below.
  - **Body:** chibi proportions. The head is about half the height, above a small torso with a belt.
  - **Limbs:** outlined tube arms and legs, with glowing joints at the shoulders, elbows and knees,
    and boots.
  - **Antenna:** rises from the shield apex and ends in a glowing node that works as a mood light.
- **Fixed shapes:** the mouth (`MOUTH_PATH`), mitten hand (`HAND_PATH`) and boots (`BOOT_PATH`) are
  defined once in `geometry.ts` and are identical in every pose. The only other hand is
  `POINTING_HAND_PATH`, used by `presenting` alone. Tests enforce both.
- **Expressions** (`poses.ts`), which are data only:

  | Expression | Pose |
  |---|---|
  | `happy` | waving |
  | `thinking` | hand to chin, antenna dimmed |
  | `celebrating` | arms up, happy arc eyes, hop, bright antenna |
  | `confused` | shrug, eyes looking different ways, flickering antenna |
  | `alert` | wide eyes; face nodes, joints and antenna in coral |
  | `presenting` | pointing the way |
- **Colours:** fixed in both themes, like the `screen` panel, via the `--color-mascot-*` tokens:

  | Part | Colour |
  |---|---|
  | Body and head fill | `#122B52` |
  | Line, eyes and lights | cyan `#00C2FF` |
  | Pupils | `#041937` |
  | Highlight | white |
  | Alert | coral `#FF7A7A` |

  The navy fill keeps the silhouette readable on both canvases. `MASCOT_HEX` mirrors the tokens
  for static exports, and a test keeps them in sync.
- **Motion:**
  - `idle` adds an occasional blink, the antenna's mood pulse, and a short wave when happy.
  - Changing `expression` plays a small spring bounce (`PRESS_SPRING`).
  - Motion wrappers are always rendered, so server HTML never depends on the reduced-motion
    setting.
  - Under reduced motion it's static.
- **Accessibility:** decorative by default (`aria-hidden`). Pass `label` (or `label` alone for the
  default description) when it carries meaning.
- **Where it appears** (restrained, to delight, not distract):
  - the landing page hero and the dashboard's welcome (`happy`, waving)
  - lesson complete (`celebrating`)
  - module quiz pass (`celebrating`, with the confetti)
  - streak milestones (`celebrating`, on their own screen before lesson or quiz complete; confetti
    from 30 days)
  - quiz fail (`thinking`, with encouraging copy)
  - league results after the weekly reset (`celebrating` with confetti when promoted, `happy` when
    staying, `thinking` when moving down)
  - wrong answers in lessons (a small `confused` beside the feedback)
  - the age check, the locked lesson screen, the 404 page, empty states and the dashboard's
    "Fresh start" note after a streak ends (`presenting`, pointing at the next step)
  - **the one exception inside cards:** a **safety-note explainer** (`mascot: "presenting"`), which
    shows the mascot beside the body in an amber panel. Use it only for real-world safety (e.g.
    "don't open real devices"), at most once per lesson.
- **Where it must not appear:**
  - inside cards or card content (apart from safety-note explainers), or in the lesson header
  - on correct answers (so it never gets repetitive)
  - on the course path or in navigation
  - more than once per screen
- **Static exports:** `npm run brand:mascot` renders the same parts, with hex colours and no motion,
  to `public/brand/mascot/<expression>.svg` for videos and socials. A test fails if they go stale.

### Sound and haptics
- **Sounds are synthesised** with the Web Audio API in `src/lib/sound.ts`: short oscillator notes
  with soft envelopes. **Source: original, written for this project; no audio files, nothing to
  license.**
- **Sounds:** correct, wrong, card complete, lesson complete, daily goal reached, part removed and snap. All are under
  300ms except the chime, and quiet.
- **Never before interaction:** `installAudioUnlock()` (in `Providers`) only creates the audio
  context on the first tap or key press. Before that, `playSound` is a no-op.
- **The toggle:** `SoundToggle` in the header sets `preferences.sound` (default on). It's saved with
  progress: `profiles.sound_enabled` for signed-in learners, written only by `setPreferencesAction`.
- **Haptics:** `navigator.vibrate` (Android browsers; iOS ignores it), light patterns only. They
  follow the sound switch and are off under reduced motion.
- **Use `useFeedback()`** (`src/lib/feedback.ts`) from components; never call the Web Audio API
  directly.

### Anti-generic rules
- No purple, pink or rainbow gradients. No gradients at all, apart from the faint background
  node grid. (The only purple is the Quantum badge's, above.)
- No glassmorphism: no `backdrop-blur`, no translucent panels. Headers are solid `canvas` with a
  hairline border.
- No emoji as icons, and one icon set.
- No generic grey or black dark mode: surfaces are navy.
- Round shapes are for nodes (and progress rings) only. Glow is for cyan interactive elements only.
- New screens should use the network motif for loading, empty, success and locked states.

### Copy rules (dashboard, catalog, course path and any new page)
- **Cut text.** Headings are at most about 4 words. Any description is one line at most (truncate
  rather than wrap). No paragraphs of explanation on navigation pages.
- **State is visual.** Show done, current, available and locked with shape, colour *and* icon, not
  repeated labels like "Locked" on every row. The screen-reader label carries the words.
- **No metadata clutter.** Card counts, "x/y done" and similar belong in a popover or side panel,
  and only if they help a decision. Never put them on the path itself.
- **Tap to reveal.** Details (title, the one-line status, the action) appear in a popover on tap,
  not all at once.
- **One primary action per view:** the dashboard's Continue, the popover's Start, the welcome's
  Start learning.

## Launch: domain, SEO, analytics, legal, feedback

### Domain and SEO
- **`src/lib/site.ts`**: `siteUrl()` (production origin, `NEXT_PUBLIC_SITE_URL` or
  https://cybernettraining.com), `SITE_NAME`, `CONTACT_EMAIL` (hello@cybernettraining.com).
  `metadataBase`, canonical URLs, Open Graph URLs and the sitemap all use it, so previews still point
  search engines at production.
- **Indexing:** only `VERCEL_ENV=production` is indexable. Previews and local dev get a robots file
  that disallows everything, plus `noindex` metadata.
- **`sitemap.xml`** lists `/`, `/courses`, course paths, every lesson, `/privacy` and `/terms`.
  **`robots.txt`** disallows `/dev/`, `/account`, `/auth/`, `/feedback` and `/from/`.
- **Every page has a title and description.** Lesson titles read "Lesson (Course)".
- **Link previews** (`src/lib/og.tsx`, rendered at build): the home image (`app/opengraph-image.tsx`)
  and one per course (`app/(main)/course/[id]/opengraph-image.tsx`); lesson pages render their
  course's image. Twitter images re-export them. Navy, logo, mascot and title; cyan only in the
  logo and mascot. Fonts are IBM Plex Sans (OFL) in `assets/og-fonts/`, read by literal paths
  (variable paths make the bundler trace the whole project).
- **Sign-in emails:** `docs/email/*.html`, pasted into Supabase (steps in the launch checklist).
  Their logo is `/brand/email-logo.png`, generated at build by `app/brand/email-logo.png/route.tsx`.

### Analytics
- **Vercel Web Analytics** (`src/components/SiteAnalytics.tsx`): no cookies, no personal data.
  `beforeSend` runs `redactUrl`: query strings are dropped except `utm_*`, and `/dev` isn't
  tracked, so a sign-in token or email can never be sent.
- **Custom events** (`trackEvent` in `src/lib/analytics.ts`): `landing_cta`, `lesson_start`,
  `lesson_complete`, `quiz_pass`, the sign-up gate's `signup_prompt_viewed` and `signed_up`, and the
  Pro funnel: `paywall_viewed`,
  `teaser_played`, `checkout_started`, `trial_started`, `subscribed`, `certificate_issued`. Each
  has at most two properties: `lesson` (or `course`) and `source`; `eventData` only lets a content
  id through, so nothing personal can be sent. **Only Pro collects custom events** (2 properties; Web Analytics Plus allows 8 and
  shows UTM parameters). On Hobby, page views still work, and the event calls are harmless.
- **Where visitors came from:** the first `utm_source` or `/from/<platform>` path seen in a tab is
  kept in sessionStorage (never a cookie) and attached to that tab's events as `source`.
- **Tagging video links** (works on every plan, because it's a page path):
  - `https://cybernettraining.com/from/tiktok` → the home page
  - `https://cybernettraining.com/from/youtube/whats-in-the-box` → that lesson
  - Use one lower-case word per platform (`tiktok`, `youtube`, `instagram`) or per video
    (`tiktok-ram`, up to 30 letters, digits, `-` and `_`). `?utm_source=tiktok` on any URL also
    works for events and for UTM reports on Web Analytics Plus.
- **Reading it** (Vercel → project → **Analytics**):
  - **Pages** panel: `/from/tiktok`, `/from/youtube/...` and so on show visits per platform or
    video.
  - **Referrers** panel: which sites links were opened from.
  - **Events** panel (Pro only): pick an event, then filter by `source` or `lesson`, e.g.
    `lesson_complete` with `source = tiktok`.

### Legal pages
- `content/legal/privacy.md` and `terms.md`, rendered at `/privacy` and `/terms`
  (`src/lib/content/legal.ts`). **They're drafts:** each file starts with a reviewer banner in an
  HTML comment (not shown on the page: the renderer skips HTML and the loader strips it) listing
  what an adult, and ideally a lawyer, must check: COPPA, the Australian Privacy Act and APPs, the
  OAIC Children's Online Privacy Code, and GDPR if EU users arrive.
- A test checks that the banner never reaches the page, and that the policy still covers what we
  collect, the services, account deletion, the contact email and Australian law. **Update the
  policy whenever we start collecting something new.**
- Linked from the footer, `/login` and the age check.

### Feedback
- `/feedback` (from the footer, and "Send feedback about this lesson" on the lesson-complete
  screen): a message (1,000 characters max, with "Please don't include personal details"), an
  optional lesson and an optional 1–5 rating (native radio inputs). It inserts straight into the
  `feedback` table with the publishable key; RLS makes it insert-only, and the database
  rate-limits it (see Row Level Security rules). Without Supabase env vars it shows the contact
  email instead.

## Content style guide

- **Plain, jargon-light language** for ages 12+. Short sentences, second person ("you").
- **Explain before naming.** Introduce an idea with an everyday analogy first, then give the technical
  term in **bold** (e.g. light switch → **bit**; 8 bits → **byte** → **octet**).
- **Keep it small.** One idea per explainer, at most 2–4 short paragraphs. Lessons run about 8–12
  cards and alternate explaining with doing.
- **Explanations teach.** Say *why* the answer is right and address likely wrong answers. Wrong
  options should reflect real misconceptions.
- **Teach before test.** Never grade something that hasn't been shown or explained earlier in the
  course: in an earlier card, or in the card's own prompt. That includes a part's name or look
  (explore a scene before a hotspot or teardown tests its parts), a term, a number, a command, and
  what a safe action is. A card's own explanation doesn't count (it comes after answering), and core
  cards and quizzes can't rely on a challenge card. `load.test.ts` checks the scene part of this
  automatically (screws, `*-cover` parts and the laptop `panel` explain themselves, so teardowns
  can use them unexplored); check the rest by reading the lesson in order.
- **Glossary (tap to define):** `content/glossary.json` is shared by every course: `{ id, term,
  definition }`, one or two plain sentences (≤220). In markdown text (explainer body, prompt, hint,
  nudge, explanation, scenario step text and consequences) mark a term as `[[router]]` or
  `[[routers|router]]`; it renders as a dotted, tappable term with a Radix popover. Mark only the
  **first use per card**, never in button labels (options, items, choices), and not where the card
  defines the term in bold. Don't mark terms in quizzes or in a card whose answers use the term (a
  definition could give the answer away). The loader fails on unknown terms, repeat marks and marks
  in the wrong field.
- **Hints and nudges:** every graded lesson card has a `hint` and a `nudge` (or, for multiple choice,
  a nudge on every wrong option); scenarios and teardowns only need the hint. `load.test.ts` checks
  it. A hint points the way (the idea, the method, where to look) **without giving the answer**; a
  nudge addresses the likely misconception **without revealing the correct option**. Neither may
  add anything the lesson hasn't taught or anything inaccurate. Quizzes never show hints.
- **One-try quiz cards test understanding, not reading tricks:** the goal must be fully stated in
  the question ("End **only** the process…, keep Notes open"), broken things must look broken
  (`down: true`), and confusing output lines must be explained before a quiz relies on them.
- **Beginner audit:** after big content changes, have a fresh agent play the course as a 12-year-old
  with no prior knowledge (on-screen text and screenshots only, answers hidden until it commits).
  Record findings and fixes in the Beginner Audit section of `content/REVIEW.md`.
- **Challenge cards** (`difficulty: "challenge"`) are optional stretch questions. Core cards alone must
  fully teach the lesson, and nothing later may depend on a challenge card. Aim for about 2 per lesson.
- **Quizzes** have about 5 core, interactive questions covering the module's lessons, and nothing
  that wasn't taught.
- **Technical accuracy is non-negotiable.** Double-check numbers, and prefer precise-but-simple over
  simplified-but-wrong.
- **Lesson shape:** 8–12 cards (photo cards don't count), opening with a hook explainer and ending with a recap explainer,
  at most 3 multiple choice cards, exactly 2 challenge cards. Quizzes have 5–8 core, interactive
  questions. `load.test.ts` enforces all of this for every lesson and quiz. It also checks that
  every simulator card starts unsolved and has a solution, that every drawn part is explored before
  a card tests it, and that every Inside Your Devices
  lesson uses at least 2 hands-on types (hotspot, teardown, simulator, scenario, sort_bins).
- **Physical safety:** no brands (in scenes and text; real photos may show a maker's name), and
  never instructions for opening a real device. Any physical
  action (cleaning a port, a hot or swollen battery) stays gentle and says "ask an adult" or a
  repair shop. List each one under **Safety** in `content/REVIEW.md`.
- **Online safety content (Stay Safe Online):** teach **defence only**, never how to make a scam
  or attack anyone. Every scam example is fictional ("Your Bank", "Parcels") and uses only
  reserved `.example` addresses; `load.test.ts` fails on any other address except the verified
  help services (`esafety.gov.au`, `scamwatch.gov.au`, `idcare.org`, `cyber.gov.au`,
  `accce.gov.au`). Verify every
  help service, number and piece of password/MFA advice against its official source before citing
  it, and record the date in `content/REVIEW.md`. Calm and empowering, never scary: it's never the
  learner's fault, and a trusted adult is always an option.
- **Help is always free:** any lesson about getting help, reporting harm or recovering from an
  incident (a hack, a scam, abuse) is always in a free module, never behind Pro. Safety and help
  information must never be behind a paywall. `load.test.ts` checks the modules this covers
  (currently Stay Safe Online's "When Things Go Wrong"); add new ones to its `alwaysFree` list.
- **Safe examples only:** IPv4 documentation ranges (`192.0.2.0/24`, `198.51.100.0/24`,
  `203.0.113.0/24`) stand in for public addresses, alongside the private ranges, `2001:db8::/32`
  and `example.com`/`example.org`. Never use a real person's or company's address. `load.test.ts`
  rejects any other IPv4 address (deliberately invalid ones, like `192.168.1.256`, are allowed).
- **`content/REVIEW.md`** lists each lesson's goals, key factual claims and every deliberate
  simplification. Update it whenever you add or change a lesson.
