import { describe, expect, it } from "vitest";
import { twoModuleCourse } from "@/test/fixtures";
import { dailyActivity, learnerStats, localDateKey } from "./activity";
import { computeCourseState, courseProgress, progressCounts, progressPercent, UNFINISHED_MAX } from "./state";
import { cardKey, emptySnapshot, type ProgressSnapshot, type XpEvent } from "./types";

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

describe("dailyActivity: XP per day, from the same ledger as the streak", () => {
  const event = (day: string, xp: number, kind: XpEvent["kind"] = "card"): XpEvent => ({ at: `${day}T02:00:00.000Z`, day, tz: "Australia/Sydney", kind, lessonId: "l1", xp });

  it("returns 14 local days, oldest first, ending today", () => {
    const days = dailyActivity(emptySnapshot(), now);
    expect(days).toHaveLength(14);
    expect(days[0]?.date).toBe("2026-09-17");
    expect(days.at(-1)?.date).toBe("2026-09-30");
    expect(days.every((d) => d.xp === 0)).toBe(true);
  });

  it("adds up every XP event on its own day: cards, lessons, quizzes and practice", () => {
    const snapshot = emptySnapshot();
    snapshot.xpEvents = [event("2026-09-29", 10), event("2026-09-29", 20, "lesson"), event("2026-09-30", 5, "practice"), event("2026-09-30", 50, "quiz")];
    const days = dailyActivity(snapshot, now);
    expect(days.find((d) => d.date === "2026-09-29")?.xp).toBe(30);
    expect(days.find((d) => d.date === "2026-09-30")?.xp).toBe(55);
  });

  it("shows cards done with no lesson finished (the bars match the XP and streak)", () => {
    const snapshot = snapshotWith({});
    snapshot.xpEvents = [event("2026-09-30", 10), event("2026-09-30", 10), event("2026-09-30", 5)];
    expect(Object.keys(snapshot.lessons)).toHaveLength(0);
    expect(dailyActivity(snapshot, now).at(-1)?.xp).toBe(25);
  });

  it("ignores events outside the window and zero-XP events", () => {
    const snapshot = emptySnapshot();
    snapshot.xpEvents = [event("2026-09-16", 10), event("2026-10-01", 10), event("2026-09-20", 0)];
    expect(dailyActivity(snapshot, now).reduce((sum, d) => sum + d.xp, 0)).toBe(0);
  });

  it("supports other window sizes", () => {
    expect(dailyActivity(emptySnapshot(), now, 7)[0]?.date).toBe("2026-09-24");
  });

  it("formats local date keys with zero padding", () => {
    expect(localDateKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("courseProgress: rings move with every card, 100% only when finished", () => {
  // twoModuleCourse: lessons l1, l2, l3 with core cards c1, c2 each, and quiz1, quiz2 with 2 questions each: 10 cards.
  const progress = (snapshot: ProgressSnapshot) => courseProgress(computeCourseState(snapshot, twoModuleCourse(), "explore"));
  const withCards = (snapshot: ProgressSnapshot, ...keys: [string, string][]) => {
    for (const [lesson, card] of keys) snapshot.cards[cardKey(lesson, card)] = { completedAt: at(9, 29), xp: 10 };
    return snapshot;
  };

  it("starts at 0", () => {
    expect(progress(emptySnapshot())).toMatchObject({ cardsDone: 0, cardsTotal: 10, fraction: 0, lessonsFinished: 0, quizzesPassed: 0 });
  });

  it("moves with one card, before any lesson is finished", () => {
    const p = progress(withCards(emptySnapshot(), ["l1", "c1"]));
    expect(p).toMatchObject({ cardsDone: 1, fraction: 0.1, lessonsFinished: 0, lessonsTotal: 3, quizzesPassed: 0, quizzesTotal: 2 });
    expect(progressPercent(p.fraction)).toBe(10);
    expect(progressCounts(p)).toBe("0/3 lessons · 0/2 quizzes");
  });

  it("never shows 100% until every lesson is finished, even with every card done", () => {
    const snapshot = withCards(snapshotWith({ l1: at(9, 1), l2: at(9, 2) }, { quiz1: [at(9, 3)], quiz2: [at(9, 4)] }), ["l3", "c1"], ["l3", "c2"]);
    const p = progress(snapshot);
    expect(p.cardsDone).toBe(10);
    expect(p.lessonsFinished).toBe(2);
    expect(p.fraction).toBe(UNFINISHED_MAX);
    expect(progressPercent(p.fraction)).toBe(99);
  });

  it("is 100% once every lesson is finished and every quiz passed", () => {
    const p = progress(snapshotWith({ l1: at(9, 1), l2: at(9, 2), l3: at(9, 3) }, { quiz1: [at(9, 4)], quiz2: [at(9, 5)] }));
    expect(p).toMatchObject({ fraction: 1, cardsDone: 10, lessonsFinished: 3, quizzesPassed: 2, completed: 5, total: 5 });
    expect(progressPercent(p.fraction)).toBe(100);
  });

  it("counts a quiz only once it's passed (failed attempts add nothing)", () => {
    expect(progress(snapshotWith({}, { quiz1: [null] })).cardsDone).toBe(0);
    expect(progress(snapshotWith({}, { quiz1: [at(9, 4)] })).cardsDone).toBe(2);
  });

  it("rounds near-finished progress to 99, never up to 100", () => {
    expect(progressPercent(0.996)).toBe(99);
    expect(progressPercent(0.004)).toBe(0);
  });
});

describe("learnerStats", () => {
  it("counts finished lessons and passed quizzes apart, from real progress", () => {
    const snapshot = snapshotWith({ l1: at(9, 1), l2: at(9, 2), removed: at(9, 3) }, { quiz1: [at(9, 4)] });
    snapshot.totalXp = 170;
    expect(learnerStats(snapshot, [twoModuleCourse()])).toEqual({
      totalXp: 170,
      lessonsCompleted: 2,
      quizzesPassed: 1,
      modulesCompleted: 1,
      coursesCompleted: 0,
    });
  });

  it("counts a course once every module in it is complete", () => {
    const snapshot = snapshotWith({ l1: at(9, 1), l2: at(9, 2), l3: at(9, 3) }, { quiz1: [at(9, 4)], quiz2: [at(9, 5)] });
    expect(learnerStats(snapshot, [twoModuleCourse()]).coursesCompleted).toBe(1);
  });

  it("is all zeros for a new learner", () => {
    expect(learnerStats(emptySnapshot(), [twoModuleCourse()])).toEqual({
      totalXp: 0,
      lessonsCompleted: 0,
      quizzesPassed: 0,
      modulesCompleted: 0,
      coursesCompleted: 0,
    });
  });
});
