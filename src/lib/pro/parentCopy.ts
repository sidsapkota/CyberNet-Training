/**
 * Every line "Send to a parent" shows, in one place (owner, 19 Oct 2026): written for the adult,
 * neutral and factual (what CyberNet is, what Pro includes, the price, cancel and refund terms), with
 * no pressure, urgency or pester wording aimed at the learner. parentCopy.test.ts screens it for
 * pressure words. Facts here must match content/legal/terms.md and privacy.md.
 */
import { CONTACT_EMAIL } from "@/lib/site";

/** The small link under the lifetime button (the learner sees it). */
export const PARENT_LINK_LABEL = "Send the details to a parent";

/** Shown to the learner once the link is made. */
export const PARENT_LINK_MADE =
  "This link opens a page for a parent or guardian: what CyberNet is, what Pro includes, the price and the terms. It works for 7 days and pays once.";

/** The text that goes with the link when it's shared or copied (the adult reads it). */
export const PARENT_SHARE_TEXT =
  "CyberNet Training is a website that teaches online safety and how technology works, for ages 13 and up. This page has what its Pro plan includes, the price and the refund terms:";

/** One line about the site, for the adult. */
export const ABOUT_CYBERNET =
  "CyberNet Training is a website with short, hands-on lessons on online safety and how technology works: passwords and scams, devices, the internet and AI. It's for ages 13 and up, and no experience is needed.";

export const WITHOUT_PRO = "Without Pro, every course stays free to use, with up to 3 new lessons a day.";

/** The one-off price, said plainly. */
export function lifetimeTerms(price: string): string {
  return `One payment of ${price}. It isn't a subscription: nothing renews and there are no further charges. Pro stays on the account for as long as CyberNet Training runs.`;
}

export const REFUND_TERMS = `No refunds for a change of mind, except where the law requires one. Your rights under the Australian Consumer Law always apply. Questions: ${CONTACT_EMAIL}.`;

export const PAYMENT_NOTE = "No account needed. Stripe handles the payment and emails you the receipt; CyberNet never sees card details.";

export const SUBSCRIPTION_TERMS = [
  "The first subscription starts with a 7-day free trial; cancel before it ends and nothing is charged.",
  "Subscriptions renew automatically until cancelled. Cancel any time from the account page (Manage subscription): Pro stays until the end of the paid period, with no further charges.",
  "Deleting the account cancels any subscription straight away.",
] as const;

export const PRIVACY_FACTS = [
  "We keep an email address, a made-up username, learning progress and settings. No real names, photos or dates of birth.",
  "No ads, no tracking cookies, and we never sell or rent anyone's information.",
  "Card details go to Stripe, never to us.",
] as const;

export const SAFETY_FACTS = [
  "Accounts are for ages 13 and up. Anyone can try a course's first lesson without an account.",
  "There's no chat, messaging or public profile. Usernames are checked so they can't be real names, contact details or rude words, and learners can hide from leaderboards.",
  "Reactions in friend challenges come from a fixed list: there's no free text anywhere.",
  "Reminder emails are off unless the learner turns them on.",
  "Lessons about getting help (after a scam or a hacked account) are always free.",
] as const;

/** Every sentence above, for the wording test. */
export const ALL_PARENT_COPY: readonly string[] = [
  PARENT_LINK_LABEL,
  PARENT_LINK_MADE,
  PARENT_SHARE_TEXT,
  ABOUT_CYBERNET,
  WITHOUT_PRO,
  lifetimeTerms("A$29"),
  REFUND_TERMS,
  PAYMENT_NOTE,
  ...SUBSCRIPTION_TERMS,
  ...PRIVACY_FACTS,
  ...SAFETY_FACTS,
];
