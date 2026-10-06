import type { SupabaseClient } from "@supabase/supabase-js";
import {
  completeCardAction,
  completeLessonAction,
  recordMistakeAction,
  recordQuizAttemptAction,
  resetAllAction,
  resetLessonAction,
  setPreferencesAction,
  type XpWrite,
} from "@/app/actions/progress";
import type { Database } from "@/lib/supabase/database.types";
import { addDays, addXpEvent, browserTimeZone, checkGoal, currentDay, eventsAfterReset, localDay, type XpInput } from "./daily";
import { quizProgressFrom } from "./merge";
import type { ProgressStore } from "./ProgressStore";
import { GOAL_DAY_COLUMNS, rowsToSnapshot, XP_EVENT_COLUMNS } from "./rows";
import { cardKey, type Preferences, type ProgressSnapshot, type QuizAttempt, sumXp, type XpEvent } from "./types";

type Listener = (snapshot: ProgressSnapshot) => void;
type Record_ = Omit<ProgressSnapshot, "totalXp">;

/** XP events older than this aren't needed in the browser (today's goal only uses today's). */
const EVENT_DAYS_LOADED = 40;

/** An optimistic XP event, to be swapped for what the server recorded. */
interface PendingXp {
  event: XpEvent | null;
  goalMet: string | null;
}

/**
 * ProgressStore for signed-in learners.
 * - Reads come straight from the database with the user's session; Row Level Security limits
 *   them to the user's own rows.
 * - Writes go through Server Actions, which verify the session and compute XP on the server
 *   (including the daily-goal ledger and met days).
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
    const since = addDays(localDay(new Date(), browserTimeZone()), -EVENT_DAYS_LOADED);
    const [cards, lessons, attempts, profile, events, goalDays] = await Promise.all([
      this.client.from("card_completions").select("lesson_id, card_id, completed_at, xp").eq("user_id", this.userId),
      this.client.from("lesson_completions").select("lesson_id, completed_at, xp").eq("user_id", this.userId),
      this.client
        .from("quiz_attempts")
        .select("quiz_id, attempted_at, score, passed, xp, answers")
        .eq("user_id", this.userId),
      this.client
        .from("profiles")
        .select("learning_mode, sound_enabled, coach_seen, daily_goal, daily_goal_chosen")
        .eq("id", this.userId)
        .maybeSingle(),
      this.client.from("xp_events").select(XP_EVENT_COLUMNS).eq("user_id", this.userId).gte("day", since),
      this.client.from("goal_days").select(GOAL_DAY_COLUMNS).eq("user_id", this.userId),
    ]);
    const error = cards.error ?? lessons.error ?? attempts.error ?? profile.error ?? events.error ?? goalDays.error;
    if (error) throw new Error(`Couldn't load progress: ${error.message}`);
    return rowsToSnapshot({
      cards: cards.data ?? [],
      lessons: lessons.data ?? [],
      attempts: attempts.data ?? [],
      learningMode: profile.data?.learning_mode,
      soundEnabled: profile.data?.sound_enabled,
      coachSeen: profile.data?.coach_seen,
      dailyGoal: profile.data?.daily_goal,
      dailyGoalChosen: profile.data?.daily_goal_chosen,
      xpEvents: events.data ?? [],
      goalDays: goalDays.data ?? [],
    });
  }

  private set(next: Record_) {
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

  /** Adds an optimistic XP event (and met day) to a snapshot about to be shown. */
  private withXp(next: Record_, input: XpInput): { next: Record_; pending: PendingXp } {
    const { ledger, event, goalMet } = addXpEvent(next, input, new Date(), browserTimeZone(), next.preferences.dailyGoal);
    return { next: { ...next, ...ledger }, pending: { event, goalMet } };
  }

  /** Swaps an optimistic XP event for what the server recorded. */
  private settle(base: Record_, pending: PendingXp, saved: XpWrite): Record_ {
    let xpEvents = pending.event ? base.xpEvents.filter((e) => e !== pending.event) : base.xpEvents;
    if (saved.event) xpEvents = [...xpEvents, saved.event];
    const goalDays = { ...base.goalDays };
    if (pending.goalMet && saved.goalDay?.[0] !== pending.goalMet) delete goalDays[pending.goalMet];
    if (saved.goalDay) goalDays[saved.goalDay[0]] = saved.goalDay[1];
    return { ...base, xpEvents, goalDays };
  }

  async getSnapshot(): Promise<ProgressSnapshot> {
    if (this.snapshot) return this.snapshot;
    this.loading ??= this.fetch().then((s) => (this.snapshot ??= s));
    return this.loading;
  }

  async completeCard(lessonId: string, cardId: string, xp: number, practiceXp = 0): Promise<void> {
    const current = await this.getSnapshot();
    const key = cardKey(lessonId, cardId);
    if (current.cards[key]) {
      // A replay: practice toward today's goal only. The server re-checks it against the content.
      if (practiceXp <= 0) return;
      const { next, pending } = this.withXp(current, { kind: "practice", lessonId, cardId, xp: practiceXp });
      if (!pending.event) return; // already practised today
      this.set(next);
      await this.write(async () => {
        const saved = await completeCardAction(lessonId, cardId, 0, browserTimeZone());
        this.set(this.settle(this.snapshot!, pending, saved.xp));
      });
      return;
    }
    const withCard = { ...current, cards: { ...current.cards, [key]: { completedAt: new Date().toISOString(), xp } } };
    const { next, pending } = this.withXp(withCard, { kind: "card", lessonId, cardId, xp });
    this.set(next);
    await this.write(async () => {
      const saved = await completeCardAction(lessonId, cardId, xp, browserTimeZone());
      const cards = { ...this.snapshot!.cards };
      if (saved.completion) cards[key] = saved.completion;
      else delete cards[key];
      this.set(this.settle({ ...this.snapshot!, cards }, pending, saved.xp));
    });
  }

  async completeLesson(lessonId: string, xp: number): Promise<void> {
    const current = await this.getSnapshot();
    if (current.lessons[lessonId]) return;
    const withLesson = { ...current, lessons: { ...current.lessons, [lessonId]: { completedAt: new Date().toISOString(), xp } } };
    const { next, pending } = this.withXp(withLesson, { kind: "lesson", lessonId, xp });
    this.set(next);
    await this.write(async () => {
      const saved = await completeLessonAction(lessonId, browserTimeZone());
      const lessons = { ...this.snapshot!.lessons };
      if (saved.completion) lessons[lessonId] = saved.completion;
      else delete lessons[lessonId];
      this.set(this.settle({ ...this.snapshot!, lessons }, pending, saved.xp));
    });
  }

  async recordQuizAttempt(quizId: string, attempt: QuizAttempt): Promise<void> {
    const current = await this.getSnapshot();
    const withAttempt = (list: QuizAttempt[]) => ({ ...this.snapshot!.quizzes, [quizId]: quizProgressFrom(list) });
    const optimistic = {
      ...current,
      quizzes: { ...current.quizzes, [quizId]: quizProgressFrom([...(current.quizzes[quizId]?.attempts ?? []), attempt]) },
    };
    const { next, pending } = this.withXp(optimistic, { kind: "quiz", lessonId: quizId, xp: attempt.xp });
    this.set(next);
    await this.write(async () => {
      const saved = await recordQuizAttemptAction(
        quizId,
        attempt.answers.map((a) => ({ cardId: a.cardId, answer: a.answer })),
        browserTimeZone(),
      );
      const others = (this.snapshot!.quizzes[quizId]?.attempts ?? []).filter((a) => a !== attempt);
      const quizzes = withAttempt(saved.attempt ? [...others, saved.attempt] : others);
      this.set(this.settle({ ...this.snapshot!, quizzes }, pending, saved.xp));
    });
  }

  /** Not part of the snapshot: the server re-grades it and keeps it for Mistake review. */
  async recordMistake(lessonId: string, cardId: string, answer: unknown): Promise<void> {
    try {
      await recordMistakeAction(lessonId, cardId, answer);
    } catch (error) {
      console.error(error);
    }
  }

  async setPreferences(preferences: Partial<Preferences>): Promise<void> {
    const current = await this.getSnapshot();
    let next: Record_ = { ...current, preferences: { ...current.preferences, ...preferences } };
    let goalMet: string | null = null;
    if (preferences.dailyGoal !== undefined) {
      const tz = browserTimeZone();
      const now = new Date();
      const checked = checkGoal(next, currentDay(now, tz, next.xpEvents), tz, next.preferences.dailyGoal, now);
      next = { ...next, ...checked.ledger };
      goalMet = checked.goalMet;
    }
    this.set(next);
    await this.write(async () => {
      const goalDay = await setPreferencesAction(preferences, browserTimeZone());
      if (preferences.dailyGoal !== undefined) this.set(this.settle(this.snapshot!, { event: null, goalMet }, { event: null, goalDay }));
    });
  }

  async resetLesson(lessonId: string): Promise<void> {
    const current = await this.getSnapshot();
    const prefix = cardKey(lessonId, "");
    const cards = Object.fromEntries(Object.entries(current.cards).filter(([key]) => !key.startsWith(prefix)));
    const lessons = { ...current.lessons };
    const quizzes = { ...current.quizzes };
    delete lessons[lessonId];
    delete quizzes[lessonId];
    this.set({ ...current, cards, lessons, quizzes, xpEvents: eventsAfterReset(current.xpEvents, lessonId) });
    await this.write(() => resetLessonAction(lessonId));
  }

  /** Clears lessons and their XP events. Settings and the streak (met days) are kept. */
  async resetAll(): Promise<void> {
    const { preferences, goalDays } = await this.getSnapshot();
    this.set({ cards: {}, lessons: {}, quizzes: {}, preferences, xpEvents: eventsAfterReset([]), goalDays });
    await this.write(() => resetAllAction());
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
