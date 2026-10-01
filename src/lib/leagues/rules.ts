/** Small league rules, pure so they're tested on their own. */
import { LEAGUES_MIN_ACTIVE, REPORTS_TO_REPLACE } from "./config";
import type { Tier } from "./tiers";
import { tierIndex } from "./tiers";

/**
 * Leagues open the first week `LEAGUES_MIN_ACTIVE` learners earn XP, and then stay open (the
 * weekly count restarts at 0 every Monday, which would otherwise hide them every week).
 */
export function shouldOpenLeagues(activeThisWeek: number, openedAt: string | null): boolean {
  return openedAt === null && activeThisWeek >= LEAGUES_MIN_ACTIVE;
}

/** A username is replaced with a generated one once this many different learners report it. */
export function shouldReplaceHandle(distinctReporters: number): boolean {
  return distinctReporters >= REPORTS_TO_REPLACE;
}


export type WeekOutcome = "promoted" | "stayed" | "demoted";

export function outcomeOf(fromTier: Tier, toTier: Tier): WeekOutcome {
  const d = tierIndex(toTier) - tierIndex(fromTier);
  return d > 0 ? "promoted" : d < 0 ? "demoted" : "stayed";
}
