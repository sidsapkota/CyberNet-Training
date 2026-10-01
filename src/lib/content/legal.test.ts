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
      "username",
      "learning progress",
      "settings",
      "supabase",
      "vercel",
      "google",
      "resend",
      "feedback",
      "hello@cybernettraining.com",
      "13 or older",
      "account page",
      "privacy act 1988",
      "no ads",
      "don't include personal details",
      "time zone",
      "only** to work out your daily goal, your streak and your weekly league xp",
      "what others in your league can see",
      "its public check page",
      "withdraw it any time",
      "show me on leaderboards",
      "never see your email",
      "stripe",
      "never see or store your card details",
    ]) {
      expect(privacy, must).toContain(must);
    }
    const terms = stripDraftBanner(read("terms")).toLowerCase();
    for (const must of [
      "13 or older",
      "australia",
      "hello@cybernettraining.com",
      "7-day free trial",
      "renews automatically",
      "manage subscription",
      "refunds",
      "australian consumer law",
      "handled by stripe",
      "getting help after something goes wrong online",
    ]) {
      expect(terms, must).toContain(must);
    }
  });
});
