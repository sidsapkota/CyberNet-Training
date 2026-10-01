/**
 * The friendly "your trial ends soon" email, sent when Stripe says a trial ends in 3 days
 * (`customer.subscription.trial_will_end`). Pure, so the wording and the rules are tested; the
 * webhook route sends it with Resend.
 */
import { isValidTimeZone } from "@/lib/progress/daily";
import { formatPrice } from "./pricing";
import type { StripeSubscriptionLike } from "./webhook";

export interface TrialReminder {
  subject: string;
  text: string;
  html: string;
}

/** Only a trial that will turn into a paid plan gets a reminder (not one that's already cancelling). */
export function shouldRemindTrial(sub: StripeSubscriptionLike, now: Date): boolean {
  if (sub.status !== "trialing" || sub.cancel_at_period_end || typeof sub.cancel_at === "number") return false;
  return typeof sub.trial_end === "number" && sub.trial_end * 1000 > now.getTime();
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function trialReminderEmail(o: {
  sub: StripeSubscriptionLike;
  /** The learner's nickname, if they chose one. */
  name: string | null;
  timeZone: string | null;
  accountUrl: string;
}): TrialReminder {
  const tz = isValidTimeZone(o.timeZone) ? o.timeZone : "Australia/Sydney";
  const ends = new Intl.DateTimeFormat("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: tz }).format(
    new Date((o.sub.trial_end ?? 0) * 1000),
  );
  const price = o.sub.items.data[0]?.price;
  const interval = price?.recurring?.interval === "year" ? "annual" : "monthly";
  const amount = typeof price?.unit_amount === "number" && price.currency ? formatPrice(price.unit_amount, price.currency) : null;
  const greeting = o.name ? `Hi ${o.name},` : "Hi,";

  const paragraphs = [
    greeting,
    `A quick heads-up: your 7-day free trial of CyberNet Pro ends on ${ends}.`,
    amount
      ? `If you keep Pro, your ${interval} plan starts then and ${amount} is charged to the card you added.`
      : `If you keep Pro, your ${interval} plan starts then and the first payment is charged to the card you added.`,
    `Don't want to keep it? Cancel before then on your account page (Manage subscription): ${o.accountUrl}. You won't be charged, and all your progress stays.`,
    "Thanks for learning with us,\nCyberNet Training",
  ];
  return {
    subject: `Your CyberNet Pro trial ends on ${ends}`,
    text: paragraphs.join("\n\n"),
    html: paragraphs.map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("\n"),
  };
}
