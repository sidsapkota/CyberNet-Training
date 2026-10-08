/**
 * Founding Member: a one-off payment for lifetime Pro (for as long as CyberNet Training runs), for
 * the first 50 buyers. Pure rules, shared by the server and the UI, unit-tested.
 *
 * Honest by construction: the counter is the database's real count, the comparison is worked out
 * from Stripe's live prices (never a made-up "was" price), and the offer simply disappears once
 * every seat is sold.
 */
import { formatPrice, type StripePrice, shortPrice } from "./pricing";

export const FOUNDER_SEATS = 50;

/** The founding price as Stripe has it (a one-off price, in cents). */
export interface OneOffPrice {
  unitAmount: number;
  currency: string;
}

/** The counter, from `founder_seats()`. */
export interface FounderSeats {
  sold: number;
  held: number;
  total: number;
}

export interface FounderCounter {
  /** Seats not sold yet ("37 of 50 left"). */
  left: number;
  total: number;
  /** Every seat is sold: the offer is gone everywhere. */
  soldOut: boolean;
  /** Not sold out, but every remaining seat is held by someone in Checkout right now. */
  allHeld: boolean;
}

export function founderCounter(seats: FounderSeats): FounderCounter {
  const total = Math.max(0, seats.total);
  const left = Math.max(0, total - Math.max(0, seats.sold));
  return { left, total, soldOut: left === 0, allHeld: left > 0 && Math.max(0, seats.held) >= left };
}

/** "37 of 50 left". */
export function seatsLeftText(c: FounderCounter): string {
  return `${c.left} of ${c.total} left`;
}

/** Until this many seats are sold, the counter shows no number (see seatCounterText). */
export const COUNTER_SHOWS_FROM = 5;

/**
 * The seat counter everywhere: "First 50 learners only" until 5 seats are sold, then the real
 * "37 of 50 left". Both are true; nothing is ever made up. `short` is for one-line spots.
 */
export function seatCounterText(c: FounderCounter, short = false): string {
  if (c.total - c.left < COUNTER_SHOWS_FROM) return short ? `First ${c.total} only` : `First ${c.total} learners only`;
  return short ? `${c.left} left` : seatsLeftText(c);
}

export interface FounderCopy {
  /** "A$29". */
  price: string;
  /** "Lifetime Pro for A$29, less than 4 months of the monthly plan". */
  headline: string;
  /** "A year of monthly is A$95.88. This is A$29, once." */
  comparison: string;
}

/**
 * The offer's words, from the live prices. "Less than N months" is the smallest whole number of
 * monthly payments that costs more than the one-off price, so it's always true. Without a
 * comparable monthly price (another currency), only the plain headline.
 */
export function founderCopy(founder: OneOffPrice, monthly: StripePrice | null): FounderCopy {
  const price = shortPrice(founder.unitAmount, founder.currency);
  const comparable = monthly !== null && monthly.interval === "month" && monthly.unitAmount > 0 && monthly.currency.toLowerCase() === founder.currency.toLowerCase();
  if (!comparable) return { price, headline: `Lifetime Pro for ${price}`, comparison: `${price}, once. Nothing to renew.` };
  const months = Math.floor(founder.unitAmount / monthly.unitAmount) + 1;
  const year = formatPrice(monthly.unitAmount * 12, monthly.currency);
  return {
    price,
    headline: `Lifetime Pro for ${price}, less than ${months} ${months === 1 ? "month" : "months"} of the monthly plan`,
    comparison: `A year of monthly is ${year}. This is ${price}, once.`,
  };
}

/** What the browser gets about the offer (`/api/pro/founder`); null when there's no offer. */
export interface FounderOffer extends FounderCopy {
  counter: FounderCounter;
}

/**
 * The offer is on only with the flag (FOUNDER_OFFER=on) and a founding price. Off by default, so
 * it ships dark until the owner turns it on in Vercel.
 */
export function founderOfferOn(env: { flag?: string; price?: string }): boolean {
  return env.flag?.trim().toLowerCase() === "on" && /^price_[A-Za-z0-9]+$/.test(env.price?.trim() ?? "");
}

/** Who sees the offer: guests, free learners and early-user grant holders; never anyone on a subscription or already a founder. */
export function showFounderOffer(offer: FounderOffer | null | undefined, pro: { loading: boolean; kind?: string } | null): offer is FounderOffer {
  if (!offer || offer.counter.soldOut) return false;
  if (pro === null) return true; // a guest
  if (pro.loading) return false; // never flash it at a subscriber while their status loads
  return pro.kind === "none" || pro.kind === "grant";
}

/**
 * The screens the offer shows on (the founder events carry one, nothing else). "continue" is /pro
 * after a guest signed in to buy: one tap from secure checkout.
 */
export const FOUNDER_SCREENS = ["pro_page", "paywall", "limit", "dashboard", "landing", "continue", "parent"] as const;
export type FounderScreen = (typeof FOUNDER_SCREENS)[number];

export function founderEventData(screen: string): Record<string, string> {
  return (FOUNDER_SCREENS as readonly string[]).includes(screen) ? { source: screen } : {};
}

/** Why a founding checkout couldn't start (sent as `founder_checkout_error`'s `reason`). */
export const FOUNDER_ERRORS = ["age", "has_pro", "founder", "all_held", "off", "stripe", "network"] as const;
export type FounderError = (typeof FOUNDER_ERRORS)[number];

/** `founder_checkout_error`'s data: the screen and the reason code, nothing else. */
export function founderErrorData(screen: string, reason: string): Record<string, string> {
  return { ...founderEventData(screen), ...((FOUNDER_ERRORS as readonly string[]).includes(reason) ? { reason } : {}) };
}

/** What the learner reads for each reason: friendly, and what to do next. */
export const FOUNDER_ERROR_TEXT: Record<FounderError, string> = {
  age: "One quick check before checkout: please confirm you're 13 or older.",
  has_pro: "You already have Pro. You can manage it from Your plan.",
  founder: "You're already a Founding Member. Enjoy lifetime Pro!",
  all_held: "The last spots are in other people's checkouts right now. They free up within 30 minutes, so try again soon.",
  off: "The Founding Member offer has ended.",
  stripe: "Stripe's checkout didn't open. Nothing was charged. Please try again.",
  network: "We couldn't reach checkout. Check your connection and try again.",
};

/** Reasons where trying again can work. */
export const FOUNDER_RETRYABLE: ReadonlySet<FounderError> = new Set(["all_held", "stripe", "network"]);

/** Where /pro sends a guest who wants to buy, so they come back one tap from checkout. */
export const FOUNDER_CONTINUE_QUERY = "buy=founder";
export const FOUNDER_SIGN_IN_PATH = `/login?next=${encodeURIComponent(`/pro?${FOUNDER_CONTINUE_QUERY}`)}`;

/** Whether this page was opened to finish a founding purchase (after signing in). */
export function isFounderContinue(search: string): boolean {
  return new URLSearchParams(search).get("buy") === "founder";
}

// ── Stripe: a paid founding session, and its refund ─────────────────────────

/** Marks our founding Checkout sessions (set by the server when it creates one). */
export const FOUNDER_METADATA = { offer: "founder" } as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const idOf = (v: unknown): string | null =>
  typeof v === "string" ? v : v && typeof v === "object" && typeof (v as { id?: unknown }).id === "string" ? (v as { id: string }).id : null;

export interface FounderPurchase {
  userId: string;
  sessionId: string;
  paymentIntentId: string;
  amountTotal: number;
  currency: string;
}

/**
 * A completed Checkout session that bought a founding seat, or null. Only sessions this server
 * made (payment mode, our metadata, the learner as client_reference_id) that Stripe says are paid.
 */
export function founderPurchaseOf(session: Record<string, unknown>): FounderPurchase | null {
  const metadata = (session.metadata ?? {}) as Record<string, unknown>;
  if (session.mode !== "payment" || metadata.offer !== FOUNDER_METADATA.offer) return null;
  if (session.payment_status !== "paid") return null;
  const userId = typeof session.client_reference_id === "string" ? session.client_reference_id : null;
  const sessionId = idOf(session.id);
  const paymentIntentId = idOf(session.payment_intent);
  if (!userId || !UUID.test(userId) || !sessionId || !paymentIntentId) return null;
  if (typeof session.amount_total !== "number" || typeof session.currency !== "string") return null;
  return { userId, sessionId, paymentIntentId, amountTotal: session.amount_total, currency: session.currency };
}

/** The payment a charge.refunded event fully refunded, or null (a partial refund keeps the seat). */
export function fullyRefundedPayment(charge: Record<string, unknown>): string | null {
  if (charge.refunded !== true) return null;
  const payment = idOf(charge.payment_intent);
  return payment && /^pi_[A-Za-z0-9]+$/.test(payment) ? payment : null;
}

// ── "Send to a parent": a one-time link a parent opens on their own device to pay ──

/** How long a parent link works, and how many a learner can make in a day. */
export const PARENT_LINK_DAYS = 7;
export const PARENT_LINKS_PER_DAY = 5;

export type ParentLinkState = "ok" | "unknown" | "expired" | "paid" | "has_pro" | "off";

/**
 * Whether a parent link can still pay: it exists, isn't past its 7 days, hasn't paid, the learner
 * doesn't already have Pro (a subscription or a seat), and the offer is still on.
 */
export function parentLinkState(
  link: { expiresAt: string; paidAt: string | null } | null,
  learner: { hasProNow: boolean },
  offerOn: boolean,
  now: Date,
): ParentLinkState {
  if (!link) return "unknown";
  if (link.paidAt) return "paid";
  if (Date.parse(link.expiresAt) <= now.getTime()) return "expired";
  if (learner.hasProNow) return "has_pro";
  if (!offerOn) return "off";
  return "ok";
}

/** What the parent reads when a link can't pay. */
export const PARENT_LINK_TEXT: Record<Exclude<ParentLinkState, "ok">, string> = {
  unknown: "This link doesn't work. Ask for a new one.",
  expired: "This link has expired (links work for 7 days). Ask for a new one.",
  paid: "This link has already been used: lifetime Pro is on the account. Thank you!",
  has_pro: "This account already has Pro, so there's nothing to pay.",
  off: "The Founding Member offer has ended.",
};

/** parent_link_created / parent_link_paid data: the screen only (no ids, nothing personal). */
export function parentLinkEventData(screen: string): Record<string, string> {
  return founderEventData(screen);
}
