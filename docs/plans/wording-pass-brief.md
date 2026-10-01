# Wording pass brief (shared by the four course agents)

Repo: C:\Users\siddh\Documents\CyberNet Training App (Windows; use the Bash tool with POSIX syntax).
A beginner IT-learning app for ages 13+ (simple, never childish). Read CLAUDE.md sections
"Content style guide", "Minimalism guardrail" and the card table under "Card types and data format"
first. You edit ONLY the lesson JSON files of your assigned course/modules
(content/courses/<course>/modules/<module>/lessons/*.json). Do not touch other files, other
courses, app code, glossary.json or REVIEW.md (report REVIEW.md changes needed instead).

## Goal (owner's rules, 1 Oct)
Questions must be quick to read and answer: about 5–15 seconds of thought, not puzzles.
- **One short sentence per question prompt** (aim ≤ 90 characters, hard limit 120), everyday words,
  second person, no double negatives, no "smallest/largest/fewest that still…" logic puzzles, no
  calculations unless the course level allows simple maths (Medium/Hard) and even then keep it to
  one easy step.
- **Answers recognisable from what the lesson showed** (never require outside knowledge).
- Example to fix: "What is the smallest amount of RAM to run everything smoothly?" → "Your phone is
  slow with lots of apps open. Which part would help most?"
- **Fit a 360×640 phone:** shorten everything a learner must read on a card. Options ≤ 60
  characters (aim ≤ 45), all about the same length and equally tempting (real misconceptions, no
  joke options, the right one must not stand out by length or wording). Sort/match/drag item labels
  ≤ 40 characters. Explainer bodies ≤ 40 words where possible (hard limit 60; safety/help 80).
  Scenario step text ≤ 2 short sentences; choices ≤ 60 characters; consequences ≤ 1–2 sentences.
  Explanations ≤ 2 short sentences (say why the answer is right and address the likely wrong one).
  Hints ≤ 1 sentence, nudges ≤ 1 sentence: still pointing the way without giving the answer.

## Depth, not exam prep (owner, 2 Oct)
Understanding, never certification/exam prep. No memorising numbers, codes, flags or acronym lists, no trick or recall-only questions. Reword exam-style cards into understanding questions (words only); list the ones you can't fix under "Reads like exam prep".

## Never change (progress and grading depend on them)
- Any `id` (lesson, card, option, item, pair, step, choice, part…), any card `type`, `difficulty`,
  `order`, `correctOptionId`, which item is correct, the correct order/bins/pairs/targets/answers,
  numeric `answer`s, simulator params/goals, scene/part ids, terminal commands/outputs, packet_path
  topology, next_word/train_model data. You change WORDS only (prompt, option/item/choice text,
  explanations, hints, nudges, explainer titles/bodies, scenario text, about lines if clearer).
- Facts: technical accuracy is non-negotiable; keep every claim true. Don't introduce new terms or
  ideas the lesson doesn't already teach. Teach-before-test must still hold (if a prompt used to
  carry teaching, keep that teaching somewhere before the question).
- Glossary marks `[[term]]` / `[[label|id]]`: keep them valid (first use per card, not in option/item
  /choice labels, not in quizzes, not where the card defines the term in bold). If you remove the
  first use, move the mark to the new first use.
- Safety and help content (Stay Safe Online, help lines, "ask an adult"): keep every safety line and
  help detail exactly correct; calm, never scary; help info stays in core cards.
- Multiple-choice option text is plain text (no backticks or markdown).
- Keep the JSON formatting (2-space indent, trailing newline). Edit with a Node/Python script or
  careful text edits; verify `git diff` shows only intended changes.

## Check your work
1. `npm run validate-content` (must pass).
2. `npx vitest run src/lib/content` — failures in YOUR course's files must be fixed; if a failure
   is in another course (other agents are editing in parallel), ignore it and say so.
3. `COURSE=<your-course-id> node scripts/e2e/fit-audit.mjs` (the dev server is running on :3000):
   report how many cards don't fit at 360×640 before (from .e2e-shots/fit/report.json, filter your
   course, viewport "640") and after. Don't chase every pixel: big scenes and long sort lists may
   still not fit; just make the words lean. NOTE: fit-audit overwrites .e2e-shots/fit/report.json;
   copy the "before" numbers first.
4. Don't commit. Report: files changed, count of prompts/options/explanations shortened, 5
   before→after examples, fit numbers before/after, any REVIEW.md claims that changed wording, and
   anything you were unsure about.
