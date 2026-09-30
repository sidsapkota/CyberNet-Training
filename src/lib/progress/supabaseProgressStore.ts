import type { SupabaseClient } from "@supabase/supabase-js";
import {
  completeCardAction,
  completeLessonAction,
  recordQuizAttemptAction,
  resetAllAction,
  resetLessonAction,
  setPreferencesAction,
} from "@/app/actions/progress";
import type { Database } from "@/lib/supabase/database.types";
import { quizProgressFrom } from "./merge";
import type { ProgressStore } from "./ProgressStore";
import { rowsToSnapshot } from "./rows";
import { cardKey, type Preferences, type ProgressSnapshot, type QuizAttempt, sumXp } from "./types";

type Listener = (snapshot: ProgressSnapshot) => void;

/**
 * ProgressStore for signed-in learners.
 * - Reads come straight from the database with the user's session; Row Level Security limits
 *   them to the user's own rows.
 * - Writes go through Server Actions, which verify the session and compute XP on the server.
 * - The UI updates immediately (optimistic), then takes whatever the server actually stored.
 *   If a write fails, the store re-reads the database so it never drifts.
 */
export class SupabaseProgressStore implements ProgressStore {
  private snapshot: ProgressSnapshot | null = null;
  private loading: Promise<ProgressSnapshot> | null = null;
  private readonly listeners = new Set<Listener>();

  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly userId: string,
  ) {}

  private async fetch(): Promise<ProgressSnapshot> {
    const [cards, lessons, attempts, profile] = await Promise.all([
      this.client.from("card_completions").select("lesson_id, card_id, completed_at, xp").eq("user_id", this.userId),
      this.client.from("lesson_completions").select("lesson_id, completed_at, xp").eq("user_id", this.userId),
      this.client
        .from("quiz_attempts")
        .select("quiz_id, attempted_at, score, passed, xp, answers")
        .eq("user_id", this.userId),
      this.client.from("profiles").select("learning_mode, sound_enabled, coach_seen").eq("id", this.userId).maybeSingle(),
    ]);
    const error = cards.error ?? lessons.error ?? attempts.error ?? profile.error;
    if (error) throw new Error(`Couldn't load progress: ${error.message}`);
    return rowsToSnapshot({
      cards: cards.data ?? [],
      lessons: lessons.data ?? [],
      attempts: attempts.data ?? [],
      learningMode: profile.data?.learning_mode,
      soundEnabled: profile.data?.sound_enabled,
      coachSeen: profile.data?.coach_seen,
    });
  }

  private set(next: Omit<ProgressSnapshot, "totalXp">) {
    this.snapshot = { ...next, totalXp: sumXp(next) };
    for (const listener of this.listeners) listener(this.snapshot);
  }

  /** Re-reads everything from the database (after a failed write). */
  async resync(): Promise<void> {
    try {
      this.set(await this.fetch());
    } catch (error) {
      console.error(error);
    }
  }

  private async write(action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      console.error(error);
      await this.resync();
    }
  }

  async getSnapshot(): Promise<ProgressSnapshot> {
    if (this.snapshot) return this.snapshot;
    this.loading ??= this.fetch().then((s) => (this.snapshot ??= s));
    return this.loading;
  }

  async completeCard(lessonId: string, cardId: string, xp: number): Promise<void> {
    const current = await this.getSnapshot();
    const key = cardKey(lessonId, cardId);
    if (current.cards[key]) return;
    this.set({ ...current, cards: { ...current.cards, [key]: { completedAt: new Date().toISOString(), xp } } });
    await this.write(async () => {
      const saved = await completeCardAction(lessonId, cardId, xp);
      const cards = { ...this.snapshot!.cards };
      if (saved) cards[key] = saved;
      else delete cards[key];
      this.set({ ...this.snapshot!, cards });
    });
  }

  async completeLesson(lessonId: string, xp: number): Promise<void> {
    const current = await this.getSnapshot();
    if (current.lessons[lessonId]) return;
    this.set({ ...current, lessons: { ...current.lessons, [lessonId]: { completedAt: new Date().toISOString(), xp } } });
    await this.write(async () => {
      const saved = await completeLessonAction(lessonId);
      const lessons = { ...this.snapshot!.lessons };
      if (saved) lessons[lessonId] = saved;
      else delete lessons[lessonId];
      this.set({ ...this.snapshot!, lessons });
    });
  }

  async recordQuizAttempt(quizId: string, attempt: QuizAttempt): Promise<void> {
    const current = await this.getSnapshot();
    const withAttempt = (list: QuizAttempt[]) => ({ ...this.snapshot!.quizzes, [quizId]: quizProgressFrom(list) });
    this.set({ ...current, quizzes: { ...current.quizzes, [quizId]: quizProgressFrom([...(current.quizzes[quizId]?.attempts ?? []), attempt]) } });
    await this.write(async () => {
      const saved = await recordQuizAttemptAction(
        quizId,
        attempt.answers.map((a) => ({ cardId: a.cardId, answer: a.answer })),
      );
      const others = (this.snapshot!.quizzes[quizId]?.attempts ?? []).filter((a) => a !== attempt);
      this.set({ ...this.snapshot!, quizzes: withAttempt(saved ? [...others, saved] : others) });
    });
  }

  async setPreferences(preferences: Partial<Preferences>): Promise<void> {
    const current = await this.getSnapshot();
    this.set({ ...current, preferences: { ...current.preferences, ...preferences } });
    await this.write(() => setPreferencesAction(preferences));
  }

  async resetLesson(lessonId: string): Promise<void> {
    const current = await this.getSnapshot();
    const prefix = cardKey(lessonId, "");
    const cards = Object.fromEntries(Object.entries(current.cards).filter(([key]) => !key.startsWith(prefix)));
    const lessons = { ...current.lessons };
    const quizzes = { ...current.quizzes };
    delete lessons[lessonId];
    delete quizzes[lessonId];
    this.set({ ...current, cards, lessons, quizzes });
    await this.write(() => resetLessonAction(lessonId));
  }

  async resetAll(): Promise<void> {
    const current = await this.getSnapshot();
    this.set({ cards: {}, lessons: {}, quizzes: {}, preferences: current.preferences });
    await this.write(() => resetAllAction());
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
