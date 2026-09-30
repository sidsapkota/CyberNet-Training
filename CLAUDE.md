# CyberNet Training

A Brilliant.org-style interactive learning web app for **IT fundamentals**: hardware, networking,
operating systems, databases, programming logic, cloud and cybersecurity. Learners work through short
lessons made of interactive **cards** and get instant, satisfying feedback.

Audience: everyone from about **age 12 to adults**. See [Content style guide](#content-style-guide).

Current state: guests learn with progress in `localStorage`; learners who sign in (Google or email
magic link) get progress synced to Supabase. Both sit behind the same `ProgressStore` interface. No
payments or premium gating yet. See [Accounts and sync](#accounts-and-sync).
Code is on GitHub: `sidsapkota/CyberNet-Training`, branch `main`.

## Commands

```bash
npm run dev               # dev server on http://localhost:3000; predev prints LAN URLs for other devices
npm run build             # runs validate-content first (prebuild), then next build
npm run lint              # eslint . (Next 16 removed `next lint`)
npm test                  # vitest run
npm run typecheck         # next typegen && tsc --noEmit
npm run validate-content  # validate every JSON file under /content
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

```
content/courses/<course-dir>/course.json                   { id, title, description, order }
content/courses/<course-dir>/modules/<module-dir>/module.json   { id, title, description, order }
content/courses/<course-dir>/modules/<module-dir>/lessons/*.json
```

- A lesson file holds `{ id, kind: "lesson" | "quiz", title, order, isFree, cards[] }`. Quizzes also
  take `passThreshold` (0 to 1, default 0.7).
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
- **Card components are controlled.** They receive `{ card, answer, onAnswerChange, status }` and never
  grade themselves. `status` is `answering`, `correct` or `incorrect`; anything other than `answering`
  means read-only.
- **The player owns everything else:** Check, Try again, Continue and Skip buttons, the Enter key,
  feedback, animations, XP and persistence.
- **Shared fields:**
  - `base.ts`: every card has `id` and `difficulty` (`"core" | "challenge"`, required).
  - Every interactive card also has `prompt` and `explanation` (markdown). This is what lets the quiz
    review screen treat every card type the same way.
- **`schema.ts`** is the discriminated union of all card types (registration step 1).
- **`registry.ts`** maps card type → definition (registration step 2). `satisfies` makes the compiler
  catch a missing or mis-keyed entry. The player uses `getCardDefinition(card)`, which erases the
  answer type to `unknown`.

### Card types and data format
All cards have `id` (kebab-case) and `difficulty` (`core` | `challenge`). Interactive cards also have
`prompt` and `explanation` (markdown). Try each one at **`/dev/cards`** (dev server only).

| `type` | Extra fields | Answer (JSON) | Correct when |
|---|---|---|---|
| `explainer` | `title`, `body` (md), `image?` `{src, alt, width, height, caption?}` | none | read (Continue) |
| `multiple_choice` | `options` (2–5 `{id, text}`), `correctOptionId` | option id | right option picked |
| `drag_to_order` | `items` (3–7 `{id, label}`, **authored in the correct order**) | item ids | exact order |
| `binary_toggle` | `target` (0–255) | 8 booleans | bits sum to target |
| `numeric_input` | `base` (`decimal` \| `binary` \| `hex`, default decimal), `answer` (number or number[]), `hint?` (md), `unit?` | raw string | parsed value is accepted |
| `match_pairs` | `pairs` (3–6 `{id, left, right}`, unique texts) | `{leftId: rightId}` | every pair matched |
| `packet_path` | `nodes`, `links`, `source`, `destination`, `validPaths` (see below) | node ids from source | equals a valid path |
| `terminal` | `commands`, `success`, `promptLabel?`, `intro?`, `caseSensitive?` (see below) | `{history, response}` | success condition met |
| `hotspot` | `scene`, `view?`, `mode` (`tap` + `targets[]`, or `label` + `labels[] {part, label}`) | `{selected[], placed{part: labelIndex}}` | exactly the targets / every label on its part |
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
    col: 0–3, row: 0–3 }`, one node per cell.
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
- **Scenes** (`src/cards/shared/scenes/`) power `hotspot` and `teardown`:
  - `manifests.ts` is pure data: part ids, accessible names, hit boxes, draw order, `coveredBy` and
    named `views` (e.g. `open` = cover off). `art.tsx` draws each part as its own group.
  - Scenes: `laptop`, `phone`, `file-browser`. Generic devices only: no brands, logos or real
    designs (a test checks for brand names).
  - Parts under a cover that's still on can't be seen, tapped or announced. Schemas check every part
    id, view and visibility at load.
  - Add a scene by adding its manifest and its drawing; `scenes.test.ts` checks every part is drawn.
- **`hotspot`:** tap mode selects exactly `targets` (tap again to unselect). Label mode places label
  chips on numbered spots (spots don't name the part, or the answer would be given away).
- **`teardown`:**
  - Verbs: `unscrew`, `lift`, `slide-out`, `unplug` (remove) and `insert`, `fasten`, `plug-in`
    (refit).
  - Tapping a part does its next action if its `after` steps are done; otherwise it shows that
    action's `nudge` and counts it. Lift and slide actions can also be dragged.
  - Every card shows a built-in **"This is a simulation"** safety note. Removed parts go to a
    "Parts out" tray, which is used for refitting.
  - The schema rejects cycles, refits before removal, and acting on parts already off.
- **`simulator`:**
  - `model` names a registered pure function in `src/cards/simulator/models/`: `memory`,
    `cpu-cores`, `thermal`, `task-manager`, `storage` or `battery`. Each has its own params schema,
    inputs and outputs, and a unit test.
  - **Never eval.** Content only configures models, and goals are declarative conditions.
  - Control and output ids are model input/output names (camelCase allowed). The schema checks they
    exist with the right kind.
  - The `device` output is a phone or laptop mockup that stutters as `smooth` drops, with its state
    always in text too.
  - Answers are ready once a control changes. The server re-grades by running the same model.
- **`scenario`:** a wrong ending shows its consequence (that's the teaching). After Check → Try
  again, the failed choice is crossed out and the learner picks again at that step. The schema
  requires every step to be reachable, no loops, and at least one success.
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
- **Preferences:** the snapshot's `preferences` (currently `mode: "path" | "explore"`) are saved with
  progress via `store.setPreferences()`, so they sync once progress does. The field is optional in
  stored data (Zod default), so progress saved before it existed still loads. `resetAll` keeps it.
- **Timestamps:** cards and lessons record `completedAt`, and quizzes `passedAt` and attempt `at`.
  `activity.ts` derives the dashboard's per-day activity and totals from them (pure, takes `now`).
- **`xp.ts`** holds every XP rule and number, and callers use it to decide awards:
  - core cards: 10 on the first try, 5 after retries
  - challenge cards: 20 on the first try, 10 after retries
  - lesson complete: +20
  - quiz first pass: +50
  - XP is paid once per card, ever
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

### Pages
Pages with the site header live in the `src/app/(main)/` route group: a top bar (logo, Dashboard,
Courses, XP, theme) and, on phones, a bottom tab bar (`src/components/nav/SiteNav.tsx`). Lessons
keep their focused player shell.
- `/`: **dashboard** (`src/components/dashboard/Dashboard.tsx`). A big "Continue" hero for the
  current lesson, real stats (XP, lessons, modules), 14 days of activity, a progress ring per
  course, and "Your courses". Learners with no progress see a one-button welcome instead.
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
- `/lesson/[id]`: statically generated for every lesson and quiz (`dynamicParams = false`). In Path
  mode a locked item offers "Switch to Explore". ✕ returns to the course path.
- **Client-only rendering:** progress-dependent pages render the `NetworkMark` loading state until
  progress loads, then draw. This also keeps reduced-motion entrances from mismatching the
  server HTML.
- **Time estimates:** `src/lib/content/estimate.ts` uses a conservative 45 seconds per card, rounded
  to whole minutes. Keep estimates honest; don't hand-write durations.

## Folder structure

```
content/                 lesson content (JSON), see above
public/brand/            logo files (colour, mono, tile, lockups), app-icon PNGs, icon-source.png (original),
                         mascot/<expression>.svg (generated exports)
docs/brand/mascot/       the mascot's AI concept sheet (reference only; not served)
public/illustrations/    SVGs used by explainer cards (drawn for the navy `screen` panel)
scripts/                 validate-content.ts, generate-brand-assets.ts
src/app/                 routes, layout (fonts), globals.css, theme.css (design tokens), icon.svg,
                         apple-icon.png, manifest.ts
src/cards/               card types, contract, union schema, registry; shared/ (seeded shuffle, InlineText)
src/components/player/   lesson/quiz player UI
src/components/brand/    logo geometry (single source of truth) and <LogoMark>/<LogoLockup>
src/components/network/  the network motif: NetworkMark, NodeProgress, QuizNetwork
src/components/nav/      site header and phone tab bar
src/components/dashboard/ dashboard (hero, stats, activity, rings, welcome), reset button
src/components/course/   course path, path nodes + popovers, mode toggle, course card, catalog
src/components/illustrations/ course covers (CourseCover registry, keyed by course id)
src/components/mascot/   the mascot: geometry + palette, poses, SVG parts, <Mascot>
src/components/ui/       Button, Markdown, icons (lucide wrappers), CountUp, ProgressRing, ThemeToggle
src/lib/content/         schemas, fs loader (load.ts), server accessors (server.ts)
src/lib/progress/        ProgressStore, localStorage impl, provider, xp, derived state
src/lib/keyboard.ts      global keyboard shortcut helpers
src/lib/supabase/        env validation, typed browser/server/admin clients, generated DB types
src/lib/auth/            AuthProvider, verified user id, display-name rules, safe redirects
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
- **Sign-in:** Google, or an email magic link (`/login`). The only personal data we collect is the
  email and a display name. Learners may be 12, so there are no avatars, birthdays or real names:
  - `/account` suggests a nickname.
  - A trigger strips `avatar_url`, `picture`, `full_name` and `name` from auth user metadata.
    Supabase still keeps the provider's data in `auth.identities`, which account deletion removes.
- **`src/proxy.ts`** (Next 16's name for Middleware) refreshes the session cookie on each request
  with `getClaims()`. It doesn't gate pages.
- **`/auth/callback`** exchanges `?code=` (Google, and the default magic-link email, which uses PKCE
  and so needs the same browser) or `?token_hash=&type=` (`verifyOtp`). Redirects only go to
  same-site paths (`safeNextPath`). New users without a display name go to `/account?welcome=1`.
- **Redirect URLs** (Supabase → Auth → URL Configuration): `http://localhost:3000/auth/callback`
  and `https://cyber-net-training.vercel.app/auth/callback` are allowed. Any other origin (a phone
  on the LAN, a preview deployment) must be added there, or sign-in falls back to the Site URL.
- **Google sign-in** is in Testing mode (only allow-listed test accounts can use it).
  **Before publishing the Google app out of Testing mode, the "Continue with Google" button must use
  Google's official "G" logo** per Google's sign-in branding guidelines. For now it's text-only
  (`src/components/account/LoginForm.tsx`). The logo is a third-party brand asset: use Google's
  file as-is, as an exception to the lucide-only icon rule.
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
  - Path/Explore: the guest's non-default choice wins.
  - Merging is idempotent, so repeated sign-ins are safe.
- **Save prompt:** guests see "Save your progress?" on the lesson-complete screen. Dismissing it
  sets `cybernet.savePrompt.dismissed`, and it never shows again in that browser.

### Schema (`supabase/migrations/`)
Migrations, all applied to the linked project:
- `20260930120000_accounts_and_progress.sql`: the tables, RLS, grants and triggers.
- `20260930130000_revoke_extra_authenticated_privileges.sql`: removes Supabase's default
  `TRUNCATE`, `REFERENCES` and `TRIGGER` from `authenticated`. TRUNCATE ignores RLS.
- `20260930140000_profiles_sound_enabled.sql`: `profiles.sound_enabled` (default true).

| Table | Holds |
|---|---|
| `profiles` | `id` (= auth user), `display_name` (1 to 40 chars, nullable until chosen), `is_premium` (default false), `learning_mode` (`path` or `explore`), `sound_enabled` (default true) |
| `card_completions` | `(user_id, lesson_id, card_id)` primary key, `completed_at`, `xp` (0 to 20) |
| `lesson_completions` | `(user_id, lesson_id)` primary key, `completed_at`, `xp` (0 to 20) |
| `quiz_attempts` | `id`, `user_id`, `quiz_id`, `attempted_at` (unique per user and quiz), `score` 0 to 1, `passed`, `xp` (0 to 50), `answers` jsonb |

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
    grant and an update policy; `is_premium`, `learning_mode` and `sound_enabled` aren't writable.
  - Progress tables have **no write policies or privileges** for `anon` or `authenticated`. All
    progress writes go through Server Actions with the secret key, so users can never set their
    own XP.
- **`anon`** has no privileges at all, and `authenticated` has only `SELECT` plus `UPDATE
  (display_name)` on profiles. The second migration removed Supabase's default `TRUNCATE`,
  `REFERENCES` and `TRIGGER`. New tables get those defaults again, so revoke them in the same
  migration.
- **`npm run check:rls`** proves all of this against the linked project. It uses two throwaway
  users, signed in with admin-generated magic-link tokens, so no emails are sent. It also checks
  the triggers and the delete cascade, then cleans up. Run it after any schema or policy change.
- **Testing sign-in without email:** Supabase's built-in email sender has a low hourly limit. For
  automated tests, use `auth.admin.generateLink()` and open `/auth/callback?token_hash=…&type=magiclink`.

## Brand

### Concept: the network
The logo is a shield containing a hub node joined to four nodes. **Nodes and connections are the
visual language of the whole app:** learning means connecting nodes.
- **Course path:** lessons are large nodes (72px, the quiz hub 96px) zig-zagging down 45° circuit
  traces. States are shown by shape and icon, never repeated words:
  - Done: filled cyan with a check.
  - Current: a cyan ring, a pulse and a "Start"/"Continue" bubble.
  - Available: a cyan outline with the number.
  - Locked: dim, with a lock glyph.
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
- **Glow (`shadow-glow`)** is only for lit cyan nodes and the primary button.
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
  course covers). No emoji as icons.

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
- **The only loops** are the current-node pulse (2.4s), the loading sequence, and the slow packet
  on course covers.
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
  - the dashboard's first-visit welcome (`happy`, waving)
  - lesson complete (`celebrating`)
  - module quiz pass (`celebrating`, with the confetti)
  - quiz fail (`thinking`, with encouraging copy)
  - wrong answers in lessons (a small `confused` beside the feedback)
  - the locked lesson screen, the 404 page and empty states (`presenting`, pointing at the next
    step)
- **Where it must not appear:**
  - inside cards or card content, or in the lesson header
  - on correct answers (so it never gets repetitive)
  - on the course path or in navigation
  - more than once per screen
- **Static exports:** `npm run brand:mascot` renders the same parts, with hex colours and no motion,
  to `public/brand/mascot/<expression>.svg` for videos and socials. A test fails if they go stale.

### Sound and haptics
- **Sounds are synthesised** with the Web Audio API in `src/lib/sound.ts`: short oscillator notes
  with soft envelopes. **Source: original, written for this project; no audio files, nothing to
  license.**
- **Sounds:** correct, wrong, card complete, lesson complete, part removed and snap. All are under
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
  node grid.
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

## Content style guide

- **Plain, jargon-light language** for ages 12+. Short sentences, second person ("you").
- **Explain before naming.** Introduce an idea with an everyday analogy first, then give the technical
  term in **bold** (e.g. light switch → **bit**; 8 bits → **byte** → **octet**).
- **Keep it small.** One idea per explainer, at most 2–4 short paragraphs. Lessons run about 8–12
  cards and alternate explaining with doing.
- **Explanations teach.** Say *why* the answer is right and address likely wrong answers. Wrong
  options should reflect real misconceptions.
- **Challenge cards** (`difficulty: "challenge"`) are optional stretch questions. Core cards alone must
  fully teach the lesson, and nothing later may depend on a challenge card. Aim for about 2 per lesson.
- **Quizzes** have about 5 core, interactive questions covering the module's lessons, and nothing
  that wasn't taught.
- **Technical accuracy is non-negotiable.** Double-check numbers, and prefer precise-but-simple over
  simplified-but-wrong.
- **Lesson shape:** 8–12 cards, opening with a hook explainer and ending with a recap explainer,
  at most 3 multiple choice cards, exactly 2 challenge cards. Quizzes have 5–8 core, interactive
  questions. `load.test.ts` enforces all of this for every lesson and quiz.
- **Safe examples only:** IPv4 documentation ranges (`192.0.2.0/24`, `198.51.100.0/24`,
  `203.0.113.0/24`) stand in for public addresses, alongside the private ranges, `2001:db8::/32`
  and `example.com`/`example.org`. Never use a real person's or company's address. `load.test.ts`
  rejects any other IPv4 address (deliberately invalid ones, like `192.168.1.256`, are allowed).
- **`content/REVIEW.md`** lists each lesson's goals, key factual claims and every deliberate
  simplification. Update it whenever you add or change a lesson.
