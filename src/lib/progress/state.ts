import type { Card } from "@/cards/schema";
import { requiredForLesson } from "@/cards/pace";
import type { CourseOutline, LessonOutline, ModuleOutline } from "@/lib/content/schema";
import { isCardCompleted, type LearningMode, type ProgressSnapshot } from "./types";

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
 *
 * In Explore mode (the learner's `preferences.mode`) nothing is locked: every lesson and quiz can be
 * taken in any order. Completion, XP and "what's next" work exactly the same.
 *
 * CyberNet Pro is separate from unlocking: a lesson in a Pro module has `needsPro` when the learner
 * doesn't have Pro (`hasPro`, false by default). Its status still shows progress (a finished Pro
 * lesson stays completed: progress is never lost), but it can't be opened, and "what's next" skips
 * it. Explore mode never bypasses Pro. The server enforces all of this; this is only for display.
 */

export type ItemStatus = "locked" | "available" | "in_progress" | "completed";

export interface LessonState {
  lesson: LessonOutline;
  status: ItemStatus;
  completedCoreCards: number;
  /** Quizzes only. 0 to 1, or null if never attempted. */
  bestScore: number | null;
  /** In a Pro module, and the learner doesn't have Pro: shown with a Pro badge, can't be opened. */
  needsPro: boolean;
}

export interface ModuleState {
  module: ModuleOutline;
  status: ItemStatus;
  lessons: LessonState[];
  /** A Pro module, and the learner doesn't have Pro. */
  needsPro: boolean;
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
  hasPro: boolean,
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

  return { lesson, status, completedCoreCards, bestScore, needsPro: lesson.access === "pro" && !hasPro };
}

export function computeModuleState(
  snapshot: ProgressSnapshot,
  mod: ModuleOutline,
  moduleUnlocked: boolean,
  mode: LearningMode = snapshot.preferences.mode,
  hasPro = false,
): ModuleState {
  const regular = mod.lessons.filter((l) => l.kind === "lesson");
  const allRegularDone = regular.every((l) => isLessonDone(snapshot, l));

  let previousDone = true;
  const lessons = mod.lessons.map((lesson) => {
    const unlocked =
      mode === "explore" ||
      (moduleUnlocked && (lesson.kind === "quiz" ? allRegularDone : previousDone));
    if (lesson.kind === "lesson") previousDone = isLessonDone(snapshot, lesson);
    return lessonState(snapshot, lesson, unlocked, hasPro);
  });

  const completedItems = lessons.filter((l) => l.status === "completed").length;
  const totalItems = lessons.length;
  const quizPassed = lessons.some((l) => l.lesson.kind === "quiz" && l.status === "completed");

  let status: ItemStatus;
  if (quizPassed) status = "completed";
  else if (!moduleUnlocked && mode === "path") status = "locked";
  else if (lessons.some((l) => l.status === "completed" || l.status === "in_progress"))
    status = "in_progress";
  else status = "available";

  return {
    module: mod,
    status,
    lessons,
    needsPro: mod.access === "pro" && !hasPro,
    completedItems,
    totalItems,
    progress: totalItems === 0 ? 0 : completedItems / totalItems,
  };
}

export function computeCourseState(
  snapshot: ProgressSnapshot,
  course: CourseOutline,
  mode: LearningMode = snapshot.preferences.mode,
  hasPro = false,
): CourseState {
  let previousModuleDone = true;
  const modules = course.modules.map((mod) => {
    const state = computeModuleState(snapshot, mod, previousModuleDone, mode, hasPro);
    previousModuleDone = state.status === "completed";
    return state;
  });
  return {
    course,
    modules,
    completedModules: modules.filter((m) => m.status === "completed").length,
  };
}

/**
 * The learner's next item: the first one, in path order, that isn't completed or locked (or Pro,
 * without Pro). In Path mode that's the next unlocked lesson; in Explore mode it's the first
 * unfinished one. Null once everything they can open is done.
 */
export function getCurrentLesson(state: CourseState): LessonState | null {
  for (const mod of state.modules) {
    const found = mod.lessons.find((l) => l.status !== "completed" && l.status !== "locked" && !l.needsPro);
    if (found) return found;
  }
  return null;
}

export interface CourseProgress {
  /** Finished lessons plus passed quizzes, out of all of them (the course is done when they match). */
  completed: number;
  total: number;
  lessonsFinished: number;
  lessonsTotal: number;
  quizzesPassed: number;
  quizzesTotal: number;
  /** Core cards done, out of every core card (a passed quiz counts all its questions). */
  cardsDone: number;
  cardsTotal: number;
  /**
   * 0 to 1, for rings and bars: cards done out of all cards, so it moves with every card. Never 1
   * until every lesson is finished and every quiz passed (doing all the cards isn't finishing).
   */
  fraction: number;
}

/** The most a course's fraction can show before it's really finished: rounds to 99%, never 100%. */
export const UNFINISHED_MAX = 0.99;

export function courseProgress(state: CourseState): CourseProgress {
  const all = state.modules.flatMap((m) => m.lessons);
  const lessons = all.filter((l) => l.lesson.kind === "lesson");
  const quizzes = all.filter((l) => l.lesson.kind === "quiz");
  const completed = all.filter((l) => l.status === "completed").length;
  let cardsDone = 0;
  let cardsTotal = 0;
  for (const item of all) {
    const cards = item.lesson.coreCardIds.length;
    cardsTotal += cards;
    // Quiz answers aren't card completions: a quiz counts once it's passed.
    cardsDone += item.status === "completed" ? cards : item.lesson.kind === "lesson" ? Math.min(item.completedCoreCards, cards) : 0;
  }
  const finished = all.length > 0 && completed === all.length;
  const raw = cardsTotal === 0 ? 0 : cardsDone / cardsTotal;
  return {
    completed,
    total: all.length,
    lessonsFinished: lessons.filter((l) => l.status === "completed").length,
    lessonsTotal: lessons.length,
    quizzesPassed: quizzes.filter((l) => l.status === "completed").length,
    quizzesTotal: quizzes.length,
    cardsDone,
    cardsTotal,
    fraction: finished ? 1 : Math.min(raw, UNFINISHED_MAX),
  };
}

/** The counts beside a ring: lessons finished and quizzes passed, apart ("2/9 lessons · 0/3 quizzes"). */
export function progressCounts(p: Pick<CourseProgress, "lessonsFinished" | "lessonsTotal" | "quizzesPassed" | "quizzesTotal">): string {
  return `${p.lessonsFinished}/${p.lessonsTotal} lessons · ${p.quizzesPassed}/${p.quizzesTotal} ${p.quizzesTotal === 1 ? "quiz" : "quizzes"}`;
}

/** Whole-number percent for a progress fraction: 100 only when it's really 1. */
export function progressPercent(fraction: number): number {
  return fraction >= 1 ? 100 : Math.min(99, Math.round(fraction * 100));
}

/** True once the learner has done anything at all (drives the first-visit welcome). */
export function hasAnyProgress(snapshot: ProgressSnapshot): boolean {
  return (
    Object.keys(snapshot.cards).length > 0 ||
    Object.keys(snapshot.lessons).length > 0 ||
    Object.keys(snapshot.quizzes).length > 0
  );
}

/** Any progress at all in this course: a card, a finished lesson or a quiz attempt. */
export function hasCourseProgress(snapshot: ProgressSnapshot, course: CourseOutline): boolean {
  const ids = new Set(flattenCourse(course).map((l) => l.id));
  return (
    Object.keys(snapshot.cards).some((key) => ids.has(key.slice(0, key.indexOf("/")))) ||
    Object.keys(snapshot.lessons).some((id) => ids.has(id)) ||
    Object.keys(snapshot.quizzes).some((id) => ids.has(id))
  );
}

/**
 * Whether the learner has finished a free lesson (or passed a free quiz) in this course. Until
 * they have, a Pro node offers "Start with the free lessons first" instead of the paywall.
 */
export function hasFinishedFreeLesson(snapshot: ProgressSnapshot, course: CourseOutline): boolean {
  return flattenCourse(course).some((l) => l.access === "free" && isLessonDone(snapshot, l));
}

/** The course's first regular lesson: where "Start here" points. */
export function startingLesson(course: CourseOutline): LessonOutline | undefined {
  return flattenCourse(course).find((l) => l.kind === "lesson");
}

/** Every lesson and quiz of a course, in the order a learner takes them. */
export function flattenCourse(course: CourseOutline): LessonOutline[] {
  return course.modules.flatMap((m) => m.lessons);
}

export function findLessonState(
  snapshot: ProgressSnapshot,
  course: CourseOutline,
  lessonId: string,
  mode: LearningMode = snapshot.preferences.mode,
): LessonState | undefined {
  for (const mod of computeCourseState(snapshot, course, mode).modules) {
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
 * Returns null if the item is not locked (always, in Explore mode).
 */
export function getBlockingLesson(
  snapshot: ProgressSnapshot,
  course: CourseOutline,
  lessonId: string,
  mode: LearningMode = snapshot.preferences.mode,
): LessonOutline | null {
  const state = findLessonState(snapshot, course, lessonId, mode);
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
  cards: readonly Pick<Card, "id" | "difficulty" | "pace">[],
): number {
  if (snapshot.lessons[lessonId]) return 0;
  const incomplete = (c: Pick<Card, "id">) => !isCardCompleted(snapshot, lessonId, c.id);

  const nextCore = cards.findIndex((c) => requiredForLesson(c) && incomplete(c));
  if (nextCore !== -1) return nextCore;

  const lastCore = cards.findLastIndex((c) => requiredForLesson(c));
  const nextAfterCore = cards.findIndex((c, i) => i > lastCore && incomplete(c));
  return nextAfterCore !== -1 ? nextAfterCore : Math.max(0, cards.length - 1);
}

/**
 * Checks a lesson run when the learner leaves its last card. `done` must also count cards completed
 * in that same event (e.g. a final recap explainer), because the React state recording them hasn't
 * been applied yet. `missingCore` is the first unfinished core card, or -1 if the lesson is finished.
 */
export function lessonFinishState(
  cards: readonly Pick<Card, "id" | "difficulty" | "pace">[],
  done: (card: Pick<Card, "id">) => boolean,
): { missingCore: number; challengesCompleted: number } {
  return {
    missingCore: cards.findIndex((c) => requiredForLesson(c) && !done(c)),
    challengesCompleted: cards.filter((c) => c.difficulty === "challenge" && done(c)).length,
  };
}

/**
 * Progress as it was just before `lessonId` was completed (its lesson record, or its quiz pass,
 * removed). The course path draws this first, then the real snapshot, so a newly completed node
 * visibly fills in and the trace to the next node lights up.
 */
export function snapshotBefore(snapshot: ProgressSnapshot, lessonId: string): ProgressSnapshot {
  const lessons = { ...snapshot.lessons };
  delete lessons[lessonId];
  const quizzes = { ...snapshot.quizzes };
  const quiz = quizzes[lessonId];
  if (quiz) quizzes[lessonId] = { ...quiz, passedAt: null };
  return { ...snapshot, lessons, quizzes };
}

/** Progress anywhere except this lesson (its own cards, completion and quiz attempts). */
export function hasProgressOutside(snapshot: ProgressSnapshot, lessonId: string): boolean {
  const prefix = `${lessonId}/`;
  return (
    Object.keys(snapshot.cards).some((key) => !key.startsWith(prefix)) ||
    Object.keys(snapshot.lessons).some((id) => id !== lessonId) ||
    Object.keys(snapshot.quizzes).some((id) => id !== lessonId)
  );
}

/**
 * The lesson a link can't open yet, or null to play it. Deep links from videos must always work
 * for a newcomer: a learner with no progress anywhere else plays any lesson straight away (it
 * counts on their path as usual), and keeps playing it: their own progress in this lesson never
 * brings the gate up mid-lesson. Learners with other progress keep the Path gate, which offers
 * "Play it anyway" (`playAnyway`) as well as switching to Explore.
 */
export function deepLinkGate(
  snapshot: ProgressSnapshot,
  course: CourseOutline,
  lessonId: string,
  playAnyway = false,
): LessonOutline | null {
  if (playAnyway || !hasProgressOutside(snapshot, lessonId)) return null;
  return getBlockingLesson(snapshot, course, lessonId);
}

