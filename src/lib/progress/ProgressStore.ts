import type { Preferences, ProgressSnapshot, QuizAttempt } from "./types";

/**
 * Persistence boundary for learner progress. Components never talk to storage
 * directly; they go through `useProgress()`, which wraps one of these.
 *
 * Methods are async so a network-backed implementation (e.g. Supabase) can be
 * swapped in without touching callers. Callers decide how much XP to award
 * (see `xp.ts`); stores just record it.
 */
export interface ProgressStore {
  getSnapshot(): Promise<ProgressSnapshot>;

  /** Idempotent: completing an already-completed card is a no-op (no extra XP). */
  completeCard(lessonId: string, cardId: string, xp: number): Promise<void>;

  /** Idempotent: completing an already-completed lesson is a no-op (no extra XP). */
  completeLesson(lessonId: string, xp: number): Promise<void>;

  /** Appends an attempt; updates best score and first pass time. */
  recordQuizAttempt(quizId: string, attempt: QuizAttempt): Promise<void>;

  /** Merges learner settings (e.g. Path or Explore mode). Stored with progress so it syncs later. */
  setPreferences(preferences: Partial<Preferences>): Promise<void>;

  /** Clears card and completion records for one lesson or quiz. */
  resetLesson(lessonId: string): Promise<void>;

  /** Clears everything. */
  resetAll(): Promise<void>;

  /** Called with a fresh snapshot after every change (including other tabs). */
  subscribe(listener: (snapshot: ProgressSnapshot) => void): () => void;
}
