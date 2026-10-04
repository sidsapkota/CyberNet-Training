# CyberNet Training

A Brilliant.org-style interactive learning web app for **IT fundamentals**: hardware, networking,
operating systems, databases, programming logic, cloud and cybersecurity. Learners work through short
lessons made of interactive **cards** and get instant, satisfying feedback.

Audience: **"For ages 13+. No experience needed."** (`AUDIENCE` in `src/lib/site.ts`, worded the same
on the landing page, `/courses`, `/pro` and in metadata). Guests of any age can still play each
course's first lesson, but nothing is marketed to under-13s. Content must suit a curious beginner of
13 and an adult alike: simple, never childish. See [Content style guide](#content-style-guide).

Current state: guests learn with progress in `localStorage`; learners who sign in (Google or email
magic link) get progress synced to Supabase. Both sit behind the same `ProgressStore` interface. See [Accounts and sync](#accounts-and-sync).
**CyberNet Pro** (Stripe subscriptions) is live: live keys in Vercel Production only; local dev and
previews use the Stripe sandbox. See [CyberNet Pro](#cybernet-pro).
Production is **https://cybernettraining.com** (`src/lib/site.ts`); see [Launch](#launch-domain-seo-analytics-legal-feedback)
and `docs/launch-checklist.md` for the dashboards (Vercel, Supabase, Google, Resend, ImprovMX).
Code is on GitHub: `sidsapkota/CyberNet-Training`, branch `main`.

## Handover

**Keep `docs/handover.md` up to date.** Update it at the end of every task, whenever a branch is
merged or created, and whenever the owner adds something to the queue. Commit it with the work it
describes. **At the start of every session, read it first.** Keep it short: replace old information
rather than appending history (git keeps the history). No secrets, keys or user data.

## Commands

```bash
npm run dev               # dev server on http://localhost:3000; predev prints LAN URLs for other devices
npm run build             # runs validate-content first (prebuild), then next build
npm run lint              # eslint . (Next 16 removed `next lint`)
npm test                  # vitest run
npm run typecheck         # next typegen && tsc --noEmit
npm run validate-content  # validate every JSON file under /content
npm run export:content    # write WEBSITE-CONTENT-FOR-AI.md: the ONE file the owner gives another AI to
                          # draft videos (briefing + every lesson; no quiz answers). Run after any content
                          # change; prebuild runs it too, and a test fails if it's stale. Keep no other copy.
npm run brand:assets      # regenerate logo SVGs + favicon from src/components/brand/geometry.ts
npm run brand:mascot      # regenerate public/brand/mascot/<expression>.svg from the Mascot parts
npm run check:supabase    # verify the Supabase URL + publishable key in .env.local (health check)
npm run check:rls         # prove users can't read/write each other's rows (needs SUPABASE_SECRET_KEY)
npm run usernames:scan    # re-check every username with the current rules (-- --apply replaces failures; counts only)
npm run e2e:design-qa     # every card type and main page at 360px/desktop, light/dark, motion on/off:
                          # sideways scrolling, controls under 44px, touch drag (dev server running)
npm run e2e:player-back   # Back/forward (read-only), Listen and lesson_quit in the lesson player
npm run e2e:pro-declined  # "What's stopping you?" after Not now on /pro (360px, event data, once a week)
npm run e2e:mistake-review # Mistake review: a wrong answer saved, the free count + pitch, the Pro review (360px)
npm run e2e:latency       # time a lesson save, a lesson fetch and the dashboard (E2E_BASE_URL=production)
npm run e2e:plans         # plans at 360px and desktop (guest, free, Pro), plan events, nav, Pro identity
npm run e2e:account-speed # how fast /account opens from the profile icon (PHONE=1 for throttled 4G)
npm run e2e:mascot-motion # mascot reactions timed in the browser, the scan filmstrip, reduced motion
npm run e2e:usernames    # pick a username at sign-up, rude/taken names refused, the 30-day change (secret key: local build)
npm run e2e:fit-audit     # every card at 360x640 and 360x560: does it fit without scrolling? (COURSE=<id>, LESSONS=<id,id>;
                          # E2E_SHARE_URL for a protected preview)
npm run e2e:dashboard-numbers # cards done, no lesson finished: header XP, Activity XP bars and rings
                          # (throwaway account; secret key, so a local production build or production)
npm run e2e:player-flow   # before/after screenshots: a hotspot card and the wrong-answer flow (SHOTS_TAG=)
npm run e2e:founder       # Founding Member: /pro, paywall, dashboard line, badge, refund, events (360x560 + desktop)
npm run e2e:leagues       # Leagues moments at 360x560: first-open celebration, live rank rise (no reload),
                          # promoted/demoted/stayed results, lesson-complete rank moment. Seeds + cleans a
                          # throwaway league; STAGING ONLY (refuses production), needs the secret key
```

Tap targets are at least **44px** everywhere (inline text links and glossary terms excepted); the
design QA script checks it. On phones, the binary bits wrap to two rows of four below 430px, and
drag to order picks items up with a short press and hold, so a swipe over the list still scrolls. Its
first-time tip ("Press and hold an item, then drag it.", or "Drag an item to move it." with a
mouse) shows until the learner's first drag (per device). Sort bins with three bins stack on
phones, so item names never squeeze into narrow columns; each stacked bin keeps its label and its
items on one row, and the tray is two columns. On short screens (max-height 620px, such as an
in-app browser) a card's question steps down from 20px to body size, and terminal output boxes get
shorter (24dvh up to 700px tall); the output scrolls inside its box.

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

Courses, in catalog order (Easy first; each `course.json` has a required `level`, `easy` | `medium` |
`hard`, shown as 1–3 filled dots and the word by `CourseLevel`): **Stay Safe Online**
(`stay-safe-online`, Easy, "Start here" for new visitors: passwords and two-step sign-in, spotting
scams, privacy, and what to do when things go wrong, including deepfake scams; modules 1 and 4 free,
modules 2 and 3 Pro), **Inside Your Devices** (`inside-your-devices`, Easy: hardware, the OS and
troubleshooting, built on the hands-on card types), **How AI Really Works** (`how-ai-really-works`, Medium:
what AI is, how models learn, how chatbots pick words, prompting and checking, AI images and voices,
and using AI safely and fairly; module 1 free, modules 2 to 6 and the final Pro; built on the
`train_model` and `next_word` cards; lesson 4.3 "AI Tools Today" is the only one that names real
products, and carries `lastChecked`) and **How the Internet Works** (`how-the-internet-works`, Hard).
- **What a level means:** **Easy** feels like a game: very little reading, mostly hands-on, and
  almost everyone succeeds. **Medium** may use simple maths and prediction. **Hard** asks learners
  to think harder, but stays fully beginner-friendly: everything taught before it's tested, no
  assumed knowledge, hints that really help.
Each `module.json` has `"access": "free" | "pro"`. Every course's first module must be free (the
loader checks), and help, reporting and recovery modules are always free. Every Pro module also has
`"teaserCard": { "lesson", "card" }`: one card from its **first lesson** that learners without Pro
can play on the "What's next" screen (`content/teaser.ts`: required on Pro modules, not allowed on
free ones; an interactive **core** card, not a hotspot or teardown). Teasers are deliberately public
(sent with the course outline), so pick one whose prompt sets it up on its own.

```
content/courses/<course-dir>/course.json                   { id, title, description, order, level }
content/courses/<course-dir>/modules/<module-dir>/module.json   { id, title, description, order }
content/courses/<course-dir>/modules/<module-dir>/lessons/*.json
```

- A lesson file holds `{ id, kind: "lesson" | "quiz", title, order, cards[] }` (plus `icon` and
  `about` for lessons: `about` is "what you'll learn" in one line, 10–90 characters, shown on the
  "Up next" screen). A lesson about fast-changing things (real products) also has `lastChecked`
  (`YYYY-MM-DD`): learners see "Last checked …" on its first card and in its path popover, and
  `validate-content` warns (never fails) 3 months later (`src/lib/content/lastChecked.ts`; the
  recheck list is in `content/REVIEW.md`). Access comes from its module. Quizzes also
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
  - Every interactive card may have a `hint` (≤300, markdown; lessons and Mistake review only, behind a "Hint" button)
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
| `train_model` | `model` (`nearest` + `k` 1/3 + `scene`: `fruit`/`ball`/`weather`/`daynight`, or `word-vote`), `labels[]` (2–3), `examples[] {id, text, x?, y?, label, given?}` (3–12; at most 4 not `given`), `tests[] {id, text, x?, y?, truth}` (1–3), `task` (`label`, or `fix` + `action` `add`/`remove`) | `{labels: {exampleId: labelId}, included: [exampleId?]}` | label: every example labelled right; fix: the one change makes the model get every test right |
| `next_word` | `context`, `candidates[] {word, p}` (3–6, sum 1), `temperature {min, max, start, step}`, `goal` (`pick` + `word`, or `probability` + `word?`, `atLeast?`, `atMost?`) | `{temperature, pick}` | pick: the likeliest word; probability: the goal holds at that temperature |

- **`multiple_choice`:** options are shown in a stable shuffle per card (`displayOptions`), so the
  right answer's written position never gives it away; digit keys follow the order on screen.
  Answers and grading use option ids, so the order can't change a score.
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
  - Never rotated: phones keep the layout with shorter rows (80px, or 104px when nodes show
    addresses), so keep networks small (at most 4 columns and 2 rows with addresses fit 360×560).
    On phones Undo and Reset are icon buttons beside the instruction, and the route readout is for
    screen readers only (the numbered stops show the order).
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
    screwed bracket holds the battery connector. The phone's `bracket-unscrewed` view starts with
    the bracket's two screws already out, so "open the phone" is four taps (soften the glue, lift
    the back, lift the bracket, unplug the battery); the card says the screws are out and that real
    phones have them.
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
- **`hotspot`:** tap mode selects exactly `targets` (tap again to unselect); every tappable part
  carries a faint hollow ring (all parts, so it never hints which are right), and a selected part a
  plain dot (a tick only ever means "right", after Check). Label mode places label chips on
  numbered spots (spots don't name the part, or the answer would be given away); the label tray sits
  **above** the scene, so labels and spots are on screen together. **Explore mode** (not graded,
  core only) teaches a scene: "Tap the glowing parts…"; unexplored parts have a hollow node that
  pulses twice as the card appears (no loop); each tap shows the part's name and one-line `job` in
  a callout **pinned inside the scene panel** (on the half away from the part), so it's in view
  without scrolling; Continue unlocks once every listed part has been tapped. Put one before a
  scene's parts are first tested.
- **Scenes fit the screen:** `SceneStage` caps a scene's height by 400px *and* by the visible
  screen (`100dvh` minus room for the player), so the whole scene fits at 360×640 and in the
  Instagram browser (~560px). A tap scrolls the panel fully into view (`useSceneReveal`).
  Feedback about a part (explore's name and job, teardown's "not yet" nudge) uses the panel's
  pinned `callout`, never a box below the scene. The live fit (`useFittedHeight`) keeps only the
  page's bottom padding under a scene (`BELOW`), since Back, the hint and Check live in the footer.
  A short live `status` (a teardown's "1/4 steps") sits on the panel's top row, opposite the
  "Simplified diagram" chip.
- **`teardown`:**
  - Verbs: `unscrew`, `lift`, `slide-out`, `unplug` (remove), `insert`, `fasten`, `plug-in`
    (refit), and `heat` (prep: "Soften the glue on", for a phone's glued back). A heated part stays
    in place with a warm dashed outline (`--color-scene-heat`) until it's lifted.
  - Tapping a part does its next action if its `after` steps are done; otherwise it shows that
    action's `nudge` and counts it. Lift and slide actions can also be dragged.
  - Every card shows a built-in **"This is a simulation"** safety note, one paragraph: the bold
    words, then the card's `safety?` line (≤240, markdown) or, without one, "Real phones and laptops
    should only be opened by an adult or a repair shop." The step count sits on the scene panel
    (no separate progress bar or instruction line). A `safety` line: every phone teardown that heats or pries uses
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
    always in text too. On phones it sits beside the other outputs (drawn a little smaller), and two
    or more meters without a device sit side by side, so the controls stay on a phone screen.
  - **Controls on list rows:** a control for one row of a `list` output sits on that row, not in
    a grid below: `end-<row>` (a button: the task manager's "End"), `delete-<row>` (a switch:
    storage's "Delete") or a switch whose id is the row's id (an app on or off; the `memory` model
    lists closed apps as crossed-out "closed" rows, so each keeps its switch). Beside a list, number
    and bar tiles share a row on phones (numbers on one line), the device shows only its status (in
    the list's header), and a remaining slider comes first. Keep lists to about 5 rows.
  - Answers are ready once a control changes. The server re-grades by running the same model.
- **`scenario`:** steps tell the story as you go; a picked **ending** is just selected (it can be
  changed) and its consequence and outcome show **after Check**. Try again takes the failed ending
  off (`retryScenario`), the tried endings stay crossed out, and the learner picks again at that
  step. The schema
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
  - **Not counted** as cards (at most one photo per lesson), and never in quizzes.
- **`sort_bins`:** tap an item then a bin, or drag (dnd-kit). Snap sound; wrong items go back to the
  tray after Try again.
- **`train_model`** (AI course): learners teach a tiny model and see it make mistakes. The models
  (`src/cards/train-model/model.ts`) are pure and deterministic: `nearest` (items have a place, x
  and y from 0 to 10; the nearest example's label, or the majority of the 3 nearest) and
  `word-vote` (each word of 3+ letters votes for the labels it was seen with; a tie is "Not sure").
  No ML libraries, no randomness, nothing run from content.
  - **Real pictures, never a chart** (zero-confusion rule): `pictures.tsx` draws each item from
    its name and data: fruit (apple, banana or lemon from the name; colour red → yellow from y,
    size words), balls (tennis or basketball from the name; size from x), weather (cloud and damp
    air from x and y) and day/night scenes (brightness, sky or indoors). Word-vote items are chat
    bubbles. Colours are the fixed `--color-pic-*` tokens on navy tiles. `given` examples show as
    small pictures in "It learned from", grouped by label; each label has a shape (circle, square,
    triangle) as well as its word, never colour alone.
  - **`fix` goal** (problem first, one action): the top box shows the test the model gets wrong
    and "Model's guess: Banana ✗", with the other tests under "Also:". The learner makes ONE
    change from 2–4 tiles, nothing pre-selected: `add` one example, or `remove` one (e.g. the
    mislabelled one; its label shows as a sticker on the picture). The guess flips at once as they
    tap (`GuessChip`, a short flip; still under reduced motion); right/wrong shows after Check.
    The schema checks the model starts wrong, some single change fixes every test, and not every
    choice does (a real choice). Try again takes the pick off.
  - **`label` goal:** at most 4 items to label (2×2 picture tiles, label buttons on each; full-width
    rows with shape buttons for 3 labels). After Check the model trains on them and its guesses
    show first, under the prompt. The schema requires that, trained on the true labels, it gets at
    least one test **wrong** (the lesson) and one right. Try again clears only wrong labels.
- **`next_word`** (AI course): pre-written chances for the next word, reshaped by temperature
  (`p^(1/T)`, rescaled; the same as dividing scores by T before softmax; the order of the words
  never changes). Nothing is generated live.
  - **`pick` goal:** which word is most likely? The chances stay hidden until Check, and the word
    must be the single likeliest.
  - **`probability` goal:** move the slider until a word (or, without `word`, the likeliest one) is
    at least / at most a share, compared to 3 decimal places. The schema checks it starts unsolved
    and that a slider stop meets it. Answers off the slider's stops are refused by the grader.
  - "Generate 5" shows seeded sample picks for the current temperature (display only, the same
    every time). Bars always show the % in text; reduced motion skips the width transition.
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
   Also add its pure grade function to `src/cards/grading.ts` (the server re-grades quiz answers with it),
   and its Try again rule to `src/cards/retry.ts` (what's kept and what's cleared).
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
  - **One flow for every card type:** select → Check → result → Continue (or Try again). Nothing
    shows right or wrong before Check: no ticks on a selection, no "match", no outcome panel, no
    live Right/Wrong (live instruments that *are* the activity, like a bit total, a probability bar
    or a simulator's meters, stay, unmarked).
  - Wrong answer: a cross, a short soft shake, the course's little wrong-answer animation over the
    cross (`WrongBurst`, under 700ms, never blocks anything, none under reduced motion: Inside Your
    Devices a spark and smoke puff, How AI Really Works a glitch, How the Internet Works a packet
    bouncing back, Stay Safe Online a shield wobble), the explanation collapsed, and **Try again**.
  - **Try again** (`src/cards/retry.ts`, tested per type): the wrong part is cleared and anything
    right stays where the card type allows it (wrong pick cleared, right pairs/bits/labels/bins
    kept, a route kept up to its first wrong hop, a failed scenario ending taken off, a teardown
    started again); and Check stays off until the answer differs from the one just marked wrong
    (`canCheckAgain`, with "Change your answer, then press Check."), so "wrong" can never loop. The
    same in Mistake review and the teaser card.
  - Right answer: a cyan pulse travels along the progress trace to this card's node, which
    ripples. The footer status node fills with a check, and the explanation and XP earned show.
  - **Mascot reactions** (`src/lib/reactions.ts`): every answer in a lesson gets a small mascot
    beside the footer heading and a short line as the heading itself ("Nailed it.", "Not quite. Have
    another look."): `happy` for right (`celebrating` on bonus cards), `confused` or `thinking` for
    wrong. Lines are picked from the lesson, card and attempt (never random during render, never the
    same twice in a row), and every wrong line says plainly that it isn't right yet. Quizzes keep
    the plain "Correct" / "Incorrect".
  - Continue unlocks only after a correct answer. **Bonus cards** (challenge) show a "Bonus ·
    Optional: skip it any time" chip and a **Skip** button at the end of that row (accessible name
    "Skip bonus"; not a second footer row, so the card keeps its room).
  - **Where you are:** the current card's node on the trace is larger and filled with a soft ring.
    Tapping the trace opens the lesson's cards as 44px numbered nodes (answered ones open read-only,
    the current one returns you, upcoming ones are disabled).
  - **The lesson menu** (`LessonMenu`, a header button): the module's lessons with their state
    (done, you're here, locked with what to finish first, needs a free account, Pro) from
    `moduleNav` (`src/lib/progress/lessonNav.ts`, pure, tested), each linking to its page, which
    applies the guest gate, the daily limit and Pro as usual; free accounts see "N new lessons left
    today". XP sits in the menu below 400px wide (the header has no room).
  - **Lesson complete, then "Up next":** the celebration step, then Continue to "Up next": the next
    lesson's icon, title and `about` line, Start, Back to course, and a quiet "Previous lesson"
    (within the module: `moduleNeighbours`).
  - **Back and forward:** a Back button in the footer, beside the main button (and Alt + Left / Alt + Right) shows earlier
    cards **read-only** (`CardReview`): an answer from this visit exactly as it was, a card finished
    on an earlier visit as its prompt plus "You got this one" and the right answer, a skipped bonus
    card as its prompt only. Nothing is re-graded, no XP changes, no sound plays; "Next" and "Back to
    card N" return to the live card with its answer untouched. In quizzes, Back shows an answered
    question with right or wrong only (still no explanation) and never offers another try. Focus
    moves to the card and an `aria-live` note says where you are.
  - **Listen** (`ListenButton`, `src/lib/speech.ts`): an icon button in the player header (between
    the trace and the lesson menu; `listen` on `PlayerShell`). The browser's own speech, from a tap only,
    hidden without support. `speechText(card, status)` (`src/cards/speech.ts`, tested on every card)
    reads the title, body, prompt and the choices, never the answer or explanation before Check
    (lessons read the explanation after Check; quizzes never do). Glossary marks read as their word,
    and technical values are made speakable (`192.0.2.1` → "192 dot 0 dot 2 dot 1", bits digit by
    digit). It stops on any change of card, Back or Check. The voice (`pickVoice` in `src/lib/voices.ts`, tested) is never a novelty voice (macOS's Albert, Bad News, Zarvox…); it prefers the learner's locale (en-AU, then en-GB, then any English), then higher-quality voices (Premium/Enhanced/Natural/Neural, the well-known system voices, Google's and Microsoft's), then on-device ones; with nothing suitable the browser's en-AU default is used. "Listen speed" (Normal / Slower,
    `ReadingSpeed`, in the lesson menu) is saved per device (localStorage).
  - **Where people quit:** leaving an unfinished lesson (✕, the browser's back, closing the tab)
    sends `lesson_quit` once, with the lesson id and the card number only.
  - **Hints** (`hint` on `FeedbackFooter`): a "Hint" button in the footer beside Back, with the cost
    up front on the button ("costs 5 XP", `hintCost`); the hint text opens in the footer above the
    buttons. Opening it once makes the card pay retry XP. Rules live in
    `src/lib/hints.ts` (`visibleHint`: lessons only, graded cards with a hint, until correct).
  - **Nudges:** a wrong answer shows `nudgeFor(card, answer)` under "Not quite"; the full
    explanation stays collapsed.
  - **How to play** (`src/components/player/coach/`): the first time a learner meets an interaction
    style (`COACH_KEYS` in `src/lib/coach.ts`: every graded type except multiple choice, and each
    hotspot mode separately), an inline panel above the card explains it with a one-shot animated
    demo ("Show again" replays; final frame under reduced motion). "Got it", ✕, Enter (unless
    typed in an answer box), Check or Continue dismiss it for good: `preferences.coachSeen`, synced
    like the other preferences. **A newcomer's very first card skips it** (`coachAllowedOn`: no
    progress at all and card 1), because on a phone it would fill the first screen and hide the card;
    that card's prompt says what to do in one line, and the panel shows next time. It also shows in quizzes, which have no hints.
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
- `/review`: Mistake review (see [Mistake review](#mistake-review)). Not indexed.
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
- **Instant taps:** routes that render on the server per request (`/account`, `/account/plan`,
  `/leagues`, the certificate page, `/review`) have a `loading.tsx` (`PageLoading`: the page's real
  heading, panel outlines and the loading network mark; never grey blocks), which Next prefetches
  with the link, so a tap shows the page's shape at once. Static pages (dashboard, catalog, course
  paths, `/pro`) are prefetched whole. Nav links show a pressed state on touch and stay dimmed
  until the page arrives (`useLinkStatus`); the shrink is `motion-safe` only. `/account` checks the
  session and reads the profile in one parallel round trip (RLS returns only the learner's row).
- **Client-only rendering:** progress-dependent pages render the `NetworkMark` loading state until
  progress loads, then draw. This also keeps reduced-motion entrances from mismatching the
  server HTML.
- **Time estimates:** `src/lib/content/estimate.ts` uses a conservative 45 seconds per **core** card,
  rounded to whole minutes; bonus cards are named apart ("about 4 min + 2 bonus cards"), and photo
  cards (a quick look) aren't counted (`photoCount` on the outline). Keep estimates honest; don't hand-write durations.

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
src/components/mistakes/ Mistake review: dashboard card (count), review player (/review)
src/components/leagues/  tier badges, player card, leagues page view, result screen, settings
src/lib/leagues/         league rules (week, grouping, settling), server code, config
src/lib/usernames/       usernames: safety check and word lists, generator, change rule, server code
src/components/illustrations/ course thumbnails (CourseCover: the template, one cover per course id)
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
- **Fit target: 360×560.** Every card must fit a 360×560 screen (the Instagram in-app browser,
  the smallest real one we see) without scrolling: prompt, interactive area, labels, header and
  footer on one screen, before Check. `npm run e2e:fit-audit` measures it (`COURSE=` / `LESSONS=`;
  `E2E_SHARE_URL` for a preview). When a card doesn't fit, split it (one idea per card) or shrink
  the diagram, whichever keeps it clear; never make a learner scroll to the controls. New and
  rewritten content must pass at 560; older courses move over in the "learn before you do"
  rollout. After Check, the footer's feedback may cover part of the card (it scrolls).
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
  email and a username. Learners may be 12, so there are no avatars, birthdays or real names:
  - The username is the one public identity (see [Usernames](#usernames)); never a real name.
  - A trigger strips `avatar_url`, `picture`, `full_name` and `name` from auth user metadata.
    Supabase still keeps the provider's data in `auth.identities`, which account deletion removes.
- **Email code and in-app browsers:** the email sign-in sends a **6-digit code** (Supabase email
  OTP, `{{ .Token }}` in `docs/email/magic-link.html` and `confirm-signup.html`) that's typed into
  the page and checked with `verifyOtp` (`SignInOptions`), so it works in any browser; the same
  email keeps the sign-in button for normal browsers. Inside Instagram, TikTok, Facebook, Messenger
  and Snapchat (`inAppBrowser` in `src/lib/auth/inApp.ts`, from the user agent, after mount),
  Google sign-in is blocked, so its button is replaced by a short "open in your browser" tip with a
  Copy link button. Signing in with the code happens in the same browser, so guest progress merges
  as usual. After the code, `afterSignInPath` (shared with `/auth/callback`) sends new accounts to
  pick a name, then on to where they were going. `npm run e2e:in-app` checks the whole flow.
- **`src/proxy.ts`** (Next 16's name for Middleware) refreshes the session cookie on each request
  with `getClaims()`. It doesn't gate pages.
- **`/auth/callback`** exchanges `?code=` (Google, and the default magic-link email, which uses PKCE
  and so needs the same browser) or `?token_hash=&type=` (`verifyOtp`). Redirects only go to
  same-site paths (`safeNextPath`). New users without a username go to `/account?welcome=1` ("Pick a username").
- **Redirect URLs** (Supabase → Auth → URL Configuration): the Site URL is
  `https://cybernettraining.com`, and `https://cybernettraining.com/auth/callback`,
  `http://localhost:3000/auth/callback` and `https://cyber-net-training.vercel.app/auth/callback`
  are allowed (see `docs/launch-checklist.md`, which also covers preview deployments). Any other
  origin (a phone on the LAN) must be added there, or sign-in falls back to the Site URL.
- **Google sign-in** is published (anyone with a Google account can use it). The
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
  `onAuthStateChange`, plus the username.
  - It creates the browser client only in effects, so server and client render the same markup.
  - It also chooses the progress store (see below).
  - `useAuth()` exposes the auth state, whether accounts are available, `refreshProfile()` and
    `signOut()`.
- **Header:** guests see "Sign in" (desktop header, and the third phone tab). Signed-in learners
  see their initial as a node, plus their username on desktop, linking to `/account`.
- **`/account`:** the username (pick it, or change it: see Usernames), sign out, and delete the
  account after a confirmation step.

### Usernames
One public identity per learner (`profiles.username`), shown in the header, dashboard (with the Pro
badge), `/account`, leagues (rows, player cards, reports), the Mistake review finish screen and the
trial-reminder email. It replaced the private display name and the league handle (2 Oct 2026).
Nothing from Google is ever shown. Certificates keep their own "Name on certificate", chosen at issue.
- **Rules** (`src/lib/usernames/check.ts`, pure; `usernames.test.ts` has the tricky examples):
  3–20 letters, numbers and underscores, at least one letter, at most 3 digits (no phone numbers or
  birth years), unique ignoring case (`profiles_username_key` on `lower(username)`), and no blocked
  word in any disguise: leetspeak, underscores removed, repeated letters collapsed, and words hidden
  inside longer names. Lists in `words.ts`: swears, slurs and hate terms, sexual terms, drugs,
  violence and self-harm, staff and app names (impersonation), contact details and social apps,
  rude number codes. Short words count only as a whole part of the name; an allow-list stops known
  false positives ("Assassin", "Therapist", "Sussex"); `obscenity` is a second layer. A blocked word
  gets only "Try a different username." (never which word); shape problems say which rule.
- **Checked on the server only:** sign-up, every change, generating, after reports and the scan.
  Learners can't write their profile row (no update grant or policy); `setUsernameAction` writes it
  with the secret key (`src/lib/usernames/server.ts`, vetted in `server-actions.test.ts`).
- **Sign-up:** "Pick a username", prefilled with a suggestion (`generateUsername`: two brand words
  and up to 3 digits, "PacketPilot482"; re-rolled until it passes the check) and a Shuffle button,
  so skipping is one tap. Anything that needs a name before then (leagues) gets a generated one
  (`ensureUsername`).
- **Changing it:** picking the first one doesn't count; the first change is free, then one every 30
  days (`username_changed_at`, `nextUsernameChange`). A name replaced after 3 reports (or by the
  scan) clears it, so the learner can choose again straight away.
- **The scan** (`npm run usernames:scan`, `-- --apply` to write): fills empty usernames and
  re-checks every username with the current rules, replacing failures with generated names. Prints
  counts only, never names. Run it after changing the word lists. Existing accounts got generated
  names, never their old display name (it was private and may be a real name).
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
  lessons made after `GUEST_GATE_AT` (in `merge.ts`: 2026-10-01 03:34 UTC, when the gate was merged) are dropped, since a
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
- `20261002100000_daily_lesson_limit.sql`: `lesson_opens`, `open_lesson()` (security definer,
  `search_path ''`, execute for `service_role` only), `profiles.time_zone_changed_at` and the
  `limit_time_zone_changes` trigger (see [Daily lesson limit](#daily-lesson-limit)).
- `20261003100000_card_mistakes.sql`: `card_mistakes` and `record_mistake()` (security definer,
  `search_path ''`, execute for `service_role` only; see [Mistake review](#mistake-review)).
- `20261004100000_usernames.sql` and `20261004110000_usernames_server_only.sql`: `profiles.username`,
  `username_changed_at`, the shape check and the unique index; league handles copied over;
  `league_standings()` returns the username; then learners lose their direct profile write.

| Table | Holds |
|---|---|
| `profiles` | `id` (= auth user), `username` (public, 3–20 `[A-Za-z0-9_]`, unique ignoring case, nullable until chosen), `username_changed_at`, `display_name` (unused since usernames; dropped later), `learning_mode` (`path` or `explore`), `sound_enabled` (default true), `coach_seen` (how-to-play panels dismissed), `age_confirmed` (13+ confirmed; never a date of birth), `daily_goal` (20, 50 or 100; default 50), `daily_goal_chosen`, `time_zone` (IANA name, for dating days) |
| `card_completions` | `(user_id, lesson_id, card_id)` primary key, `completed_at`, `xp` (0 to 20) |
| `lesson_completions` | `(user_id, lesson_id)` primary key, `completed_at`, `xp` (0 to 20) |
| `quiz_attempts` | `id`, `user_id`, `quiz_id`, `attempted_at` (unique per user and quiz), `score` 0 to 1, `passed`, `xp` (0 to 50), `answers` jsonb |
| `xp_events` | `id`, `user_id`, `at`, `day` (local date), `time_zone`, `kind` (`card`, `lesson`, `quiz`, `practice`), `lesson_id`, `card_id?`, `xp` (0 to 50); practice unique per user, day and card |
| `goal_days` | `(user_id, day)` primary key, `time_zone`, `goal` (the goal that day), `met_at` |
| `card_mistakes` | `(user_id, lesson_id, card_id)` primary key, `misses` (1 to 999), `first_missed_at`, `last_missed_at`, `cleared_at` (set by a right answer in review; a new miss clears it again). Never the wrong answer itself. Learners select their own; only `record_mistake()` and Server Actions write |
| `lesson_opens` | `(user_id, day, lesson_id)` primary key, `opened_at`: each new lesson a free account opened on its own day. Learners select their own; only `open_lesson()` writes |
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
  - **Learners can't write their profile row at all** (since the usernames migration): the
    username, `learning_mode`, `sound_enabled`, `coach_seen`, `age_confirmed`, `daily_goal`,
    `daily_goal_chosen` and `time_zone` are set by Server Actions with the secret key.
  - **`card_mistakes` is read-only for learners** (select own rows only); the server records
    misses with `record_mistake()` and clears them after re-grading a review answer.
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
  on its own rows and inserting feedback. The second migration removed Supabase's default `TRUNCATE`,
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

- **What's Pro:** unlimited new lessons every day, [Mistake review](#mistake-review), certificates
  and an extra streak freeze. Free
  accounts open **any lesson in any course**, Pro modules included, up to 3 new lessons a day (see
  [Daily lesson limit](#daily-lesson-limit)). Modules still have `"access": "free" | "pro"`: the
  first module of each course and every help module (e.g. Stay Safe Online's "When Things Go
  Wrong") are free (tests enforce both), and only a copy without accounts (no Supabase) still locks
  Pro modules.
- **Lesson content never reaches the browser unchecked:** lessons guests can't play load from
  `/api/lessons/[id]` (`private, no-store`) only after `requireUser()`, then the limit (401
  `account` for guests, 403 `limit` when today's lessons are used). Progress Server Actions write
  XP for a Pro lesson only when the learner opened it (`lesson_opens`), has Pro, or finished it
  before (`ProRequiredError` otherwise). The guest merge keeps Pro progress made before launch, and
  drops Pro progress from after launch unless the account has Pro (`withoutUnentitledPro`), since
  guests can't open Pro lessons.
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
- **Trial reminder:** on `customer.subscription.trial_will_end` (3 days before), if the trial will
  become paid (`shouldRemindTrial`: still trialing, not cancelling), the webhook emails the learner
  via Resend (`trialReminderEmail` in `src/lib/pro/trialReminder.ts`: the end date in their time
  zone, the plan and amount, how to cancel; idempotency key `trial-reminder/<subscription>`).
  Stripe's own trial reminder email must stay **off** (Billing → Subscriptions and emails), or
  learners get two.
- **Early-user grant:** accounts created before `PRO_LAUNCH_AT` get 30 days of Pro once, on their
  first visit after launch (`pro_grants`), with a one-time thank-you on the dashboard.
- **Keys** (`src/lib/pro/env.ts`, `stripe.ts`): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`, optional `PRO_LAUNCH_AT`; server-only. **Live keys
  are refused everywhere except the production deployment** (`VERCEL_ENV=production`). Amounts
  live in Stripe, never in code (`/pro` reads them and works out the annual saving).
- **UI:** every in-app Pro screen is `ProPitch` (below); `/pro` is the plans section (see
  [Plans and Pro identity](#plans-and-pro-identity); prices from Stripe, `/api/pro/prices` for
  in-app screens); `/pro/welcome`; "Your plan" on `/account` (one line from `proLine()`) and its page
  `/account/plan` ("Manage subscription" → the portal). Deleting an account deletes the Stripe customer
  first, which cancels any subscription.
- **Tables** (`20260930180000_pro_subscriptions.sql`): `stripe_customers`, `subscriptions`,
  `stripe_events`, `pro_grants`. Learners read only their own subscription and grant; nobody but
  the service role writes any of them (`check:rls` proves it). Besides Server Actions, only
  `src/lib/pro/server.ts` (server-only) and the signature-checked webhook may use the secret-key
  client (`server-actions.test.ts`).
- **End-to-end:** with `stripe listen` forwarding to the dev server, a scratch Playwright script
  runs real Checkout and portal pages with test cards and test clocks (monthly with trial, annual
  without, portal cancel, a failed renewal, the grant expiring); see the checklist's step 10.

## Founding Member

A one-off payment for lifetime Pro ("for as long as CyberNet Training runs", never "forever"), for
the first 50 buyers. **Behind `FOUNDER_OFFER=on`** (plus `STRIPE_PRICE_FOUNDER`, a one-off price):
off, `/api/pro/founder` answers null and nothing shows. Plan and owner steps:
`docs/plans/founding-member.md`. Rules in `src/lib/pro/founder.ts` (pure, tested), UI in
`src/components/pro/Founder.tsx`.
- **Honest numbers:** the counter is the database's (`founder_seats()`, never cached), and the
  headline and comparison ("Lifetime Pro for A$29, less than 4 months of the monthly plan" / "A
  year of monthly is A$95.88. This is A$29, once.") are worked out from Stripe's live prices
  (`founderCopy`). Never a "was" price, timer or fake scarcity; at 50 it disappears.
- **Seats:** `startFounderCheckoutAction` (payment mode, 31-minute session) holds a seat
  (`reserve_founder_seat`, under a lock: sold + held < 50); the webhook's
  `checkout.session.completed` (and `/pro/welcome`) claims it for a paid session with our
  metadata (idempotent); a **full** `charge.refunded` ends it and frees the seat. An unrefunded
  seat is Pro with no end date (`proStatus` kind `founder`).
- **Shown to** guests, free accounts and early-user grant holders; never subscribers or founders.
  First on `/pro` (`/pricing` redirects there), the main button in `ProPitch` (trial one link
  away), one dismissible dashboard line. "Under 18? Ask a parent before buying." under every button.
- **Badge** (`FounderBadge`: the logo's shield and the words): dashboard, account, Your plan,
  player cards and leaderboard rows (via `league_founders()`; `league_standings()` unchanged).
- **Parent pitch** (`ParentPitch`, on `/pro` and the landing page): only what Stay Safe Online
  teaches, plus "Buying for your kid?" (buy on the kid's account, together).
- **Events:** `founder_viewed`, `founder_clicked` (only the screen), `founder_purchased`.
- **Tables:** `founding_members`, `founder_holds` (`20261007100000_founding_members.sql`): learners
  read only their own seat; only the server writes; `check:rls` proves it.

## Paywall and certificates

Honest conversion: no timers, no fake urgency, no guilt; "Not now" is always there, and "Ask a
parent or guardian before subscribing" is shown to everyone.

- **`ProPitch`** (`src/components/pro/ProPitch.tsx`) is every Pro screen: the daily-limit screen,
  "What's next", the Pro sheet and the `/review` paywall. **One screen, no scrolling on a 360×640
  phone, the button in view:** the mascot (`happy`), one headline, 3 benefits with icons (one line
  each: unlimited lessons, "Review your mistakes", certificates; the extra streak freeze is listed on
  `/pro` only), the price with **annual preselected** ("A$59.99 a year, just A$5 a month"; monthly is a
  small switch), one big button ("Start 7-day free trial" via `PlanButton`, which sends
  `checkout_started`), "Not now", and the parent line. A gentle staggered entrance (none under
  reduced motion). It sends `paywall_viewed`.
- **"What's stopping you?"** (`DeclinedQuestion`, rules in `src/lib/pro/declined.ts`): "Not now"
  on the paywall or the daily-limit screen (`declineSource`; `/pro` is the plans section and has no
  "Not now", so `pro_page` no longer occurs) first swaps the pitch for one
  optional question with four one-tap answers and Skip, then carries on where "Not now" was going.
  It sends `pro_declined` with only `reason` and `source` (the screen: `paywall`, `limit`,
  `pro_page`; not the visitor's source). At most once a week per device (localStorage; never if
  storage is blocked). The sheet's ✕ and Escape just close. `npm run e2e:pro-declined` checks it.
- **"What's next"** (`WhatsNext`) is `ProPitch` with the next module named; its **teaser card**
  (`TeaserCard`: a sandbox, no XP, nothing saved) sits behind a small "Try a sample" link. With
  accounts it only shows where Pro is still needed (a copy without accounts).
- **Free first:** until a learner has finished a free lesson in a course (`hasFinishedFreeLesson`),
  tapping a Pro node, or opening a Pro lesson, shows "Start with the free lessons first"
  (`StartFreeFirst`: one button into the course's first lesson, "Not now", and a quiet link to
  `/pro`) instead of "What's next", and no `paywall_viewed` is sent. Learners with no progress in a
  course see **"Start here"** on its first lesson's bubble.
- **Plans and Pro identity**<a id="plans-and-pro-identity"></a> (`PlansCards`, `YourPlan`,
  `ProCelebration`; pure rules in `src/lib/pro/plans.ts`, tested). **Never list a benefit that isn't
  live** (`PRO_BENEFITS`; a test bans "new course", since free accounts get every course).
  - **Plans** (`/pro`, `/account/plan` for free learners; linked as "Free plan · See plans" at the
    top of the dashboard and "See plans" on `/account`): Free (A$0, three lines; "Start free" for
    guests, "Your plan" disabled when signed in) and Pro (Stripe's prices, annual preselected with a
    Yearly/Monthly switch, "Best value" only when the annual plan really saves, the 4 benefits,
    "Start 7-day free trial", the parent line). Pro first in the page and on phones (its button in
    view at 360×640), on the right from `sm`. Side by side they're the same height with the buttons
    lined up along the bottom (Free says "Upgrade any time." above its button; never extra
    benefits); stacked on phones they keep natural heights. The Pro card has a cyan border and
    `shadow-pro-card` (raised 2px on phones); a gentle staggered entrance (none under reduced motion). Below: the trial
    terms and a 3-question FAQ (cancel, after the trial, ask a parent).
  - **Nav:** "Pricing" (`/pro?from=nav`) in the header nav and the phone tab bar; "Your plan"
    (`/account/plan`) for Pro members. Hidden until a signed-in learner's Pro status is known.
  - **Events:** `plans_viewed` (`source`: `pro_page`, `account`, `dashboard` or `nav`, from `?from=`) and
    `plan_selected` (`plan`: free or pro; `interval`: monthly or annual for Pro), data only from
    `plansViewedData` / `planSelectedData`.
  - **Pro identity:** the member's node wears the Pro frame (an outer cyan ring and glow) in the
    header and tab bar, with a lit `ProBadge` beside their name on desktop and at the top of the
    dashboard (opens Your plan). `/pro` says "You're on Pro" and shows "See your plan", never a
    trial button. **No upgrade prompt for Pro members anywhere**, and none while their status is
    still loading (`e2e:plans` checks the main pages for upgrade wording).
  - **Your plan** (`/account/plan`): the plan, renewal or trial end (`proLine`), what's included
    (ticks) and "Manage subscription".
  - **Welcome moment** (`ProCelebration`, in the main layout): the first time a new subscriber
    (started in the last 14 days; not the early-user grant) opens the app on a device: the
    mascot celebrating, one confetti burst, the benefits, "Let's go". Remembered per device
    (`cybernet.proCelebrated.<userId>`); `/pro/welcome` marks it too.
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

## Mistake review

Pro learners try the cards they got wrong again. Pure rules in `src/lib/progress/mistakes.ts`
(tested), actions in `src/app/actions/mistakes.ts` and `recordMistakeAction` in
`src/app/actions/progress.ts`, UI in `src/components/mistakes/`.

- **What counts:** a lesson card's **first wrong try in a visit** (`LessonRun` →
  `store.recordMistake`; guests keep nothing, so `LocalStorageProgressStore` ignores it), and every
  wrong answer in a **server-graded quiz attempt**. The server re-grades the lesson answer and
  records nothing unless the lesson and card are in the loaded content, the card is graded (not an
  explainer, photo or explore card) and the answer really is wrong (`lessonMistake`); quiz mistakes
  only for cards still in that quiz (`quizMistakes`). Only the fact of the miss is stored.
- **Everyone signed in is recorded; only Pro reviews.** Free learners see the count on the
  dashboard (`MistakesCard`: "Your mistakes", "N cards to try again", "Review with Pro") and `/review`
  shows them `ProPitch` with the count. Lists leave out mistakes whose card has left the content
  (`reviewableMistakes`). Reset progress (one lesson or all) clears them.
- **`/review`** (`MistakeReview`, not indexed; guests sign in first): newest first, at most
  `REVIEW_BATCH` (30) at a time ("Review more" for the rest), in the player shell with the same
  card components, Check / Try again, nudges, explanations and the card's hint (as in lessons:
  opening it makes a never-finished card pay retry XP; practice XP is the retry amount anyway, so
  nothing to game), but no bonus chip, and "Skip for now" on every card (a skipped mistake stays). A right answer is re-graded on the server
  (`checkMistakeAction`, Pro only), which clears it, and pays like a replay through
  `store.completeCard`: practice XP toward today's goal, or the card's XP if it was never finished;
  quiz cards pay nothing. The finish screen counts what was fixed (mascot `celebrating`, or
  `thinking` if nothing was).

## Avatars and rewards

Cosmetic only, never bought, never gambling-like. Pure rules in `src/lib/rewards/` (`items.ts`,
`rules.ts`, tested), server code in `src/lib/rewards/server.ts` (vetted secret-key use), actions in
`src/app/actions/rewards.ts`, UI in `src/components/rewards/`.
- **The avatar is the mascot, dressed up** (avatars v2; art direction `docs/brand/avatars.png`,
  reference only; plan `docs/plans/avatars-and-rewards.md`). Never uploaded, never a photo.
  `MascotAvatar` (`src/components/mascot/outfit/`) draws the waving `happy` mascot from the real
  `Mascot` parts plus one SVG layer per accessory (`accessories.tsx`): head items in the head's
  64-unit grid (they tilt with it), body items in the viewBox, through the `outfit` slots of
  `MascotFigure` (behind, torso, neck, head; without them the drawing and static exports are
  unchanged). Accessories use `--color-mascot-accessory` (lighter, brighter blue) over
  `--color-mascot-accessory-fill`. `framing="bust"` crops head and shoulders for small circles;
  `size` under 40px drops fine detail. `Avatar` puts the bust in a node (header 32px, tab bar 24px,
  dashboard, `/account`, league rows 32px, player cards). Head and face items read at 24px; body
  items show from about 48px (the hood and cape collar peek out beside the head).
- **Slots:** one item per slot, at most 5 (`SLOTS`: head, face, neck, body, back). A new item
  replaces its slot, tapping a worn item takes it off (`wearItem`), and `effectiveOutfit` drops
  unknown ids, slot clashes and Pro items without Pro (the rest of the outfit stays).
- **The 12 items and how they're earned** (`AVATAR_ITEMS`, `unlockLabel`, tested): free from the
  start (backwards cap, round glasses, hoodie); from a spin (beanie, headband, headset, VR visor);
  milestones, unlocked for good and worked out from progress, never stored (scarf at a 7-day
  streak, grad cap for a finished course, jetpack at a 30-day streak); Pro, worn while Pro (circuit
  crown, cape). The sign-up gate shows the mascot in the free cap ("Your own avatar to dress up").
- **The avatar page** (`/account/rewards`, `AvatarStudio`): a big preview, slot tabs, item tiles
  (locked ones are dim silhouettes with how to get them), saved on tap through `setOutfitAction`
  (the server checks every item is owned, `validOutfit`) and reverted if the save fails. Putting an
  item on pops it in (`PRESS_SPRING`) and plays the mascot's short wave; nothing moves under reduced
  motion. `/dev/avatars` and `/dev/avatar-page` (dev only) show every item, the size strip and the
  page with local data; `node scripts/e2e/avatar-shots.mjs` saves them to `docs/plans/avatars/`.
- **Spins** are earned only by learning: finishing a module (its quiz passed), finishing a course
  (its final passed) and 7, 30 and 100-day streaks (longest streak). `claimSpins` derives them from
  real progress and records each once (`reward_spins`, idempotent), on end screens and the avatar
  page. **Every spin that's spun wins:** a spin is only offered while there's an unowned spin item
  (`spinCounts`); the server picks one with equal chance (never a Pro item, so paying never changes
  a spin). Spins earned after that are kept and shown as "N spins saved for new items" until items
  are added; no filler prizes. No money, odds, "rare" labels or near misses; every item is always
  listed.
- **Where:** `SpinPrompt` on the lesson-complete and quiz-results screens ("You earned a spin",
  only when one can win), `RewardSpin` (a ring of nodes lights in sequence, ~1.2 s, the result at
  once under reduced motion; "Wear it" / "Not now"), the avatar page, and the "Your avatar" row on
  `/account`. Never inside a lesson.
- **Data:** `profiles.outfit` (text[], at most 5 database-safe ids; `20261006100000_avatar_outfits.sql`),
  `reward_items_owned` (spin items won) and `reward_spins`; learners read their own rows only, the
  server writes (`check:rls`). `league_standings()` returns the outfit. `profiles.avatar` (v1) is
  unused, to be dropped with `display_name`. `npm run e2e:rewards` checks the flow.

## Daily lesson limit

Free accounts open up to **3 new lessons a day** (quizzes count); Pro is unlimited. Rules in
`src/lib/pro/dailyLimit.ts` (pure, tested), enforced by the database.

- **Never counted:** lessons guests can play (each course's first lesson and the help modules: the
  API sends them before checking anything), lessons already finished (a lesson completion, or a
  passed quiz: replays), and opening the same lesson again the same day.
- **Enforced in `/api/lessons/[id]`:** for a signed-in learner without Pro and a lesson that isn't
  a replay, it calls `open_lesson(user, lesson, 3, tz)` with the secret key (`openLessonToday` in
  `src/lib/pro/server.ts`). The function takes a per-learner advisory lock, so two tabs can't both
  take the last place, then inserts into `lesson_opens` or refuses (403 `{reason: "limit"}`).
- **The day** is the learner's own: `profiles.time_zone` (the browser sends `?tz=`), else
  Australia/Sydney. **A time zone can change at most once every 7 days**, enforced by the
  `limit_time_zone_changes` trigger (a change that comes too soon is silently kept as the old zone,
  so XP writes never fail over it). `check:rls` proves the limit, the 7-day rule and that only the
  server can call `open_lesson`.
- **UI:** the limit screen (`LimitReached`: "You've done 3 lessons today. Come back tomorrow, or go
  unlimited with Pro.", sends `limit_reached`); "N new lessons left today" in the course-path
  popover (`getDailyLessonsAction`, display only); a one-time dashboard notice
  (`DailyLimitNotice`, dismissed per device). Guests see the account badge on every lesson they
  can't play, Pro modules included.

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
  with `after()` from `recordXp`, never blocking the XP). Their player row (tier Packet, shown on
  leaderboards) is made then; leaderboards show their username. Not playing a week keeps your tier.
- **Grouping:** same tier only, then an activity band from the last 3 weeks' XP (light < 100 a
  week ≤ regular < 400 ≤ keen). `join_league` puts them in the first league of their tier with space
  (under 30), own band first then the nearest, and makes a new league only when all are full, under
  a lock per week and tier (no duplicates, never over 30).
- **Settling** (`settleLeague`, pure): ranked by weekly XP, ties to whoever got there first, then
  the username. The top 20% move up (at least 1 in leagues of 3+, and only with 50+ XP), the bottom
  15% move down (at least 1 in leagues of 6+). Never above Quantum or below Packet. Hidden learners
  aren't ranked and keep their tier. Vercel Cron calls `/api/cron/leagues` hourly (`vercel.json`;
  `CRON_SECRET`, checked first): `reconcileCurrentWeek` places anyone who earned XP this week but
  isn't in a league yet (a safety net, because `onXpEarned`'s `after()` placement can be dropped by
  Vercel), then `finalizeDueWeeks` settles every finished week since leagues opened, each in one
  transaction (`finalize_league_week`; a second run changes nothing). `placeInWeek` is shared by
  `onXpEarned` and the reconcile.
- **Hidden until there are players:** leagues (page, nav entry, standings) stay hidden until
  `LEAGUES_MIN_ACTIVE` (20) learners earn XP in one week, then stay open for good (`league_state`).
  No promotions before that, so everyone starts in Packet. **Never add fake or bot players.**
- **Tiers** (lowest first): Packet, Switch, Router, Firewall, Server, Mainframe, Quantum.
  `TierBadge` draws them on the logo's shield (concept: `docs/brand/leagues/tier-badges.png`):
  outline (Packet, Switch), dark-cyan fill (Router, Firewall), reversed bright cyan with a navy icon
  (Server, Mainframe; Mainframe is a wide multi-cabinet unit), purple Quantum. Always shown with the
  tier's name (`TierLabel`), never the badge alone.
- **Player cards** (`PlayerCard`; concept: `docs/brand/leagues/player-card.png`): the avatar circle
  holds the tier badge (**never photos**), the username, the tier, and on your own card total XP
  (bolt), streak (node chain, no flame) and courses completed. Other learners' cards show only the
  public fields: username, tier, weekly XP and Pro.
- **Pro is cosmetic only:** no extra XP or ranking advantage. Pro cards get the Pro frame and badge;
  `pro_cosmetic_until` is stamped from `getEntitlement()` (`proCosmeticUntil`).
- **Names:** leaderboards show each learner's username (see [Usernames](#usernames)); it's changed
  in account settings, not on `/leagues`. (`league_players.handle` is unused, dropped later.)
- **Safety:** "Show me on leaderboards" (on by default) hides the learner from every public view.
  Any username in your league can be reported (`handle_reports`, at most 10 a day); when 3 different
  learners report the same username it's replaced with a generated one (reports are kept). The cron
  emails yesterday's (Sydney) reports to `CONTACT_EMAIL` from 8 am, only on days with reports, via
  Resend (`RESEND_API_KEY`; one idempotency key per day, so hourly retries never send twice).
- **Dashboard card** (`LeaguesCard`, state from `leagueCardState` in `src/lib/leagues/card.ts`):
  while leagues are closed, everyone with a dashboard sees "Weekly leagues": the Packet badge, how
  leagues work (up to 30 learners; the tier ladder), and "Leagues open soon. Earn XP now to be
  ready." It loads no league data (no counts, other learners or empty leaderboard; a test checks).
  Guests also get "Create a free account". Once leagues open it becomes the learner's league card
  by itself (tier, place this week, time left, "See your league"); guests are invited to join. It
  waits for `useLeaguesStatus()` so it never flips from "soon" to open on screen.
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
  decoration, or illustration chrome. (A course card's progress bar takes that course's identity
  colour instead: see Course thumbnails.)
- **Fills vs strokes:** use `accent` for fills and `accent-ink` for text, strokes and rings. Bright
  cyan on white is only 2:1.
- **Correct is mint (`success`), not cyan,** so "right" and "interactive" are never confused.
- **Glow (`shadow-glow`)** is only for lit cyan nodes and the primary button. **One exception:** Pro
  identity: the Pro player card's frame (`drop-shadow-pro`), a member's node ring and lit
  `ProBadge`, and the Pro plan card (`shadow-pro-card`). Nowhere else.
- **Purple belongs to the Quantum tier badge** (`--color-quantum`, a lilac, `drop-shadow-quantum`;
  7.3:1 on the badge's navy tile, which is navy in both themes) **and, as a deeper violet, to How AI
  Really Works' identity** (`--color-course-ai`, owner, 2 Oct 2026). Nowhere else.
- **Course identity colours** (`--color-course-{safe,devices,ai,internet}` for surfaces in both
  themes, `-art` fixed for the navy art panel; `src/lib/content/courseTheme.ts`): Stay Safe Online
  emerald, Inside Your Devices amber, How AI Really Works violet, How the Internet Works cyan. Only
  on a course's thumbnail art, its level dots and its course-card progress bar, **never inside
  lessons or answer feedback** (so emerald never reads as "correct").
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
  (`PRESS_SPRING`, `POPOVER_SPRING` in `src/lib/motion.ts`, about 7%). Nothing else bounces, apart
  from the mascot's own one-shot reactions (a hop, the scan's check: see Mascot → Motion).
- **Entrances:** dashboard blocks rise in with a 60ms stagger, and path nodes pop in with a 30ms
  stagger, capped so long lists don't drag (`staggerDelay`).
- **Numbers and rings** animate up to their value (`CountUp`, `ProgressRing`) and animate again
  when the value changes.
- **Module complete:** one short confetti burst in brand colours on the quiz pass screen
  (`celebrate()`).
- **The only loops** are the course path's current-node pulse (2.4s), the loading sequence and the
  light travelling round the Pro player card's frame (`animate-pro-trace`, 7s). Mainframe's lights
  are static dots. Course thumbnails move once on hover, focus or tap, never on a loop.

### Course thumbnails
`CourseCover` (`src/components/illustrations/CourseCover.tsx`; owner's brief, 2 Oct 2026) draws each
course's thumbnail: on the catalog and dashboard cards, the course path's side panel (desktop) and a
banner at the top of the course page (phones). **Every course follows the template** at the top of
that file, future ones included:
- One big hero object you recognise in under a second, not a diagram: Stay Safe Online, the mascot
  holding up a shield (the logo's own) as a phishing hook bounces off it; Inside Your Devices, a phone
  pulled apart into floating layers (screen, battery, board with chip); How AI Really Works, the
  mascot showing a picture card to a small robot that's learning; How the Internet Works, an envelope
  on a dotted route over a simple globe.
- A 320 × 180 viewBox on the navy `screen` panel (both themes), no dot grid or extra decoration.
  `ART.stroke` (2) for every line, round caps and joins, rounded corners. Outlines in the light
  accessory blue, fills in the mascot's navy; the course colour only on the hero detail.
- The mascot is the real avatars v2 one (`MascotFigure` via `CoverMascot`), so thumbnails and
  avatars match.
- One short move on hover, keyboard focus or tap of the nearest `group` (the card): the hook swings
  and bounces off, the layers spread, the card is held higher and the robot's light blinks, the
  envelope zips along its route. `motion-safe:` classes and the `cover-*` keyframes in theme.css;
  nothing under reduced motion. Class names are written out in full (Tailwind can't see built ones).
- A new course adds its cover to `COVERS`, an accent in `courseTheme.ts` and a token pair;
  `courseTheme.test.ts` fails until it has both, and checks no two courses share a colour.
- `/dev/thumbnails` (dev only) shows the four cards side by side;
  `node scripts/e2e/thumbnail-shots.mjs` saves review screenshots to `docs/plans/thumbnails/`.
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
  - `idle` adds an occasional blink, the antenna's mood pulse, and a short wave when happy (560ms).
  - Changing `expression` plays a small spring bounce (`PRESS_SPRING`), unless a reaction plays.
  - **Reactions** (`reaction`, `src/components/mascot/reactions.ts`, timings tested): one-shot
    motions on parts of the SVG (never swapped images), played when the mascot mounts (a new `key`
    replays), each under 600ms, and nothing ever waits for them. No idle loop.
    - The feedback mascot in lessons (never inside cards): blinks while shown, **hops** (7px) on a
      right answer, **tilts its head** 8° around the neck, with a 3px bob, on a wrong one.
    - `bob` (3px) is the plain "appear" reaction.
  - **Security scan** (`reaction="scan"`, under 1.2s, the signature move): the shield's outline
    glows cyan, a scan line (a solid line and a faint band, clipped to the shield; no gradients)
    sweeps top to bottom, the eyes light up, then a check pops on the shield's lower corner with a
    tiny spring and stays. Used at lesson complete, on `/pro/welcome` and in the Pro welcome moment.
    Under reduced motion it shows only the check.
  - The parts file draws the head through a `head` slot (the tilt) and a `headOverlay` slot (the
    scan); without them the drawing is unchanged (tested), so the static exports never change.
  - A reaction resets motion's `PresenceContext`, so it plays even inside
    `<AnimatePresence initial={false}>` (the feedback footer), which skips first-mount animations.
  - Motion wrappers are always rendered, so server HTML never depends on the reduced-motion
    setting.
  - Under reduced motion it's static (still expressions; no reactions).
- **Accessibility:** decorative by default (`aria-hidden`). Pass `label` (or `label` alone for the
  default description) when it carries meaning.
- **Where it appears** (restrained, to delight, not distract):
  - the landing page hero and the dashboard's welcome (`happy`, waving)
  - lesson complete (`celebrating`, with the security scan)
  - module quiz pass (`celebrating`, with the confetti)
  - streak milestones (`celebrating`, on their own screen before lesson or quiz complete; confetti
    from 30 days)
  - quiz fail (`thinking`, with encouraging copy)
  - the end of a mistake review (`celebrating` when something was fixed, otherwise `thinking`)
  - league results after the weekly reset (`celebrating` with confetti when promoted, `happy` when
    staying, `thinking` when moving down)
  - every answer in lessons (a small reaction beside the feedback, see LessonRun above)
  - the age check, the locked lesson screen, the 404 page, empty states and the dashboard's
    "Fresh start" note after a streak ends (`presenting`, pointing at the next step)
  - **the one exception inside cards:** a **safety-note explainer** (`mascot: "presenting"`), which
    shows the mascot beside the body in an amber panel. Use it only for real-world safety (e.g.
    "don't open real devices"), at most once per lesson.
- **Where it must not appear:**
  - inside cards or card content (apart from safety-note explainers), or in the lesson header
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

### Hosting region
Vercel functions run in **`syd1`** (`"regions"` in `vercel.json`), next to Supabase
(`ap-southeast-2`, Sydney). Every server action and API route talks to the database, so keep them
together: `x-vercel-id` reads `syd1::syd1::…` (edge::function). Moving from `iad1` cut a lesson save
from ~2.8s to ~0.4s (`npm run e2e:latency`).

### Domain and SEO
- **`src/lib/site.ts`**: `siteUrl()` (production origin, `NEXT_PUBLIC_SITE_URL` or
  https://cybernettraining.com), `SITE_NAME`, `CONTACT_EMAIL` (hello@cybernettraining.com).
  `metadataBase`, canonical URLs, Open Graph URLs and the sitemap all use it, so previews still point
  search engines at production.
- **Indexing:** only `VERCEL_ENV=production` is indexable. Previews and local dev get a robots file
  that disallows everything, plus `noindex` metadata.
- **`sitemap.xml`** lists `/`, `/courses`, course paths, every lesson, `/privacy` and `/terms`.
  **`robots.txt`** disallows `/dev/`, `/account`, `/auth/`, `/feedback`, `/from/`, `/leagues`,
  `/certificate/` and `/review`.
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
  `lesson_complete`, `lesson_quit` (lesson id and card number only, without `source`: `quitEventData`), `pro_declined` (reason and screen only: `declinedEventData`), `plans_viewed` and `plan_selected` (see Plans and Pro identity), `quiz_pass`, the sign-up gate's `signup_prompt_viewed` and `signed_up`, and the
  Pro funnel: `paywall_viewed`, `limit_reached` (a free account hit today's limit, with the lesson),
  `teaser_played`, `checkout_started`, `trial_started`, `subscribed`, `certificate_issued`. Each
  has at most two properties: `lesson` (or `course`) and `source`; `eventData` only lets a content
  id through, so nothing personal can be sent. **Only Pro collects custom events** (2 properties; Web Analytics Plus allows 8 and
  shows UTM parameters). On Hobby, page views still work, and the event calls are harmless.
- **Events sent as a page first loads are queued** (`ensureAnalyticsQueue`): Vercel's `track()`
  only calls `window.va`, which `<Analytics>` creates after the page's own effects, so until
  1 Oct 2026 `lesson_start`, `paywall_viewed`, `limit_reached` and `signup_prompt_viewed` were lost
  on a first load (not after client-side navigation). Every `track*` helper creates the same queue
  first.
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
  optional lesson and an optional 1–5 rating (native radio inputs). It posts to `/api/feedback`,
  which inserts into the `feedback` table with the visitor's own session (RLS makes it insert-only,
  and the database rate-limits it: see Row Level Security rules). Without Supabase env vars it
  shows the contact email instead.
- **Emailed to the owner:** after storing it, the route emails a plain-text copy via Resend
  (`src/lib/feedback/`, sent with `after()`, so a failed email never fails the form) to
  `FEEDBACK_INBOX` in `src/lib/site.ts` (cybernettraining10@gmail.com for now; switch it to
  `CONTACT_EMAIL` once hello@ forwarding works). It holds the message, the lesson, the page the
  sender came from (same-site path only, no query string), the rating, the time, and only
  **whether** they were signed in, never who. At most `FEEDBACK_EMAILS_PER_HOUR` (12) emails an
  hour, counted from the table; the first message over the cap sends one "more are waiting" note,
  the rest stay in the table only. Without `RESEND_API_KEY` (previews, local) nothing is emailed.

## Minimalism guardrail (Brilliant-level clean)

Applies to every screen, and to all new work. **Before each preview, compare the screens against
this list and fix anything busy.**
- **One idea and one action per screen.** At most one sentence of instruction.
- **Generous spacing.** No new borders, badges or colours unless they carry meaning.
- **Animations are short and purposeful** (feedback, celebration, a first-time pointer that runs
  once or twice), **never decorative loops.**
- **Rewards and avatars** live on the lesson-complete screen and the profile, never in the lesson
  itself.

## CyberNet design playbook

Applies to all content work: the "learn before you do" rollout, new courses and card redesigns.
1. **Start from real life:** every lesson opens from something the learner does or uses (their
   phone, a game, a scam text), then shows the tech underneath.
2. **Predict, then play:** open new ideas with "What do you think happens?" before explaining.
3. **Interactive first:** drag, tap and try; explainers are one sentence and come after doing.
4. **Wrong answers teach:** show visually why it's wrong (the diagram or scene changes), then Try
   again. Never punish mistakes.
5. **Tiny steps that build:** each card uses what the previous one proved.
6. **3-second rule:** know what to do instantly (the zero-confusion rule below).
7. **Useful today:** each lesson ends with one thing they can do in real life now ("Try this: …").
8. **Learning over streaks:** XP and streaks reward real progress, not speed-running.

### Zero-confusion rule (every card type, every course)
A learner should know what to do within **3 seconds** of seeing a card.
1. **Problem first:** the top of the card says what's wrong or what to do, in one short sentence
   ("Fix the model's mistake", "Tap the battery").
2. **Show, don't describe:** real-looking pictures and real colours instead of abstract dots,
   charts or labels. Charts only in Hard bonus cards.
3. **One action per card:** one clear thing to tap, drag or choose. Nothing pre-selected unless the
   task is to change it.
4. **Few choices:** 3–4 options at most on Easy and Medium cards.
5. **Instant, visible feedback:** when they act, something on screen changes right away (a guess
   flips, a part lights up, a packet moves).
6. **Plain words:** everyday language, short sentences, no jargon in instructions (jargon only as
   a tappable glossary word).
7. **Everything visible:** fits 360×560 with no scrolling.

## Content style guide

- **Plain, jargon-light language** for curious beginners aged 13+: a reading age of about 12. Short
  sentences, everyday words, second person ("you"). Simple, never childish: it should feel right for a
  13-year-old and a 45-year-old alike, with light humour in examples where it fits (never in help or
  safety content). Teach how things work, not job-training detail (no memorising ports, flags,
  record types or standards trivia). Questions test understanding ("I get it"), not recall.
- **Depth, not exam prep:** CyberNet Training teaches understanding of foundations, not
  certification or exam prep (not CCNA, CompTIA or school exams).
  - **Easy:** what it is and why it matters in everyday life.
  - **Medium:** how it works, with simple cause and effect.
  - **Hard:** how it really works underneath, going deeper through explanation and hands-on
    exploration, never through memorisation. It should feel like "whoa, so that's how it works",
    not like studying for a test.
  - **Never:** memorising numbers, codes, command flags or acronym lists; exam-style trick
    questions; questions only answerable by recall rather than understanding.
- **Do first, explain after:** where possible, start a lesson or a new idea with a hands-on card
  (predict, drag, try) set up by its own prompt, then name the idea in a short explainer.
- **Explain before naming.** Introduce an idea with an everyday analogy first, then give the technical
  term in **bold** (e.g. light switch → **bit**; 8 bits → **byte** → **octet**).
- **Fits a phone:** every card fits 360×560 without scrolling (see Conventions → Fit target).
- **Keep it small.** One idea per explainer, at most 60 words. Lessons run 5–7 core cards (about
  3–5 minutes) and mostly teach by doing; a card's own prompt can teach the idea it asks about.
- **Explanations teach.** Say *why* the answer is right and address likely wrong answers. Wrong
  options should reflect real misconceptions.
- **Teach before test.** Never grade something that hasn't been shown or explained earlier in the
  course: in an earlier card, or in the card's own prompt. That includes a part's name or look
  (explore a scene before a hotspot or teardown tests its parts), a term, a number, a command, and
  what a safe action is. A card's own explanation doesn't count (it comes after answering), and core
  cards and quizzes can't rely on a challenge card. `load.test.ts` checks the scene part of this
  automatically (screws, `*-cover` parts and the laptop `panel` explain themselves, so teardowns
  can use them unexplored); check the rest by reading the lesson in order.
- **Prior knowledge only (owner, 2 Oct 2026): every question must be answerable using only what the
  learner has seen earlier in that module, or in an earlier module of the same course. No outside
  knowledge required, ever.** (So Bits and Binary can't ask about IP addresses: they're taught in
  module 2.) Enforced by concept tags: every card lists the concepts it `teaches` (an explainer, a
  reveal, or a prompt that explains the idea itself) and every graded card the concepts it `uses`
  (kebab-case ids, scoped to the course; only things a beginner wouldn't know without the course,
  never everyday knowledge). `conceptProblems` (`src/lib/content/concepts.ts`, run by
  `concepts.test.ts`) walks each course in order and fails when a concept is used before an earlier
  core card (or the card itself) teaches it, or is never taught; bonus cards may lean on bonus cards,
  nothing else may. A new or changed card must update its tags. The audit and fixes:
  `docs/plans/prior-knowledge-audit.md`.
- **Every option on screen (owner, 2 Oct 2026):** every control in a card (choices, drag items,
  bins, switches, scene parts, answer boxes) must be visible without scrolling at 360×560 and
  360×640, so nobody scrolls mid-drag or hunts for an option. `npm run e2e:fit-audit` fails if any
  is below the fold (page overflow alone, like a long prompt, is still reported).
- **Glossary (tap to define):** `content/glossary.json` is shared by every course: `{ id, term,
  full?, definition }`. The definition is **one plain sentence** (≤180; `isOneSentence`).
  Abbreviations carry `full` (`needsFullName`, tested): the popup shows "CPU = Central Processing
  Unit", or "Stands for: Internet Protocol address" for a longer term. In markdown text (explainer body, prompt, hint,
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
- **No giveaways in multiple choice:** options are shuffled on screen (stable per card), and wrong
  options should be as long, specific and tempting as the right one (real misconceptions, not
  jokes). Beginner audits read the cards with the answers stripped out and options shuffled.
- **Bonus cards** (`difficulty: "challenge"`) are optional stretch questions, shown as "Bonus ·
  Optional". Core cards alone must fully teach the lesson, and nothing later may depend on a bonus
  card. 0–2 per lesson. Thinking, not arithmetic for its own sake.
- **Quizzes** have about 5 core, interactive questions covering the module's lessons, and nothing
  that wasn't taught.
- **Technical accuracy is non-negotiable.** Double-check numbers, and prefer precise-but-simple over
  simplified-but-wrong.
- **Lesson shape (the right-level rules, `src/lib/content/shape.ts`):** 5–7 core cards (about 3–5
  minutes) plus 0–2 bonus cards; at least 60% of the core cards hands-on; explainers of at most 60
  words (80 for a safety note or a help module, which are split rather than cut); never two
  non-interactive cards (explainer or photo) in a row; a recap explainer of at most 3 bullets at the
  end; at most 3 multiple choice; at most one photo (photos don't count as cards). Quizzes have 5–8
  core, interactive questions, at most one vocabulary match, and no word-for-word copies of lesson
  cards. `load.test.ts` enforces these for every lesson and quiz (`npx tsx scripts/check-shape.ts
  <course-id> [module-id]` prints each lesson's counts and problems while you work). It also checks that
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
  Help lines inside other courses also sit in a free lesson: How AI Really Works has its Kids
  Helpline / Lifeline / 000 card in free lesson 1.3 as well as 6.2 (word for word the same). Wherever
  Kids Helpline (ages 5–25) appears for a general audience, Lifeline (13 11 14, any time, anyone in
  Australia; never called "free", since its site doesn't say) appears next to it. Help information
  is always in core cards (a prompt, explainer or recap), never only in a bonus card or an
  after-answer explanation.
- **Safe examples only:** IPv4 documentation ranges (`192.0.2.0/24`, `198.51.100.0/24`,
  `203.0.113.0/24`) stand in for public addresses, alongside the private ranges, `2001:db8::/32`
  and `example.com`/`example.org`. Never use a real person's or company's address. `load.test.ts`
  rejects any other IPv4 address (deliberately invalid ones, like `192.168.1.256`, are allowed).
- **`content/REVIEW.md`** lists each lesson's goals, key factual claims and every deliberate
  simplification. Update it whenever you add or change a lesson.
