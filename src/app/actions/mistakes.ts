"use server";

/**
 * Mistake review (Pro). Mistakes are recorded for every signed-in learner (progress.ts:
 * `recordMistakeAction`, and wrong quiz answers), so free learners see how many they have; only
 * Pro can review them. Every list is checked against the loaded content, and every review answer
 * is re-graded here before a mistake is cleared.
 */
import { z } from "zod";
import type { InteractiveCard } from "@/cards/schema";
import { requireUser, requireUserId } from "@/lib/auth/server";
import { getContentIndex, getCourses, getLesson } from "@/lib/content/server";
import { gradedCard, REVIEW_BATCH, reviewableMistakes, reviewAnswerCorrect } from "@/lib/progress/mistakes";
import { getEntitlement, ProRequiredError } from "@/lib/pro/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const Id = z.string().min(1).max(120);

/** Open mistakes, newest first, that are still in the content. */
async function openMistakes(userId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("card_mistakes")
    .select("lesson_id, card_id, misses")
    .eq("user_id", userId)
    .is("cleared_at", null)
    .order("last_missed_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(`Couldn't load mistakes: ${error.message}`);
  return reviewableMistakes(getContentIndex(), data ?? []);
}

/** How many mistakes are waiting (any signed-in learner: free learners see the count, not the cards). */
export async function getMistakeCountAction(): Promise<{ count: number }> {
  const userId = await requireUserId();
  return { count: (await openMistakes(userId)).length };
}

export interface MistakeToReview {
  lessonId: string;
  lessonTitle: string;
  courseTitle: string;
  kind: "lesson" | "quiz";
  card: InteractiveCard;
  misses: number;
}

/** The cards to review (Pro only), newest first, at most `REVIEW_BATCH` at a time. */
export async function getMistakesToReviewAction(): Promise<{ mistakes: MistakeToReview[]; total: number }> {
  const user = await requireUser();
  if (!(await getEntitlement(user)).hasPro) throw new ProRequiredError();
  const rows = await openMistakes(user.id);
  const index = getContentIndex();
  const courses = new Map(getCourses().map((c) => [c.id, c.title]));
  const mistakes = rows.slice(0, REVIEW_BATCH).flatMap((r): MistakeToReview[] => {
    const lesson = getLesson(r.lesson_id);
    const card = gradedCard(index, r.lesson_id, r.card_id);
    if (!lesson || !card) return [];
    return [
      {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        courseTitle: courses.get(lesson.courseId) ?? "",
        kind: lesson.kind,
        card,
        misses: r.misses,
      },
    ];
  });
  return { mistakes, total: rows.length };
}

/**
 * Checks a review answer (Pro only). The server re-grades it; a right answer clears the mistake.
 * XP for it goes through the normal card write (practice toward today's goal).
 */
export async function checkMistakeAction(lessonId: string, cardId: string, answer: unknown): Promise<{ correct: boolean }> {
  const user = await requireUser();
  if (!(await getEntitlement(user)).hasPro) throw new ProRequiredError();
  const lesson = Id.parse(lessonId);
  const card = Id.parse(cardId);
  const correct = reviewAnswerCorrect(getContentIndex(), lesson, card, answer);
  if (correct === null) throw new Error("That card isn't in the course any more");
  if (!correct) return { correct: false };
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("card_mistakes")
    .update({ cleared_at: new Date().toISOString() })
    .match({ user_id: user.id, lesson_id: lesson, card_id: card })
    .is("cleared_at", null);
  if (error) throw new Error(`Couldn't clear the mistake: ${error.message}`);
  return { correct: true };
}
