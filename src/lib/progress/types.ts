import { z } from "zod";

export const CardCompletionSchema = z.object({
  completedAt: z.string(),
  xp: z.number().int().nonnegative(),
});

export type CardCompletion = z.infer<typeof CardCompletionSchema>;

export const LessonCompletionSchema = z.object({
  completedAt: z.string(),
  /** Completion bonus only; per-card XP is recorded on the cards. */
  xp: z.number().int().nonnegative(),
});

export type LessonCompletion = z.infer<typeof LessonCompletionSchema>;

export const QuizAttemptSchema = z.object({
  at: z.string(),
  /** 0 to 1. */
  score: z.number().min(0).max(1),
  passed: z.boolean(),
  xp: z.number().int().nonnegative(),
  answers: z.array(
    z.object({
      cardId: z.string(),
      /** Card-type-specific answer value (JSON-serialisable). */
      answer: z.unknown(),
      correct: z.boolean(),
    }),
  ),
});
export type QuizAttempt = z.infer<typeof QuizAttemptSchema>;

export const QuizProgressSchema = z.object({
  attempts: z.array(QuizAttemptSchema),
  bestScore: z.number().min(0).max(1),
  passedAt: z.string().nullable(),
});
export type QuizProgress = z.infer<typeof QuizProgressSchema>;

/** "path": lessons unlock in order. "explore": everything is open, in any order. */
export const LearningModeSchema = z.enum(["path", "explore"]);
export type LearningMode = z.infer<typeof LearningModeSchema>;

export const PreferencesSchema = z.object({
  mode: LearningModeSchema.default("path"),
  /** Sound effects and haptics. On by default; nothing plays before the first interaction. */
  sound: z.boolean().default(true),
  /** First-time "how to play" panels already dismissed (keys from src/lib/coach.ts). */
  coachSeen: z.array(z.string().max(40)).max(32).default([]),
});
export type Preferences = z.infer<typeof PreferencesSchema>;

export function defaultPreferences(): Preferences {
  return { mode: "path", sound: true, coachSeen: [] };
}

export const ProgressSnapshotSchema = z.object({
  /** Keyed by `cardKey(lessonId, cardId)`. */
  cards: z.record(z.string(), CardCompletionSchema),
  /** Keyed by lesson id. Regular lessons only. */
  lessons: z.record(z.string(), LessonCompletionSchema),
  /** Keyed by quiz (lesson) id. */
  quizzes: z.record(z.string(), QuizProgressSchema),
  /** Learner settings. Optional in stored data: progress saved before it existed still loads. */
  preferences: PreferencesSchema.default(defaultPreferences),
  totalXp: z.number().int().nonnegative(),
});
export type ProgressSnapshot = z.infer<typeof ProgressSnapshotSchema>;

export function emptySnapshot(): ProgressSnapshot {
  return { cards: {}, lessons: {}, quizzes: {}, preferences: defaultPreferences(), totalXp: 0 };
}

export function cardKey(lessonId: string, cardId: string): string {
  return `${lessonId}/${cardId}`;
}

export function isCardCompleted(snapshot: ProgressSnapshot, lessonId: string, cardId: string) {
  return cardKey(lessonId, cardId) in snapshot.cards;
}

/** Recomputes total XP from the records, so it can never drift out of sync. */
export function sumXp(snapshot: Omit<ProgressSnapshot, "totalXp">): number {
  let total = 0;
  for (const c of Object.values(snapshot.cards)) total += c.xp;
  for (const l of Object.values(snapshot.lessons)) total += l.xp;
  for (const q of Object.values(snapshot.quizzes)) for (const a of q.attempts) total += a.xp;
  return total;
}
