import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalStorageProgressStore, PROGRESS_STORAGE_KEY } from "./localStorageProgressStore";
import { MemoryStorage } from "./memoryStorage";
import { cardKey, emptySnapshot, type QuizAttempt } from "./types";

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
    expect(snapshot.preferences).toEqual({ mode: "path", sound: true, coachSeen: [] });
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

  it("resets everything", async () => {
    await store.completeCard("l1", "c1", 10);
    await store.resetAll();
    expect(await store.getSnapshot()).toEqual(emptySnapshot());
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
