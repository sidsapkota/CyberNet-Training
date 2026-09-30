import { describe, expect, it } from "vitest";
import { twoModuleCourse } from "@/test/fixtures";
import {
  computeCourseState,
  courseProgress,
  getBlockingLesson,
  getCurrentLesson,
  getNextLesson,
  hasAnyProgress,
  snapshotBefore,
  lessonFinishState,
  resumeIndex,
} from "./state";
import { cardKey, emptySnapshot, type ProgressSnapshot } from "./types";

const done = { completedAt: "2026-01-01", xp: 0 };

function withLessons(...ids: string[]): ProgressSnapshot {
  const snapshot = emptySnapshot();
  for (const id of ids) snapshot.lessons[id] = done;
  return snapshot;
}

function passQuiz(snapshot: ProgressSnapshot, id: string, passed = true) {
  snapshot.quizzes[id] = {
    attempts: [{ at: "t", score: passed ? 1 : 0.5, passed, xp: 0, answers: [] }],
    bestScore: passed ? 1 : 0.5,
    passedAt: passed ? "t" : null,
  };
  return snapshot;
}

function statuses(snapshot: ProgressSnapshot, mode?: "path" | "explore") {
  const state = computeCourseState(snapshot, twoModuleCourse(), mode);
  return state.modules.map((m) => ({
    module: m.status,
    lessons: Object.fromEntries(m.lessons.map((l) => [l.lesson.id, l.status])),
  }));
}

describe("computeCourseState: unlocking", () => {
  it("starts with only the first lesson available", () => {
    expect(statuses(emptySnapshot())).toEqual([
      { module: "available", lessons: { l1: "available", l2: "locked", quiz1: "locked" } },
      { module: "locked", lessons: { l3: "locked", quiz2: "locked" } },
    ]);
  });

  it("unlocks lessons in order within a module", () => {
    expect(statuses(withLessons("l1"))[0]).toEqual({
      module: "in_progress",
      lessons: { l1: "completed", l2: "available", quiz1: "locked" },
    });
  });

  it("unlocks the quiz once every lesson in the module is done", () => {
    expect(statuses(withLessons("l1", "l2"))[0]?.lessons.quiz1).toBe("available");
  });

  it("keeps the next module locked until the quiz is passed", () => {
    const failed = passQuiz(withLessons("l1", "l2"), "quiz1", false);
    const s = statuses(failed);
    expect(s[0]?.lessons.quiz1).toBe("in_progress");
    expect(s[0]?.module).toBe("in_progress");
    expect(s[1]?.module).toBe("locked");
  });

  it("completes the module and unlocks the next one when the quiz is passed", () => {
    const s = statuses(passQuiz(withLessons("l1", "l2"), "quiz1"));
    expect(s[0]?.module).toBe("completed");
    expect(s[1]).toEqual({ module: "available", lessons: { l3: "available", quiz2: "locked" } });
  });

  it("marks a lesson in progress once a core card is done", () => {
    const snapshot = emptySnapshot();
    snapshot.cards[cardKey("l1", "c1")] = done;
    const state = computeCourseState(snapshot, twoModuleCourse());
    expect(state.modules[0]?.lessons[0]).toMatchObject({ status: "in_progress", completedCoreCards: 1 });
  });

  it("reports module progress and best quiz score", () => {
    const state = computeCourseState(passQuiz(withLessons("l1", "l2"), "quiz1", false), twoModuleCourse());
    const m1 = state.modules[0];
    expect(m1?.completedItems).toBe(2);
    expect(m1?.totalItems).toBe(3);
    expect(m1?.progress).toBeCloseTo(2 / 3);
    expect(m1?.lessons[2]?.bestScore).toBe(0.5);
    expect(state.completedModules).toBe(0);
  });
});

describe("computeCourseState: Explore mode", () => {
  it("opens every lesson and quiz, in every module, from the start", () => {
    expect(statuses(emptySnapshot(), "explore")).toEqual([
      { module: "available", lessons: { l1: "available", l2: "available", quiz1: "available" } },
      { module: "available", lessons: { l3: "available", quiz2: "available" } },
    ]);
  });

  it("still records completion and progress normally", () => {
    const snapshot = passQuiz(withLessons("l3"), "quiz2");
    expect(statuses(snapshot, "explore")).toEqual([
      { module: "available", lessons: { l1: "available", l2: "available", quiz1: "available" } },
      { module: "completed", lessons: { l3: "completed", quiz2: "completed" } },
    ]);
    const state = computeCourseState(snapshot, twoModuleCourse(), "explore");
    expect(state.completedModules).toBe(1);
    expect(courseProgress(state)).toEqual({ completed: 2, total: 5, fraction: 0.4 });
  });

  it("uses the learner's saved mode when none is passed", () => {
    const snapshot = emptySnapshot();
    snapshot.preferences.mode = "explore";
    expect(statuses(snapshot)[1]?.lessons.quiz2).toBe("available");
    expect(getBlockingLesson(snapshot, twoModuleCourse(), "quiz2")).toBeNull();
  });

  it("blocks the same item in Path mode", () => {
    expect(getBlockingLesson(emptySnapshot(), twoModuleCourse(), "quiz2", "path")?.id).toBe("l1");
    expect(getBlockingLesson(emptySnapshot(), twoModuleCourse(), "quiz2", "explore")).toBeNull();
  });
});

describe("getCurrentLesson", () => {
  const course = twoModuleCourse();
  const current = (snapshot: ProgressSnapshot, mode: "path" | "explore") =>
    getCurrentLesson(computeCourseState(snapshot, course, mode))?.lesson.id ?? null;

  it("is the next unlocked item in Path mode", () => {
    expect(current(emptySnapshot(), "path")).toBe("l1");
    expect(current(withLessons("l1", "l2"), "path")).toBe("quiz1");
  });

  it("is the first unfinished item in path order in Explore mode, even after skipping ahead", () => {
    expect(current(withLessons("l3"), "explore")).toBe("l1");
    expect(current(withLessons("l1", "l3"), "explore")).toBe("l2");
  });

  it("is null when everything is done", () => {
    const all = passQuiz(passQuiz(withLessons("l1", "l2", "l3"), "quiz1"), "quiz2");
    expect(current(all, "path")).toBeNull();
    expect(courseProgress(computeCourseState(all, course)).fraction).toBe(1);
  });
});

describe("snapshotBefore", () => {
  it("undoes a lesson completion so the path can animate it filling in", () => {
    const after = withLessons("l1", "l2");
    const before = snapshotBefore(after, "l2");
    expect(statuses(before)[0]?.lessons).toEqual({ l1: "completed", l2: "available", quiz1: "locked" });
    expect(statuses(after)[0]?.lessons.quiz1).toBe("available");
    expect(after.lessons.l2).toBeDefined(); // the real snapshot is untouched
  });

  it("undoes a quiz pass, re-locking the next module in Path mode", () => {
    const after = passQuiz(withLessons("l1", "l2"), "quiz1");
    const before = snapshotBefore(after, "quiz1");
    expect(statuses(before)[1]?.module).toBe("locked");
    expect(statuses(after)[1]?.module).toBe("available");
    expect(after.quizzes.quiz1?.passedAt).toBe("t");
  });
});

describe("hasAnyProgress", () => {
  it("is false for a new learner, even with a saved preference", () => {
    const snapshot = emptySnapshot();
    snapshot.preferences.mode = "explore";
    expect(hasAnyProgress(snapshot)).toBe(false);
  });

  it("is true after a single card", () => {
    const snapshot = emptySnapshot();
    snapshot.cards[cardKey("l1", "c1")] = done;
    expect(hasAnyProgress(snapshot)).toBe(true);
  });
});

describe("getNextLesson", () => {
  const course = twoModuleCourse();

  it("goes to the next lesson, then the quiz, then the next module", () => {
    expect(getNextLesson(course, "l1")?.id).toBe("l2");
    expect(getNextLesson(course, "l2")?.id).toBe("quiz1");
    expect(getNextLesson(course, "quiz1")?.id).toBe("l3");
  });

  it("returns null at the end of the course or for unknown ids", () => {
    expect(getNextLesson(course, "quiz2")).toBeNull();
    expect(getNextLesson(course, "nope")).toBeNull();
  });
});

describe("getBlockingLesson", () => {
  const course = twoModuleCourse();

  it("returns null for unlocked items", () => {
    expect(getBlockingLesson(emptySnapshot(), course, "l1")).toBeNull();
  });

  it("points at the earliest unfinished item", () => {
    expect(getBlockingLesson(emptySnapshot(), course, "quiz1")?.id).toBe("l1");
    expect(getBlockingLesson(withLessons("l1"), course, "l3")?.id).toBe("l2");
    expect(getBlockingLesson(withLessons("l1", "l2"), course, "l3")?.id).toBe("quiz1");
  });
});

describe("resumeIndex", () => {
  const cards = [
    { id: "intro", difficulty: "core" as const },
    { id: "q1", difficulty: "core" as const },
    { id: "bonus", difficulty: "challenge" as const },
    { id: "q2", difficulty: "core" as const },
    { id: "bonus2", difficulty: "challenge" as const },
  ];

  const completing = (...ids: string[]) => {
    const snapshot = emptySnapshot();
    for (const id of ids) snapshot.cards[cardKey("l", id)] = done;
    return snapshot;
  };

  it("starts at the beginning for a fresh lesson", () => {
    expect(resumeIndex(emptySnapshot(), "l", cards)).toBe(0);
  });

  it("resumes at the first incomplete core card, skipping skipped challenges", () => {
    expect(resumeIndex(completing("intro"), "l", cards)).toBe(1);
    expect(resumeIndex(completing("intro", "q1"), "l", cards)).toBe(3);
  });

  it("resumes at a trailing challenge when every core card is done", () => {
    expect(resumeIndex(completing("intro", "q1", "q2"), "l", cards)).toBe(4);
  });

  it("resumes at the last card when every card is done but the lesson never finished", () => {
    expect(resumeIndex(completing("intro", "q1", "bonus", "q2", "bonus2"), "l", cards)).toBe(4);
  });

  it("starts over when replaying a completed lesson", () => {
    const snapshot = completing("intro", "q1");
    snapshot.lessons.l = done;
    expect(resumeIndex(snapshot, "l", cards)).toBe(0);
  });
});

describe("lessonFinishState", () => {
  // Every new lesson ends with a recap explainer, which is marked complete by the same Continue
  // press that finishes the lesson.
  const cards = [
    { id: "hook", difficulty: "core" as const },
    { id: "q1", difficulty: "core" as const },
    { id: "bonus", difficulty: "challenge" as const },
    { id: "recap", difficulty: "core" as const },
  ];
  const doneSet = (...ids: string[]) => (c: { id: string }) => ids.includes(c.id);

  it("finishes a lesson ending on an explainer when the recap is counted as just completed", () => {
    const justCompleted = "recap";
    const done = doneSet("hook", "q1");
    expect(lessonFinishState(cards, (c) => c.id === justCompleted || done(c))).toEqual({
      missingCore: -1,
      challengesCompleted: 0,
    });
  });

  it("points back at the recap if it isn't counted (the old double-Continue bug)", () => {
    expect(lessonFinishState(cards, doneSet("hook", "q1")).missingCore).toBe(3);
  });

  it("reports the first unfinished core card and counts completed challenges", () => {
    expect(lessonFinishState(cards, doneSet("hook", "bonus", "recap"))).toEqual({
      missingCore: 1,
      challengesCompleted: 1,
    });
  });

  it("doesn't require skipped challenges", () => {
    expect(lessonFinishState(cards, doneSet("hook", "q1", "recap")).missingCore).toBe(-1);
  });
});
