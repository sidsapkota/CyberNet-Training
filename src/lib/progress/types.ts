import { z } from "zod";
import { DAILY_GOAL_VALUES, DEFAULT_DAILY_GOAL, type DailyGoal } from "./daily";

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

/** What earned XP. "practice" is replaying a finished card: it counts toward the daily goal only. */
export const XpEventKindSchema = z.enum(["card", "lesson", "quiz", "practice"]);
export type XpEventKind = z.infer<typeof XpEventKindSchema>;

/** One XP-earning moment, dated with the learner's local day when it happened (see daily.ts). */
export const XpEventSchema = z.object({
  at: z.string(),
  /** Local calendar date, "YYYY-MM-DD". */
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** IANA time zone the day was worked out in. */
  tz: z.string().min(1).max(64),
  kind: XpEventKindSchema,
  lessonId: z.string().min(1).max(120),
  cardId: z.string().min(1).max(120).optional(),
  xp: z.number().int().min(0).max(50),
});
export type XpEvent = z.infer<typeof XpEventSchema>;

const DailyGoalSchema = z
  .number()
  .int()
  .refine((n): n is DailyGoal => DAILY_GOAL_VALUES.includes(n));

/** A day the daily goal was met, with the goal and time zone at that moment. */
export const DailyGoalDaySchema = z.object({
  tz: z.string().min(1).max(64),
  goal: DailyGoalSchema,
  metAt: z.string(),
});
export type DailyGoalDay = z.infer<typeof DailyGoalDaySchema>;

/** "path": lessons unlock in order. "explore": everything is open, in any order. */
export const LearningModeSchema = z.enum(["path", "explore"]);
export type LearningMode = z.infer<typeof LearningModeSchema>;

export const PreferencesSchema = z.object({
  mode: LearningModeSchema.default("path"),
  /** Sound effects and haptics. On by default; nothing plays before the first interaction. */
  sound: z.boolean().default(true),
  /** First-time "how to play" panels already dismissed (keys from src/lib/coach.ts). */
  coachSeen: z.array(z.string().max(40)).max(32).default([]),
  /** Daily XP goal (Casual 20, Regular 50, Serious 100). */
  dailyGoal: DailyGoalSchema.default(DEFAULT_DAILY_GOAL),
  /** The learner has picked a goal (or kept the default on purpose); the first-use picker hides. */
  dailyGoalChosen: z.boolean().default(false),
});
export type Preferences = z.infer<typeof PreferencesSchema>;

export function defaultPreferences(): Preferences {
  return { mode: "path", sound: true, coachSeen: [], dailyGoal: DEFAULT_DAILY_GOAL, dailyGoalChosen: false };
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
  /**
   * The XP ledger for daily goals, oldest first. Separate from the records above: total XP never
   * includes practice. Optional in stored data (progress saved before streaks still loads).
   */
  xpEvents: z.array(XpEventSchema).default([]),
  /** Days the daily goal was met, keyed by "YYYY-MM-DD". Streaks are calculated from these. */
  goalDays: z.record(z.string().regex(/^\d{4}-\d{2}-\d{2}$/), DailyGoalDaySchema).default({}),
  totalXp: z.number().int().nonnegative(),
});
export type ProgressSnapshot = z.infer<typeof ProgressSnapshotSchema>;

export function emptySnapshot(): ProgressSnapshot {
  return { cards: {}, lessons: {}, quizzes: {}, preferences: defaultPreferences(), xpEvents: [], goalDays: {}, totalXp: 0 };
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
