import fs from "node:fs";
import path from "node:path";
import { renderContentExport } from "../src/lib/content/export";
import { ContentValidationError, loadContent } from "../src/lib/content/load";

// Writes WEBSITE-CONTENT-FOR-AI.md (repo root) from /content: the one file to give another AI for
// drafting videos (lesson text only; never env files, keys or quiz answers).
try {
  const target = path.join(process.cwd(), "WEBSITE-CONTENT-FOR-AI.md");
  fs.writeFileSync(target, renderContentExport(loadContent()));
  console.log(`✓ Wrote ${path.relative(process.cwd(), target)}`);
} catch (error) {
  if (error instanceof ContentValidationError) {
    console.error(`✗ ${error.message}`);
    process.exit(1);
  }
  throw error;
}
