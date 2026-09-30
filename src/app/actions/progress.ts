"use server";

/**
 * Progress writes for signed-in learners. Every action:
 * 1. gets the user id from a server-verified session (`requireUserId()`), never from the client;
 * 2. validates its input and looks everything up in the lesson content;
 * 3. computes XP on the server (progress/authority.ts), then writes with the secret key.
 * Users can only READ their progress tables directly (RLS); they can't write them.
 */
import { cleanCoachSeen } from "@/lib/coach";
import { z } from "zod";
import { requireUserId } from "@/lib/auth/server";
import { getContentIndex } from "@/lib/content/server";
import { canCompleteLesson, cardXpFor, gradeQuizAttempt } from "@/lib/progress/authority";
import { mergeProgress } from "@/lib/progress/merge";
import { rowsToSnapshot, snapshotToRows } from "@/lib/progress/rows";
import {
  type CardCompletion,
  type LearningMode,
  LearningModeSchema,
  type LessonCompletion,
  type Preferences,
  type ProgressSnapshot,
  ProgressSnapshotSchema,
  type QuizAttempt,
} from "@/lib/progress/types";
import { XP } from "@/lib/progress/xp";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const Id = z.string().min(1).max(120);

function fail(message: string, error?: { message: string } | null): never {
  throw new Error(error ? `${message}: ${error.message}` : message);
}

async function loadAccountSnapshot(admin: ReturnType<typeof createSupabaseAdminClient>, userId: string) {
  const [cards, lessons, attempts, profile] = await Promise.all([
    admin.from("card_completions").select("lesson_id, card_id, completed_at, xp").eq("user_id", userId),
    admin.from("lesson_completions").select("lesson_id, completed_at, xp").eq("user_id", userId),
    admin.from("quiz_attempts").select("quiz_id, attempted_at, score, passed, xp, answers").eq("user_id", userId),
    admin.from("profiles").select("learning_mode, sound_enabled, coach_seen").eq("id", userId).maybeSingle(),
  ]);
  const error = cards.error ?? lessons.error ?? attempts.error ?? profile.error;
  if (error) fail("Couldn't load progress", error);
  return rowsToSnapshot({
    cards: cards.data ?? [],
    lessons: lessons.data ?? [],
    attempts: attempts.data ?? [],
    learningMode: profile.data?.learning_mode,
    soundEnabled: profile.data?.sound_enabled,
    coachSeen: profile.data?.coach_seen,
  });
}

/** Records a completed card. `claimedXp` only signals first try vs retry; the server sets the XP. */
export async function completeCardAction(lessonId: string, cardId: string, claimedXp: number): Promise<CardCompletion | null> {
  const userId = await requireUserId();
  const xp = cardXpFor(getContentIndex(), Id.parse(lessonId), Id.parse(cardId), Number(claimedXp));
  if (xp === null) return null;

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("card_completions")
    .upsert(
      { user_id: userId, lesson_id: lessonId, card_id: cardId, completed_at: new Date().toISOString(), xp },
      { onConflict: "user_id,lesson_id,card_id", ignoreDuplicates: true },
    );
  if (error) fail("Couldn't save the card", error);
  const { data } = await admin
    .from("card_completions")
    .select("completed_at, xp")
    .match({ user_id: userId, lesson_id: lessonId, card_id: cardId })
    .single();
  return data ? { completedAt: new Date(data.completed_at).toISOString(), xp: data.xp } : null;
}

/** Completes a lesson (+20 XP once), but only if every core card is already recorded. */
export async function completeLessonAction(lessonId: string): Promise<LessonCompletion | null> {
  const userId = await requireUserId();
  const id = Id.parse(lessonId);
  const admin = createSupabaseAdminClient();

  const { data: cards, error } = await admin
    .from("card_completions")
    .select("card_id")
    .match({ user_id: userId, lesson_id: id });
  if (error) fail("Couldn't check the lesson", error);
  if (!canCompleteLesson(getContentIndex(), id, (cards ?? []).map((c) => c.card_id))) return null;

  const { error: insertError } = await admin
    .from("lesson_completions")
    .upsert(
      { user_id: userId, lesson_id: id, completed_at: new Date().toISOString(), xp: XP.lessonComplete },
      { onConflict: "user_id,lesson_id", ignoreDuplicates: true },
    );
  if (insertError) fail("Couldn't complete the lesson", insertError);
  const { data } = await admin.from("lesson_completions").select("completed_at, xp").match({ user_id: userId, lesson_id: id }).single();
  return data ? { completedAt: new Date(data.completed_at).toISOString(), xp: data.xp } : null;
}

const AnswersSchema = z.array(z.object({ cardId: Id, answer: z.unknown() })).max(50);

/** Records a quiz attempt. The server re-grades the raw answers; the client's score is ignored. */
export async function recordQuizAttemptAction(
  quizId: string,
  answers: { cardId: string; answer: unknown }[],
): Promise<QuizAttempt | null> {
  const userId = await requireUserId();
  const id = Id.parse(quizId);
  const admin = createSupabaseAdminClient();

  const { count, error: countError } = await admin
    .from("quiz_attempts")
    .select("id", { count: "exact", head: true })
    .match({ user_id: userId, quiz_id: id, passed: true });
  if (countError) fail("Couldn't check the quiz", countError);

  const attempt = gradeQuizAttempt(getContentIndex(), id, AnswersSchema.parse(answers), new Date().toISOString(), (count ?? 0) > 0);
  if (!attempt) return null;
  const { error } = await admin.from("quiz_attempts").insert({
    user_id: userId,
    quiz_id: id,
    attempted_at: attempt.at,
    score: attempt.score,
    passed: attempt.passed,
    xp: attempt.xp,
    answers: attempt.answers as never,
  });
  if (error) fail("Couldn't save the quiz attempt", error);
  return attempt;
}

export async function setPreferencesAction(preferences: Partial<Preferences>): Promise<void> {
  const userId = await requireUserId();
  const update: { learning_mode?: LearningMode; sound_enabled?: boolean; coach_seen?: string[] } = {};
  if (preferences.mode !== undefined) update.learning_mode = LearningModeSchema.parse(preferences.mode);
  if (preferences.sound !== undefined) update.sound_enabled = z.boolean().parse(preferences.sound);
  if (preferences.coachSeen !== undefined) update.coach_seen = cleanCoachSeen(z.array(z.string()).max(64).parse(preferences.coachSeen));
  if (Object.keys(update).length === 0) return;
  const { error } = await createSupabaseAdminClient().from("profiles").update(update).eq("id", userId);
  if (error) fail("Couldn't save the setting", error);
}

export async function resetLessonAction(lessonId: string): Promise<void> {
  const userId = await requireUserId();
  const id = Id.parse(lessonId);
  const admin = createSupabaseAdminClient();
  const results = await Promise.all([
    admin.from("card_completions").delete().match({ user_id: userId, lesson_id: id }),
    admin.from("lesson_completions").delete().match({ user_id: userId, lesson_id: id }),
    admin.from("quiz_attempts").delete().match({ user_id: userId, quiz_id: id }),
  ]);
  const error = results.find((r) => r.error)?.error;
  if (error) fail("Couldn't reset the lesson", error);
}

/** Clears all progress. The account and its settings stay. */
export async function resetAllAction(): Promise<void> {
  const userId = await requireUserId();
  const admin = createSupabaseAdminClient();
  const results = await Promise.all([
    admin.from("card_completions").delete().eq("user_id", userId),
    admin.from("lesson_completions").delete().eq("user_id", userId),
    admin.from("quiz_attempts").delete().eq("user_id", userId),
  ]);
  const error = results.find((r) => r.error)?.error;
  if (error) fail("Couldn't reset progress", error);
}

/**
 * Merges this browser's guest progress into the account (see progress/merge.ts). Quiz attempts
 * are re-graded from their answers first, and all XP is recomputed, so nothing uploaded is trusted.
 * Safe to call repeatedly.
 */
export async function mergeGuestProgressAction(local: unknown): Promise<ProgressSnapshot> {
  const userId = await requireUserId();
  const parsed = ProgressSnapshotSchema.parse(local);
  const index = getContentIndex();

  const regraded: ProgressSnapshot = {
    ...parsed,
    quizzes: Object.fromEntries(
      Object.entries(parsed.quizzes).flatMap(([quizId, q]) => {
        const attempts = q.attempts
          .map((a) => gradeQuizAttempt(index, quizId, a.answers, a.at, false))
          .filter((a): a is QuizAttempt => a !== null);
        return attempts.length ? [[quizId, { attempts, bestScore: 0, passedAt: null }]] : [];
      }),
    ),
  };

  const admin = createSupabaseAdminClient();
  const merged = mergeProgress(await loadAccountSnapshot(admin, userId), regraded, index);
  const rows = snapshotToRows(userId, merged);

  const writes = await Promise.all([
    rows.cards.length ? admin.from("card_completions").upsert(rows.cards, { onConflict: "user_id,lesson_id,card_id" }) : null,
    rows.lessons.length ? admin.from("lesson_completions").upsert(rows.lessons, { onConflict: "user_id,lesson_id" }) : null,
    rows.attempts.length
      ? admin.from("quiz_attempts").upsert(rows.attempts, { onConflict: "user_id,quiz_id,attempted_at" })
      : null,
    admin
      .from("profiles")
      .update({
        learning_mode: merged.preferences.mode,
        sound_enabled: merged.preferences.sound,
        coach_seen: merged.preferences.coachSeen,
      })
      .eq("id", userId),
  ]);
  const error = writes.find((w) => w?.error)?.error;
  if (error) fail("Couldn't save your progress", error);
  return merged;
}
