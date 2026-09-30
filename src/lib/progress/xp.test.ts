import { describe, expect, it } from "vitest";
import { emptySnapshot } from "./types";
import { cardXp, cardXpToAward, lessonBonusToAward, quizXpToAward, scoreQuiz, XP } from "./xp";

describe("cardXp", () => {
  it("pays more for a first-try answer", () => {
    expect(cardXp("core", 1)).toBe(XP.card.core.firstTry);
    expect(cardXp("core", 2)).toBe(XP.card.core.retry);
    expect(cardXp("core", 7)).toBe(XP.card.core.retry);
  });

  it("pays a bonus for challenge cards", () => {
    expect(cardXp("challenge", 1)).toBe(XP.card.challenge.firstTry);
    expect(cardXp("challenge", 3)).toBe(XP.card.challenge.retry);
    expect(cardXp("challenge", 1)).toBeGreaterThan(cardXp("core", 1));
  });

  it("pays nothing for a card that already earned XP", () => {
    expect(cardXpToAward(true, "challenge", 1)).toBe(0);
    expect(cardXpToAward(false, "challenge", 1)).toBe(XP.card.challenge.firstTry);
  });
});

describe("lessonBonusToAward", () => {
  it("pays the bonus only the first time", () => {
    const snapshot = emptySnapshot();
    expect(lessonBonusToAward(snapshot, "l1")).toBe(XP.lessonComplete);
    snapshot.lessons.l1 = { completedAt: "2026-01-01", xp: XP.lessonComplete };
    expect(lessonBonusToAward(snapshot, "l1")).toBe(0);
  });
});

describe("quizXpToAward", () => {
  it("pays nothing for a failed attempt", () => {
    expect(quizXpToAward(emptySnapshot(), "q", false)).toBe(0);
  });

  it("pays only on the first pass", () => {
    const snapshot = emptySnapshot();
    expect(quizXpToAward(snapshot, "q", true)).toBe(XP.quizPass);
    snapshot.quizzes.q = { attempts: [], bestScore: 1, passedAt: "2026-01-01" };
    expect(quizXpToAward(snapshot, "q", true)).toBe(0);
  });

  it("still pays when passing after earlier failures", () => {
    const snapshot = emptySnapshot();
    snapshot.quizzes.q = { attempts: [], bestScore: 0.4, passedAt: null };
    expect(quizXpToAward(snapshot, "q", true)).toBe(XP.quizPass);
  });
});

describe("scoreQuiz", () => {
  it("computes score and pass/fail against the threshold", () => {
    expect(scoreQuiz([true, true, true, true, false], 0.7)).toEqual({
      correct: 4,
      total: 5,
      score: 0.8,
      passed: true,
    });
    expect(scoreQuiz([true, true, true, false, false], 0.7).passed).toBe(false);
  });

  it("passes when exactly on the threshold despite float rounding", () => {
    const sevenOfTen = [...Array(7).fill(true), ...Array(3).fill(false)] as boolean[];
    expect(scoreQuiz(sevenOfTen, 0.7).passed).toBe(true);
  });

  it("handles a perfect and a zero score", () => {
    expect(scoreQuiz([true, true], 1).passed).toBe(true);
    expect(scoreQuiz([false, false], 0.5)).toMatchObject({ score: 0, passed: false });
  });

  it("never passes an empty quiz", () => {
    expect(scoreQuiz([], 0)).toMatchObject({ total: 0, passed: false });
  });
});
