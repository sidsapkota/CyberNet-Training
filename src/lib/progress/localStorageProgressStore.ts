import type { ProgressStore } from "./ProgressStore";
import {
  cardKey,
  emptySnapshot,
  type ProgressSnapshot,
  ProgressSnapshotSchema,
  type QuizAttempt,
  sumXp,
} from "./types";

export const PROGRESS_STORAGE_KEY = "cybernet.progress.v1";

type Listener = (snapshot: ProgressSnapshot) => void;

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
  ) {}

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

  async completeCard(lessonId: string, cardId: string, xp: number): Promise<void> {
    const current = this.read();
    const key = cardKey(lessonId, cardId);
    if (current.cards[key]) return;
    this.write({
      ...current,
      cards: { ...current.cards, [key]: { completedAt: new Date().toISOString(), xp } },
    });
  }

  async completeLesson(lessonId: string, xp: number): Promise<void> {
    const current = this.read();
    if (current.lessons[lessonId]) return;
    this.write({
      ...current,
      lessons: { ...current.lessons, [lessonId]: { completedAt: new Date().toISOString(), xp } },
    });
  }

  async recordQuizAttempt(quizId: string, attempt: QuizAttempt): Promise<void> {
    const current = this.read();
    const previous = current.quizzes[quizId];
    this.write({
      ...current,
      quizzes: {
        ...current.quizzes,
        [quizId]: {
          attempts: [...(previous?.attempts ?? []), attempt],
          bestScore: Math.max(previous?.bestScore ?? 0, attempt.score),
          passedAt: previous?.passedAt ?? (attempt.passed ? attempt.at : null),
        },
      },
    });
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
    this.write({ cards, lessons, quizzes });
  }

  async resetAll(): Promise<void> {
    this.write(emptySnapshot());
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
