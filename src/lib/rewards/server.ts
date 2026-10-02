import "server-only";
/**
 * Rewards on the server, with the secret key (learners can only read their own rows). Callers pass
 * a verified user id. Spins and milestone items are derived from real progress (passed quizzes,
 * goal days); spins are recorded once each, and the prize is picked here, never in the browser.
 */
import { getCourses } from "@/lib/content/server";
import { goalDayFromRow } from "@/lib/progress/rows";
import { localDay } from "@/lib/progress/daily";
import { computeStreak } from "@/lib/progress/streak";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { earnedSpins, type Milestones, milestonesFrom, ownedItems, pickReward, validOutfit } from "./rules";

export interface RewardsState {
  /** Item ids worn, one per slot (shown through `effectiveOutfit`). */
  outfit: string[];
  /** Spin item ids won (free, milestone and Pro items are added by `ownedItems`). */
  won: string[];
  /** Spins earned but not spun yet (some may be saved for new items: `spinCounts`). */
  waiting: number;
  milestones: Milestones;
}

function fail(message: string, error: { message: string } | null | undefined): asserts error is null | undefined {
  if (error) throw new Error(`${message}: ${error.message}`);
}

/** Passed quizzes and the longest streak: what spins and milestone items come from. */
async function readProgress(userId: string, now: Date) {
  const admin = createSupabaseAdminClient();
  const [quizzes, goalDays, profile] = await Promise.all([
    admin.from("quiz_attempts").select("quiz_id").eq("user_id", userId).eq("passed", true),
    admin.from("goal_days").select("day, time_zone, goal, met_at").eq("user_id", userId),
    admin.from("profiles").select("time_zone").eq("id", userId).maybeSingle(),
  ]);
  fail("Couldn't read progress for rewards", quizzes.error ?? goalDays.error ?? profile.error);
  const tz = profile.data?.time_zone ?? "Australia/Sydney";
  const days = Object.fromEntries((goalDays.data ?? []).map(goalDayFromRow).filter((g) => g !== null));
  const streak = computeStreak(days, { day: localDay(now, tz), tz });
  return { passedQuizIds: new Set((quizzes.data ?? []).map((q) => q.quiz_id)), courses: getCourses(), longestStreak: streak.longest };
}

export async function getRewards(userId: string, now = new Date()): Promise<RewardsState> {
  const admin = createSupabaseAdminClient();
  const [profile, owned, spins, progress] = await Promise.all([
    admin.from("profiles").select("outfit").eq("id", userId).maybeSingle(),
    admin.from("reward_items_owned").select("item_id").eq("user_id", userId),
    admin.from("reward_spins").select("earned_for").eq("user_id", userId).is("spun_at", null),
    readProgress(userId, now),
  ]);
  fail("Couldn't read rewards", profile.error ?? owned.error ?? spins.error);
  return {
    outfit: profile.data?.outfit ?? [],
    won: (owned.data ?? []).map((r) => r.item_id),
    waiting: (spins.data ?? []).length,
    milestones: milestonesFrom(progress),
  };
}

/** Records every spin the learner has earned so far (idempotent). Returns how many are waiting. */
export async function claimSpins(userId: string, now = new Date()): Promise<number> {
  const admin = createSupabaseAdminClient();
  const keys = earnedSpins(await readProgress(userId, now));
  if (keys.length > 0) {
    const { error } = await admin
      .from("reward_spins")
      .upsert(keys.map((earned_for) => ({ user_id: userId, earned_for })), { onConflict: "user_id,earned_for", ignoreDuplicates: true });
    fail("Couldn't record spins", error);
  }
  const waiting = await admin.from("reward_spins").select("earned_for", { count: "exact", head: true }).eq("user_id", userId).is("spun_at", null);
  fail("Couldn't count spins", waiting.error);
  return waiting.count ?? 0;
}

export type SpinResult = { ok: true; itemId: string; waiting: number } | { ok: false; error: string };

/**
 * Spins the oldest waiting spin: the server picks an unowned spin item with equal chance. With
 * nothing left to win, the spin isn't used: it stays saved for new items.
 */
export async function spinReward(userId: string, hasPro: boolean, random: () => number = Math.random): Promise<SpinResult> {
  const admin = createSupabaseAdminClient();
  for (let attempt = 0; attempt < 3; attempt++) {
    const next = await admin.from("reward_spins").select("earned_for").eq("user_id", userId).is("spun_at", null).order("earned_at").limit(1).maybeSingle();
    fail("Couldn't read spins", next.error);
    if (!next.data) return { ok: false, error: "No spins waiting. Finish a module or keep your streak going to earn one." };
    const state = await getRewards(userId);
    const itemId = pickReward(ownedItems(state.won, hasPro, state.milestones), random);
    if (!itemId) return { ok: false, error: "You've won every spin item. Your spins are saved for new items." };
    // Only this request may use this spin (two taps at once can't both win).
    const used = await admin
      .from("reward_spins")
      .update({ spun_at: new Date().toISOString(), item_id: itemId })
      .match({ user_id: userId, earned_for: next.data.earned_for })
      .is("spun_at", null)
      .select("earned_for");
    fail("Couldn't use the spin", used.error);
    if ((used.data ?? []).length === 0) continue;
    const { error } = await admin.from("reward_items_owned").upsert({ user_id: userId, item_id: itemId, source: "spin" }, { onConflict: "user_id,item_id", ignoreDuplicates: true });
    fail("Couldn't save the reward", error);
    return { ok: true, itemId, waiting: Math.max(0, state.waiting - 1) };
  }
  return { ok: false, error: "Couldn't spin. Please try again." };
}

/** Saves an outfit: every item owned (free, won, milestones, Pro while Pro), at most one per slot. */
export async function setOutfit(userId: string, outfit: readonly string[], hasPro: boolean): Promise<{ ok: boolean }> {
  const state = await getRewards(userId);
  if (!validOutfit(outfit, ownedItems(state.won, hasPro, state.milestones))) return { ok: false };
  const { error } = await createSupabaseAdminClient().from("profiles").update({ outfit: [...outfit] }).eq("id", userId);
  fail("Couldn't save the outfit", error);
  return { ok: true };
}
