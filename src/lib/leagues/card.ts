/**
 * Which leagues card the dashboard shows. Pure, so it's tested. While leagues are closed, everyone
 * sees "Leagues open soon" (guests with a create-account button); once they open, signed-in learners
 * see their league and guests are invited to join. Nothing shows on a copy without accounts.
 */
import type { LeaguesStatus } from "./useLeaguesOpen";

export type LeagueCardState = "hidden" | "loading" | "soon" | "soon-guest" | "open" | "open-guest";

export function leagueCardState(accountsAvailable: boolean, signedIn: boolean, status: LeaguesStatus): LeagueCardState {
  if (!accountsAvailable) return "hidden";
  if (status === "loading") return "loading";
  if (status === "closed") return signedIn ? "soon" : "soon-guest";
  return signedIn ? "open" : "open-guest";
}

/** The learner's own row in this week's standings, if they've joined a league yet. */
export function myStanding<T extends { isMe: boolean }>(standings: readonly T[]): T | null {
  return standings.find((row) => row.isMe) ?? null;
}
