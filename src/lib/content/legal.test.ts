import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { stripDraftBanner } from "./legal";

vi.mock("server-only", () => ({}));

const read = (page: string) => fs.readFileSync(path.join(process.cwd(), "content", "legal", `${page}.md`), "utf8");

describe("privacy policy and terms", () => {
  it("keep the reviewer banner in the repo, but never on the page", () => {
    for (const page of ["privacy", "terms"]) {
      const source = read(page);
      expect(source.trimStart().startsWith("<!--"), page).toBe(true);
      expect(source).toMatch(/DRAFT/);
      const shown = stripDraftBanner(source);
      expect(shown, page).not.toMatch(/DRAFT|Points to check|lawyer/);
      expect(shown.startsWith("# "), page).toBe(true);
    }
  });

  it("cover what the launch brief requires", () => {
    const privacy = stripDraftBanner(read("privacy")).toLowerCase();
    for (const must of [
      "email",
      "display name",
      "learning progress",
      "settings",
      "supabase",
      "vercel",
      "google",
      "resend",
      "feedback",
      "hello@cybernettrainer.com",
      "13 or older",
      "account page",
      "privacy act 1988",
      "no ads",
      "don't include personal details",
      "time zone",
      "only** to work out your daily goal and your streak",
    ]) {
      expect(privacy, must).toContain(must);
    }
    const terms = stripDraftBanner(read("terms")).toLowerCase();
    for (const must of ["13 or older", "free right now", "australia", "hello@cybernettrainer.com"]) {
      expect(terms, must).toContain(must);
    }
  });
});
