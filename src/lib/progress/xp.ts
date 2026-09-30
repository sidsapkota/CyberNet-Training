import type { Difficulty } from "@/cards/base";
import type { ProgressSnapshot } from "./types";

/** All XP numbers live here so they are easy to tune. */
export const XP = {
  card: {
    core: { firstTry: 10, retry: 5 },
    challenge: { firstTry: 20, retry: 10 },
  },
  /** Exploring a scene (hotspot explore mode): ungraded, a small reward for finishing it. */
  explore: 5,
  lessonComplete: 20,
  quizPass: 50,
} as const;

/**
 * XP for answering an interactive card correctly.
 * @param attempts number of checks including the correct one (1 = first try).
 * @param usedHint the learner opened the hint: pays the retry amount, even on the first try.
 */
export function cardXp(difficulty: Difficulty, attempts: number, usedHint = false): number {
  const table = XP.card[difficulty];
  return attempts <= 1 && !usedHint ? table.firstTry : table.retry;
}

/** XP for a card, or 0 if the learner already earned XP for it before. */
export function cardXpToAward(
  alreadyCompleted: boolean,
  difficulty: Difficulty,
  attempts: number,
  usedHint = false,
): number {
  return alreadyCompleted ? 0 : cardXp(difficulty, attempts, usedHint);
}

/**
 * Practice XP for replaying a graded card already finished: the retry amount. It counts toward
 * the daily goal only (never total XP), once per card per day (see daily.ts).
 */
export function practiceXp(difficulty: Difficulty): number {
  return XP.card[difficulty].retry;
}

/** XP for finishing an explore card, or 0 if it was already done. */
export function exploreXpToAward(alreadyCompleted: boolean): number {
  return alreadyCompleted ? 0 : XP.explore;
}

export function lessonBonusToAward(snapshot: ProgressSnapshot, lessonId: string): number {
  return snapshot.lessons[lessonId] ? 0 : XP.lessonComplete;
}

/** Quiz XP is only paid out the first time the quiz is passed. */
export function quizXpToAward(snapshot: ProgressSnapshot, quizId: string, passed: boolean): number {
  if (!passed) return 0;
  return snapshot.quizzes[quizId]?.passedAt ? 0 : XP.quizPass;
}

export interface QuizScore {
  correct: number;
  total: number;
  /** 0 to 1. */
  score: number;
  passed: boolean;
}

export function scoreQuiz(results: readonly boolean[], passThreshold: number): QuizScore {
  const total = results.length;
  const correct = results.filter(Boolean).length;
  const score = total === 0 ? 0 : correct / total;
  // Small epsilon so e.g. 7/10 passes a 0.7 threshold despite float rounding.
  return { correct, total, score, passed: total > 0 && score + 1e-9 >= passThreshold };
}
