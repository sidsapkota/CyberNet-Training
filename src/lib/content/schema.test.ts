import { describe, expect, it } from "vitest";
import { binaryToggle, explainer, multipleChoice } from "@/test/fixtures";
import { DEFAULT_PASS_THRESHOLD, LessonFileSchema, toLessonOutline } from "./schema";

const lesson = (over: Record<string, unknown> = {}) => ({
  id: "bits",
  kind: "lesson",
  title: "Bits",
  order: 1,
  isFree: true,
  cards: [explainer(), multipleChoice({ difficulty: "challenge" })],
  ...over,
});

const quiz = (over: Record<string, unknown> = {}) => ({
  id: "bits-quiz",
  kind: "quiz",
  title: "Quiz",
  order: 99,
  isFree: true,
  cards: [multipleChoice(), binaryToggle()],
  ...over,
});

describe("LessonFileSchema: lessons", () => {
  it("accepts a valid lesson", () => {
    expect(LessonFileSchema.safeParse(lesson()).success).toBe(true);
  });

  it("requires at least one card", () => {
    expect(LessonFileSchema.safeParse(lesson({ cards: [] })).success).toBe(false);
  });

  it("requires at least one core card", () => {
    const result = LessonFileSchema.safeParse(
      lesson({ cards: [multipleChoice({ difficulty: "challenge" })] }),
    );
    expect(result.success).toBe(false);
  });

  it("requires unique card ids", () => {
    const result = LessonFileSchema.safeParse(lesson({ cards: [explainer(), explainer()] }));
    expect(result.success).toBe(false);
  });

  it("reports a bad card with its path", () => {
    const result = LessonFileSchema.safeParse(
      lesson({ cards: [explainer(), multipleChoice({ correctOptionId: "nope" })] }),
    );
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["cards", 1, "correctOptionId"]);
  });

  it("requires isFree", () => {
    const withoutIsFree: Record<string, unknown> = lesson();
    delete withoutIsFree.isFree;
    expect(LessonFileSchema.safeParse(withoutIsFree).success).toBe(false);
  });
});

describe("LessonFileSchema: quizzes", () => {
  it("accepts a valid quiz and defaults the pass threshold", () => {
    const result = LessonFileSchema.parse(quiz());
    expect(result.kind === "quiz" && result.passThreshold).toBe(DEFAULT_PASS_THRESHOLD);
  });

  it("accepts a custom pass threshold between 0 and 1", () => {
    const result = LessonFileSchema.parse(quiz({ passThreshold: 0.8 }));
    expect(result.kind === "quiz" && result.passThreshold).toBe(0.8);
    expect(LessonFileSchema.safeParse(quiz({ passThreshold: 1.5 })).success).toBe(false);
  });

  it("rejects explainers in a quiz", () => {
    expect(LessonFileSchema.safeParse(quiz({ cards: [explainer(), multipleChoice()] })).success).toBe(
      false,
    );
  });

  it("rejects challenge cards in a quiz", () => {
    const result = LessonFileSchema.safeParse(
      quiz({ cards: [multipleChoice({ difficulty: "challenge" })] }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects an unknown kind", () => {
    expect(LessonFileSchema.safeParse(lesson({ kind: "exam" })).success).toBe(false);
  });
});

describe("toLessonOutline", () => {
  it("summarises a lesson without card content", () => {
    const parsed = LessonFileSchema.parse(lesson());
    const outline = toLessonOutline({ ...parsed, courseId: "c", moduleId: "m" });
    expect(outline).toEqual({
      id: "bits",
      kind: "lesson",
      title: "Bits",
      order: 1,
      isFree: true,
      courseId: "c",
      moduleId: "m",
      cardCount: 2,
      coreCardIds: ["intro"],
    });
  });

  it("includes the pass threshold for quizzes", () => {
    const parsed = LessonFileSchema.parse(quiz());
    expect(toLessonOutline({ ...parsed, courseId: "c", moduleId: "m" }).passThreshold).toBe(0.7);
  });
});
