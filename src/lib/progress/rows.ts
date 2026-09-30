/**
 * Maps between the database rows (see supabase/migrations) and the ProgressSnapshot shape the app
 * uses. Pure, shared by the browser store (reads) and Server Actions (writes).
 */
import { cleanCoachSeen } from "@/lib/coach";
import type { Database, Json } from "@/lib/supabase/database.types";
import { quizProgressFrom } from "./merge";
import {
  cardKey,
  LearningModeSchema,
  type ProgressSnapshot,
  type QuizAttempt,
  QuizAttemptSchema,
  sumXp,
} from "./types";

type Tables = Database["public"]["Tables"];
export type CardRow = Pick<Tables["card_completions"]["Row"], "lesson_id" | "card_id" | "completed_at" | "xp">;
export type LessonRow = Pick<Tables["lesson_completions"]["Row"], "lesson_id" | "completed_at" | "xp">;
export type AttemptRow = Pick<
  Tables["quiz_attempts"]["Row"],
  "quiz_id" | "attempted_at" | "score" | "passed" | "xp" | "answers"
>;

export interface ProgressRows {
  cards: CardRow[];
  lessons: LessonRow[];
  attempts: AttemptRow[];
  learningMode: string | null | undefined;
  soundEnabled?: boolean | null;
  coachSeen?: string[] | null;
}

const iso = (value: string) => new Date(value).toISOString();

export function attemptFromRow(row: AttemptRow): QuizAttempt {
  const answers = QuizAttemptSchema.shape.answers.safeParse(row.answers);
  return {
    at: iso(row.attempted_at),
    score: Number(row.score),
    passed: row.passed,
    xp: row.xp,
    answers: answers.success ? answers.data : [],
  };
}

export function rowsToSnapshot(rows: ProgressRows): ProgressSnapshot {
  const cards: ProgressSnapshot["cards"] = {};
  for (const r of rows.cards) cards[cardKey(r.lesson_id, r.card_id)] = { completedAt: iso(r.completed_at), xp: r.xp };

  const lessons: ProgressSnapshot["lessons"] = {};
  for (const r of rows.lessons) lessons[r.lesson_id] = { completedAt: iso(r.completed_at), xp: r.xp };

  const byQuiz = new Map<string, QuizAttempt[]>();
  for (const r of rows.attempts) byQuiz.set(r.quiz_id, [...(byQuiz.get(r.quiz_id) ?? []), attemptFromRow(r)]);
  const quizzes: ProgressSnapshot["quizzes"] = {};
  for (const [id, attempts] of byQuiz) quizzes[id] = quizProgressFrom(attempts);

  const mode = LearningModeSchema.safeParse(rows.learningMode);
  const next = {
    cards,
    lessons,
    quizzes,
    preferences: {
      mode: mode.success ? mode.data : ("path" as const),
      sound: rows.soundEnabled ?? true,
      coachSeen: cleanCoachSeen(rows.coachSeen),
    },
  };
  return { ...next, totalXp: sumXp(next) };
}

/** Rows to upsert for a user's whole snapshot (used by the sign-in merge). */
export function snapshotToRows(userId: string, snapshot: ProgressSnapshot) {
  return {
    cards: Object.entries(snapshot.cards).map(([key, c]) => {
      const slash = key.indexOf("/");
      return {
        user_id: userId,
        lesson_id: key.slice(0, slash),
        card_id: key.slice(slash + 1),
        completed_at: c.completedAt,
        xp: c.xp,
      };
    }),
    lessons: Object.entries(snapshot.lessons).map(([lessonId, l]) => ({
      user_id: userId,
      lesson_id: lessonId,
      completed_at: l.completedAt,
      xp: l.xp,
    })),
    attempts: Object.entries(snapshot.quizzes).flatMap(([quizId, q]) =>
      q.attempts.map((a) => ({
        user_id: userId,
        quiz_id: quizId,
        attempted_at: a.at,
        score: a.score,
        passed: a.passed,
        xp: a.xp,
        answers: a.answers as unknown as Json,
      })),
    ),
  };
}
