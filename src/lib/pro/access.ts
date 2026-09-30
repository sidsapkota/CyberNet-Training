/**
 * What a learner may open. Pure. Free modules are for everyone (no account needed); Pro modules
 * need Pro, decided on the server (src/lib/pro/server.ts). Explore mode never bypasses Pro.
 */
import type { Lesson, LessonOutline, ModuleAccess } from "@/lib/content/schema";

export function needsPro(access: ModuleAccess, hasPro: boolean): boolean {
  return access === "pro" && !hasPro;
}

/**
 * The lesson a statically built page may contain: the whole lesson if its module is free, nothing
 * if it's Pro. Pro lessons are fetched after the server checks entitlement (/api/lessons/[id]), so
 * their cards and answers are never in public HTML or JavaScript.
 */
export function publicLesson(lesson: Lesson): Lesson | null {
  return lesson.access === "free" ? lesson : null;
}

/** Why a Pro lesson can't be opened, for the gate: a guest must sign in first. */
export type LockedReason = "sign-in" | "pro";

export function isProLesson(outline: Pick<LessonOutline, "access">): boolean {
  return outline.access === "pro";
}
