import type { CourseOutline } from "@/lib/content/schema";
import { computeCourseState } from "./state";
import type { ProgressSnapshot } from "./types";

/**
 * Dashboard numbers derived from progress. Pure: pass `now` in, so results are testable and never
 * computed during server rendering.
 */

export interface ActivityDay {
  /** Local calendar date, "YYYY-MM-DD". */
  date: string;
  /** Lessons completed plus module quizzes passed on that day. */
  count: number;
}

/** "YYYY-MM-DD" for a moment, in the viewer's local time zone. */
export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Completions per local day for the last `days` days, oldest first, ending today. A lesson counts
 * once, on the day it was first completed; a quiz counts once, on the day it was first passed.
 * Failed quiz attempts and replays don't count.
 */
export function dailyActivity(snapshot: ProgressSnapshot, now: Date, days = 14): ActivityDay[] {
  const window: ActivityDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    window.push({ date: localDateKey(day), count: 0 });
  }
  const byDate = new Map(window.map((d) => [d.date, d]));

  const stamps = [
    ...Object.values(snapshot.lessons).map((l) => l.completedAt),
    ...Object.values(snapshot.quizzes).flatMap((q) => (q.passedAt ? [q.passedAt] : [])),
  ];
  for (const stamp of stamps) {
    const at = new Date(stamp);
    if (Number.isNaN(at.getTime())) continue;
    const day = byDate.get(localDateKey(at));
    if (day) day.count += 1;
  }
  return window;
}

export interface LearnerStats {
  totalXp: number;
  /** Regular lessons completed (quizzes are counted as modules). */
  lessonsCompleted: number;
  modulesCompleted: number;
  /** Courses with every module complete (shown on the learner's league card). */
  coursesCompleted: number;
}

/** Totals across the given courses. Progress for lessons no longer in the content is ignored. */
export function learnerStats(snapshot: ProgressSnapshot, courses: readonly CourseOutline[]): LearnerStats {
  let lessonsCompleted = 0;
  let modulesCompleted = 0;
  let coursesCompleted = 0;
  for (const course of courses) {
    const state = computeCourseState(snapshot, course);
    modulesCompleted += state.completedModules;
    if (course.modules.length > 0 && state.completedModules === course.modules.length) coursesCompleted++;
    for (const mod of state.modules) {
      lessonsCompleted += mod.lessons.filter((l) => l.lesson.kind === "lesson" && l.status === "completed").length;
    }
  }
  return { totalXp: snapshot.totalXp, lessonsCompleted, modulesCompleted, coursesCompleted };
}
