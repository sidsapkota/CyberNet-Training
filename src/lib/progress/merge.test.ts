import { describe, expect, it } from "vitest";
import type { Lesson } from "@/lib/content/schema";
import { binaryToggle, explainer, hotspot, multipleChoice } from "@/test/fixtures";
import { buildContentIndex, canCompleteLesson, cardXpFor, gradeQuizAttempt } from "./authority";
import { mergeLedger, mergeProgress, recomputeXp } from "./merge";
import { computeStreak } from "./streak";
import { cardKey, defaultPreferences, emptySnapshot, type ProgressSnapshot, type QuizAttempt, type XpEvent } from "./types";

// A tiny course: lesson l1 (explainer, core MC, challenge MC) and quiz q1 (two MCs, pass 0.5).
const lessons: Lesson[] = [
  {
    id: "l1",
    kind: "lesson",
    title: "L1",
    order: 1,
    courseId: "c",
    moduleId: "m",
    access: "free",
    cards: [
      explainer({ id: "intro" }),
      multipleChoice({ id: "core-q" }),
      multipleChoice({ id: "bonus-q", difficulty: "challenge" }),
    ],
  },
  {
    id: "q1",
    kind: "quiz",
    title: "Q1",
    order: 99,
    passThreshold: 0.5,
    courseId: "c",
    moduleId: "m",
    access: "free",
    cards: [multipleChoice({ id: "a" }), binaryToggle({ id: "b", target: 5 })],
  },
  {
    // Two challenge cards: replaying both (10 practice XP each) meets a 20 XP goal.
    id: "l2",
    kind: "lesson",
    title: "L2",
    order: 2,
    courseId: "c",
    moduleId: "m",
    access: "free",
    cards: [multipleChoice({ id: "p1", difficulty: "challenge" }), multipleChoice({ id: "p2", difficulty: "challenge" })],
  },
];
const index = buildContentIndex(lessons);

const T = (minute: number) => new Date(Date.UTC(2026, 8, 1, 10, minute)).toISOString();
const attempt = (minute: number, passed: boolean, score = passed ? 1 : 0, xp = 0): QuizAttempt => ({
  at: T(minute),
  score,
  passed,
  xp,
  answers: [],
});

function snapshot(over: Partial<ProgressSnapshot> = {}): ProgressSnapshot {
  return { ...emptySnapshot(), ...over };
}

describe("cardXpFor (server XP rules)", () => {
  it("pays explore cards the small explore XP, whatever the client claims, and explainers nothing", () => {
    const look = hotspot({ id: "look", mode: "explore", targets: undefined, parts: [{ part: "cpu", job: "a" }, { part: "ram", job: "b" }] });
    const withExplore = buildContentIndex([{ ...lessons[0]!, cards: [look, ...lessons[0]!.cards] } as Lesson]);
    expect(cardXpFor(withExplore, "l1", "look", 9999)).toBe(5);
    expect(cardXpFor(withExplore, "l1", "look", 0)).toBe(5);
    expect(cardXpFor(withExplore, "l1", "intro", 10)).toBe(0);
  });

  it("awards first-try or retry XP from the card's difficulty, never the client's number", () => {
    expect(cardXpFor(index, "l1", "core-q", 10)).toBe(10);
    expect(cardXpFor(index, "l1", "core-q", 5)).toBe(5);
    expect(cardXpFor(index, "l1", "core-q", 9999)).toBe(10); // tampered: capped at first-try
    expect(cardXpFor(index, "l1", "bonus-q", 20)).toBe(20);
    expect(cardXpFor(index, "l1", "bonus-q", 1)).toBe(10);
    expect(cardXpFor(index, "l1", "core-q", Number.NaN)).toBe(5);
  });

  it("gives explainers no XP and rejects unknown cards", () => {
    expect(cardXpFor(index, "l1", "intro", 10)).toBe(0);
    expect(cardXpFor(index, "l1", "nope", 10)).toBeNull();
    expect(cardXpFor(index, "nope", "core-q", 10)).toBeNull();
  });
});

describe("canCompleteLesson", () => {
  it("needs every core card recorded; challenges are optional", () => {
    expect(canCompleteLesson(index, "l1", ["intro"])).toBe(false);
    expect(canCompleteLesson(index, "l1", ["intro", "core-q"])).toBe(true);
    expect(canCompleteLesson(index, "q1", ["a", "b"])).toBe(false); // quizzes aren't lessons
  });
});

describe("gradeQuizAttempt (server re-grading)", () => {
  it("scores from the raw answers and ignores anything the client claims", () => {
    const graded = gradeQuizAttempt(
      index,
      "q1",
      [
        { cardId: "a", answer: "two" },
        { cardId: "b", answer: [false, false, false, false, false, true, false, true] },
      ],
      T(0),
      false,
    );
    expect(graded).toMatchObject({ score: 1, passed: true, xp: 50 });
    expect(graded?.answers.map((a) => a.correct)).toEqual([true, true]);
  });

  it("treats malformed and missing answers as wrong, and pays pass XP only once", () => {
    const graded = gradeQuizAttempt(index, "q1", [{ cardId: "a", answer: "two" }, { cardId: "b", answer: { hack: 1 } }], T(0), true);
    expect(graded).toMatchObject({ score: 0.5, passed: true, xp: 0 });
    expect(gradeQuizAttempt(index, "q1", [], T(0), false)).toMatchObject({ score: 0, passed: false, xp: 0 });
    expect(gradeQuizAttempt(index, "l1", [], T(0), false)).toBeNull();
  });
});

describe("mergeProgress", () => {
  const coreKey = cardKey("l1", "core-q");
  const introKey = cardKey("l1", "intro");

  it("takes the union of cards and lessons, keeping the earliest completedAt", () => {
    const account = snapshot({
      cards: { [coreKey]: { completedAt: T(30), xp: 10 } },
      lessons: { l1: { completedAt: T(40), xp: 20 } },
    });
    const local = snapshot({
      cards: { [coreKey]: { completedAt: T(5), xp: 5 }, [introKey]: { completedAt: T(1), xp: 0 } },
      lessons: { l1: { completedAt: T(10), xp: 20 } },
    });
    const merged = mergeProgress(account, local, index);
    expect(merged.cards[coreKey]).toEqual({ completedAt: T(5), xp: 5 }); // earliest record, its own XP
    expect(merged.cards[introKey]).toEqual({ completedAt: T(1), xp: 0 });
    expect(merged.lessons.l1).toEqual({ completedAt: T(10), xp: 20 });
    expect(merged.totalXp).toBe(5 + 0 + 20);
  });

  it("recalculates XP instead of adding both sides up", () => {
    const both = snapshot({
      cards: { [coreKey]: { completedAt: T(1), xp: 10 } },
      lessons: { l1: { completedAt: T(2), xp: 20 } },
      quizzes: { q1: { attempts: [attempt(3, true, 1, 50)], bestScore: 1, passedAt: T(3) } },
    });
    const merged = mergeProgress(both, both, index);
    expect(merged.totalXp).toBe(10 + 20 + 50);
  });

  it("fixes tampered local XP to the content rules", () => {
    const local = snapshot({
      cards: { [coreKey]: { completedAt: T(1), xp: 9000 } },
      lessons: { l1: { completedAt: T(2), xp: 9000 } },
      quizzes: { q1: { attempts: [attempt(3, true, 1, 9000), attempt(4, true, 1, 9000)], bestScore: 1, passedAt: T(3) } },
    });
    expect(mergeProgress(snapshot(), local, index).totalXp).toBe(10 + 20 + 50);
  });

  it("merges quiz attempts: union, best score, earliest pass, XP for the first pass only", () => {
    const account = snapshot({
      quizzes: { q1: { attempts: [attempt(20, false, 0.4), attempt(30, true, 0.6, 50)], bestScore: 0.6, passedAt: T(30) } },
    });
    const local = snapshot({
      quizzes: { q1: { attempts: [attempt(10, true, 1, 50), attempt(20, false, 0.4)], bestScore: 1, passedAt: T(10) } },
    });
    const q = mergeProgress(account, local, index).quizzes.q1!;
    expect(q.attempts.map((a) => a.at)).toEqual([T(10), T(20), T(30)]); // duplicate at T(20) dropped
    expect(q.bestScore).toBe(1);
    expect(q.passedAt).toBe(T(10));
    expect(q.attempts.map((a) => a.xp)).toEqual([50, 0, 0]);
  });

  it("treats the same attempt time in different ISO formats as one attempt", () => {
    const account = snapshot({
      quizzes: { q1: { attempts: [{ ...attempt(5, true, 1, 50), at: "2026-09-01T10:05:00+00:00" }], bestScore: 1, passedAt: T(5) } },
    });
    const local = snapshot({ quizzes: { q1: { attempts: [attempt(5, true, 1, 50)], bestScore: 1, passedAt: T(5) } } });
    expect(mergeProgress(account, local, index).quizzes.q1?.attempts).toHaveLength(1);
  });

  it("drops lessons, cards and quizzes that no longer exist in the content", () => {
    const local = snapshot({
      cards: { [cardKey("gone", "x")]: { completedAt: T(1), xp: 10 }, [cardKey("l1", "gone")]: { completedAt: T(1), xp: 10 } },
      lessons: { gone: { completedAt: T(1), xp: 20 }, q1: { completedAt: T(1), xp: 20 } },
      quizzes: { gone: { attempts: [attempt(1, true)], bestScore: 1, passedAt: T(1) } },
    });
    const merged = mergeProgress(snapshot(), local, index);
    expect(merged.cards).toEqual({});
    expect(merged.lessons).toEqual({});
    expect(merged.quizzes).toEqual({});
    expect(merged.totalXp).toBe(0);
  });

  it("keeps the guest's Explore choice, otherwise the account's", () => {
    const explore = snapshot({ preferences: { ...defaultPreferences(), mode: "explore", sound: true, coachSeen: [] } });
    expect(mergeProgress(snapshot(), explore, index).preferences.mode).toBe("explore");
    expect(mergeProgress(explore, snapshot(), index).preferences.mode).toBe("explore");
    expect(mergeProgress(snapshot(), snapshot(), index).preferences.mode).toBe("path");
  });

  it("keeps the guest's sound-off choice, otherwise the account's", () => {
    const quiet = snapshot({ preferences: { ...defaultPreferences(), mode: "path", sound: false, coachSeen: [] } });
    expect(mergeProgress(snapshot(), quiet, index).preferences.sound).toBe(false);
    expect(mergeProgress(quiet, snapshot(), index).preferences.sound).toBe(false);
    expect(mergeProgress(snapshot(), snapshot(), index).preferences.sound).toBe(true);
  });

  it("keeps every how-to-play panel seen on either side, once, dropping unknown keys", () => {
    const account = snapshot({ preferences: { ...defaultPreferences(), mode: "path", sound: true, coachSeen: ["sort_bins", "terminal"] } });
    const local = snapshot({ preferences: { ...defaultPreferences(), mode: "path", sound: true, coachSeen: ["terminal", "hotspot-tap", "not-a-key"] } });
    expect(mergeProgress(account, local, index).preferences.coachSeen).toEqual(["sort_bins", "terminal", "hotspot-tap"]);
  });

  it("is idempotent: signing in again with the same local progress changes nothing", () => {
    const account = snapshot({ cards: { [coreKey]: { completedAt: T(30), xp: 10 } } });
    const local = snapshot({
      cards: { [coreKey]: { completedAt: T(5), xp: 10 } },
      lessons: { l1: { completedAt: T(6), xp: 20 } },
      quizzes: { q1: { attempts: [attempt(7, true, 1, 50)], bestScore: 1, passedAt: T(7) } },
    });
    const once = mergeProgress(account, local, index);
    expect(mergeProgress(once, local, index)).toEqual(once);
    expect(mergeProgress(once, snapshot(), index)).toEqual(once); // later sign-in, nothing local
  });

  it("handles guest play between sign-ins", () => {
    const first = mergeProgress(snapshot(), snapshot({ cards: { [introKey]: { completedAt: T(1), xp: 0 } } }), index);
    const second = mergeProgress(first, snapshot({ cards: { [coreKey]: { completedAt: T(50), xp: 10 } } }), index);
    expect(Object.keys(second.cards).sort()).toEqual([coreKey, introKey].sort());
    expect(second.totalXp).toBe(10);
  });
});

describe("recomputeXp", () => {
  it("leaves already-correct progress unchanged", () => {
    const good = recomputeXp(
      snapshot({
        cards: { [cardKey("l1", "core-q")]: { completedAt: T(1), xp: 10 } },
        lessons: { l1: { completedAt: T(2), xp: 20 } },
      }),
      index,
    );
    expect(recomputeXp(good, index)).toEqual(good);
    expect(good.totalXp).toBe(30);
  });
});

describe("mergeLedger (daily goals and streaks)", () => {
  const SYD = "Australia/Sydney";
  const NOW = new Date("2026-10-10T08:00:00Z"); // 19:00 on 10 Oct in Sydney
  const ev = (day: string, hourUtc: number, over: Partial<XpEvent> = {}): XpEvent => ({
    // The previous day's evening in UTC is the morning of `day` in Sydney (+11).
    at: new Date(Date.UTC(2026, 9, Number(day.slice(8)) - 1, hourUtc)).toISOString(),
    day,
    tz: SYD,
    kind: "card",
    lessonId: "l1",
    cardId: "core-q",
    xp: 10,
    ...over,
  });
  const goal = (goalXp: 20 | 50 | 100 = 20) => ({ tz: SYD, goal: goalXp, metAt: "2026-10-01T00:00:00.000Z" });
  const none = new Set<string>();

  it("re-prices guest events from the content, never trusting their XP", () => {
    const local = { xpEvents: [ev("2026-10-09", 20, { xp: 50 }), ev("2026-10-09", 21, { kind: "practice", xp: 50 })], goalDays: {} };
    const { newEvents } = mergeLedger({ xpEvents: [], goalDays: {} }, local, index, none, NOW);
    expect(newEvents.map((e) => [e.kind, e.xp])).toEqual([["card", 10], ["practice", 5]]);
  });

  it("drops unknown lessons, explainer practice, quiz events without a pass, and bad dates", () => {
    const local = {
      xpEvents: [
        ev("2026-10-09", 20, { lessonId: "gone" }),
        ev("2026-10-09", 20, { kind: "practice", cardId: "intro" }),
        ev("2026-10-09", 20, { kind: "quiz", lessonId: "q1", cardId: undefined, xp: 50 }),
        ev("2026-10-07", 20, { at: "2026-10-08T20:00:00.000Z" }), // backdated: its time is 9 Oct in Sydney
        ev("2026-10-11", 20, { at: "2026-10-11T00:00:00.000Z" }), // in the future
      ],
      goalDays: {},
    };
    expect(mergeLedger({ xpEvents: [], goalDays: {} }, local, index, none, NOW).newEvents).toEqual([]);
    const passed = mergeLedger({ xpEvents: [], goalDays: {} }, { xpEvents: [local.xpEvents[2]!], goalDays: {} }, index, new Set(["q1"]), NOW);
    expect(passed.newEvents.map((e) => e.xp)).toEqual([50]);
  });

  it("unions met days, accepting a guest day only if its merged XP reaches the goal", () => {
    const account = { xpEvents: [ev("2026-10-08", 20)], goalDays: { "2026-10-08": goal(20) } };
    const local = {
      xpEvents: [ev("2026-10-09", 20), ev("2026-10-09", 21, { cardId: "bonus-q", xp: 20 })],
      goalDays: { "2026-10-09": goal(20), "2026-10-07": goal(20) }, // 7 Oct has no XP behind it
    };
    const { ledger, newGoalDays } = mergeLedger(account, local, index, none, NOW);
    expect(Object.keys(ledger.goalDays).sort()).toEqual(["2026-10-08", "2026-10-09"]);
    expect(newGoalDays.map(([d]) => d)).toEqual(["2026-10-09"]);
  });

  it("keeps the longer streak: the union is at least as long as either side", () => {
    const days = (from: number, to: number) =>
      Object.fromEntries(Array.from({ length: to - from + 1 }, (_, i) => [`2026-10-0${from + i}`, goal(20)]));
    const events = (from: number, to: number) =>
      Array.from({ length: to - from + 1 }, (_, i) =>
        ["p1", "p2"].map((cardId) => ev(`2026-10-0${from + i}`, 20, { kind: "practice", lessonId: "l2", cardId, xp: 10 })),
      ).flat();
    const account = { xpEvents: events(1, 3), goalDays: days(1, 3) }; // 3-day run, ended
    const local = { xpEvents: events(4, 9), goalDays: days(4, 9) }; // 6-day run up to yesterday
    const { ledger } = mergeLedger(account, local, index, none, NOW);
    const today = { day: "2026-10-10", tz: SYD };
    expect(computeStreak(ledger.goalDays, today).current).toBe(9);
    expect(computeStreak(ledger.goalDays, today).current).toBeGreaterThanOrEqual(computeStreak(local.goalDays, today).current);
  });

  it("is idempotent, and counts practice once per card per day across both sides", () => {
    const practice = ev("2026-10-09", 20, { kind: "practice" });
    const account = { xpEvents: [{ ...practice, at: new Date(Date.parse(practice.at) + 60_000).toISOString(), xp: 5 }], goalDays: {} };
    const local = { xpEvents: [practice, ev("2026-10-09", 22)], goalDays: {} };
    const once = mergeLedger(account, local, index, none, NOW);
    expect(once.newEvents.map((e) => e.kind)).toEqual(["card"]);
    const twice = mergeLedger(once.ledger, local, index, none, NOW);
    expect(twice.newEvents).toEqual([]);
    expect(twice.ledger).toEqual(once.ledger);
  });

  it("counts a card's first-time XP once ever, even if claimed on several days or on both sides", () => {
    const account = { xpEvents: [ev("2026-10-08", 20)], goalDays: {} };
    const local = { xpEvents: [ev("2026-10-09", 20), ev("2026-10-09", 21, { cardId: "bonus-q", xp: 20 }), ev("2026-10-10", 1, { cardId: "bonus-q", xp: 20 })], goalDays: {} };
    const { newEvents } = mergeLedger(account, local, index, none, NOW);
    expect(newEvents.map((e) => [e.day, e.cardId])).toEqual([["2026-10-09", "bonus-q"]]);
  });

  it("merges through mergeProgress too, with the guest's chosen goal winning", () => {
    const local = snapshot({
      preferences: { ...defaultPreferences(), dailyGoal: 100, dailyGoalChosen: true },
      xpEvents: [ev("2026-10-09", 20)],
    });
    const merged = mergeProgress(snapshot(), local, index, NOW);
    expect(merged.xpEvents).toHaveLength(1);
    expect(merged.preferences).toMatchObject({ dailyGoal: 100, dailyGoalChosen: true });
    expect(merged.totalXp).toBe(0); // the ledger never adds to total XP
    expect(mergeProgress(snapshot({ preferences: { ...defaultPreferences(), dailyGoal: 20, dailyGoalChosen: true } }), snapshot(), index, NOW).preferences.dailyGoal).toBe(20);
  });
});
