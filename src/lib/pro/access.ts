/**
 * What a learner may open. Pure. Guests play each course's first lesson and every lesson in a
 * module open to guests (help and recovery); the rest of the free modules need a free account; Pro
 * modules need Pro, decided on the server (src/lib/pro/server.ts). Explore mode never bypasses either.
 */
import type { Lesson, LessonOutline, ModuleAccess } from "@/lib/content/schema";

export function needsPro(access: ModuleAccess, hasPro: boolean): boolean {
  return access === "pro" && !hasPro;
}

/**
 * The lesson a statically built page may contain: the whole lesson only if guests can play it.
 * Every other lesson is fetched after the server checks the session, and Pro too
 * (/api/lessons/[id]), so their cards and answers are never in public HTML or JavaScript.
 */
export function publicLesson(lesson: Lesson): Lesson | null {
  return lesson.guests ? lesson : null;
}

/** Who may open a lesson: anyone, anyone signed in, or Pro learners. */
export type LessonAccessLevel = "guest" | "account" | "pro";

export function lessonAccessLevel(lesson: Pick<LessonOutline, "access" | "guests">): LessonAccessLevel {
  if (lesson.access === "pro") return "pro";
  return lesson.guests ? "guest" : "account";
}

/**
 * Why a lesson can't be opened, for the gate: "account" needs a free account (any lesson guests
 * can't play); "limit" is a free account that has opened today's new lessons; "pro" a Pro lesson
 * on a copy without accounts; "sign-in" a Pro lesson for a guest.
 */
export type LockedReason = "account" | "sign-in" | "pro" | "limit";

export function isProLesson(outline: Pick<LessonOutline, "access">): boolean {
  return outline.access === "pro";
}
