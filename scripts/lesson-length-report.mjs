// Per-lesson length report for the lesson-pattern rollout.
//   node scripts/lesson-length-report.mjs <course-id> [module-id]
// For each regular lesson: the longest QUESTION (a graded card's prompt, or a scenario step's text)
// and the longest FEEDBACK (a card's explanation / a scenario choice consequence), in words.
// Flags questions over 12 words and feedback over ~2 lines (>2 sentences or >26 words).
import fs from "node:fs";
import path from "node:path";

const APP = path.resolve(import.meta.dirname, "..");
const [courseArg, moduleArg] = process.argv.slice(2);
if (!courseArg) {
  console.error("usage: node scripts/lesson-length-report.mjs <course-id> [module-id]");
  process.exit(1);
}

const QUESTION_MAX = 12; // words
const FEEDBACK_MAX_WORDS = 26; // ~2 lines on a phone
const FEEDBACK_MAX_SENTENCES = 2;
const GRADED = new Set(["multiple_choice", "sort_bins", "drag_to_order", "binary_toggle", "numeric_input",
  "match_pairs", "packet_path", "terminal", "hotspot", "teardown", "simulator", "scenario",
  "train_model", "next_word", "true_false", "fill_gap"]);

const strip = (md = "") => md
  .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1")
  .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
  .replace(/[*_`#>|]/g, " ");
const words = (md = "") => strip(md).split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
// A quoted scam message (an email, text or call) is the stimulus the learner judges — like showing a
// picture — not the question. Count question length with quoted spans removed.
const unquoted = (md = "") => md.replace(/["“][^"”]*["”]/g, " ");
const qWords = (md = "") => words(unquoted(md));
// Only count a full stop that ends a sentence (followed by space or end), so domains and addresses
// like yourbank.example or 192.0.2.1 don't read as several sentences.
const sentences = (md = "") => strip(md).split(/[.!?]+(?=\s|$)/).map((s) => s.trim()).filter(Boolean).length;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}

const root = path.join(APP, "content/courses", courseArg);
const files = walk(root)
  .filter((f) => f.includes(`${path.sep}lessons${path.sep}`) && f.endsWith(".json"))
  .filter((f) => !moduleArg || f.includes(moduleArg))
  .sort();

let anyFlag = false;
for (const file of files) {
  const lesson = JSON.parse(fs.readFileSync(file, "utf8"));
  if (lesson.kind !== "lesson") continue;
  const questions = []; // {card, text, n}
  const feedback = []; // {card, text, n, s}
  for (const c of lesson.cards ?? []) {
    if (GRADED.has(c.type) && c.prompt) questions.push({ card: c.id, text: c.prompt, n: qWords(c.prompt) });
    if (c.type === "scenario") {
      for (const step of c.steps ?? []) {
        if (step.text) questions.push({ card: `${c.id}/${step.id}`, text: step.text, n: qWords(step.text) });
        for (const ch of step.choices ?? []) {
          if (ch.consequence) feedback.push({ card: `${c.id}/${ch.id}`, text: ch.consequence, n: words(ch.consequence), s: sentences(ch.consequence) });
        }
      }
    }
    if (c.explanation) feedback.push({ card: c.id, text: c.explanation, n: words(c.explanation), s: sentences(c.explanation) });
  }
  const qMax = questions.sort((a, b) => b.n - a.n)[0];
  const fMax = feedback.sort((a, b) => b.n - a.n)[0];
  const qBad = questions.filter((q) => q.n > QUESTION_MAX);
  const fBad = feedback.filter((f) => f.n > FEEDBACK_MAX_WORDS || f.s > FEEDBACK_MAX_SENTENCES);
  const flag = qBad.length || fBad.length;
  if (flag) anyFlag = true;
  console.log(`\n${flag ? "✗" : "✓"} ${lesson.id}`);
  console.log(`    longest question: ${qMax ? `${qMax.n}w  [${qMax.card}]  "${strip(qMax.text).trim().slice(0, 70)}"` : "—"}`);
  console.log(`    longest feedback: ${fMax ? `${fMax.n}w/${fMax.s}s  [${fMax.card}]  "${strip(fMax.text).trim().slice(0, 70)}"` : "—"}`);
  for (const q of qBad) console.log(`      ! question ${q.n}w > ${QUESTION_MAX}  [${q.card}]`);
  for (const f of fBad) console.log(`      ! feedback ${f.n}w/${f.s}s  [${f.card}]`);
}
console.log(anyFlag ? "\nSome cards exceed the limits (see !)." : "\nAll within limits.");
