"use server";

/**
 * Progress writes for signed-in learners. Every action:
 * 1. gets the user id from a server-verified session (`requireUserId()`), never from the client;
 * 2. validates its input and looks everything up in the lesson content;
 * 3. computes XP on the server (progress/authority.ts), then writes with the secret key.
 * Users can only READ their progress tables directly (RLS); they can't write them.
 *
 * Daily goals: every write that earns XP also records an XP event, dated here on the server in
 * the learner's time zone (never earlier than their latest event), and records the day's goal as
 * met when that event crosses it (see progress/daily.ts). The browser only says which time zone
 * it's in; the XP, the date and whether the goal was met are all decided here.
 */
import { cleanCoachSeen } from "@/lib/coach";
import { z } from "zod";
import { requireUserId } from "@/lib/auth/server";
import { getContentIndex } from "@/lib/content/server";
import { canCompleteLesson, cardXpFor, gradeQuizAttempt, practiceXpFor } from "@/lib/progress/authority";
import { addDays, DEFAULT_DAILY_GOAL, isDailyGoal, localDay, safeTimeZone, type XpInput } from "@/lib/progress/daily";
import { GUEST_GATE_AT, mergeLedger, mergeProgress, withoutGatedGuestProgress, withoutUnentitledPro } from "@/lib/progress/merge";
import {
  eventToRow,
  GOAL_DAY_COLUMNS,
  goalDayFromRow,
  goalDayToRow,
  rowsToSnapshot,
  snapshotToRows,
  XP_EVENT_COLUMNS,
} from "@/lib/progress/rows";
import {
  type CardCompletion,
  type DailyGoalDay,
  type LearningMode,
  LearningModeSchema,
  type LessonCompletion,
  type Preferences,
  type ProgressSnapshot,
  ProgressSnapshotSchema,
  type QuizAttempt,
  type XpEvent,
} from "@/lib/progress/types";
import { XP } from "@/lib/progress/xp";
import { getEntitlement, hasFinishedLesson, hasOpenedLesson, proLaunchAt, ProRequiredError } from "@/lib/pro/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { after } from "next/server";
import { onXpEarned } from "@/lib/leagues/server";

const Id = z.string().min(1).max(120);

/**
 * Pro lessons are recorded and graded only for learners who could open them: with Pro, or a free
 * account the lesson API let in (a `lesson_opens` row, from the daily limit), or a replay of one
 * finished before. Free lessons, and unknown ids (which the XP rules reject anyway), pass through.
 */
async function assertCanUse(userId: string, lessonId: string): Promise<void> {
  const lesson = getContentIndex().get(lessonId);
  if (lesson?.access !== "pro") return;
  if (await hasOpenedLesson(userId, lessonId)) return;
  if ((await getEntitlement({ id: userId, createdAt: null })).hasPro) return;
  if (await hasFinishedLesson(userId, lessonId, lesson.kind)) return;
  throw new ProRequiredError();
}

function fail(message: string, error?: { message: string } | null): never {
  throw new Error(error ? `${message}: ${error.message}` : message);
}

type Admin = ReturnType<typeof createSupabaseAdminClient>;

/** The account's progress, with XP events from `eventsSince` ("YYYY-MM-DD") onwards. */
async function loadAccountSnapshot(admin: Admin, userId: string, eventsSince: string) {
  const [cards, lessons, attempts, profile, events, goalDays] = await Promise.all([
    admin.from("card_completions").select("lesson_id, card_id, completed_at, xp").eq("user_id", userId),
    admin.from("lesson_completions").select("lesson_id, completed_at, xp").eq("user_id", userId),
    admin.from("quiz_attempts").select("quiz_id, attempted_at, score, passed, xp, answers").eq("user_id", userId),
    admin
      .from("profiles")
      .select("learning_mode, sound_enabled, coach_seen, daily_goal, daily_goal_chosen")
      .eq("id", userId)
      .maybeSingle(),
    admin.from("xp_events").select(XP_EVENT_COLUMNS).eq("user_id", userId).gte("day", eventsSince),
    admin.from("goal_days").select(GOAL_DAY_COLUMNS).eq("user_id", userId),
  ]);
  const error = cards.error ?? lessons.error ?? attempts.error ?? profile.error ?? events.error ?? goalDays.error;
  if (error) fail("Couldn't load progress", error);
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

/** What the server recorded for the daily goal after a write. */
export interface XpWrite {
  event: XpEvent | null;
  /** Set when this write met the day's goal. */
  goalDay: [string, DailyGoalDay] | null;
}
const NO_XP: XpWrite = { event: null, goalDay: null };

/** The learner's current day: their local date, never earlier than their latest XP event. */
async function learnerDay(admin: Admin, userId: string, tz: string, now: Date): Promise<string> {
  const { data, error } = await admin
    .from("xp_events")
    .select("day")
    .eq("user_id", userId)
    .order("day", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) fail("Couldn't read the daily goal", error);
  const local = localDay(now, tz);
  return data && data.day > local ? data.day : local;
}

/** Records `day` as met if its XP (summed from the ledger) has reached the learner's goal. */
async function checkGoalDay(admin: Admin, userId: string, day: string, tz: string, now: Date): Promise<XpWrite["goalDay"]> {
  const [events, profile] = await Promise.all([
    admin.from("xp_events").select("xp").match({ user_id: userId, day }),
    admin.from("profiles").select("daily_goal").eq("id", userId).maybeSingle(),
  ]);
  const error = events.error ?? profile.error;
  if (error) fail("Couldn't check the daily goal", error);
  const goal = isDailyGoal(profile.data?.daily_goal) ? profile.data.daily_goal : DEFAULT_DAILY_GOAL;
  const total = (events.data ?? []).reduce((sum, e) => sum + e.xp, 0);
  if (total < goal) return null;
  const { data, error: insertError } = await admin
    .from("goal_days")
    .upsert(goalDayToRow(userId, day, { tz, goal, metAt: now.toISOString() }), {
      onConflict: "user_id,day",
      ignoreDuplicates: true,
    })
    .select(GOAL_DAY_COLUMNS);
  if (insertError) fail("Couldn't save the daily goal", insertError);
  // Only a newly met day comes back (an existing one is left alone).
  return data?.[0] ? goalDayFromRow(data[0]) : null;
}

/** Records one XP event for the daily goal. Practice counts once per card per day. */
async function recordXp(admin: Admin, userId: string, tz: string, input: XpInput): Promise<XpWrite> {
  if (input.xp <= 0) return NO_XP;
  const now = new Date();
  const day = await learnerDay(admin, userId, tz, now);
  if (input.kind === "practice") {
    const { count, error } = await admin
      .from("xp_events")
      .select("id", { count: "exact", head: true })
      .match({ user_id: userId, day, kind: "practice", lesson_id: input.lessonId, card_id: input.cardId ?? "" });
    if (error) fail("Couldn't check practice", error);
    if ((count ?? 0) > 0) return NO_XP;
  }
  const event: XpEvent = {
    at: now.toISOString(),
    day,
    tz,
    kind: input.kind,
    lessonId: input.lessonId,
    ...(input.cardId ? { cardId: input.cardId } : {}),
    xp: input.xp,
  };
  const [inserted, profile] = await Promise.all([
    admin.from("xp_events").insert(eventToRow(userId, event)),
    // The learner's current time zone (shown in no UI; only used to date days).
    admin.from("profiles").update({ time_zone: tz }).eq("id", userId),
  ]);
  // 23505: the same card was practised in a request that just won the race; it counts once.
  if (inserted.error?.code === "23505") return NO_XP;
  const error = inserted.error ?? profile.error;
  if (error) fail("Couldn't record XP", error);
  // Leagues: join this week's league (once a week) after the response; never blocks XP.
  after(() => onXpEarned(userId, now));
  return { event, goalDay: await checkGoalDay(admin, userId, day, tz, now) };
}

/**
 * Records a completed card. `claimedXp` only signals first try vs retry; the server sets the XP.
 * A card already completed earns nothing new, but counts as practice toward today's goal.
 */
export async function completeCardAction(
  lessonId: string,
  cardId: string,
  claimedXp: number,
  timeZone?: string,
): Promise<{ completion: CardCompletion | null; xp: XpWrite }> {
  const userId = await requireUserId();
  await assertCanUse(userId, Id.parse(lessonId));
  const index = getContentIndex();
  const tz = safeTimeZone(timeZone);
  const xp = cardXpFor(index, Id.parse(lessonId), Id.parse(cardId), Number(claimedXp));
  if (xp === null) return { completion: null, xp: NO_XP };

  const admin = createSupabaseAdminClient();
  const { data: inserted, error } = await admin
    .from("card_completions")
    .upsert(
      { user_id: userId, lesson_id: lessonId, card_id: cardId, completed_at: new Date().toISOString(), xp },
      { onConflict: "user_id,lesson_id,card_id", ignoreDuplicates: true },
    )
    .select("card_id");
  if (error) fail("Couldn't save the card", error);
  const xpWrite = inserted?.length
    ? await recordXp(admin, userId, tz, { kind: "card", lessonId, cardId, xp })
    : await recordXp(admin, userId, tz, { kind: "practice", lessonId, cardId, xp: practiceXpFor(index, lessonId, cardId) ?? 0 });
  const { data } = await admin
    .from("card_completions")
    .select("completed_at, xp")
    .match({ user_id: userId, lesson_id: lessonId, card_id: cardId })
    .single();
  return { completion: data ? { completedAt: new Date(data.completed_at).toISOString(), xp: data.xp } : null, xp: xpWrite };
}

/** Completes a lesson (+20 XP once), but only if every core card is already recorded. */
export async function completeLessonAction(
  lessonId: string,
  timeZone?: string,
): Promise<{ completion: LessonCompletion | null; xp: XpWrite }> {
  const userId = await requireUserId();
  const id = Id.parse(lessonId);
  await assertCanUse(userId, id);
  const admin = createSupabaseAdminClient();

  const { data: cards, error } = await admin
    .from("card_completions")
    .select("card_id")
    .match({ user_id: userId, lesson_id: id });
  if (error) fail("Couldn't check the lesson", error);
  if (!canCompleteLesson(getContentIndex(), id, (cards ?? []).map((c) => c.card_id))) return { completion: null, xp: NO_XP };

  const { data: inserted, error: insertError } = await admin
    .from("lesson_completions")
    .upsert(
      { user_id: userId, lesson_id: id, completed_at: new Date().toISOString(), xp: XP.lessonComplete },
      { onConflict: "user_id,lesson_id", ignoreDuplicates: true },
    )
    .select("lesson_id");
  if (insertError) fail("Couldn't complete the lesson", insertError);
  const xpWrite = inserted?.length
    ? await recordXp(admin, userId, safeTimeZone(timeZone), { kind: "lesson", lessonId: id, xp: XP.lessonComplete })
    : NO_XP;
  const { data } = await admin.from("lesson_completions").select("completed_at, xp").match({ user_id: userId, lesson_id: id }).single();
  return { completion: data ? { completedAt: new Date(data.completed_at).toISOString(), xp: data.xp } : null, xp: xpWrite };
}

const AnswersSchema = z.array(z.object({ cardId: Id, answer: z.unknown() })).max(50);

/** Records a quiz attempt. The server re-grades the raw answers; the client's score is ignored. */
export async function recordQuizAttemptAction(
  quizId: string,
  answers: { cardId: string; answer: unknown }[],
  timeZone?: string,
): Promise<{ attempt: QuizAttempt | null; xp: XpWrite }> {
  const userId = await requireUserId();
  const id = Id.parse(quizId);
  await assertCanUse(userId, id);
  const admin = createSupabaseAdminClient();

  const { count, error: countError } = await admin
    .from("quiz_attempts")
    .select("id", { count: "exact", head: true })
    .match({ user_id: userId, quiz_id: id, passed: true });
  if (countError) fail("Couldn't check the quiz", countError);

  const attempt = gradeQuizAttempt(getContentIndex(), id, AnswersSchema.parse(answers), new Date().toISOString(), (count ?? 0) > 0);
  if (!attempt) return { attempt: null, xp: NO_XP };
  const { error } = await admin.from("quiz_attempts").insert({
    user_id: userId,
    quiz_id: id,
    attempted_at: attempt.at,
    score: attempt.score,
    passed: attempt.passed,
    xp: attempt.xp,
    answers: attempt.answers as never,
  });
  if (error) fail("Couldn't save the quiz attempt", error);
  const xpWrite = await recordXp(admin, userId, safeTimeZone(timeZone), { kind: "quiz", lessonId: id, xp: attempt.xp });
  return { attempt, xp: xpWrite };
}

/**
 * Saves settings. Changing the daily goal also marks it as chosen, and returns today's goal day if
 * the new goal is already met by today's XP.
 */
export async function setPreferencesAction(
  preferences: Partial<Preferences>,
  timeZone?: string,
): Promise<XpWrite["goalDay"]> {
  const userId = await requireUserId();
  const update: {
    learning_mode?: LearningMode;
    sound_enabled?: boolean;
    coach_seen?: string[];
    daily_goal?: number;
    daily_goal_chosen?: boolean;
  } = {};
  if (preferences.mode !== undefined) update.learning_mode = LearningModeSchema.parse(preferences.mode);
  if (preferences.sound !== undefined) update.sound_enabled = z.boolean().parse(preferences.sound);
  if (preferences.coachSeen !== undefined) update.coach_seen = cleanCoachSeen(z.array(z.string()).max(64).parse(preferences.coachSeen));
  if (preferences.dailyGoal !== undefined) {
    if (!isDailyGoal(preferences.dailyGoal)) fail("That daily goal isn't one of the options");
    update.daily_goal = preferences.dailyGoal;
    update.daily_goal_chosen = true;
  }
  if (preferences.dailyGoalChosen === true) update.daily_goal_chosen = true;
  if (Object.keys(update).length === 0) return null;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("profiles").update(update).eq("id", userId);
  if (error) fail("Couldn't save the setting", error);
  if (update.daily_goal === undefined) return null;
  const tz = safeTimeZone(timeZone);
  const now = new Date();
  return checkGoalDay(admin, userId, await learnerDay(admin, userId, tz, now), tz, now);
}

export async function resetLessonAction(lessonId: string): Promise<void> {
  const userId = await requireUserId();
  const id = Id.parse(lessonId);
  const admin = createSupabaseAdminClient();
  const results = await Promise.all([
    admin.from("card_completions").delete().match({ user_id: userId, lesson_id: id }),
    admin.from("lesson_completions").delete().match({ user_id: userId, lesson_id: id }),
    admin.from("quiz_attempts").delete().match({ user_id: userId, quiz_id: id }),
  ]);
  const error = results.find((r) => r.error)?.error;
  if (error) fail("Couldn't reset the lesson", error);
}

/** Clears all progress. The account and its settings stay. */
export async function resetAllAction(): Promise<void> {
  const userId = await requireUserId();
  const admin = createSupabaseAdminClient();
  const results = await Promise.all([
    admin.from("card_completions").delete().eq("user_id", userId),
    admin.from("lesson_completions").delete().eq("user_id", userId),
    admin.from("quiz_attempts").delete().eq("user_id", userId),
  ]);
  const error = results.find((r) => r.error)?.error;
  if (error) fail("Couldn't reset progress", error);
}

/**
 * Merges this browser's guest progress into the account (see progress/merge.ts). Quiz attempts
 * are re-graded from their answers first, and all XP is recomputed, so nothing uploaded is trusted.
 * Safe to call repeatedly.
 */
export async function mergeGuestProgressAction(local: unknown): Promise<ProgressSnapshot> {
  const userId = await requireUserId();
  const parsed = ProgressSnapshotSchema.parse(local);
  const index = getContentIndex();

  const regraded: ProgressSnapshot = {
    ...parsed,
    quizzes: Object.fromEntries(
      Object.entries(parsed.quizzes).flatMap(([quizId, q]) => {
        const attempts = q.attempts
          .map((a) => gradeQuizAttempt(index, quizId, a.answers, a.at, false))
          .filter((a): a is QuizAttempt => a !== null);
        return attempts.length ? [[quizId, { attempts, bestScore: 0, passedAt: null }]] : [];
      }),
    ),
  };

  const admin = createSupabaseAdminClient();
  const now = new Date();
  // Account events are only needed from the guest's earliest day (for day totals and duplicates).
  const earliest = regraded.xpEvents.reduce((min, e) => (e.day < min ? e.day : min), localDay(now, "UTC"));
  const account = await loadAccountSnapshot(admin, userId, addDays(earliest, -1));
  // Guests can't open Pro lessons after launch, so Pro progress from after then only counts with Pro.
  const { hasPro } = await getEntitlement({ id: userId, createdAt: null });
  // Likewise, guests can't open account-only lessons once the sign-up gate launched.
  const guest = withoutGatedGuestProgress(withoutUnentitledPro(regraded, index, proLaunchAt(), hasPro), index, GUEST_GATE_AT);
  const merged = mergeProgress(account, guest, index, now);
  const passedQuizzes = new Set(
    Object.entries(guest.quizzes)
      .filter(([, q]) => q.attempts.some((a) => a.passed))
      .map(([id]) => id),
  );
  const ledger = mergeLedger(account, guest, index, passedQuizzes, now);
  const rows = snapshotToRows(userId, merged);

  const writes = await Promise.all([
    rows.cards.length ? admin.from("card_completions").upsert(rows.cards, { onConflict: "user_id,lesson_id,card_id" }) : null,
    rows.lessons.length ? admin.from("lesson_completions").upsert(rows.lessons, { onConflict: "user_id,lesson_id" }) : null,
    rows.attempts.length
      ? admin.from("quiz_attempts").upsert(rows.attempts, { onConflict: "user_id,quiz_id,attempted_at" })
      : null,
    ledger.newEvents.length ? admin.from("xp_events").insert(ledger.newEvents.map((e) => eventToRow(userId, e))) : null,
    ledger.newGoalDays.length
      ? admin
          .from("goal_days")
          .upsert(
            ledger.newGoalDays.map(([day, g]) => goalDayToRow(userId, day, g)),
            { onConflict: "user_id,day", ignoreDuplicates: true },
          )
      : null,
    admin
      .from("profiles")
      .update({
        learning_mode: merged.preferences.mode,
        sound_enabled: merged.preferences.sound,
        coach_seen: merged.preferences.coachSeen,
        daily_goal: merged.preferences.dailyGoal,
        daily_goal_chosen: merged.preferences.dailyGoalChosen,
      })
      .eq("id", userId),
  ]);
  const error = writes.find((w) => w?.error)?.error;
  if (error) fail("Couldn't save your progress", error);
  return merged;
}
