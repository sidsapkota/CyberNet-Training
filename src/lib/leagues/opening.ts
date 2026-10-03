/**
 * The one-time "leagues are open" celebration: shown once per device, the first time a signed-in
 * learner opens the app after leagues have opened. Remembered in localStorage, like the Pro
 * welcome (ProCelebration), so there's no database column and nothing syncs. Pure helpers here are
 * tested; the dialog lives in src/components/leagues/LeaguesOpening.tsx.
 */
import type { LeaguesStatus } from "./useLeaguesOpen";

/** Per-device, per-learner key recording that this device has seen the opening celebration. */
export const leaguesOpenSeenKey = (userId: string): string => `cybernet.leaguesOpenSeen.${userId}`;

/**
 * Whether to show the opening celebration now: the learner is on the dashboard, leagues are open,
 * they're signed in, and this device hasn't shown it yet. `seen` is the stored value (any non-null
 * string means seen). `onDashboard` keeps it off lessons, sign-in and onboarding — it only greets
 * them once they're back on the dashboard. While the open flag is still loading ("loading"), never
 * show it, so it can't flash and then vanish.
 */
export function shouldShowOpening(args: { status: LeaguesStatus; userId: string | null; seen: string | null; onDashboard: boolean }): boolean {
  return args.onDashboard && args.status === "open" && args.userId !== null && args.seen === null;
}
