/**
 * Checks lessons against the right-level rules (src/lib/content/shape.ts) and prints each one's
 * card counts, minutes and problems. For content work before a course joins RIGHT_LEVEL_COURSES.
 *   npx tsx scripts/check-shape.ts <course-id> [module-id]
 */
import { estimateMinutes } from "../src/lib/content/estimate";
import { loadContent } from "../src/lib/content/load";
import { toLessonOutline } from "../src/lib/content/schema";
import { isHandsOn, lessonShapeProblems } from "../src/lib/content/shape";

const [courseId, moduleId] = process.argv.slice(2);
if (!courseId) {
  console.error("Usage: npx tsx scripts/check-shape.ts <course-id> [module-id]");
  process.exit(2);
}
let failed = 0;
for (const lesson of loadContent().lessons.values()) {
  if (lesson.courseId !== courseId || (moduleId && lesson.moduleId !== moduleId)) continue;
  if (lesson.kind === "quiz") {
    const matches = lesson.cards.filter((c) => c.type === "match_pairs").length;
    const problems = [lesson.cards.length < 5 || lesson.cards.length > 8 ? `has ${lesson.cards.length} questions (5–8)` : "", matches > 1 ? `has ${matches} match questions (at most 1)` : ""].filter(Boolean);
    console.log(`${problems.length ? "✗" : "✓"} ${lesson.id} (quiz, ${lesson.cards.length} questions)${problems.map((p) => `\n    - ${p}`).join("")}`);
    failed += problems.length;
    continue;
  }
  const core = lesson.cards.filter((c) => c.type !== "photo" && c.difficulty === "core");
  const problems = lessonShapeProblems(lesson, { helpModule: lesson.moduleId === "when-things-go-wrong" });
  const share = Math.round((core.filter(isHandsOn).length / Math.max(1, core.length)) * 100);
  console.log(
    `${problems.length ? "✗" : "✓"} ${lesson.id}: ${core.length} core + ${lesson.cards.length - core.length} other, ${share}% hands-on, ~${estimateMinutes(toLessonOutline(lesson))} min` +
      problems.map((p) => `\n    - ${p}`).join(""),
  );
  failed += problems.length;
}
process.exitCode = failed ? 1 : 0;
