/**
 * The small "You moved up to #N" moment on the lesson-complete screen. It compares the learner's
 * current league rank with the rank the last time they finished a lesson (kept per device in
 * localStorage, like the other league memories), and celebrates only an improvement. Pure helpers
 * here are tested; the component is src/components/leagues/LeagueRankMoment.tsx.
 */

/** Per-device, per-learner key holding the learner's rank as of their last finished lesson. */
export const leagueRankKey = (userId: string): string => `cybernet.leagueRank.${userId}`;

/**
 * The rank to celebrate, or null. A lower number is a better rank, so an improvement is
 * `current < previous`. Returns null when there's nothing to compare (no previous rank, or the
 * learner isn't ranked), or when they didn't move up. The caller stores `current` afterwards so the
 * next lesson compares against this one.
 */
export function rankImprovement(previous: number | null, current: number | null): number | null {
  if (current === null || previous === null) return null;
  return current < previous ? current : null;
}

/** Reads the stored rank for this device (null if none or storage is blocked). */
export function readStoredRank(userId: string): number | null {
  try {
    const raw = localStorage.getItem(leagueRankKey(userId));
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/** Stores the learner's current rank for next time (no-op if storage is blocked). */
export function storeRank(userId: string, rank: number): void {
  try {
    localStorage.setItem(leagueRankKey(userId), String(rank));
  } catch {
    // storage blocked: the moment just won't show next time, which is harmless
  }
}
