import type { ProStatus } from "./entitlement";

/** One plain line about the learner's Pro, from the status the server worked out. */
export function proLine(status: ProStatus, timeZone?: string): string {
  const on = (iso: string | null) =>
    iso ? new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone }).format(new Date(iso)) : null;
  if (status.kind === "none") return status.hadSubscription ? "Your Pro has ended. Your progress is all still here." : "Unlimited lessons every day.";
  if (status.kind === "grant") return `Free for early users until ${on(status.expiresAt)}. Thank you!`;
  const plan = status.interval === "year" ? "Annual" : "Monthly";
  if (status.status === "past_due") return `${plan} plan. A payment didn't go through: update your card to keep Pro.`;
  if (status.cancelling) return `${plan} plan, cancelled. Pro stays until ${on(status.periodEnd)}, and you won't be charged again.`;
  if (status.status === "trialing") return `${plan} plan, free trial until ${on(status.trialEnd)}. You can cancel before then.`;
  return `${plan} plan. Renews on ${on(status.periodEnd)}.`;
}

