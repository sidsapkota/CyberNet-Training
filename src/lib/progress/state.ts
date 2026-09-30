import type { Card } from "@/cards/schema";
import type { CourseOutline, LessonOutline, ModuleOutline } from "@/lib/content/schema";
import { isCardCompleted, type ProgressSnapshot } from "./types";

/**
 * Pure functions that derive display state (locked, completed, percentages,
 * what's next) from content outlines plus a progress snapshot. Nothing derived
 * is ever stored.
 *
 * Unlock rules:
 * - The first module of each course is unlocked; module N+1 unlocks when module N's quiz is passed.
 * - Within an unlocked module, lessons unlock in order: each needs the previous one completed.
 * - The module quiz unlocks once every regular lesson in the module is completed.
 * - A module is complete when its quiz is passed.
 */

export type ItemStatus = "locked" | "available" | "in_progress" | "completed";

export interface LessonState {
  lesson: LessonOutline;
  status: ItemStatus;
  completedCoreCards: number;
  /** Quizzes only. 0 to 1, or null if never attempted. */
  bestScore: number | null;
}

export interface ModuleState {
  module: ModuleOutline;
  status: ItemStatus;
  lessons: LessonState[];
  completedItems: number;
  totalItems: number;
  /** 0 to 1. */
  progress: number;
}

export interface CourseState {
  course: CourseOutline;
  modules: ModuleState[];
  completedModules: number;
}

export function isLessonDone(snapshot: ProgressSnapshot, lesson: LessonOutline): boolean {
  return lesson.kind === "quiz"
    ? Boolean(snapshot.quizzes[lesson.id]?.passedAt)
    : Boolean(snapshot.lessons[lesson.id]);
}

function lessonState(
  snapshot: ProgressSnapshot,
  lesson: LessonOutline,
  unlocked: boolean,
): LessonState {
  const completedCoreCards = lesson.coreCardIds.filter((id) =>
    isCardCompleted(snapshot, lesson.id, id),
  ).length;
  const quiz = lesson.kind === "quiz" ? snapshot.quizzes[lesson.id] : undefined;
  const bestScore = quiz ? quiz.bestScore : null;

  let status: ItemStatus;
  if (isLessonDone(snapshot, lesson)) status = "completed";
  else if (!unlocked) status = "locked";
  else if (completedCoreCards > 0 || (quiz?.attempts.length ?? 0) > 0) status = "in_progress";
  else status = "available";

  return { lesson, status, completedCoreCards, bestScore };
}

export function computeModuleState(
  snapshot: ProgressSnapshot,
  mod: ModuleOutline,
  moduleUnlocked: boolean,
): ModuleState {
  const regular = mod.lessons.filter((l) => l.kind === "lesson");
  const allRegularDone = regular.every((l) => isLessonDone(snapshot, l));

  let previousDone = true;
  const lessons = mod.lessons.map((lesson) => {
    const unlocked =
      moduleUnlocked && (lesson.kind === "quiz" ? allRegularDone : previousDone);
    if (lesson.kind === "lesson") previousDone = isLessonDone(snapshot, lesson);
    return lessonState(snapshot, lesson, unlocked);
  });

  const completedItems = lessons.filter((l) => l.status === "completed").length;
  const totalItems = lessons.length;
  const quizPassed = lessons.some((l) => l.lesson.kind === "quiz" && l.status === "completed");

  let status: ItemStatus;
  if (quizPassed) status = "completed";
  else if (!moduleUnlocked) status = "locked";
  else if (lessons.some((l) => l.status === "completed" || l.status === "in_progress"))
    status = "in_progress";
  else status = "available";

  return {
    module: mod,
    status,
    lessons,
    completedItems,
    totalItems,
    progress: totalItems === 0 ? 0 : completedItems / totalItems,
  };
}

export function computeCourseState(snapshot: ProgressSnapshot, course: CourseOutline): CourseState {
  let previousModuleDone = true;
  const modules = course.modules.map((mod) => {
    const state = computeModuleState(snapshot, mod, previousModuleDone);
    previousModuleDone = state.status === "completed";
    return state;
  });
  return {
    course,
    modules,
    completedModules: modules.filter((m) => m.status === "completed").length,
  };
}

/** Every lesson and quiz of a course, in the order a learner takes them. */
export function flattenCourse(course: CourseOutline): LessonOutline[] {
  return course.modules.flatMap((m) => m.lessons);
}

export function findLessonState(
  snapshot: ProgressSnapshot,
  course: CourseOutline,
  lessonId: string,
): LessonState | undefined {
  for (const mod of computeCourseState(snapshot, course).modules) {
    const found = mod.lessons.find((l) => l.lesson.id === lessonId);
    if (found) return found;
  }
  return undefined;
}

/** The item that follows `lessonId` in its course, or null at the end. */
export function getNextLesson(course: CourseOutline, lessonId: string): LessonOutline | null {
  const all = flattenCourse(course);
  const index = all.findIndex((l) => l.id === lessonId);
  return index === -1 ? null : (all[index + 1] ?? null);
}

/**
 * For a locked item, the earliest unfinished item the learner should do first.
 * Returns null if the item is not locked.
 */
export function getBlockingLesson(
  snapshot: ProgressSnapshot,
  course: CourseOutline,
  lessonId: string,
): LessonOutline | null {
  const state = findLessonState(snapshot, course, lessonId);
  if (!state || state.status !== "locked") return null;
  return flattenCourse(course).find((l) => !isLessonDone(snapshot, l)) ?? null;
}

/**
 * Where to start a lesson:
 * - already completed (a replay): the first card
 * - otherwise: the first core card not yet completed
 * - every core card done but the lesson never finished: the first unfinished
 *   card after the last core card, or the last card, so finishing is close
 */
export function resumeIndex(
  snapshot: ProgressSnapshot,
  lessonId: string,
  cards: readonly Pick<Card, "id" | "difficulty">[],
): number {
  if (snapshot.lessons[lessonId]) return 0;
  const incomplete = (c: Pick<Card, "id">) => !isCardCompleted(snapshot, lessonId, c.id);

  const nextCore = cards.findIndex((c) => c.difficulty === "core" && incomplete(c));
  if (nextCore !== -1) return nextCore;

  const lastCore = cards.findLastIndex((c) => c.difficulty === "core");
  const nextAfterCore = cards.findIndex((c, i) => i > lastCore && incomplete(c));
  return nextAfterCore !== -1 ? nextAfterCore : Math.max(0, cards.length - 1);
}
