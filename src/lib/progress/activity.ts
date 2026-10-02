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
  /** XP earned that day: cards, lessons, quizzes and practice (the same ledger as the daily goal and streak). */
  xp: number;
}

/** "YYYY-MM-DD" for a moment, in the viewer's local time zone. */
export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * XP per day for the last `days` days, oldest first, ending today, from the XP ledger
 * (`snapshot.xpEvents`): the same record the daily goal and streak use, so a day with a met goal
 * always has a bar. Each event counts on the day it was dated with when it happened.
 */
export function dailyActivity(snapshot: ProgressSnapshot, now: Date, days = 14): ActivityDay[] {
  const window: ActivityDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    window.push({ date: localDateKey(day), xp: 0 });
  }
  const byDate = new Map(window.map((d) => [d.date, d]));
  for (const event of snapshot.xpEvents) {
    const day = byDate.get(event.day);
    if (day && event.xp > 0) day.xp += event.xp;
  }
  return window;
}

export interface LearnerStats {
  totalXp: number;
  /** Regular lessons finished (counted apart from quizzes). */
  lessonsCompleted: number;
  /** Quizzes passed (module quizzes and course finals). */
  quizzesPassed: number;
  modulesCompleted: number;
  /** Courses with every module complete (shown on the learner's league card). */
  coursesCompleted: number;
}

/** Totals across the given courses. Progress for lessons no longer in the content is ignored. */
export function learnerStats(snapshot: ProgressSnapshot, courses: readonly CourseOutline[]): LearnerStats {
  let lessonsCompleted = 0;
  let quizzesPassed = 0;
  let modulesCompleted = 0;
  let coursesCompleted = 0;
  for (const course of courses) {
    const state = computeCourseState(snapshot, course);
    modulesCompleted += state.completedModules;
    if (course.modules.length > 0 && state.completedModules === course.modules.length) coursesCompleted++;
    for (const mod of state.modules) {
      lessonsCompleted += mod.lessons.filter((l) => l.lesson.kind === "lesson" && l.status === "completed").length;
      quizzesPassed += mod.lessons.filter((l) => l.lesson.kind === "quiz" && l.status === "completed").length;
    }
  }
  return { totalXp: snapshot.totalXp, lessonsCompleted, quizzesPassed, modulesCompleted, coursesCompleted };
}
