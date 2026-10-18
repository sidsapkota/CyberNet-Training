import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

// /dev/* pages (card playground, lesson preview, fit checks…) must never exist in production. They
// are `.dev.tsx` files, which next.config.ts registers as pages only under `next dev` or on Vercel
// previews. These tests fail if a dev page is added with a normal extension, or the gate changes.
const DEV_DIRS = [path.join(process.cwd(), "src", "app", "dev"), path.join(process.cwd(), "src", "app", "(main)", "dev")];

function pageFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? pageFiles(full) : /^(page|route|layout)\./.test(e.name) ? [full] : [];
  });
}

describe("dev-only routes", () => {
  it("are all .dev.tsx files", () => {
    const pages = DEV_DIRS.flatMap(pageFiles);
    expect(pages.length).toBeGreaterThan(0);
    for (const file of pages) expect(path.basename(file), file).toMatch(/\.dev\.tsx$/);
  });

  it("only compile under next dev or on a Vercel preview, never in a production build", () => {
    const env = process.env.VERCEL_ENV;
    try {
      process.env.VERCEL_ENV = "production";
      expect(nextConfig("phase-production-build").pageExtensions).not.toContain("dev.tsx");
      delete process.env.VERCEL_ENV;
      expect(nextConfig("phase-production-build").pageExtensions).not.toContain("dev.tsx");
      expect(nextConfig("phase-development-server").pageExtensions).toContain("dev.tsx");
      process.env.VERCEL_ENV = "preview";
      expect(nextConfig("phase-production-build").pageExtensions).toContain("dev.tsx");
    } finally {
      if (env === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = env;
    }
  });
});
