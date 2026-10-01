/**
 * Moving between the lessons of a module: the lesson header's menu and the lesson-complete
 * screen's "Previous lesson" / "Next lesson". Pure. Access isn't decided here: every row links to
 * the lesson's own page, which applies the guest gate, the daily limit and Pro as usual. This only
 * says what each row should show (done, here, locked, needs an account, Pro).
 */
import type { CourseOutline, LessonOutline, ModuleOutline } from "@/lib/content/schema";
import { computeCourseState, getBlockingLesson, type ItemStatus } from "./state";
import type { ProgressSnapshot } from "./types";

export type LessonNavState = "done" | "here" | "locked" | "open";

export interface LessonNavRow {
  lesson: LessonOutline;
  state: LessonNavState;
  /** A guest, on a lesson that needs a free account (its page shows the sign-up gate). */
  needsAccount: boolean;
  /** A Pro lesson the learner can't open (only on a copy without accounts). */
  needsPro: boolean;
  /** Locked in Path mode: the lesson to finish first. */
  blockedBy: LessonOutline | null;
}

export function moduleOf(course: CourseOutline, lessonId: string): ModuleOutline | undefined {
  return course.modules.find((m) => m.lessons.some((l) => l.id === lessonId));
}

/** The lessons before and after this one in its module (null at either end). */
export function moduleNeighbours(course: CourseOutline, lessonId: string): { previous: LessonOutline | null; next: LessonOutline | null } {
  const lessons = moduleOf(course, lessonId)?.lessons ?? [];
  const i = lessons.findIndex((l) => l.id === lessonId);
  if (i === -1) return { previous: null, next: null };
  return { previous: lessons[i - 1] ?? null, next: lessons[i + 1] ?? null };
}

/**
 * The module's lessons for the header menu. `proOpen`: Pro lessons can be opened (the learner has
 * Pro, or accounts exist, where the daily limit applies instead).
 */
export function moduleNav(
  snapshot: ProgressSnapshot,
  course: CourseOutline,
  lessonId: string,
  { guest, accounts, proOpen }: { guest: boolean; accounts: boolean; proOpen: boolean },
): { module: ModuleOutline; rows: LessonNavRow[] } | null {
  const mod = moduleOf(course, lessonId);
  if (!mod) return null;
  const state = computeCourseState(snapshot, course, undefined, proOpen).modules.find((m) => m.module.id === mod.id);
  const statusOf = new Map<string, ItemStatus>(state?.lessons.map((l) => [l.lesson.id, l.status]) ?? []);
  const rows = mod.lessons.map((lesson): LessonNavRow => {
    const status = statusOf.get(lesson.id);
    const navState: LessonNavState = lesson.id === lessonId ? "here" : status === "completed" ? "done" : status === "locked" ? "locked" : "open";
    return {
      lesson,
      state: navState,
      needsAccount: accounts && guest && !lesson.guests && navState !== "done",
      needsPro: lesson.access === "pro" && !proOpen,
      blockedBy: navState === "locked" ? getBlockingLesson(snapshot, course, lesson.id) : null,
    };
  });
  return { module: mod, rows };
}
