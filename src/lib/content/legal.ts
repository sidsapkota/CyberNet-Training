import "server-only";
import fs from "node:fs";
import path from "node:path";

export type LegalPage = "privacy" | "terms";

/**
 * Removes the repo-only reviewer banner (the leading HTML comment) before rendering. The Markdown
 * renderer already skips raw HTML; stripping it here as well means it can never reach a page. Pure.
 */
export function stripDraftBanner(markdown: string): string {
  return markdown.replace(/<!--[\s\S]*?-->/g, "").trim();
}

/** The legal page's Markdown from content/legal/<page>.md, ready to render. */
export function getLegalPage(page: LegalPage): string {
  const file = path.join(process.cwd(), "content", "legal", `${page}.md`);
  return stripDraftBanner(fs.readFileSync(file, "utf8"));
}
