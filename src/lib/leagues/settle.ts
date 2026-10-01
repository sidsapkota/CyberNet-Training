/**
 * The weekly result of one league: ranks, and who moves up or down. Pure: the weekly job runs it
 * on the server from xp_events, then `finalize_league_week` saves it in one transaction.
 *
 * - Ranked by weekly XP; ties go to whoever got there first, then the handle (A to Z).
 * - Learners hidden from leaderboards aren't ranked and keep their tier.
 * - The top 20% move up (at least 1, in leagues of 3+), if they earned at least 50 XP.
 * - The bottom 15% move down (at least 1, in leagues of 6+).
 * - Nobody goes above Quantum or below Packet, so a 0 XP week never drops a learner below Packet.
 * - Learners who don't play a week aren't in a league, so their tier stays the same.
 */
import { DEMOTE_MIN_LEAGUE, DEMOTE_SHARE, PROMOTE_MIN_LEAGUE, PROMOTE_MIN_XP, PROMOTE_SHARE } from "./config";
import { moveTier, type Tier } from "./tiers";

export interface LeagueEntry {
  userId: string;
  handle: string;
  weeklyXp: number;
  /** When they earned their last XP of the week (epoch ms), for ties. */
  lastAt: number | null;
  visible: boolean;
}

export interface LeagueOutcome {
  userId: string;
  rank: number;
  weeklyXp: number;
  fromTier: Tier;
  toTier: Tier;
}

/** How many move up and down in a league of `size` ranked learners. */
export function zoneSizes(size: number, tier: Tier): { up: number; down: number } {
  let up = size >= PROMOTE_MIN_LEAGUE ? Math.max(1, Math.floor(size * PROMOTE_SHARE)) : 0;
  let down = size >= DEMOTE_MIN_LEAGUE ? Math.max(1, Math.floor(size * DEMOTE_SHARE)) : 0;
  if (tier === "quantum") up = 0;
  if (tier === "packet") down = 0;
  // Never let the zones overlap.
  if (up + down > size) down = Math.max(0, size - up);
  return { up, down };
}

/** Ranks in the order the database's `league_standings()` uses. */
export function rankEntries<T extends Pick<LeagueEntry, "weeklyXp" | "lastAt" | "handle">>(entries: readonly T[]): T[] {
  return [...entries].sort(
    (a, b) =>
      b.weeklyXp - a.weeklyXp ||
      (a.lastAt ?? Number.POSITIVE_INFINITY) - (b.lastAt ?? Number.POSITIVE_INFINITY) ||
      (a.handle < b.handle ? -1 : a.handle > b.handle ? 1 : 0),
  );
}

/** Whether rank `rank` (1-based) is in the promotion zone, the demotion zone, or neither. */
export function zoneOf(rank: number, size: number, tier: Tier, weeklyXp: number): "up" | "down" | null {
  const { up, down } = zoneSizes(size, tier);
  if (rank <= up && weeklyXp >= PROMOTE_MIN_XP) return "up";
  if (down > 0 && rank > size - down) return "down";
  return null;
}

export function settleLeague(entries: readonly LeagueEntry[], tier: Tier): LeagueOutcome[] {
  const ranked = rankEntries(entries.filter((e) => e.visible));
  return ranked.map((e, i) => {
    const rank = i + 1;
    const zone = zoneOf(rank, ranked.length, tier, e.weeklyXp);
    return { userId: e.userId, rank, weeklyXp: e.weeklyXp, fromTier: tier, toTier: moveTier(tier, zone === "up" ? 1 : zone === "down" ? -1 : 0) };
  });
}
