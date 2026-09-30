import { describe, expect, it } from "vitest";
import { explainer, hotspot, multipleChoice } from "@/test/fixtures";
import { hintXpNote, visibleHint } from "./hints";

describe("hint display rules", () => {
  const card = multipleChoice({ hint: "Think about what routers read." });

  it("shows a lesson card's hint until it's answered correctly", () => {
    expect(visibleHint(card, "lesson", "answering")).toBe("Think about what routers read.");
    expect(visibleHint(card, "lesson", "incorrect")).toBe("Think about what routers read.");
    expect(visibleHint(card, "lesson", "correct")).toBeNull();
  });

  it("never shows hints in quizzes", () => {
    expect(visibleHint(card, "quiz", "answering")).toBeNull();
  });

  it("needs a graded card with a hint", () => {
    expect(visibleHint(multipleChoice({ hint: undefined }), "lesson", "answering")).toBeNull();
    expect(visibleHint(explainer(), "lesson", "answering")).toBeNull();
    expect(visibleHint(hotspot({ mode: "explore", targets: undefined, parts: [{ part: "cpu", job: "x" }, { part: "ram", job: "y" }] }), "lesson", "answering")).toBeNull();
  });

  it("says up front that a hint pays the retry XP, unless the card already paid", () => {
    expect(hintXpNote(card, false)).toBe("+5 XP instead of +10");
    expect(hintXpNote(multipleChoice({ difficulty: "challenge" }), false)).toBe("+10 XP instead of +20");
    expect(hintXpNote(card, true)).toBeUndefined();
  });
});
