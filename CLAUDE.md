# CyberNet Training

A Brilliant.org-style interactive learning web app for **IT fundamentals**: hardware, networking,
operating systems, databases, programming logic, cloud and cybersecurity. Learners work through short
lessons made of interactive **cards** and get instant, satisfying feedback.

Audience: everyone from about **age 12 to adults**. See [Content style guide](#content-style-guide).

Current state: v1, local only. There is **no auth, database or payments yet**. Progress lives in
`localStorage` behind the `ProgressStore` interface, so a Supabase implementation can replace it later.

## Commands

```bash
npm run dev               # dev server on http://localhost:3000
npm run build             # runs validate-content first (prebuild), then next build
npm run lint              # eslint . (Next 16 removed `next lint`)
npm test                  # vitest run
npm run typecheck         # next typegen && tsc --noEmit
npm run validate-content  # validate every JSON file under /content
npm run brand:assets      # regenerate logo SVGs + favicon from src/components/brand/geometry.ts
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
- IBM Plex Sans + IBM Plex Mono via `next/font/google` (self-hosted at build time)
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

### Adding a new card type
1. Create `src/cards/<new-type>/` with `schema.ts` (spread `interactiveCardBase` or `cardBase`, and
   add `type: z.literal("new_type")`), `grade.ts`, the view component, `definition.ts` and
   `grade.test.ts`.
2. Add the schema to the union in `src/cards/schema.ts`.
3. Add the definition to `definitions` in `src/cards/registry.ts`.
4. Add schema cases to `src/cards/schema.test.ts` and a fixture to `src/test/fixtures.ts`.

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
- **`xp.ts`** holds every XP rule and number, and callers use it to decide awards:
  - core cards: 10 on the first try, 5 after retries
  - challenge cards: 20 on the first try, 10 after retries
  - lesson complete: +20
  - quiz first pass: +50
  - XP is paid once per card, ever
- **`state.ts`** holds pure derived state, and nothing derived is ever stored:
  - unlocks: lessons in order within a module; the quiz after all of the module's lessons; the next
    module after this module's quiz is passed
  - statuses, module progress, the next lesson, the blocking lesson, and the resume position

### Pages
- `/`: the **course map**. Each module is a card whose lessons form a vertical network path
  (`src/components/home/CourseMap.tsx`), ending in the quiz as a hub node.
- `/lesson/[id]`: statically generated for every lesson and quiz (`dynamicParams = false`).

## Folder structure

```
content/                 lesson content (JSON), see above
public/brand/            logo files (colour, mono, tile, lockups), app-icon PNGs, icon-source.png (original)
public/illustrations/    SVGs used by explainer cards (drawn for the navy `screen` panel)
scripts/                 validate-content.ts, generate-brand-assets.ts
src/app/                 routes, layout (fonts), globals.css, theme.css (design tokens), icon.svg,
                         apple-icon.png, manifest.ts
src/cards/               card types, contract, union schema, registry
src/components/player/   lesson/quiz player UI
src/components/brand/    logo geometry (single source of truth) and <LogoMark>/<LogoLockup>
src/components/network/  the network motif: NetworkMark, NodeProgress, QuizNetwork
src/components/home/     home page UI, course map
src/components/ui/       Button, Markdown, icons (lucide wrappers), CountUp, ThemeToggle
src/lib/content/         schemas, fs loader (load.ts), server accessors (server.ts)
src/lib/progress/        ProgressStore, localStorage impl, provider, xp, derived state
src/lib/keyboard.ts      global keyboard shortcut helpers
src/lib/network/         pure layout maths for the motif (quiz ring/grid, map lanes)
src/test/fixtures.ts     test data builders
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

## Brand

### Concept: the network
The logo is a shield containing a hub node joined to four nodes. **Nodes and connections are the
visual language of the whole app:** learning means connecting nodes.
- **Course map:** lessons are nodes on a vertical path of 45° circuit traces, and the quiz is a
  larger hub. Completed nodes are lit cyan with a check. The current node has a gentle pulse ring.
  Locked nodes are dim outlines with a lock. Connections light up once the node before is done.
- **Lesson progress:** `NodeProgress` shows one node per card on a trace. Challenge cards are
  diamonds; skipped challenges are amber outlines.
- **Feedback:** a correct answer sends a pulse along the trace to the card's node (~370ms). A wrong
  answer gives a ~250ms soft shake, with no pulse.
- **Completion:** the logo network assembles (`NetworkMark mode="assemble"`). Quiz results use a
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
- **Spacing:** Tailwind's 4px scale plus the `gutter` and `section` tokens and the `max-w-lesson`
  and `max-w-page` containers.

### Icons
- **lucide-react only,** imported from `src/components/ui/icons.tsx`, which sets `strokeWidth` 1.75
  and round caps/joins to match the logo. Add new icons there.
- **Custom drawing** is allowed only for the logo and node shapes. No emoji as icons.

### Motion
- **Purposeful and quick:** feedback animations stay under 400ms, and celebrations about 1s.
  Easing is `ease-out-quick` (`cubic-bezier(0.22, 1, 0.36, 1)`).
- **Correct:** a pulse along the trace plus a node ripple. **Wrong:** a small shake. **No bounces.**
- **The only loops** are the current-node pulse (2.4s) and the loading sequence.
- **`prefers-reduced-motion`:** every animation must render its final state instantly. Use
  `useReducedMotion()` for motion components; CSS keyframes are neutralised in `globals.css`.

### Anti-generic rules
- No purple, pink or rainbow gradients. No gradients at all, apart from the faint background
  node grid.
- No glassmorphism: no `backdrop-blur`, no translucent panels. Headers are solid `canvas` with a
  hairline border.
- No emoji as icons, and one icon set.
- No generic grey or black dark mode: surfaces are navy.
- Round shapes are for nodes only. Glow is for cyan interactive elements only.
- New screens should use the network motif for loading, empty, success and locked states.

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
