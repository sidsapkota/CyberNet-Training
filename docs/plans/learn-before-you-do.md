# Plan: "learn before you do"

Status: **plan, not built.** Pilot on Inside Your Devices module 1 after the owner approves this
plan; then roll out course by course, one preview per course.

## The rule

Before any activity uses a part, word or idea, the learner meets it in an **interactive learning
card**: they tap, and see it, with one sentence. Example: before "take out the battery", a card
where they tap the phone and see "This is the battery. It stores the energy that runs everything."
with a short glow on the part.

- **One sentence per learning card.** More cards are fine; each takes seconds.
- **Every activity is preceded by the learning cards for everything it uses** (parts, words,
  ideas). A test checks it where it can be checked automatically (scene parts, glossary terms,
  named items), the rest by reading the lesson in order (as today).
- **More variety:** no lesson is just "scene, then drag". Each lesson mixes at least three
  interaction styles.
- **Quick questions** (owner, 1 Oct; the rest of that message was cut off): one short sentence,
  everyday words, no double negatives, no "smallest/largest that still…" puzzles; about 5–15
  seconds of thought; answers recognisable from what the lesson showed.
- **Nothing below the fold** at 360×640 and in the Instagram browser (~560px): a card that can't
  fit is split in two. `npm run e2e:fit-audit` checks every card (the current content has
  over 100 cards that don't fit, mostly long prompts with a scene, or long explanations; the
  rollout fixes them course by course).
- **Minimalism guardrail** (CLAUDE.md): one idea and one action per screen, at most one sentence
  of instruction, no decorative loops.

## Lesson length becomes time-based

The "5–7 core cards" rule becomes **about 3–5 minutes**, from a per-type time estimate
(`src/lib/content/estimate.ts`), so short learning cards don't count like a full activity:

| Card | Seconds (estimate) |
|---|---|
| Learning card (`reveal`, one explore part) | 8 |
| `true_false` | 8 |
| `fill_gap` | 12 |
| Multiple choice, sort, match, order | 20–30 |
| `estimate` | 15 |
| `chat` / scenario | 30–40 |
| Hotspot tap/label, teardown, simulator, terminal, packet path | 40–60 |

Shape rules (`shape.ts`, tested): 3–5 minutes of core cards; at least 60% of time hands-on; at
most 3 multiple choice; at least three interaction styles; a recap of at most 3 bullets; never two
non-interactive cards in a row (learning cards are interactive).

## New card types (lightweight)

All follow the card contract (`schema.ts`, `grade.ts`, view, `definition.ts`, tests, a Try again
rule in `retry.ts`, a grader in `grading.ts`, a sample on `/dev/cards`).

1. **`reveal`** (the learning card; guided, ungraded, like explore): one thing, one sentence.
   ```ts
   { type: "reveal", id, difficulty: "core",
     show: { scene: SceneId, part: string, view?: string }   // highlight one scene part
         | { icon: LessonIconName }                          // or a drawn icon
         | { term: string },                                  // or a glossary word
     sentence: string,              // ≤ 120 chars, one sentence, the part/word in **bold**
     prompt?: string }              // ≤ 60 chars, e.g. "Tap the phone."
   ```
   Tap the highlighted thing (or the card) → it glows once and the sentence appears → Continue.
   Pays a small XP once (like explore).

2. **`true_false`** (swipe or tap):
   ```ts
   { type: "true_false", id, difficulty, prompt /* the statement, one sentence */,
     answer: boolean, explanation, hint?, nudge? }
   // answer: boolean | null
   ```
   Swipe right/left or tap True/False (buttons always there; swiping is optional). Check, as
   every card.

3. **`fill_gap`** (tap a word into a sentence):
   ```ts
   { type: "fill_gap", id, difficulty, prompt /* sentence with one "___" */,
     options: { id, text }[] /* 2–4 */, correctOptionId, explanation, hint?, nudge? }
   // answer: option id | null
   ```

4. **`estimate`** (quick slider, Medium/Hard only, never a calculation):
   ```ts
   { type: "estimate", id, difficulty, prompt, min, max, step, unit?,
     answer: number, tolerance: number, explanation, hint? }
   // answer: number | null; right when |answer - value| ≤ tolerance
   ```
   After Check, the true value appears on the slider beside theirs.

5. **`chat`** (a scenario styled as messages): the existing `scenario` schema plus
   `style: "chat"` and each step's text as a message bubble from `them`; choices are the
   learner's replies. Grading, Try again and the success/fail ending are scenario's.

Considered and left out for now: spot the difference (overlaps with hotspot tap on two
self-labelled scenes; can come later as a scene pair).

## Pilot: Inside Your Devices, module 1

Lessons: `whats-in-the-box`, `memory-vs-storage`, `meet-the-cpu`, and the module quiz. Steps:
1. Build `reveal`, `true_false` and `fill_gap` (the pilot needs these; `estimate` and `chat` come
   with the courses that use them).
2. Rewrite the three lessons: a `reveal` (or one-part explore) for every part, word and idea before
   it's used; one sentence per learning card; quick questions; every card fits 360×640 and 560.
   Keep every published card and lesson id that survives (progress is keyed on them); new cards get
   new ids; removed ids are never reused.
3. The time-based shape rule and the "learn before you do" checks in `load.test.ts`.
4. Fit audit, design QA and a beginner audit of module 1 at 360×640; REVIEW.md updated.
5. Preview to the owner. After approval: the rest of Inside Your Devices, then Stay Safe Online,
   How AI Really Works, How the Internet Works, one preview each.

## Questions for the owner

1. The question-wording message was cut off after "Answers recognisable from what the lesson…":
   anything more?
2. Should quizzes also use the new types (true/false and fill-the-gap are quick), or stay with
   the current ones?
