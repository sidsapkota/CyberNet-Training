import { describe, expect, it } from "vitest";
import type { Lesson } from "@/lib/content/schema";
import { binaryToggle, explainer, multipleChoice } from "@/test/fixtures";
import { buildContentIndex, canCompleteLesson, cardXpFor, gradeQuizAttempt } from "./authority";
import { mergeProgress, recomputeXp } from "./merge";
import { cardKey, emptySnapshot, type ProgressSnapshot, type QuizAttempt } from "./types";

// A tiny course: lesson l1 (explainer, core MC, challenge MC) and quiz q1 (two MCs, pass 0.5).
const lessons: Lesson[] = [
  {
    id: "l1",
    kind: "lesson",
    title: "L1",
    order: 1,
    isFree: true,
    courseId: "c",
    moduleId: "m",
    cards: [
      explainer({ id: "intro" }),
      multipleChoice({ id: "core-q" }),
      multipleChoice({ id: "bonus-q", difficulty: "challenge" }),
    ],
  },
  {
    id: "q1",
    kind: "quiz",
    title: "Q1",
    order: 99,
    isFree: true,
    passThreshold: 0.5,
    courseId: "c",
    moduleId: "m",
    cards: [multipleChoice({ id: "a" }), binaryToggle({ id: "b", target: 5 })],
  },
];
const index = buildContentIndex(lessons);

const T = (minute: number) => new Date(Date.UTC(2026, 8, 1, 10, minute)).toISOString();
const attempt = (minute: number, passed: boolean, score = passed ? 1 : 0, xp = 0): QuizAttempt => ({
  at: T(minute),
  score,
  passed,
  xp,
  answers: [],
});

function snapshot(over: Partial<ProgressSnapshot> = {}): ProgressSnapshot {
  return { ...emptySnapshot(), ...over };
}

describe("cardXpFor (server XP rules)", () => {
  it("awards first-try or retry XP from the card's difficulty, never the client's number", () => {
    expect(cardXpFor(index, "l1", "core-q", 10)).toBe(10);
    expect(cardXpFor(index, "l1", "core-q", 5)).toBe(5);
    expect(cardXpFor(index, "l1", "core-q", 9999)).toBe(10); // tampered: capped at first-try
    expect(cardXpFor(index, "l1", "bonus-q", 20)).toBe(20);
    expect(cardXpFor(index, "l1", "bonus-q", 1)).toBe(10);
    expect(cardXpFor(index, "l1", "core-q", Number.NaN)).toBe(5);
  });

  it("gives explainers no XP and rejects unknown cards", () => {
    expect(cardXpFor(index, "l1", "intro", 10)).toBe(0);
    expect(cardXpFor(index, "l1", "nope", 10)).toBeNull();
    expect(cardXpFor(index, "nope", "core-q", 10)).toBeNull();
  });
});

describe("canCompleteLesson", () => {
  it("needs every core card recorded; challenges are optional", () => {
    expect(canCompleteLesson(index, "l1", ["intro"])).toBe(false);
    expect(canCompleteLesson(index, "l1", ["intro", "core-q"])).toBe(true);
    expect(canCompleteLesson(index, "q1", ["a", "b"])).toBe(false); // quizzes aren't lessons
  });
});

describe("gradeQuizAttempt (server re-grading)", () => {
  it("scores from the raw answers and ignores anything the client claims", () => {
    const graded = gradeQuizAttempt(
      index,
      "q1",
      [
        { cardId: "a", answer: "two" },
        { cardId: "b", answer: [false, false, false, false, false, true, false, true] },
      ],
      T(0),
      false,
    );
    expect(graded).toMatchObject({ score: 1, passed: true, xp: 50 });
    expect(graded?.answers.map((a) => a.correct)).toEqual([true, true]);
  });

  it("treats malformed and missing answers as wrong, and pays pass XP only once", () => {
    const graded = gradeQuizAttempt(index, "q1", [{ cardId: "a", answer: "two" }, { cardId: "b", answer: { hack: 1 } }], T(0), true);
    expect(graded).toMatchObject({ score: 0.5, passed: true, xp: 0 });
    expect(gradeQuizAttempt(index, "q1", [], T(0), false)).toMatchObject({ score: 0, passed: false, xp: 0 });
    expect(gradeQuizAttempt(index, "l1", [], T(0), false)).toBeNull();
  });
});

describe("mergeProgress", () => {
  const coreKey = cardKey("l1", "core-q");
  const introKey = cardKey("l1", "intro");

  it("takes the union of cards and lessons, keeping the earliest completedAt", () => {
    const account = snapshot({
      cards: { [coreKey]: { completedAt: T(30), xp: 10 } },
      lessons: { l1: { completedAt: T(40), xp: 20 } },
    });
    const local = snapshot({
      cards: { [coreKey]: { completedAt: T(5), xp: 5 }, [introKey]: { completedAt: T(1), xp: 0 } },
      lessons: { l1: { completedAt: T(10), xp: 20 } },
    });
    const merged = mergeProgress(account, local, index);
    expect(merged.cards[coreKey]).toEqual({ completedAt: T(5), xp: 5 }); // earliest record, its own XP
    expect(merged.cards[introKey]).toEqual({ completedAt: T(1), xp: 0 });
    expect(merged.lessons.l1).toEqual({ completedAt: T(10), xp: 20 });
    expect(merged.totalXp).toBe(5 + 0 + 20);
  });

  it("recalculates XP instead of adding both sides up", () => {
    const both = snapshot({
      cards: { [coreKey]: { completedAt: T(1), xp: 10 } },
      lessons: { l1: { completedAt: T(2), xp: 20 } },
      quizzes: { q1: { attempts: [attempt(3, true, 1, 50)], bestScore: 1, passedAt: T(3) } },
    });
    const merged = mergeProgress(both, both, index);
    expect(merged.totalXp).toBe(10 + 20 + 50);
  });

  it("fixes tampered local XP to the content rules", () => {
    const local = snapshot({
      cards: { [coreKey]: { completedAt: T(1), xp: 9000 } },
      lessons: { l1: { completedAt: T(2), xp: 9000 } },
      quizzes: { q1: { attempts: [attempt(3, true, 1, 9000), attempt(4, true, 1, 9000)], bestScore: 1, passedAt: T(3) } },
    });
    expect(mergeProgress(snapshot(), local, index).totalXp).toBe(10 + 20 + 50);
  });

  it("merges quiz attempts: union, best score, earliest pass, XP for the first pass only", () => {
    const account = snapshot({
      quizzes: { q1: { attempts: [attempt(20, false, 0.4), attempt(30, true, 0.6, 50)], bestScore: 0.6, passedAt: T(30) } },
    });
    const local = snapshot({
      quizzes: { q1: { attempts: [attempt(10, true, 1, 50), attempt(20, false, 0.4)], bestScore: 1, passedAt: T(10) } },
    });
    const q = mergeProgress(account, local, index).quizzes.q1!;
    expect(q.attempts.map((a) => a.at)).toEqual([T(10), T(20), T(30)]); // duplicate at T(20) dropped
    expect(q.bestScore).toBe(1);
    expect(q.passedAt).toBe(T(10));
    expect(q.attempts.map((a) => a.xp)).toEqual([50, 0, 0]);
  });

  it("treats the same attempt time in different ISO formats as one attempt", () => {
    const account = snapshot({
      quizzes: { q1: { attempts: [{ ...attempt(5, true, 1, 50), at: "2026-09-01T10:05:00+00:00" }], bestScore: 1, passedAt: T(5) } },
    });
    const local = snapshot({ quizzes: { q1: { attempts: [attempt(5, true, 1, 50)], bestScore: 1, passedAt: T(5) } } });
    expect(mergeProgress(account, local, index).quizzes.q1?.attempts).toHaveLength(1);
  });

  it("drops lessons, cards and quizzes that no longer exist in the content", () => {
    const local = snapshot({
      cards: { [cardKey("gone", "x")]: { completedAt: T(1), xp: 10 }, [cardKey("l1", "gone")]: { completedAt: T(1), xp: 10 } },
      lessons: { gone: { completedAt: T(1), xp: 20 }, q1: { completedAt: T(1), xp: 20 } },
      quizzes: { gone: { attempts: [attempt(1, true)], bestScore: 1, passedAt: T(1) } },
    });
    const merged = mergeProgress(snapshot(), local, index);
    expect(merged.cards).toEqual({});
    expect(merged.lessons).toEqual({});
    expect(merged.quizzes).toEqual({});
    expect(merged.totalXp).toBe(0);
  });

  it("keeps the guest's Explore choice, otherwise the account's", () => {
    const explore = snapshot({ preferences: { mode: "explore", sound: true } });
    expect(mergeProgress(snapshot(), explore, index).preferences.mode).toBe("explore");
    expect(mergeProgress(explore, snapshot(), index).preferences.mode).toBe("explore");
    expect(mergeProgress(snapshot(), snapshot(), index).preferences.mode).toBe("path");
  });

  it("keeps the guest's sound-off choice, otherwise the account's", () => {
    const quiet = snapshot({ preferences: { mode: "path", sound: false } });
    expect(mergeProgress(snapshot(), quiet, index).preferences.sound).toBe(false);
    expect(mergeProgress(quiet, snapshot(), index).preferences.sound).toBe(false);
    expect(mergeProgress(snapshot(), snapshot(), index).preferences.sound).toBe(true);
  });

  it("is idempotent: signing in again with the same local progress changes nothing", () => {
    const account = snapshot({ cards: { [coreKey]: { completedAt: T(30), xp: 10 } } });
    const local = snapshot({
      cards: { [coreKey]: { completedAt: T(5), xp: 10 } },
      lessons: { l1: { completedAt: T(6), xp: 20 } },
      quizzes: { q1: { attempts: [attempt(7, true, 1, 50)], bestScore: 1, passedAt: T(7) } },
    });
    const once = mergeProgress(account, local, index);
    expect(mergeProgress(once, local, index)).toEqual(once);
    expect(mergeProgress(once, snapshot(), index)).toEqual(once); // later sign-in, nothing local
  });

  it("handles guest play between sign-ins", () => {
    const first = mergeProgress(snapshot(), snapshot({ cards: { [introKey]: { completedAt: T(1), xp: 0 } } }), index);
    const second = mergeProgress(first, snapshot({ cards: { [coreKey]: { completedAt: T(50), xp: 10 } } }), index);
    expect(Object.keys(second.cards).sort()).toEqual([coreKey, introKey].sort());
    expect(second.totalXp).toBe(10);
  });
});

describe("recomputeXp", () => {
  it("leaves already-correct progress unchanged", () => {
    const good = recomputeXp(
      snapshot({
        cards: { [cardKey("l1", "core-q")]: { completedAt: T(1), xp: 10 } },
        lessons: { l1: { completedAt: T(2), xp: 20 } },
      }),
      index,
    );
    expect(recomputeXp(good, index)).toEqual(good);
    expect(good.totalXp).toBe(30);
  });
});
