/**
 * Grouping learners with similar activity. Tier comes first (learners only ever share a league
 * with their own tier); within it, an activity band from recent weeks. The database places the
 * learner atomically (`join_league`): the first league in their tier with space, trying these
 * bands in order, and a new league only when every one is full. So a small player base fills a
 * few leagues instead of splitting into many tiny ones.
 */
import { BAND_KEEN_XP, BAND_REGULAR_XP, BAND_WEEKS } from "./config";

export const BANDS = ["light", "regular", "keen"] as const;
export type Band = (typeof BANDS)[number];

/** The band from recent finished weeks' XP (newest first; missing weeks count as 0). New: light. */
export function bandFor(recentWeeklyXp: readonly number[]): Band {
  const weeks = recentWeeklyXp.slice(0, BAND_WEEKS);
  if (weeks.length === 0) return "light";
  const average = weeks.reduce((sum, xp) => sum + Math.max(0, xp), 0) / BAND_WEEKS;
  if (average >= BAND_KEEN_XP) return "keen";
  if (average >= BAND_REGULAR_XP) return "regular";
  return "light";
}

/** Which leagues to try, in order: the learner's own band, then the nearest. */
export function bandPreference(band: Band): Band[] {
  if (band === "regular") return ["regular", "light", "keen"];
  if (band === "keen") return ["keen", "regular", "light"];
  return ["light", "regular", "keen"];
}

/**
 * The same placement rule as `join_league`, for tests and simulations: the first league in the
 * tier with space, in band preference order then oldest first; otherwise a new league.
 */
export function placeLearner(
  leagues: readonly { id: string; band: Band; size: number; createdAt: number }[],
  band: Band,
  cap: number,
): { join: string } | { create: Band } {
  const order = bandPreference(band);
  const open = leagues
    .filter((l) => l.size < cap)
    .sort((a, b) => order.indexOf(a.band) - order.indexOf(b.band) || a.createdAt - b.createdAt);
  return open[0] ? { join: open[0].id } : { create: band };
}
