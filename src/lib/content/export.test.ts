import { describe, expect, it } from "vitest";
import { accessLabel, interactivePicks, plainText, renderContentExport, sentences, taggedLink, truncate } from "./export";
import { loadContent } from "./load";

const content = loadContent();
const doc = renderContentExport(content);

describe("content export", () => {
  it("lists every course, module and regular lesson with its access and tagged link", () => {
    for (const course of content.courses) {
      expect(doc).toContain(`## ${course.title}`);
      for (const mod of course.modules) {
        expect(doc).toContain(`: ${mod.title} (${mod.access === "pro" ? "Pro" : "Free"})`);
        for (const lesson of mod.lessons.filter((l) => l.kind === "lesson")) {
          expect(doc).toContain(`#### ${lesson.title}`);
          expect(doc).toContain(`cybernettraining.com/from/<platform>/${lesson.id}`);
        }
      }
    }
  });

  it("never includes quiz questions, answers, explanations, hints or nudges", () => {
    const text = (s: string) => plainText(s);
    // A quiz may reuse a lesson card's wording; those lesson prompts are fine to show.
    const lessonPrompts = new Set(
      [...content.lessons.values()].filter((l) => l.kind === "lesson").flatMap((l) => l.cards.flatMap((c) => ("prompt" in c ? [text(c.prompt)] : []))),
    );
    for (const lesson of content.lessons.values()) {
      for (const card of lesson.cards) {
        if (lesson.kind === "quiz" && "prompt" in card && !lessonPrompts.has(text(card.prompt))) expect(doc).not.toContain(truncate(text(card.prompt), 60).replace(/…$/, ""));
        for (const field of ["explanation", "hint", "nudge"] as const) {
          const value = (card as Partial<Record<typeof field, string>>)[field];
          if (value && text(value).length > 40) expect(doc).not.toContain(text(value));
        }
        if (card.type === "multiple_choice") {
          for (const option of card.options) if (option.nudge) expect(doc).not.toContain(text(option.nudge));
        }
      }
    }
  });

  it("contains no keys or env values", () => {
    expect(doc).not.toMatch(/sb_secret_|sb_publishable_|sk_(live|test)_|whsec_|re_[A-Za-z0-9]{8}|SUPABASE_|STRIPE_|CRON_SECRET/);
  });

  it("is up to date with /content", async () => {
    const fs = await import("node:fs");
    expect(fs.readFileSync("docs/content-export.md", "utf8").replace(/\r\n/g, "\n")).toBe(doc);
  });
});

describe("export helpers", () => {
  it("strips glossary marks and links but keeps bold", () => {
    expect(plainText("An [[IP address]] or [[routers|router]], see [docs](https://example.com). **Bold**")).toBe(
      "An IP address or routers, see docs. **Bold**",
    );
  });

  it("splits sentences without breaking addresses", () => {
    expect(sentences("Try `192.0.2.44` now. It works!\n- A list item")).toEqual(["Try `192.0.2.44` now.", "It works!", "A list item"]);
  });

  it("truncates on a word boundary", () => {
    expect(truncate("one two three four", 12)).toBe("one two…");
    expect(truncate("short")).toBe("short");
  });

  it("picks hands-on cards first, at most three, in lesson order", () => {
    const lesson = content.lessons.get("memory-vs-storage")!;
    const picks = interactivePicks(lesson);
    expect(picks.length).toBeLessThanOrEqual(3);
    expect(picks.some((p) => p.type === "Simulator")).toBe(true);
  });

  it("says who can open a lesson from a link", () => {
    expect(accessLabel({ access: "free", guests: true })).toMatch(/no account needed/);
    expect(accessLabel({ access: "free", guests: false })).toBe("Free with a free account");
    expect(accessLabel({ access: "pro", guests: false })).toBe("Pro");
  });

  it("builds the tagged link from the production host", () => {
    expect(taggedLink("bits-and-binary")).toBe("cybernettraining.com/from/<platform>/bits-and-binary");
  });
});
