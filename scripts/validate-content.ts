import { ContentValidationError, loadContent } from "../src/lib/content/load";

try {
  const { courses, lessons } = loadContent();
  const modules = courses.reduce((n, c) => n + c.modules.length, 0);
  console.log(
    `✓ Content valid: ${courses.length} course(s), ${modules} module(s), ${lessons.size} lesson(s)/quiz(zes)`,
  );
} catch (error) {
  if (error instanceof ContentValidationError) {
    console.error(`✗ ${error.message}`);
    process.exit(1);
  }
  throw error;
}
