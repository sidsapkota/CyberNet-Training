import { beforeEach, describe, expect, it, vi } from "vitest";
import { countsForLeague } from "./daily";
import { LocalStorageProgressStore, PROGRESS_STORAGE_KEY } from "./localStorageProgressStore";
import { MemoryStorage } from "./memoryStorage";
import { cardKey, defaultPreferences, emptySnapshot, type QuizAttempt } from "./types";

const attempt = (over: Partial<QuizAttempt> = {}): QuizAttempt => ({
  at: "2026-01-01T00:00:00.000Z",
  score: 0.6,
  passed: false,
  xp: 0,
  answers: [{ cardId: "q1", answer: "a", correct: true }],
  ...over,
});

describe("LocalStorageProgressStore", () => {
  let storage: MemoryStorage;
  let store: LocalStorageProgressStore;

  beforeEach(() => {
    storage = new MemoryStorage();
    store = new LocalStorageProgressStore(() => storage);
  });

  it("starts empty", async () => {
    expect(await store.getSnapshot()).toEqual(emptySnapshot());
  });

  it("loads progress saved before preferences existed, defaulting to Path mode", async () => {
    const saved = {
      cards: { [cardKey("l1", "c1")]: { completedAt: "2026-01-01T00:00:00.000Z", xp: 10 } },
      lessons: {},
      quizzes: {},
      totalXp: 10,
    };
    storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(saved));
    const snapshot = await store.getSnapshot();
    expect(snapshot.preferences).toEqual(defaultPreferences());
    expect(snapshot.xpEvents).toEqual([]);
    expect(snapshot.goalDays).toEqual({});
    expect(snapshot.cards[cardKey("l1", "c1")]?.xp).toBe(10);
  });

  it("saves the learning mode and keeps it through resets", async () => {
    await store.setPreferences({ mode: "explore" });
    await store.completeCard("l1", "c1", 10);
    expect((await new LocalStorageProgressStore(() => storage).getSnapshot()).preferences.mode).toBe("explore");

    await store.resetLesson("l1");
    expect((await store.getSnapshot()).preferences.mode).toBe("explore");
    await store.resetAll();
    const reset = await store.getSnapshot();
    expect(reset.preferences.mode).toBe("explore");
    expect(reset.cards).toEqual({});
  });

  it("persists across instances (i.e. a page refresh)", async () => {
    await store.completeCard("l1", "c1", 10);
    await store.completeLesson("l1", 20);
    const reloaded = new LocalStorageProgressStore(() => storage);
    const snapshot = await reloaded.getSnapshot();
    expect(snapshot.cards[cardKey("l1", "c1")]?.xp).toBe(10);
    expect(snapshot.lessons.l1?.xp).toBe(20);
    expect(snapshot.totalXp).toBe(30);
  });

  it("is idempotent for cards and lessons", async () => {
    await store.completeCard("l1", "c1", 10);
    await store.completeCard("l1", "c1", 10);
    await store.completeLesson("l1", 20);
    await store.completeLesson("l1", 20);
    expect((await store.getSnapshot()).totalXp).toBe(30);
  });

  it("records quiz attempts, best score and first pass", async () => {
    await store.recordQuizAttempt("q", attempt({ score: 0.6 }));
    await store.recordQuizAttempt("q", attempt({ score: 1, passed: true, xp: 50, at: "pass-1" }));
    await store.recordQuizAttempt("q", attempt({ score: 0.8, passed: true, at: "pass-2" }));
    const quiz = (await store.getSnapshot()).quizzes.q;
    expect(quiz?.attempts).toHaveLength(3);
    expect(quiz?.bestScore).toBe(1);
    expect(quiz?.passedAt).toBe("pass-1");
    expect((await store.getSnapshot()).totalXp).toBe(50);
  });

  it("resets a single lesson without touching others", async () => {
    await store.completeCard("l1", "c1", 10);
    await store.completeCard("l10", "c1", 10);
    await store.completeLesson("l1", 20);
    await store.resetLesson("l1");
    const snapshot = await store.getSnapshot();
    expect(snapshot.cards).toEqual({ [cardKey("l10", "c1")]: expect.any(Object) });
    expect(snapshot.lessons).toEqual({});
    expect(snapshot.totalXp).toBe(10);
  });

  it("resets all progress and its XP, but keeps the streak (met days) and settings", async () => {
    await store.setPreferences({ dailyGoal: 20 });
    await store.completeCard("l1", "c1", 10);
    await store.completeCard("l1", "c2", 10);
    await store.resetAll();
    const after = await store.getSnapshot();
    expect({ cards: after.cards, lessons: after.lessons, quizzes: after.quizzes, totalXp: after.totalXp }).toEqual({
      cards: {},
      lessons: {},
      quizzes: {},
      totalXp: 0,
    });
    expect(after.xpEvents).toHaveLength(0);
    expect(Object.keys(after.goalDays)).toHaveLength(1);
    expect(after.preferences.dailyGoal).toBe(20);
  });

  describe("league XP can't be farmed (reset and replay)", () => {
    // Weekly league XP is the ledger's non-practice XP; it must never exceed total XP.
    const leagueXp = (snap: Awaited<ReturnType<typeof store.getSnapshot>>) => snap.xpEvents.filter(countsForLeague).reduce((sum, e) => sum + e.xp, 0);

    it("resetting everything, then replaying, pays the XP once, not twice", async () => {
      for (let round = 0; round < 3; round++) {
        await store.completeCard("l1", "c1", 10);
        await store.completeCard("l1", "c2", 10);
        const snap = await store.getSnapshot();
        expect(leagueXp(snap)).toBeLessThanOrEqual(snap.totalXp);
        await store.resetAll();
      }
      await store.completeCard("l1", "c1", 10);
      const snap = await store.getSnapshot();
      expect(snap.totalXp).toBe(10);
      expect(leagueXp(snap)).toBe(10);
    });

    it("resetting one lesson clears only that lesson's XP", async () => {
      await store.completeCard("l1", "c1", 10);
      await store.completeCard("l2", "c1", 10);
      await store.resetLesson("l1");
      await store.completeCard("l1", "c1", 10);
      const snap = await store.getSnapshot();
      expect(snap.totalXp).toBe(20);
      expect(leagueXp(snap)).toBe(20);
      expect(snap.xpEvents.filter((e) => e.lessonId === "l2")).toHaveLength(1);
    });

    it("practice never counts toward a league", () => {
      expect(countsForLeague({ kind: "practice" })).toBe(false);
      for (const kind of ["card", "lesson", "quiz"] as const) expect(countsForLeague({ kind })).toBe(true);
    });
  });

  it("notifies subscribers and stops after unsubscribe", async () => {
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    await store.completeCard("l1", "c1", 10);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0].totalXp).toBe(10);
    unsubscribe();
    await store.completeCard("l1", "c2", 10);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("falls back to empty progress for corrupt or invalid data", async () => {
    storage.setItem(PROGRESS_STORAGE_KEY, "{ nope");
    expect(await store.getSnapshot()).toEqual(emptySnapshot());
    storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({ cards: "wrong" }));
    expect(await store.getSnapshot()).toEqual(emptySnapshot());
  });

  it("works (without persisting) when storage is unavailable", async () => {
    const noStorage = new LocalStorageProgressStore(() => null);
    await noStorage.completeCard("l1", "c1", 10);
    expect(await noStorage.getSnapshot()).toEqual(emptySnapshot());
  });

  it("recomputes totalXp rather than trusting the stored value", async () => {
    storage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ ...emptySnapshot(), lessons: { l1: { completedAt: "t", xp: 20 } }, totalXp: 9999 }),
    );
    await store.completeCard("l1", "c1", 5);
    expect((await store.getSnapshot()).totalXp).toBe(25);
  });
});

describe("LocalStorageProgressStore: daily goal and streak", () => {
  let now = new Date("2026-10-10T01:00:00Z"); // 12:00 on 10 Oct in Sydney
  let tz = "Australia/Sydney";
  let store: LocalStorageProgressStore;

  beforeEach(() => {
    now = new Date("2026-10-10T01:00:00Z");
    tz = "Australia/Sydney";
    const storage = new MemoryStorage();
    store = new LocalStorageProgressStore(() => storage, undefined, { now: () => now, timeZone: () => tz });
  });

  it("records each first-time XP as a dated event, without changing total XP", async () => {
    await store.completeCard("l1", "c1", 10);
    await store.completeLesson("l1", 20);
    await store.recordQuizAttempt("q1", attempt({ passed: true, score: 1, xp: 50 }));
    const s = await store.getSnapshot();
    expect(s.xpEvents.map((e) => [e.kind, e.xp, e.day])).toEqual([
      ["card", 10, "2026-10-10"],
      ["lesson", 20, "2026-10-10"],
      ["quiz", 50, "2026-10-10"],
    ]);
    expect(s.totalXp).toBe(80);
  });

  it("meets the daily goal once today's XP reaches it", async () => {
    await store.completeCard("l1", "c1", 10);
    await store.completeCard("l1", "c2", 20);
    expect((await store.getSnapshot()).goalDays).toEqual({});
    await store.completeLesson("l1", 20);
    expect((await store.getSnapshot()).goalDays["2026-10-10"]).toMatchObject({ goal: 50, tz: "Australia/Sydney" });
  });

  it("counts practice toward today's goal only, once per card per day", async () => {
    await store.completeCard("l1", "c1", 10);
    await store.completeCard("l1", "c1", 0, 5);
    await store.completeCard("l1", "c1", 0, 5);
    let s = await store.getSnapshot();
    expect(s.xpEvents.map((e) => e.kind)).toEqual(["card", "practice"]);
    expect(s.totalXp).toBe(10);
    now = new Date("2026-10-11T01:00:00Z");
    await store.completeCard("l1", "c1", 0, 5);
    s = await store.getSnapshot();
    expect(s.xpEvents.at(-1)).toMatchObject({ kind: "practice", day: "2026-10-11" });
  });

  it("meets today's goal straight away when it's lowered below today's XP", async () => {
    await store.completeCard("l1", "c1", 10);
    await store.completeCard("l1", "c2", 10);
    await store.setPreferences({ dailyGoal: 20, dailyGoalChosen: true });
    const s = await store.getSnapshot();
    expect(s.goalDays["2026-10-10"]).toMatchObject({ goal: 20 });
    expect(s.preferences).toMatchObject({ dailyGoal: 20, dailyGoalChosen: true });
  });

  it("dates events in the learner's current time zone", async () => {
    tz = "America/Los_Angeles"; // 01:00 UTC on 10 Oct is still 9 Oct there
    await store.completeCard("l1", "c1", 10);
    expect((await store.getSnapshot()).xpEvents[0]?.day).toBe("2026-10-09");
  });
});
