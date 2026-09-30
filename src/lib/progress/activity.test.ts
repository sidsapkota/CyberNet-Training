import { describe, expect, it } from "vitest";
import { twoModuleCourse } from "@/test/fixtures";
import { dailyActivity, learnerStats, localDateKey } from "./activity";
import { emptySnapshot, type ProgressSnapshot } from "./types";

// Dates are built in local time so the tests pass in any time zone.
const at = (month: number, day: number, hour = 12, minute = 0) =>
  new Date(2026, month - 1, day, hour, minute).toISOString();
const now = new Date(2026, 8, 30, 9, 0); // 30 Sep 2026, 09:00 local

function snapshotWith(lessons: Record<string, string>, quizzes: Record<string, (string | null)[]> = {}) {
  const snapshot: ProgressSnapshot = emptySnapshot();
  for (const [id, completedAt] of Object.entries(lessons)) snapshot.lessons[id] = { completedAt, xp: 20 };
  for (const [id, attempts] of Object.entries(quizzes)) {
    const passedAt = attempts.find((a) => a !== null) ?? null;
    snapshot.quizzes[id] = {
      attempts: attempts.map((a) => ({ at: a ?? at(9, 1), score: a ? 1 : 0.4, passed: a !== null, xp: 0, answers: [] })),
      bestScore: passedAt ? 1 : 0.4,
      passedAt,
    };
  }
  return snapshot;
}

describe("dailyActivity", () => {
  it("returns 14 local days, oldest first, ending today", () => {
    const days = dailyActivity(emptySnapshot(), now);
    expect(days).toHaveLength(14);
    expect(days[0]?.date).toBe("2026-09-17");
    expect(days.at(-1)?.date).toBe("2026-09-30");
    expect(days.every((d) => d.count === 0)).toBe(true);
  });

  it("counts lessons on the local day they were completed, including late at night", () => {
    const days = dailyActivity(
      snapshotWith({ a: at(9, 29, 23, 59), b: at(9, 29, 8), c: at(9, 30, 0, 1) }),
      now,
    );
    expect(days.find((d) => d.date === "2026-09-29")?.count).toBe(2);
    expect(days.find((d) => d.date === "2026-09-30")?.count).toBe(1);
  });

  it("counts a quiz once, on the day it was first passed, ignoring failed attempts", () => {
    const days = dailyActivity(snapshotWith({}, { q: [null, at(9, 25), at(9, 28)] }), now);
    expect(days.find((d) => d.date === "2026-09-25")?.count).toBe(1);
    expect(days.find((d) => d.date === "2026-09-28")?.count).toBe(0);
    expect(days.reduce((sum, d) => sum + d.count, 0)).toBe(1);
  });

  it("ignores completions outside the window and unreadable dates", () => {
    const days = dailyActivity(snapshotWith({ old: at(9, 16, 23), future: at(10, 1), bad: "not a date" }), now);
    expect(days.reduce((sum, d) => sum + d.count, 0)).toBe(0);
  });

  it("supports other window sizes", () => {
    expect(dailyActivity(emptySnapshot(), now, 7)[0]?.date).toBe("2026-09-24");
  });

  it("formats local date keys with zero padding", () => {
    expect(localDateKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("learnerStats", () => {
  it("counts regular lessons and passed modules only, from real progress", () => {
    const snapshot = snapshotWith({ l1: at(9, 1), l2: at(9, 2), removed: at(9, 3) }, { quiz1: [at(9, 4)] });
    snapshot.totalXp = 170;
    expect(learnerStats(snapshot, [twoModuleCourse()])).toEqual({
      totalXp: 170,
      lessonsCompleted: 2,
      modulesCompleted: 1,
    });
  });

  it("is all zeros for a new learner", () => {
    expect(learnerStats(emptySnapshot(), [twoModuleCourse()])).toEqual({
      totalXp: 0,
      lessonsCompleted: 0,
      modulesCompleted: 0,
    });
  });
});
