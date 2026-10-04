// Scores every regular lesson against the lesson pattern + picture-first rules (CLAUDE.md) and
// writes docs/plans/lesson-pattern-audit.md, worst first. Heuristic (a human still decides), meant
// to point the rollout at the worst offenders. Re-run after rebuilds to watch the red turn green.
//   npx tsx scripts/lesson-pattern-audit.mjs   (or: node scripts/lesson-pattern-audit.mjs)
import fs from "node:fs";
import path from "node:path";

const APP = path.resolve(import.meta.dirname, "..");
const COURSES = path.join(APP, "content/courses");

// Rollout order (live courses first).
const ORDER = ["stay-safe-online", "inside-your-devices", "how-ai-really-works", "how-the-internet-works"];

// Question (graded, interactive) card types that are text to read, not a picture to look at.
const TEXT_QUESTION = new Set(["match_pairs", "numeric_input", "drag_to_order", "fill_gap", "true_false", "scenario"]);
const NON_INTERACTIVE = new Set(["explainer", "photo"]);

const words = (md = "") =>
  md.replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_`#>|]/g, " ").split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}

function scoreLesson(lesson) {
  const cards = lesson.cards ?? [];
  const reasons = [];
  let debt = 0;
  const first = cards[0];
  if (first && NON_INTERACTIVE.has(first.type)) {
    debt += 3;
    reasons.push("opens by telling (first card is an explainer)");
  }
  const explainers = cards.filter((c) => c.type === "explainer").length;
  if (explainers > 2) {
    debt += 2 * (explainers - 2);
    reasons.push(`${explainers} explainers (max 2)`);
  }
  const textQ = cards.filter((c) => TEXT_QUESTION.has(c.type) || (c.type === "multiple_choice" && !c.image));
  if (textQ.length) {
    debt += textQ.length;
    const mcNoImg = cards.filter((c) => c.type === "multiple_choice" && !c.image).length;
    reasons.push(`${textQ.length} text-only question card(s)${mcNoImg ? ` (${mcNoImg} MC without a picture)` : ""}`);
  }
  const longPrompts = cards.filter((c) => c.prompt && words(c.prompt) > 14).length;
  if (longPrompts) {
    debt += longPrompts;
    reasons.push(`${longPrompts} long prompt(s) (>14 words)`);
  }
  const longExpl = cards.filter((c) => c.explanation && words(c.explanation) > 30).length;
  if (longExpl) {
    debt += longExpl;
    reasons.push(`${longExpl} paragraph-length feedback`);
  }
  const grade = debt >= 7 ? "rebuild" : debt >= 3 ? "needs work" : "pass";
  return { debt, grade, reasons };
}

const byCourse = new Map();
for (const file of walk(COURSES).filter((f) => f.includes(`${path.sep}lessons${path.sep}`) && f.endsWith(".json"))) {
  const lesson = JSON.parse(fs.readFileSync(file, "utf8"));
  if (lesson.kind !== "lesson") continue; // quizzes audited separately
  const rel = file.split(`courses${path.sep}`)[1];
  const [courseDir, , moduleDir] = rel.split(path.sep);
  const res = scoreLesson(lesson);
  if (!byCourse.has(courseDir)) byCourse.set(courseDir, []);
  byCourse.get(courseDir).push({ id: lesson.id, title: lesson.title, module: moduleDir.replace(/^\d+-/, ""), ...res });
}

const courseTitle = (dir) => JSON.parse(fs.readFileSync(path.join(COURSES, dir, "course.json"), "utf8")).title;
const EMOJI = { rebuild: "🔴", "needs work": "🟡", pass: "🟢" };
const totals = { rebuild: 0, "needs work": 0, pass: 0 };
for (const list of byCourse.values()) for (const l of list) totals[l.grade]++;

const today = new Date().toISOString().slice(0, 10);
let md = `# Lesson pattern audit\n\nScored against the lesson pattern and the picture-first rules in CLAUDE.md. Heuristic (a human decides the final call); re-run \`node scripts/lesson-pattern-audit.mjs\` after rebuilds. Last run: ${today}.\n\n`;
md += `**Legend:** 🔴 rebuild · 🟡 needs work · 🟢 pass (already pattern-shaped).\n\n`;
md += `**Totals:** 🔴 ${totals.rebuild} rebuild · 🟡 ${totals["needs work"]} needs work · 🟢 ${totals.pass} pass.\n\n`;
md += `Debt points: opens-by-telling +3 · each explainer over 2 +2 · each text-only question card +1 · each long prompt (>14 words) +1 · each paragraph-length feedback +1. (≥7 rebuild, 3–6 needs work, <3 pass.)\n`;

for (const dir of ORDER) {
  const list = byCourse.get(dir);
  if (!list) continue;
  list.sort((a, b) => b.debt - a.debt);
  md += `\n## ${courseTitle(dir)}\n\n| | Lesson | Module | Debt | Why |\n|---|---|---|---|---|\n`;
  for (const l of list) {
    md += `| ${EMOJI[l.grade]} | ${l.title} (\`${l.id}\`) | ${l.module} | ${l.debt} | ${l.reasons.join("; ") || "—"} |\n`;
  }
}

const out = path.join(APP, "docs/plans/lesson-pattern-audit.md");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, md);
console.log(`Wrote ${path.relative(APP, out)}`);
console.log(`Totals: ${totals.rebuild} rebuild, ${totals["needs work"]} needs work, ${totals.pass} pass`);
