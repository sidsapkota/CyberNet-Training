/**
 * Server-side progress rules for signed-in learners. The server is the authority on XP: every
 * number here comes from the lesson content and `xp.ts`, never from a value the client sends.
 * Pure (content passed in), so it's unit-tested and shared by Server Actions and the merge.
 */
import { gradeUntrusted } from "@/cards/grading";
import { type Card, isInteractiveCard } from "@/cards/schema";
import type { Lesson } from "@/lib/content/schema";
import type { QuizAttempt } from "./types";
import { scoreQuiz, XP } from "./xp";

export interface IndexedLesson {
  kind: Lesson["kind"];
  cards: Map<string, Card>;
  coreCardIds: string[];
  /** Quizzes only. */
  passThreshold?: number;
}

/** Lesson id → the facts the server needs to award XP. */
export type ContentIndex = Map<string, IndexedLesson>;

export function buildContentIndex(lessons: Iterable<Lesson>): ContentIndex {
  const index: ContentIndex = new Map();
  for (const lesson of lessons) {
    index.set(lesson.id, {
      kind: lesson.kind,
      cards: new Map(lesson.cards.map((c) => [c.id, c])),
      coreCardIds: lesson.cards.filter((c) => c.difficulty === "core").map((c) => c.id),
      ...(lesson.kind === "quiz" ? { passThreshold: lesson.passThreshold } : {}),
    });
  }
  return index;
}

/**
 * XP for completing a card, or null if the card doesn't exist.
 *
 * The client can't be trusted with a number, but it's the only one that knows whether the
 * learner got it right first time. So its claim is read as a yes/no: anything at or above the
 * first-try value counts as first try. The worst a tampered client can do is claim the first-try
 * XP for that card; it can never get more.
 */
export function cardXpFor(index: ContentIndex, lessonId: string, cardId: string, claimedXp: number): number | null {
  const card = index.get(lessonId)?.cards.get(cardId);
  if (!card) return null;
  if (!isInteractiveCard(card)) return 0;
  const table = XP.card[card.difficulty];
  return Number.isFinite(claimedXp) && claimedXp >= table.firstTry ? table.firstTry : table.retry;
}

/** A regular lesson counts as complete only once every core card is recorded. */
export function canCompleteLesson(index: ContentIndex, lessonId: string, completedCardIds: Iterable<string>): boolean {
  const lesson = index.get(lessonId);
  if (!lesson || lesson.kind !== "lesson") return false;
  const done = new Set(completedCardIds);
  return lesson.coreCardIds.every((id) => done.has(id));
}

/**
 * Re-grades a quiz attempt from its raw answers. Score, pass and XP are all computed here; the
 * client's own score is ignored. Returns null for unknown quizzes.
 */
export function gradeQuizAttempt(
  index: ContentIndex,
  quizId: string,
  answers: readonly { cardId: string; answer: unknown }[],
  at: string,
  alreadyPassed: boolean,
): QuizAttempt | null {
  const quiz = index.get(quizId);
  if (!quiz || quiz.kind !== "quiz") return null;
  const byCard = new Map(answers.map((a) => [a.cardId, a.answer]));
  const graded = [...quiz.cards.values()].filter(isInteractiveCard).map((card) => ({
    cardId: card.id,
    answer: byCard.get(card.id) ?? null,
    correct: byCard.has(card.id) && gradeUntrusted(card, byCard.get(card.id)),
  }));
  const { score, passed } = scoreQuiz(
    graded.map((g) => g.correct),
    quiz.passThreshold ?? 0.7,
  );
  return { at, score, passed, xp: passed && !alreadyPassed ? XP.quizPass : 0, answers: graded };
}
