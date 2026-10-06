"use server";

/**
 * League actions for signed-in learners. The user id always comes from the verified session.
 * Standings are read with the learner's own session through `league_standings()`, so the
 * database decides what they may see: public fields of their own league only.
 */
import { z } from "zod";
import { requireUserId } from "@/lib/auth/server";
import { LEAGUE_TIME_ZONE } from "@/lib/leagues/config";
import {
  ensurePlayer,
  leaguesOpenedAt,
  REPORT_REASONS,
  reportHandle,
  type ReportResult,
  setShowOnLeaderboards,
} from "@/lib/leagues/server";
import { isTier, type Tier } from "@/lib/leagues/tiers";
import { leagueWeek } from "@/lib/leagues/week";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface StandingRow {
  rank: number;
  handle: string;
  tier: Tier;
  weeklyXp: number;
  pro: boolean;
  /** A Founding Member (the badge). */
  founder: boolean;
  isMe: boolean;
  /** Their avatar outfit (item ids from the fixed list; nothing personal). */
  outfit: string[];
}

export interface WeekResult {
  week: string;
  rank: number;
  weeklyXp: number;
  fromTier: Tier;
  toTier: Tier;
}

export interface MyLeague {
  open: boolean;
  week: string;
  timeZone: string;
  /** `handle` is the learner's public username. */
  /** `handle` is null until the learner has a username (reading league data never makes one). */
  player: { handle: string | null; tier: Tier; showOnLeaderboards: boolean; outfit: string[] };
  /** This week's league, ranked; empty until the learner earns XP this week. */
  standings: StandingRow[];
  /** Last week's result, until the learner has seen it. */
  result: WeekResult | null;
}

export async function getMyLeagueAction(): Promise<MyLeague> {
  const userId = await requireUserId();
  const admin = createSupabaseAdminClient();
  const [openedAt, player] = await Promise.all([leaguesOpenedAt(admin), ensurePlayer(admin, userId)]);
  const week = leagueWeek(new Date());
  const base = { open: openedAt !== null, week, timeZone: LEAGUE_TIME_ZONE, player };
  if (!openedAt) return { ...base, standings: [], result: null };

  // The learner's own session: RLS and the standings function decide what's visible.
  const supabase = await createSupabaseServerClient();
  const [standings, result, founders] = await Promise.all([
    supabase.rpc("league_standings"),
    supabase.from("league_results").select("week, rank, weekly_xp, from_tier, to_tier").is("seen_at", null).order("week", { ascending: false }).limit(1),
    supabase.rpc("league_founders"),
  ]);
  // The badge is extra: if it can't load, the league still shows.
  if (founders.error) console.error("Leagues: couldn't load Founding Members", founders.error.message);
  const founderHandles = new Set((founders.data ?? []).map((f) => f.handle));
  if (standings.error) throw new Error(`Couldn't load your league: ${standings.error.message}`);
  if (result.error) throw new Error(`Couldn't load last week's result: ${result.error.message}`);
  const last = result.data?.[0];
  return {
    ...base,
    standings: (standings.data ?? []).map((r) => ({
      rank: r.rank,
      handle: r.handle,
      tier: isTier(r.tier) ? r.tier : "packet",
      weeklyXp: r.weekly_xp,
      pro: r.pro,
      founder: founderHandles.has(r.handle),
      isMe: r.is_me,
      outfit: r.outfit ?? [],
    })),
    result:
      last && isTier(last.from_tier) && isTier(last.to_tier)
        ? { week: last.week, rank: last.rank, weeklyXp: last.weekly_xp, fromTier: last.from_tier, toTier: last.to_tier }
        : null,
  };
}

/**
 * The learner's own rank this week, for the small lesson-complete moment. Lean: just open?, rank and
 * tier, read through the learner's own session (so the standings function decides what they see).
 */
export async function getMyRankAction(): Promise<{ open: boolean; rank: number | null; tier: Tier | null }> {
  await requireUserId();
  const admin = createSupabaseAdminClient();
  const openedAt = await leaguesOpenedAt(admin);
  if (!openedAt) return { open: false, rank: null, tier: null };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("league_standings");
  if (error) throw new Error(`Couldn't load your rank: ${error.message}`);
  const me = (data ?? []).find((r) => r.is_me);
  return { open: true, rank: me?.rank ?? null, tier: me && isTier(me.tier) ? me.tier : null };
}

/** The learner has seen last week's result screen. */
export async function markResultSeenAction(week: string): Promise<void> {
  const userId = await requireUserId();
  const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(week);
  const { error } = await createSupabaseAdminClient()
    .from("league_results")
    .update({ seen_at: new Date().toISOString() })
    .match({ user_id: userId, week: day })
    .is("seen_at", null);
  if (error) throw new Error(`Couldn't save that: ${error.message}`);
}

export async function setShowOnLeaderboardsAction(show: boolean): Promise<void> {
  const userId = await requireUserId();
  await setShowOnLeaderboards(userId, z.boolean().parse(show));
}

export async function reportHandleAction(handle: string, reason: string): Promise<ReportResult> {
  const userId = await requireUserId();
  const parsed = z.object({ handle: z.string().min(1).max(20), reason: z.enum(REPORT_REASONS) }).safeParse({ handle, reason });
  if (!parsed.success) return { ok: false, error: "Please choose a reason." };
  return reportHandle(userId, parsed.data.handle, parsed.data.reason);
}
