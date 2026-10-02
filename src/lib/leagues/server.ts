import "server-only";
/**
 * Leagues on the server, with the secret key. Callers pass a verified user id (from
 * requireUserId()/requireUser()) or are the weekly job (authenticated by CRON_SECRET). Nothing here
 * trusts the browser: weekly XP is always summed from xp_events, which only the server writes.
 */
import { addDays, dayStart, localDay } from "@/lib/progress/daily";
import { proCosmeticUntil, type FounderRecord, type GrantRecord, type SubscriptionRecord } from "@/lib/pro/entitlement";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";
import { BAND_WEEKS, LEAGUE_CAP, LEAGUE_TIME_ZONE, REPORTS_PER_DAY } from "./config";
import { bandFor, bandPreference } from "./grouping";
import { ensureUsername, replaceUsername } from "@/lib/usernames/server";
import { shouldOpenLeagues, shouldReplaceHandle } from "./rules";
import { type LeagueEntry, type LeagueOutcome, settleLeague } from "./settle";
import { isTier, type Tier } from "./tiers";
import { leagueWeek, weekWindow } from "./week";

type Admin = ReturnType<typeof createSupabaseAdminClient>;

function fail(message: string, error: { message: string } | null | undefined): asserts error is null | undefined {
  if (error) throw new Error(`${message}: ${error.message}`);
}

export interface LeaguePlayer {
  /** The learner's public username (`profiles.username`), shown on leaderboards. */
  handle: string;
  tier: Tier;
  showOnLeaderboards: boolean;
  /** The learner's avatar outfit (item ids from the fixed list). */
  outfit: string[];
}

/** The learner's league player row, created the first time. Their public name is their username. */
export async function ensurePlayer(admin: Admin, userId: string): Promise<LeaguePlayer> {
  const [username, profile] = await Promise.all([ensureUsername(admin, userId), admin.from("profiles").select("outfit").eq("id", userId).maybeSingle()]);
  const outfit = profile.data?.outfit ?? [];
  const existing = await admin.from("league_players").select("tier, show_on_leaderboards").eq("user_id", userId).maybeSingle();
  fail("Couldn't read the league player", existing.error);
  if (existing.data) {
    return { handle: username, outfit, tier: isTier(existing.data.tier) ? existing.data.tier : "packet", showOnLeaderboards: existing.data.show_on_leaderboards };
  }
  const { error } = await admin.from("league_players").insert({ user_id: userId });
  // 23505: a parallel request just created this player.
  if (error && error.code !== "23505") fail("Couldn't create the league player", error);
  return { handle: username, outfit, tier: "packet", showOnLeaderboards: true };
}

/** Usernames for a set of learners (leaderboards show nothing else about them). */
async function usernames(admin: Admin, userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const { data, error } = await admin.from("profiles").select("id, username").in("id", userIds);
  fail("Couldn't read usernames", error);
  return new Map((data ?? []).map((r) => [r.id, r.username ?? ""]));
}

/** Weekly XP per user over a time window, with each user's last XP time (for ties). */
async function weeklyXp(admin: Admin, userIds: string[], starts: number, ends: number): Promise<Map<string, { xp: number; lastAt: number | null }>> {
  const out = new Map(userIds.map((id) => [id, { xp: 0, lastAt: null as number | null }]));
  if (userIds.length === 0) return out;
  const { data, error } = await admin
    .from("xp_events")
    .select("user_id, xp, at")
    .in("user_id", userIds)
    .gte("at", new Date(starts).toISOString())
    .lt("at", new Date(ends).toISOString());
  fail("Couldn't read weekly XP", error);
  for (const row of data ?? []) {
    const entry = out.get(row.user_id);
    if (!entry) continue;
    entry.xp += row.xp;
    const t = Date.parse(row.at);
    entry.lastAt = entry.lastAt === null ? t : Math.max(entry.lastAt, t);
  }
  return out;
}

/**
 * After the server records XP: puts the learner in this week's league (once a week), and opens
 * leagues the first time enough learners are playing. Never throws: leagues must never block XP.
 */
export async function onXpEarned(userId: string, now = new Date()): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    const week = leagueWeek(now);
    const member = await admin.from("league_members").select("league_id").match({ week, user_id: userId }).maybeSingle();
    fail("Couldn't check league membership", member.error);
    if (!member.data) {
      const player = await ensurePlayer(admin, userId);
      // Activity band: the last BAND_WEEKS finished weeks.
      const oldest = weekWindow(addDays(week, -7 * BAND_WEEKS)).starts;
      const history = await weeklyXp(admin, [userId], oldest, weekWindow(week).starts);
      // bandFor averages over BAND_WEEKS weeks, so the window's total is enough.
      const band = bandFor([history.get(userId)?.xp ?? 0]);
      const { error } = await admin.rpc("join_league", {
        p_user: userId,
        p_week: week,
        p_tier: player.tier,
        p_bands: bandPreference(band),
        p_cap: LEAGUE_CAP,
      });
      fail("Couldn't join a league", error);
    }
    await maybeOpenLeagues(admin, week, now);
  } catch (error) {
    console.error("Leagues: couldn't place learner", error);
  }
}

/** Opens leagues the first week LEAGUES_MIN_ACTIVE learners have earned XP (they then stay open). */
async function maybeOpenLeagues(admin: Admin, week: string, now: Date): Promise<void> {
  const state = await admin.from("league_state").select("opened_at").maybeSingle();
  fail("Couldn't read league state", state.error);
  if (state.data?.opened_at) return;
  // Every learner who earns XP joins this week's league, so members = active learners.
  const { count, error } = await admin.from("league_members").select("user_id", { count: "exact", head: true }).eq("week", week);
  fail("Couldn't count active learners", error);
  if (!shouldOpenLeagues(count ?? 0, null)) return;
  const opened = await admin.from("league_state").update({ opened_at: now.toISOString() }).is("opened_at", null).eq("id", true);
  fail("Couldn't open leagues", opened.error);
}

export async function leaguesOpenedAt(admin: Admin): Promise<string | null> {
  const { data, error } = await admin.from("league_state").select("opened_at").maybeSingle();
  fail("Couldn't read league state", error);
  return data?.opened_at ?? null;
}

/** Keeps the Pro cosmetic flag in step with the learner's Pro (only if they have a player row). */
export async function stampProCosmetic(userId: string, subs: readonly SubscriptionRecord[], grant: GrantRecord | null, now = new Date(), founder: FounderRecord | null = null): Promise<void> {
  const until = proCosmeticUntil(subs, grant, now, founder);
  const { error } = await createSupabaseAdminClient().from("league_players").update({ pro_cosmetic_until: until }).eq("user_id", userId);
  if (error) console.error("Leagues: couldn't stamp the Pro cosmetic", error.message);
}

// ── The weekly job ────────────────────────────────────────────────────────────

/**
 * Settles every finished week since leagues opened that isn't settled yet, oldest first. Each week
 * is one transaction (`finalize_league_week`), and a week already settled is skipped, so the job
 * can run every hour and retry safely.
 */
export async function finalizeDueWeeks(now = new Date()): Promise<string[]> {
  const admin = createSupabaseAdminClient();
  const openedAt = await leaguesOpenedAt(admin);
  if (!openedAt) return [];
  const firstWeek = leagueWeek(new Date(openedAt));
  const current = leagueWeek(now);
  const [weeksWithLeagues, settled] = await Promise.all([
    admin.from("leagues").select("week").gte("week", firstWeek).lt("week", current),
    admin.from("league_weeks").select("week").gte("week", firstWeek),
  ]);
  fail("Couldn't list league weeks", weeksWithLeagues.error ?? settled.error);
  const done = new Set((settled.data ?? []).map((r) => r.week));
  const due = [...new Set((weeksWithLeagues.data ?? []).map((r) => r.week))].filter((w) => !done.has(w)).sort();
  for (const week of due) await finalizeWeek(admin, week);
  return due;
}

async function finalizeWeek(admin: Admin, week: string): Promise<void> {
  const [leagues, members] = await Promise.all([
    admin.from("leagues").select("id, tier").eq("week", week),
    admin.from("league_members").select("user_id, league_id").eq("week", week),
  ]);
  fail("Couldn't read the week's leagues", leagues.error ?? members.error);
  const userIds = (members.data ?? []).map((m) => m.user_id);
  const players = userIds.length
    ? await admin.from("league_players").select("user_id, show_on_leaderboards").in("user_id", userIds)
    : { data: [], error: null };
  fail("Couldn't read players", players.error);
  const names = await usernames(admin, userIds);
  const { starts, ends } = weekWindow(week);
  const xp = await weeklyXp(admin, userIds, starts, ends);
  const byUser = new Map((players.data ?? []).map((p) => [p.user_id, p]));
  const results: (LeagueOutcome & { leagueId: string })[] = [];
  for (const league of leagues.data ?? []) {
    if (!isTier(league.tier)) continue;
    const entries: LeagueEntry[] = (members.data ?? [])
      .filter((m) => m.league_id === league.id && byUser.has(m.user_id))
      .map((m) => {
        const p = byUser.get(m.user_id)!;
        const w = xp.get(m.user_id) ?? { xp: 0, lastAt: null };
        return { userId: m.user_id, handle: names.get(m.user_id) ?? "", weeklyXp: w.xp, lastAt: w.lastAt, visible: p.show_on_leaderboards };
      });
    for (const outcome of settleLeague(entries, league.tier)) results.push({ ...outcome, leagueId: league.id });
  }
  const { error } = await admin.rpc("finalize_league_week", {
    p_week: week,
    p_results: results.map((r) => ({
      user_id: r.userId,
      league_id: r.leagueId,
      rank: r.rank,
      weekly_xp: r.weeklyXp,
      from_tier: r.fromTier,
      to_tier: r.toTier,
    })),
  });
  // 23505: another run settled this week first. Nothing to do.
  if (error && error.code !== "23505") fail(`Couldn't settle the week of ${week}`, error);
}

// ── Handles and reports ──────────────────────────────────────────────────────

export async function setShowOnLeaderboards(userId: string, show: boolean): Promise<void> {
  const admin = createSupabaseAdminClient();
  await ensurePlayer(admin, userId);
  const { error } = await admin.from("league_players").update({ show_on_leaderboards: show }).eq("user_id", userId);
  fail("Couldn't save that setting", error);
}

export const REPORT_REASONS = ["rude", "personal_info", "pretending", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export type ReportResult = { ok: true } | { ok: false; error: string };

/**
 * Reports a username in the reporter's own league this week. Once REPORTS_TO_REPLACE different
 * learners report the same username, it's replaced with a generated one (the reports are kept),
 * and the learner can choose a new one straight away.
 */
export async function reportHandle(reporterId: string, handle: string, reason: ReportReason, now = new Date()): Promise<ReportResult> {
  const admin = createSupabaseAdminClient();
  const week = leagueWeek(now);
  const pattern = handle.trim().replace(/[\\%_]/g, (c) => `\\${c}`); // ilike wildcards
  const reported = await admin.from("profiles").select("id, username").ilike("username", pattern).maybeSingle();
  fail("Couldn't look up that username", reported.error);
  const target = reported.data?.username ? { user_id: reported.data.id, handle: reported.data.username } : null;
  if (!target || target.user_id === reporterId) return { ok: false, error: "You can only report other learners in your league." };
  const [mine, theirs] = await Promise.all([
    admin.from("league_members").select("league_id").match({ week, user_id: reporterId }).maybeSingle(),
    admin.from("league_members").select("league_id").match({ week, user_id: target.user_id }).maybeSingle(),
  ]);
  fail("Couldn't check the league", mine.error ?? theirs.error);
  if (!mine.data || mine.data.league_id !== theirs.data?.league_id) return { ok: false, error: "You can only report other learners in your league." };

  const today = await admin
    .from("handle_reports")
    .select("id", { count: "exact", head: true })
    .eq("reporter_id", reporterId)
    .gte("created_at", new Date(now.getTime() - 86_400_000).toISOString());
  fail("Couldn't check recent reports", today.error);
  if ((today.count ?? 0) >= REPORTS_PER_DAY) return { ok: false, error: "You've sent a lot of reports today. Thanks: we'll look at them." };

  const inserted = await admin.from("handle_reports").insert({ reporter_id: reporterId, reported_user_id: target.user_id, handle: target.handle, reason });
  if (inserted.error && inserted.error.code !== "23505") fail("Couldn't save the report", inserted.error);

  const reporters = await admin.from("handle_reports").select("reporter_id").match({ reported_user_id: target.user_id, handle: target.handle }).not("reporter_id", "is", null);
  fail("Couldn't count reports", reporters.error);
  if (shouldReplaceHandle(new Set((reporters.data ?? []).map((r) => r.reporter_id)).size)) {
    if (await replaceUsername(admin, target.user_id, target.handle)) console.info("Leagues: replaced a username after reports");
  }
  return { ok: true };
}

// ── The daily report summary ────────────────────────────────────────────────

/**
 * Emails yesterday's (Sydney) new reports to CONTACT_EMAIL, only if there were any. The hourly job
 * calls this from 8 am Sydney time; Resend's idempotency key (one per day, kept 24 hours) means
 * retries in later hours never send it twice.
 */
export async function sendReportSummary(now = new Date()): Promise<"sent" | "none" | "not-yet" | "no-key"> {
  const hour = Number(new Intl.DateTimeFormat("en-AU", { hour: "numeric", hourCycle: "h23", timeZone: LEAGUE_TIME_ZONE }).format(now));
  if (hour < 8) return "not-yet";
  const today = localDay(now, LEAGUE_TIME_ZONE);
  const yesterday = addDays(today, -1);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("handle_reports")
    .select("created_at, handle, reason")
    .gte("created_at", new Date(dayStart(yesterday, LEAGUE_TIME_ZONE)).toISOString())
    .lt("created_at", new Date(dayStart(today, LEAGUE_TIME_ZONE)).toISOString())
    .order("created_at");
  fail("Couldn't read reports", error);
  if (!data?.length) return "none";
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("Leagues: RESEND_API_KEY isn't set, so the report summary wasn't sent.");
    return "no-key";
  }
  const lines = data.map((r) => `${r.created_at.slice(11, 16)} UTC  ${r.handle}  (${r.reason.replace("_", " ")})`);
  const text = [
    `${data.length} new handle report${data.length === 1 ? "" : "s"} on ${yesterday} (Sydney time):`,
    "",
    ...lines,
    "",
    "Review them in Supabase: Table Editor → handle_reports (set resolved_at when done).",
    "Handles reported by 3 different learners have already been replaced automatically.",
  ].join("\n");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `handle-report-summary/${yesterday}` },
    body: JSON.stringify({
      from: `${SITE_NAME} <noreply@cybernettraining.com>`,
      to: [CONTACT_EMAIL],
      subject: `Handle reports: ${data.length} on ${yesterday}`,
      text,
    }),
  });
  if (!response.ok) throw new Error(`Resend refused the report summary (${response.status})`);
  return "sent";
}
