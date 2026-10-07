import "server-only";
/**
 * The admin dashboard's data (docs/plans/admin.md), read with the secret key. Every exported
 * function calls requireAdmin() itself before touching anything (the pages do too): a second gate,
 * so no data call can skip the check. Read-only, apart from the audit log.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAllLessonIds, getCourses, getLesson } from "@/lib/content/server";
import { leagueWeek, previousWeek, weekWindow } from "@/lib/leagues/week";
import { localDay } from "@/lib/progress/daily";
import { goalDayFromRow } from "@/lib/progress/rows";
import { computeStreak } from "@/lib/progress/streak";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "./auth";
import { maskEmail, perDay, returningLearners } from "./rules";

const TZ = "Australia/Sydney";
const DAY = 86_400_000;

function fail(message: string, error: { message: string } | null | undefined): asserts error is null | undefined {
  if (error) throw new Error(`${message}: ${error.message}`);
}

/** Every row of a query, 1,000 at a time. */
async function all<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    fail("Couldn't read", error);
    rows.push(...(data ?? []));
    if ((data ?? []).length < 1000) return rows;
  }
}

/** Writes one audit row (who, what, when). */
export async function logAdmin(action: string, target?: string): Promise<void> {
  const admin = await requireAdmin();
  const { error } = await createSupabaseAdminClient().from("admin_audit").insert({ admin_id: admin.id, action: action.slice(0, 60), target: target?.slice(0, 120) ?? null });
  fail("Couldn't write the audit log", error);
}

// ── Overview ────────────────────────────────────────────────────────────────

export interface Overview {
  learners: number;
  signups: { day: string; n: number }[];
  activeToday: number;
  active7: number;
  returning: number;
  lessonsCompleted: number;
  subscribers: { monthly: number; yearly: number; trialing: number };
  grants: number;
  founders: number;
  founderRevenue: { amount: number; currency: string }[];
}

export async function overview(now = new Date()): Promise<Overview> {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  const [profiles, events, lessons, subs, grants, founders] = await Promise.all([
    all<{ created_at: string }>((a, b) => db.from("profiles").select("created_at").range(a, b)),
    all<{ user_id: string; day: string; at: string }>((a, b) => db.from("xp_events").select("user_id, day, at").range(a, b)),
    db.from("lesson_completions").select("lesson_id", { count: "exact", head: true }),
    db.from("subscriptions").select("status, billing_interval, current_period_end").in("status", ["trialing", "active", "past_due"]),
    db.from("pro_grants").select("user_id").gt("expires_at", now.toISOString()),
    db.from("founding_members").select("amount_total, currency").is("refunded_at", null),
  ]);
  fail("Couldn't read the overview", lessons.error ?? subs.error ?? grants.error ?? founders.error);
  const today = localDay(now, TZ);
  const live = (subs.data ?? []).filter((s) => !s.current_period_end || Date.parse(s.current_period_end) > now.getTime() - 2 * DAY);
  const revenue = new Map<string, number>();
  for (const f of founders.data ?? []) revenue.set(f.currency, (revenue.get(f.currency) ?? 0) + f.amount_total);
  return {
    learners: profiles.length,
    signups: perDay(profiles.map((p) => localDay(new Date(p.created_at), TZ)), today, 30),
    activeToday: new Set(events.filter((e) => localDay(new Date(e.at), TZ) === today).map((e) => e.user_id)).size,
    active7: new Set(events.filter((e) => Date.parse(e.at) > now.getTime() - 7 * DAY).map((e) => e.user_id)).size,
    returning: returningLearners(events),
    lessonsCompleted: lessons.count ?? 0,
    subscribers: {
      monthly: live.filter((s) => s.status !== "trialing" && s.billing_interval === "month").length,
      yearly: live.filter((s) => s.status !== "trialing" && s.billing_interval === "year").length,
      trialing: live.filter((s) => s.status === "trialing").length,
    },
    grants: (grants.data ?? []).length,
    founders: (founders.data ?? []).length,
    founderRevenue: [...revenue].map(([currency, amount]) => ({ currency, amount })),
  };
}

// ── Funnel ──────────────────────────────────────────────────────────────────

export interface FunnelStep {
  step: string;
  learners: number;
}

/** From our own data, for learners who signed up in the last `days` days. */
export async function funnel(days: number, now = new Date()): Promise<FunnelStep[]> {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  const since = new Date(now.getTime() - days * DAY).toISOString();
  const signups = await all<{ id: string }>((a, b) => db.from("profiles").select("id").gte("created_at", since).range(a, b));
  const ids = signups.map((p) => p.id);
  if (ids.length === 0) return ["Signed up", "Answered a card", "Finished a lesson", "Started a founder checkout", "Paid (Pro or founder)"].map((step) => ({ step, learners: 0 }));
  const loose = db as unknown as SupabaseClient;
  const inIds = <T,>(table: string, column: string) => all<T>((a, b) => loose.from(table).select(column).in("user_id", ids).range(a, b) as unknown as PromiseLike<{ data: T[] | null; error: { message: string } | null }>);
  const [cards, lessons, holds, subs, seats] = await Promise.all([
    inIds<{ user_id: string }>("card_completions", "user_id"),
    inIds<{ user_id: string }>("lesson_completions", "user_id"),
    inIds<{ user_id: string }>("founder_holds", "user_id"),
    inIds<{ user_id: string; status: string }>("subscriptions", "user_id, status"),
    inIds<{ user_id: string }>("founding_members", "user_id"),
  ]);
  const distinct = (rows: { user_id: string }[]) => new Set(rows.map((r) => r.user_id)).size;
  const paid = new Set([...subs.filter((s) => ["active", "past_due", "canceled"].includes(s.status)).map((s) => s.user_id), ...seats.map((s) => s.user_id)]);
  return [
    { step: "Signed up", learners: ids.length },
    { step: "Answered a card", learners: distinct(cards) },
    { step: "Finished a lesson", learners: distinct(lessons) },
    { step: "Started a founder checkout", learners: new Set([...holds.map((h) => h.user_id), ...seats.map((s) => s.user_id)]).size },
    { step: "Paid (Pro or founder)", learners: paid.size },
  ];
}

// ── Learners ────────────────────────────────────────────────────────────────

export interface LearnerRow {
  id: string;
  username: string;
  joined: string;
  lastActive: string | null;
  xp: number;
  streak: number;
  lessonsDone: number;
  pro: "Founder" | "Pro" | "Trial" | "Grant" | "Free";
  emailHint: string;
}

export const LEARNERS_PAGE = 50;

export async function learners(page: number, now = new Date()): Promise<{ rows: LearnerRow[]; total: number }> {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  const from = Math.max(0, page) * LEARNERS_PAGE;
  const list = await db.from("profiles").select("id, username, created_at, time_zone", { count: "exact" }).order("created_at", { ascending: false }).range(from, from + LEARNERS_PAGE - 1);
  fail("Couldn't read learners", list.error);
  const people = list.data ?? [];
  const ids = people.map((p) => p.id);
  if (ids.length === 0) return { rows: [], total: list.count ?? 0 };
  const [cards, lessons, quizzes, events, goals, subs, grants, seats, users] = await Promise.all([
    all<{ user_id: string; xp: number }>((a, b) => db.from("card_completions").select("user_id, xp").in("user_id", ids).range(a, b)),
    all<{ user_id: string; xp: number }>((a, b) => db.from("lesson_completions").select("user_id, xp").in("user_id", ids).range(a, b)),
    all<{ user_id: string; quiz_id: string; xp: number; attempted_at: string }>((a, b) => db.from("quiz_attempts").select("user_id, quiz_id, xp, attempted_at").in("user_id", ids).order("attempted_at").range(a, b)),
    all<{ user_id: string; at: string }>((a, b) => db.from("xp_events").select("user_id, at").in("user_id", ids).range(a, b)),
    all<{ user_id: string; day: string; time_zone: string; goal: number; met_at: string }>((a, b) => db.from("goal_days").select("user_id, day, time_zone, goal, met_at").in("user_id", ids).range(a, b)),
    db.from("subscriptions").select("user_id, status, current_period_end").in("user_id", ids).in("status", ["trialing", "active", "past_due"]),
    db.from("pro_grants").select("user_id, expires_at").in("user_id", ids),
    db.from("founding_members").select("user_id").in("user_id", ids).is("refunded_at", null),
    Promise.all(ids.map((id) => db.auth.admin.getUserById(id))),
  ]);
  fail("Couldn't read learner details", subs.error ?? grants.error ?? seats.error);
  const sum = (rows: { user_id: string; xp: number }[], id: string) => rows.filter((r) => r.user_id === id).reduce((s, r) => s + r.xp, 0);
  const rows = people.map((p, i): LearnerRow => {
    const firstPass = new Map<string, number>();
    for (const q of quizzes) if (q.user_id === p.id && q.xp > 0 && !firstPass.has(q.quiz_id)) firstPass.set(q.quiz_id, q.xp);
    const last = events.filter((e) => e.user_id === p.id).reduce<string | null>((m, e) => (m === null || e.at > m ? e.at : m), null);
    const tz = p.time_zone ?? TZ;
    const days = Object.fromEntries(goals.filter((g) => g.user_id === p.id).map(goalDayFromRow).filter((g) => g !== null));
    const sub = (subs.data ?? []).find((s) => s.user_id === p.id && (!s.current_period_end || Date.parse(s.current_period_end) > now.getTime() - 2 * DAY));
    const grant = (grants.data ?? []).find((g) => g.user_id === p.id && Date.parse(g.expires_at) > now.getTime());
    return {
      id: p.id,
      username: p.username ?? "(no username yet)",
      joined: p.created_at,
      lastActive: last,
      xp: sum(cards, p.id) + sum(lessons, p.id) + [...firstPass.values()].reduce((s, x) => s + x, 0),
      streak: computeStreak(days, { day: localDay(now, tz), tz }).current,
      lessonsDone: lessons.filter((l) => l.user_id === p.id).length,
      pro: (seats.data ?? []).some((s) => s.user_id === p.id) ? "Founder" : sub ? (sub.status === "trialing" ? "Trial" : "Pro") : grant ? "Grant" : "Free",
      emailHint: maskEmail(users[i]?.data.user?.email),
    };
  });
  return { rows, total: list.count ?? 0 };
}

/** One learner's full email, for the admin who asked (logged with whose it was). */
export async function revealEmail(userId: string): Promise<string | null> {
  await requireAdmin();
  const { data } = await createSupabaseAdminClient().auth.admin.getUserById(userId);
  await logAdmin("reveal-email", userId);
  return data.user?.email ?? null;
}

// ── Lessons ─────────────────────────────────────────────────────────────────

export interface LessonRow {
  id: string;
  title: string;
  course: string;
  started: number;
  finished: number;
}
export interface CardTrouble {
  lessonTitle: string;
  cardId: string;
  value: number;
}

export async function lessonStats(): Promise<{ lessons: LessonRow[]; mistakes: CardTrouble[]; slowest: CardTrouble[]; mostMissed: CardTrouble[] | null }> {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  const [cards, done, misses] = await Promise.all([
    all<{ user_id: string; lesson_id: string }>((a, b) => db.from("card_completions").select("user_id, lesson_id").range(a, b)),
    all<{ lesson_id: string }>((a, b) => db.from("lesson_completions").select("lesson_id").range(a, b)),
    all<{ lesson_id: string; card_id: string; misses: number }>((a, b) => db.from("card_mistakes").select("lesson_id, card_id, misses").range(a, b)),
  ]);
  const courseTitle = new Map(getCourses().map((c) => [c.id, c.title]));
  const started = new Map<string, Set<string>>();
  for (const c of cards) (started.get(c.lesson_id) ?? started.set(c.lesson_id, new Set()).get(c.lesson_id)!).add(c.user_id);
  const finished = new Map<string, number>();
  for (const l of done) finished.set(l.lesson_id, (finished.get(l.lesson_id) ?? 0) + 1);
  const title = (id: string) => getLesson(id)?.title ?? id;
  const lessons = getAllLessonIds()
    .map((id) => getLesson(id)!)
    .filter(Boolean)
    .map((l) => ({ id: l.id, title: l.title, course: courseTitle.get(l.courseId) ?? l.courseId, started: started.get(l.id)?.size ?? 0, finished: finished.get(l.id) ?? 0 }));
  const missTotals = new Map<string, number>();
  for (const m of misses) missTotals.set(`${m.lesson_id}/${m.card_id}`, (missTotals.get(`${m.lesson_id}/${m.card_id}`) ?? 0) + m.misses);
  const top = (map: Map<string, number>) =>
    [...map].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([key, value]) => ({ lessonTitle: title(key.split("/")[0]!), cardId: key.split("/")[1] ?? "", value }));
  // Card measurements, once that table exists (card-measure branch).
  const plays = await (db as unknown as SupabaseClient).from("card_plays").select("lesson_id, card_id, ms, first_try").gte("created_at", new Date(Date.now() - 7 * DAY).toISOString()).limit(5000);
  let slowest: CardTrouble[] = [];
  let mostMissed: CardTrouble[] | null = null;
  if (!plays.error) {
    const by = new Map<string, { ms: number[]; right: number }>();
    for (const p of (plays.data ?? []) as { lesson_id: string; card_id: string; ms: number; first_try: boolean }[]) {
      const e = by.get(`${p.lesson_id}/${p.card_id}`) ?? { ms: [], right: 0 };
      e.ms.push(p.ms);
      if (p.first_try) e.right++;
      by.set(`${p.lesson_id}/${p.card_id}`, e);
    }
    const enough = [...by].filter(([, e]) => e.ms.length >= 5);
    const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
    slowest = top(new Map(enough.map(([k, e]) => [k, Math.round(median(e.ms) / 1000)])));
    mostMissed = top(new Map(enough.map(([k, e]) => [k, Math.round(100 - (100 * e.right) / e.ms.length)])));
  }
  return { lessons, mistakes: top(missTotals), slowest, mostMissed };
}

// ── Leagues ─────────────────────────────────────────────────────────────────

export interface LeagueTable {
  tier: string;
  rows: { username: string; weeklyXp: number }[];
}

export async function leagueStats(now = new Date()): Promise<{ week: string; leagues: LeagueTable[]; lastWeek: { username: string; rank: number; weeklyXp: number; fromTier: string; toTier: string }[] }> {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  const week = leagueWeek(now);
  const [leagues, members, results] = await Promise.all([
    db.from("leagues").select("id, tier").eq("week", week),
    db.from("league_members").select("league_id, user_id").eq("week", week),
    db.from("league_results").select("user_id, rank, weekly_xp, from_tier, to_tier").eq("week", previousWeek(week)).order("rank"),
  ]);
  fail("Couldn't read leagues", leagues.error ?? members.error ?? results.error);
  const ids = [...new Set([...(members.data ?? []).map((m) => m.user_id), ...(results.data ?? []).map((r) => r.user_id)])];
  const names = ids.length ? (await db.from("profiles").select("id, username").in("id", ids)).data ?? [] : [];
  const name = new Map(names.map((n) => [n.id, n.username ?? "(no username)"]));
  const { starts, ends } = weekWindow(week);
  const xp = ids.length
    ? await all<{ user_id: string; xp: number }>((a, b) => db.from("xp_events").select("user_id, xp").in("user_id", ids).neq("kind", "practice").gte("at", new Date(starts).toISOString()).lt("at", new Date(ends).toISOString()).range(a, b))
    : [];
  const weekly = (id: string) => xp.filter((e) => e.user_id === id).reduce((s, e) => s + e.xp, 0);
  return {
    week,
    leagues: (leagues.data ?? []).map((l) => ({
      tier: l.tier,
      rows: (members.data ?? []).filter((m) => m.league_id === l.id).map((m) => ({ username: name.get(m.user_id) ?? "?", weeklyXp: weekly(m.user_id) })).sort((a, b) => b.weeklyXp - a.weeklyXp),
    })),
    lastWeek: (results.data ?? []).map((r) => ({ username: name.get(r.user_id) ?? "?", rank: r.rank, weeklyXp: r.weekly_xp, fromTier: r.from_tier, toTier: r.to_tier })),
  };
}

// ── Feedback ────────────────────────────────────────────────────────────────

export async function latestFeedback(): Promise<{ at: string; message: string; lesson: string | null; rating: number | null }[]> {
  await requireAdmin();
  const { data, error } = await createSupabaseAdminClient().from("feedback").select("created_at, message, lesson_id, rating").order("created_at", { ascending: false }).limit(50);
  fail("Couldn't read feedback", error);
  return (data ?? []).map((f) => ({ at: f.created_at, message: f.message, lesson: f.lesson_id ? (getLesson(f.lesson_id)?.title ?? f.lesson_id) : null, rating: f.rating }));
}

// ── Features ────────────────────────────────────────────────────────────────

export interface FeatureStat {
  feature: string;
  live: boolean;
  numbers: { label: string; value: number }[];
}

/** Reminders, challenges and the Feed: each "not live yet" until its tables exist. */
export async function featureStats(): Promise<FeatureStat[]> {
  await requireAdmin();
  const db = createSupabaseAdminClient() as unknown as SupabaseClient;
  const n = async (query: PromiseLike<{ count: number | null; error: unknown }>) => {
    const { count, error } = await query;
    return error ? null : (count ?? 0);
  };
  const head = (table: string) => db.from(table).select("*", { count: "exact", head: true });
  const [optedIn, sent, opened, returned, made, played, claimed, bytes] = await Promise.all([
    n(head("profiles").eq("reminder_emails", true)),
    n(head("reminder_emails").eq("dry_run", false)),
    n(head("reminder_emails").not("opened_at", "is", null)),
    n(head("reminder_emails").not("returned_at", "is", null)),
    n(head("challenges")),
    n(head("challenge_attempts")),
    n(head("challenge_attempts").not("player_id", "is", null)),
    n(head("card_completions").eq("lesson_id", "feed")),
  ]);
  const stat = (feature: string, pairs: [string, number | null][]): FeatureStat => ({ feature, live: pairs.every(([, v]) => v !== null), numbers: pairs.map(([label, value]) => ({ label, value: value ?? 0 })) });
  return [
    stat("Reminder emails", [["Opted in", optedIn], ["Sent", sent], ["Opened", opened], ["Came back", returned]]),
    stat("Challenge a friend", [["Challenges made", made], ["Goes played", played], ["Goes claimed after sign-up", claimed]]),
    stat("The Feed", [["Bytes answered right (signed in)", bytes]]),
  ];
}
