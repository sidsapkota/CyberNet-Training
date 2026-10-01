import { formatChecked, isRecheckOverdue, recheckDue } from "../src/lib/content/lastChecked";
import { ContentValidationError, loadContent } from "../src/lib/content/load";

try {
  const { courses, lessons } = loadContent();
  const modules = courses.reduce((n, c) => n + c.modules.length, 0);
  console.log(
    `✓ Content valid: ${courses.length} course(s), ${modules} module(s), ${lessons.size} lesson(s)/quiz(zes)`,
  );
  // Dated lessons: a reminder, never a failure (a late check must not block a deploy).
  const today = new Date().toISOString().slice(0, 10);
  for (const lesson of lessons.values()) {
    if (lesson.kind === "lesson" && lesson.lastChecked && isRecheckOverdue(lesson.lastChecked, today)) {
      console.warn(
        `⚠ "${lesson.id}" was last checked ${formatChecked(lesson.lastChecked)}; a recheck was due ${formatChecked(recheckDue(lesson.lastChecked))} (see content/REVIEW.md).`,
      );
    }
  }
} catch (error) {
  if (error instanceof ContentValidationError) {
    console.error(`✗ ${error.message}`);
    process.exit(1);
  }
  throw error;
}
