/**
 * What the Stripe webhook does with each event. The route (src/app/api/stripe/webhook/route.ts)
 * verifies the signature first; this decides what to save. Written against small interfaces, so
 * it's tested with fakes (duplicates, out-of-order events, every event type).
 *
 * - **Idempotent:** an event id already handled is skipped.
 * - **Order doesn't matter:** for anything about a subscription, the latest state is fetched from
 *   Stripe and saved, whatever the event said. An old event arriving late just re-saves the
 *   current truth.
 * - Only subscriptions (mode "subscription") are handled; nothing else is ever charged.
 */
import type { SubscriptionStatus } from "./entitlement";

/** The fields of a Stripe Subscription we use (API 2026-08-26: the period lives on the item). */
export interface StripeSubscriptionLike {
  id: string;
  customer: string | { id: string };
  status: string;
  metadata?: Record<string, string> | null;
  cancel_at_period_end: boolean;
  cancel_at?: number | null;
  trial_end: number | null;
  start_date: number;
  ended_at: number | null;
  items: {
    data: {
      current_period_end?: number | null;
      price: { id: string; recurring?: { interval?: string } | null };
    }[];
  };
}

export interface StripeEventLike {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  customer_id: string;
  status: SubscriptionStatus;
  price_id: string;
  billing_interval: "month" | "year" | null;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  started_at: string;
  ended_at: string | null;
  synced_at: string;
}

export interface WebhookDeps {
  isProcessed(eventId: string): Promise<boolean>;
  markProcessed(eventId: string, type: string): Promise<void>;
  /** The subscription as Stripe has it now (null if Stripe doesn't know it). */
  retrieveSubscription(id: string): Promise<StripeSubscriptionLike | null>;
  saveSubscription(row: SubscriptionRow): Promise<void>;
  linkCustomer(userId: string, customerId: string): Promise<void>;
  userForCustomer(customerId: string): Promise<string | null>;
  now(): Date;
}

export type WebhookOutcome = "processed" | "duplicate" | "ignored";

const STATUSES: readonly SubscriptionStatus[] = [
  "incomplete",
  "incomplete_expired",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "paused",
];
const isoFromUnix = (s: number | null | undefined) => (typeof s === "number" ? new Date(s * 1000).toISOString() : null);
const idOf = (v: unknown): string | null =>
  typeof v === "string" ? v : v && typeof v === "object" && typeof (v as { id?: unknown }).id === "string" ? (v as { id: string }).id : null;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A Stripe subscription as a row for our table. */
export function toSubscriptionRow(sub: StripeSubscriptionLike, userId: string, now: Date): SubscriptionRow {
  const item = sub.items.data[0];
  if (!item) throw new Error(`Subscription ${sub.id} has no items`);
  const status = STATUSES.includes(sub.status as SubscriptionStatus) ? (sub.status as SubscriptionStatus) : "incomplete";
  const interval = item.price.recurring?.interval;
  return {
    id: sub.id,
    user_id: userId,
    customer_id: idOf(sub.customer) ?? "",
    status,
    price_id: item.price.id,
    billing_interval: interval === "month" || interval === "year" ? interval : null,
    current_period_end: isoFromUnix(item.current_period_end),
    trial_end: isoFromUnix(sub.trial_end),
    // The Customer Portal may cancel with `cancel_at` (the period's end) rather than the flag.
    cancel_at_period_end: sub.cancel_at_period_end || typeof sub.cancel_at === "number",
    started_at: isoFromUnix(sub.start_date) ?? now.toISOString(),
    ended_at: isoFromUnix(sub.ended_at),
    synced_at: now.toISOString(),
  };
}

/** The subscription an event is about, if any. */
export function subscriptionIdOf(event: StripeEventLike): string | null {
  const o = event.data.object;
  if (event.type.startsWith("customer.subscription.")) return idOf(o.id);
  if (event.type === "checkout.session.completed") return o.mode === "subscription" ? idOf(o.subscription) : null;
  if (event.type.startsWith("invoice.")) {
    const parent = o.parent as { subscription_details?: { subscription?: unknown } } | null | undefined;
    return idOf(parent?.subscription_details?.subscription) ?? idOf(o.subscription);
  }
  return null;
}

export const HANDLED_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.trial_will_end",
  "invoice.payment_failed",
  "invoice.paid",
] as const;

export async function handleStripeEvent(event: StripeEventLike, deps: WebhookDeps): Promise<WebhookOutcome> {
  if (await deps.isProcessed(event.id)) return "duplicate";
  if (!(HANDLED_EVENTS as readonly string[]).includes(event.type)) {
    await deps.markProcessed(event.id, event.type);
    return "ignored";
  }

  let userHint: string | null = null;
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const ref = typeof session.client_reference_id === "string" ? session.client_reference_id : null;
    const customer = idOf(session.customer);
    if (ref && UUID.test(ref)) {
      userHint = ref;
      if (customer) await deps.linkCustomer(ref, customer);
    }
  }

  const subscriptionId = subscriptionIdOf(event);
  if (subscriptionId) {
    const sub = await deps.retrieveSubscription(subscriptionId);
    if (sub) {
      const customer = idOf(sub.customer);
      const metaUser = sub.metadata?.user_id && UUID.test(sub.metadata.user_id) ? sub.metadata.user_id : null;
      const userId = metaUser ?? userHint ?? (customer ? await deps.userForCustomer(customer) : null);
      // No account for it (e.g. deleted since): nothing to save.
      if (userId) await deps.saveSubscription(toSubscriptionRow(sub, userId, deps.now()));
    }
  }
  await deps.markProcessed(event.id, event.type);
  return "processed";
}
