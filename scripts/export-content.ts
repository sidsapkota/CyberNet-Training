import fs from "node:fs";
import path from "node:path";
import { renderContentExport } from "../src/lib/content/export";
import { ContentValidationError, loadContent } from "../src/lib/content/load";

// Writes docs/content-export.md from /content (lesson text only; never env files or keys).
try {
  const target = path.join(process.cwd(), "docs", "content-export.md");
  fs.writeFileSync(target, renderContentExport(loadContent()));
  console.log(`✓ Wrote ${path.relative(process.cwd(), target)}`);
} catch (error) {
  if (error instanceof ContentValidationError) {
    console.error(`✗ ${error.message}`);
    process.exit(1);
  }
  throw error;
}
