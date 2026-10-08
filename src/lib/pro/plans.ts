/**
 * The plans section (Free and Pro) and Pro identity: what each plan lists, the two plan events, and
 * when to celebrate a new subscription. Pure. Every benefit listed here must be live in production:
 * never list one that isn't.
 */
import { DAILY_LESSON_LIMIT } from "./dailyLimit";
import { FREE_MAX_FREEZES, PRO_MAX_FREEZES, type ProInterval } from "./entitlement";

/** Pro's benefits, four at most (all live: see CLAUDE.md → CyberNet Pro). */
export const PRO_BENEFITS = [
  "Unlimited lessons every day",
  "Review your mistakes",
  "Certificates for every course",
  "An extra streak freeze",
] as const;

/** What the free plan gives, in three short lines. */
export const FREE_BENEFITS = [`${DAILY_LESSON_LIMIT} new lessons a day`, "Every course", "Streaks and XP"] as const;

/** A cell in the Free vs Pro table: included (a tick), not included (a dash), or a short value. */
export type PlanCell = boolean | string;

/**
 * /pro's Free vs Pro table, unlimited lessons first. Every row is live in production (the same
 * benefits as PRO_BENEFITS, plus the Pro avatar items: the circuit crown and the cape).
 */
export const PLAN_TABLE: readonly { feature: string; free: PlanCell; pro: PlanCell }[] = [
  { feature: "Unlimited lessons every day", free: `${DAILY_LESSON_LIMIT} a day`, pro: true },
  { feature: "Review your mistakes", free: false, pro: true },
  { feature: "Certificates for every course", free: false, pro: true },
  { feature: "Streak freezes", free: `Up to ${FREE_MAX_FREEZES}`, pro: `Up to ${PRO_MAX_FREEZES}` },
  { feature: "Pro avatar items", free: false, pro: true },
];

/** The one Pro box's three ways to pay: Lifetime (Founding Member, while seats remain), Yearly or Monthly. */
export type ProChoice = "lifetime" | "annual" | "monthly";

/** What's offered, in order: Lifetime only while the Founding Member offer is showing. */
export function proChoices(founder: boolean): ProChoice[] {
  return founder ? ["lifetime", "annual", "monthly"] : ["annual", "monthly"];
}

/** Selected at first: Lifetime while seats remain, otherwise Yearly. */
export function defaultChoice(founder: boolean): ProChoice {
  return founder ? "lifetime" : "annual";
}

/** "Best value": Lifetime while it's offered; once it's gone, Yearly, but only if it really saves. */
export function bestValueChoice(founder: boolean, annualSaves: boolean): ProChoice | null {
  return founder ? "lifetime" : annualSaves ? "annual" : null;
}

/** Under the button: what the choice means, then the parent line. Lifetime has nothing to cancel. */
export function choiceNote(choice: ProChoice): string {
  return choice === "lifetime" ? "Pay once · Under 18? Ask a parent" : "Cancel anytime · Under 18? Ask a parent";
}

/** Where the plans section was opened from (`plans_viewed`'s `source`). */
export type PlansSource = "pro_page" | "account" | "dashboard" | "nav";
const SOURCES = new Set<string>(["pro_page", "account", "dashboard", "nav"]);

/** `?from=` on /pro, from a link elsewhere in the app; anything else is the page itself. */
export function plansSourceFrom(search: string): PlansSource {
  const from = new URLSearchParams(search).get("from");
  return from && SOURCES.has(from) && from !== "pro_page" ? (from as PlansSource) : "pro_page";
}

/** `plans_viewed`'s properties: the screen it was opened from, nothing else. */
export function plansViewedData(source: string): Record<string, string> {
  return SOURCES.has(source) ? { source } : {};
}

/** `plan_selected`'s properties: free or pro, and for Pro, monthly, annual or lifetime. Nothing else. */
export function planSelectedData(plan: string, interval?: string): Record<string, string> {
  if (plan === "free") return { plan };
  if (plan !== "pro") return {};
  return interval === "monthly" || interval === "annual" || interval === "lifetime" ? { plan, interval } : { plan };
}

/** A subscription this new still gets the welcome moment on a device that hasn't shown it. */
export const CELEBRATE_WITHIN_MS = 14 * 24 * 60 * 60 * 1000;

/** The start of the learner's current Pro time (the latest interval that's still open). */
export function currentProStart(intervals: readonly ProInterval[], now: number): string | null {
  const live = intervals.filter((i) => i.start <= now && (i.end === null || i.end > now)).sort((a, b) => b.start - a.start)[0];
  return live ? new Date(live.start).toISOString() : null;
}

/**
 * Whether to celebrate now: a subscription (not the early-user grant, which has its own thank-you)
 * that started in the last two weeks, and this device hasn't celebrated that start yet.
 */
export function shouldCelebrate(subscribed: boolean, start: string | null, celebrated: string | null, now: number): boolean {
  if (!subscribed || !start || celebrated === start) return false;
  const at = Date.parse(start);
  return !Number.isNaN(at) && now - at <= CELEBRATE_WITHIN_MS;
}

/** Per device, per account: the Pro start already celebrated here. */
export const celebratedKey = (userId: string) => `cybernet.proCelebrated.${userId}`;
