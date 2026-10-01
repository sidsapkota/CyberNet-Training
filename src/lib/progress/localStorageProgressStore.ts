import { addXpEvent, browserTimeZone, checkGoal, currentDay, type XpInput } from "./daily";
import type { ProgressStore } from "./ProgressStore";
import {
  cardKey,
  emptySnapshot,
  type Preferences,
  type ProgressSnapshot,
  ProgressSnapshotSchema,
  type QuizAttempt,
  sumXp,
} from "./types";

export const PROGRESS_STORAGE_KEY = "cybernet.progress.v1";

type Listener = (snapshot: ProgressSnapshot) => void;
type Record_ = Omit<ProgressSnapshot, "totalXp">;

export interface StoreClock {
  /** The current time (injectable for tests). */
  now?: () => Date;
  /** The learner's IANA time zone (the browser's by default). */
  timeZone?: () => string;
}

/**
 * ProgressStore backed by `localStorage` (or any `Storage`, for tests).
 * Stored data is validated on read; anything corrupt or from an unknown
 * version falls back to empty progress instead of crashing the app.
 */
export class LocalStorageProgressStore implements ProgressStore {
  private readonly listeners = new Set<Listener>();

  constructor(
    private readonly getStorage: () => Storage | null = () =>
      typeof window === "undefined" ? null : window.localStorage,
    private readonly key: string = PROGRESS_STORAGE_KEY,
    private readonly clock: StoreClock = {},
  ) {}

  private now() {
    return this.clock.now?.() ?? new Date();
  }

  /** Adds an XP event (and today's goal, if this crosses it) to a snapshot about to be written. */
  private withXp(next: Record_, input: XpInput): Record_ {
    const tz = this.clock.timeZone?.() ?? browserTimeZone();
    const { ledger } = addXpEvent(next, input, this.now(), tz, next.preferences.dailyGoal);
    return { ...next, ...ledger };
  }

  private read(): ProgressSnapshot {
    const storage = this.getStorage();
    if (!storage) return emptySnapshot();
    try {
      const raw = storage.getItem(this.key);
      if (!raw) return emptySnapshot();
      const parsed = ProgressSnapshotSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : emptySnapshot();
    } catch {
      return emptySnapshot();
    }
  }

  private write(next: Omit<ProgressSnapshot, "totalXp">): ProgressSnapshot {
    const snapshot: ProgressSnapshot = { ...next, totalXp: sumXp(next) };
    try {
      this.getStorage()?.setItem(this.key, JSON.stringify(snapshot));
    } catch {
      // Storage full or blocked (e.g. some private modes): progress just won't persist.
    }
    this.emit(snapshot);
    return snapshot;
  }

  private emit(snapshot: ProgressSnapshot) {
    for (const listener of this.listeners) listener(snapshot);
  }

  async getSnapshot(): Promise<ProgressSnapshot> {
    return this.read();
  }

  async completeCard(lessonId: string, cardId: string, xp: number, practiceXp = 0): Promise<void> {
    const current = this.read();
    const key = cardKey(lessonId, cardId);
    if (current.cards[key]) {
      // A replay: practice XP toward today's goal only (once per card per day; addXpEvent checks).
      if (practiceXp > 0) this.write(this.withXp(current, { kind: "practice", lessonId, cardId, xp: practiceXp }));
      return;
    }
    const next = { ...current, cards: { ...current.cards, [key]: { completedAt: this.now().toISOString(), xp } } };
    this.write(this.withXp(next, { kind: "card", lessonId, cardId, xp }));
  }

  async completeLesson(lessonId: string, xp: number): Promise<void> {
    const current = this.read();
    if (current.lessons[lessonId]) return;
    const next = { ...current, lessons: { ...current.lessons, [lessonId]: { completedAt: this.now().toISOString(), xp } } };
    this.write(this.withXp(next, { kind: "lesson", lessonId, xp }));
  }

  async recordQuizAttempt(quizId: string, attempt: QuizAttempt): Promise<void> {
    const current = this.read();
    const previous = current.quizzes[quizId];
    const next: Record_ = {
      ...current,
      quizzes: {
        ...current.quizzes,
        [quizId]: {
          attempts: [...(previous?.attempts ?? []), attempt],
          bestScore: Math.max(previous?.bestScore ?? 0, attempt.score),
          passedAt: previous?.passedAt ?? (attempt.passed ? attempt.at : null),
        },
      },
    };
    this.write(this.withXp(next, { kind: "quiz", lessonId: quizId, xp: attempt.xp }));
  }

  /** Guests keep no mistakes (Mistake review is for accounts). */
  async recordMistake(): Promise<void> {}

  async setPreferences(preferences: Partial<Preferences>): Promise<void> {
    const current = this.read();
    let next: Record_ = { ...current, preferences: { ...current.preferences, ...preferences } };
    if (preferences.dailyGoal !== undefined) {
      // A lower goal can already be met by today's XP.
      const tz = this.clock.timeZone?.() ?? browserTimeZone();
      const now = this.now();
      next = { ...next, ...checkGoal(next, currentDay(now, tz, next.xpEvents), tz, next.preferences.dailyGoal, now).ledger };
    }
    this.write(next);
  }

  async resetLesson(lessonId: string): Promise<void> {
    const current = this.read();
    const prefix = cardKey(lessonId, "");
    const cards = Object.fromEntries(
      Object.entries(current.cards).filter(([key]) => !key.startsWith(prefix)),
    );
    const lessons = { ...current.lessons };
    const quizzes = { ...current.quizzes };
    delete lessons[lessonId];
    delete quizzes[lessonId];
    this.write({ ...current, cards, lessons, quizzes });
  }

  /** Clears all progress. Settings (Path or Explore, the daily goal) and the streak are kept. */
  async resetAll(): Promise<void> {
    const { preferences, xpEvents, goalDays } = this.read();
    this.write({ ...emptySnapshot(), preferences, xpEvents, goalDays });
  }

  /**
   * Removes this browser's guest progress entirely (after it has been merged into an account).
   * Not part of ProgressStore: only the sign-in merge uses it.
   */
  clear(): void {
    try {
      this.getStorage()?.removeItem(this.key);
    } catch {
      // Storage blocked: nothing to clear.
    }
    this.emit(emptySnapshot());
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);

    // Keep multiple open tabs in sync.
    const onStorage = (event: StorageEvent) => {
      if (event.key === this.key) listener(this.read());
    };
    if (typeof window !== "undefined") window.addEventListener("storage", onStorage);

    return () => {
      this.listeners.delete(listener);
      if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
    };
  }
}
