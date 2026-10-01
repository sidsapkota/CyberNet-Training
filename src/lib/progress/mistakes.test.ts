import { describe, expect, it } from "vitest";
import type { Lesson } from "@/lib/content/schema";
import { explainer, hotspot, multipleChoice } from "@/test/fixtures";
import { buildContentIndex } from "./authority";
import { lessonMistake, quizMistakes, reviewableMistakes, reviewAnswerCorrect } from "./mistakes";

// Lesson l1: an explainer, an explore card and a multiple choice (right answer "two"); quiz q1.
const lessons: Lesson[] = [
  {
    id: "l1",
    kind: "lesson",
    icon: "binary",
    title: "L1",
    order: 1,
    courseId: "c",
    moduleId: "m",
    access: "free",
    guests: true,
    cards: [explainer({ id: "intro" }), hotspot({ id: "look", mode: "explore" } as never), multipleChoice({ id: "mc" })],
  },
  {
    id: "q1",
    kind: "quiz",
    title: "Q1",
    order: 99,
    passThreshold: 0.5,
    courseId: "c",
    moduleId: "m",
    access: "free",
    guests: true,
    cards: [multipleChoice({ id: "a" }), multipleChoice({ id: "b" })],
  },
];
const index = buildContentIndex(lessons);

describe("lessonMistake (only real cards, only wrong answers)", () => {
  it("records a wrong answer on a graded lesson card", () => {
    expect(lessonMistake(index, "l1", "mc", "one")).toEqual({ lessonId: "l1", cardId: "mc" });
  });

  it("rejects lesson and card ids that aren't in the content", () => {
    expect(lessonMistake(index, "no-such-lesson", "mc", "one")).toBeNull();
    expect(lessonMistake(index, "l1", "no-such-card", "one")).toBeNull();
    expect(lessonMistake(index, "l1", "a", "one")).toBeNull(); // a card from another lesson
  });

  it("rejects cards that aren't graded (explainers, explore cards)", () => {
    expect(lessonMistake(index, "l1", "intro", null)).toBeNull();
    expect(lessonMistake(index, "l1", "look", null)).toBeNull();
  });

  it("rejects an answer that was actually right", () => {
    expect(lessonMistake(index, "l1", "mc", "two")).toBeNull();
  });

  it("counts a malformed answer as wrong without throwing", () => {
    expect(lessonMistake(index, "l1", "mc", { nonsense: true })).toEqual({ lessonId: "l1", cardId: "mc" });
  });

  it("leaves quizzes to the server-graded attempt", () => {
    expect(lessonMistake(index, "q1", "a", "one")).toBeNull();
  });
});

describe("quizMistakes", () => {
  it("takes the wrong answers of a graded attempt, for cards in that quiz only", () => {
    const answers = [
      { cardId: "a", answer: "one", correct: false },
      { cardId: "b", answer: "two", correct: true },
      { cardId: "gone", answer: "one", correct: false },
    ];
    expect(quizMistakes(index, "q1", { answers })).toEqual([{ lessonId: "q1", cardId: "a" }]);
    expect(quizMistakes(index, "l1", { answers })).toEqual([]);
    expect(quizMistakes(index, "nope", { answers })).toEqual([]);
  });
});

describe("reviewableMistakes and reviewAnswerCorrect", () => {
  it("leaves out stored mistakes whose card is no longer in the content", () => {
    const rows = [
      { lesson_id: "l1", card_id: "mc" },
      { lesson_id: "l1", card_id: "removed" },
      { lesson_id: "old-lesson", card_id: "mc" },
    ];
    expect(reviewableMistakes(index, rows)).toEqual([{ lesson_id: "l1", card_id: "mc" }]);
  });

  it("re-grades review answers on the server", () => {
    expect(reviewAnswerCorrect(index, "l1", "mc", "two")).toBe(true);
    expect(reviewAnswerCorrect(index, "q1", "a", "one")).toBe(false);
    expect(reviewAnswerCorrect(index, "l1", "nope", "two")).toBeNull();
  });
});
