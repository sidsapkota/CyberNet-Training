import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import {
  earlyGrantEligible,
  type GrantRecord,
  hasPro,
  newEarlyGrant,
  parseLaunchAt,
  type ProStatus,
  proStatus,
  type SubscriptionRecord,
  type SubscriptionStatus,
} from "./entitlement";
import { getStripe, getStripeEnv } from "./stripe";
import { type StripeSubscriptionLike, toSubscriptionRow } from "./webhook";

/**
 * Entitlement on the server: the only place that decides who has Pro. Reads the subscriptions the
 * Stripe webhook saved and the early-user grant, with the secret key. Server only, and every caller
 * passes a user id it got from `requireUser()` / `requireUserId()`, never one from the browser.
 */

type Tables = Database["public"]["Tables"];
type SubRow = Tables["subscriptions"]["Row"];
type GrantRow = Tables["pro_grants"]["Row"];

export function subscriptionFromRow(r: SubRow): SubscriptionRecord {
  return {
    id: r.id,
    status: r.status as SubscriptionStatus,
    priceId: r.price_id,
    interval: r.billing_interval === "month" || r.billing_interval === "year" ? r.billing_interval : null,
    currentPeriodEnd: r.current_period_end,
    trialEnd: r.trial_end,
    cancelAtPeriodEnd: r.cancel_at_period_end,
    startedAt: r.started_at,
    endedAt: r.ended_at,
  };
}

export function grantFromRow(r: GrantRow | null): GrantRecord | null {
  return r ? { reason: "early_user", startsAt: r.starts_at, expiresAt: r.expires_at, thankedAt: r.thanked_at } : null;
}

/** When Pro launched (PRO_LAUNCH_AT); null means not yet, so no early-user grants. */
export function proLaunchAt(): Date | null {
  return parseLaunchAt(process.env.PRO_LAUNCH_AT);
}

export interface Entitlement {
  hasPro: boolean;
  status: ProStatus;
  subscriptions: SubscriptionRecord[];
  grant: GrantRecord | null;
}

/**
 * The learner's Pro, creating their early-user grant first if they're due one (idempotent: the
 * grant's primary key is the user, so it's only ever created once).
 */
export async function getEntitlement(user: { id: string; createdAt: string | null }, now = new Date()): Promise<Entitlement> {
  const admin = createSupabaseAdminClient();
  const [subs, grantRow] = await Promise.all([
    admin.from("subscriptions").select("*").eq("user_id", user.id),
    admin.from("pro_grants").select("*").eq("user_id", user.id).maybeSingle(),
  ]);
  if (subs.error || grantRow.error) throw new Error(`Couldn't check Pro: ${(subs.error ?? grantRow.error)!.message}`);
  let grant = grantFromRow(grantRow.data);
  if (!grant && earlyGrantEligible(user.createdAt, proLaunchAt(), now)) {
    const { data, error } = await admin
      .from("pro_grants")
      .upsert({ user_id: user.id, ...newEarlyGrant(now) }, { onConflict: "user_id", ignoreDuplicates: true })
      .select("*");
    if (error) throw new Error(`Couldn't create the early-user grant: ${error.message}`);
    grant = grantFromRow(data?.[0] ?? (await admin.from("pro_grants").select("*").eq("user_id", user.id).maybeSingle()).data);
  }
  const subscriptions = (subs.data ?? []).map(subscriptionFromRow);
  return { hasPro: hasPro(subscriptions, grant, now), status: proStatus(subscriptions, grant, now), subscriptions, grant };
}

export class ProRequiredError extends Error {
  constructor() {
    super("That lesson is part of CyberNet Pro.");
    this.name = "ProRequiredError";
  }
}

// ── Stripe: customers and syncing ─────────────────────────────────────────────

/** The learner's Stripe customer id, if they have one. */
export async function stripeCustomerFor(userId: string): Promise<string | null> {
  const { data, error } = await createSupabaseAdminClient()
    .from("stripe_customers")
    .select("customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Couldn't look up the Stripe customer: ${error.message}`);
  return data?.customer_id ?? null;
}

/** The learner's Stripe customer, created the first time they start checkout. */
export async function ensureStripeCustomer(userId: string): Promise<string> {
  const existing = await stripeCustomerFor(userId);
  if (existing) return existing;
  // Only the account id is sent: Checkout asks for the email itself (for receipts).
  const customer = await getStripe().customers.create({ metadata: { user_id: userId } });
  const { error } = await createSupabaseAdminClient()
    .from("stripe_customers")
    .upsert({ user_id: userId, customer_id: customer.id }, { onConflict: "user_id", ignoreDuplicates: true });
  if (error) throw new Error(`Couldn't save the Stripe customer: ${error.message}`);
  // If two requests raced, keep whichever was saved first.
  return (await stripeCustomerFor(userId)) ?? customer.id;
}

/** Saves a subscription as Stripe has it now (exactly what the webhook does). */
export async function syncSubscription(subscriptionId: string, userId: string): Promise<void> {
  const sub = (await getStripe().subscriptions.retrieve(subscriptionId)) as unknown as StripeSubscriptionLike;
  const { error } = await createSupabaseAdminClient()
    .from("subscriptions")
    .upsert(toSubscriptionRow(sub, userId, new Date()), { onConflict: "id" });
  if (error) throw new Error(`Couldn't save the subscription: ${error.message}`);
}

/**
 * After Checkout: if the session is this learner's and complete, save the subscription now, so
 * the welcome page is right even before the webhook arrives. False for anyone else's session.
 */
export async function syncCheckoutSession(userId: string, sessionId: string): Promise<boolean> {
  if (!/^cs_(test_)?[A-Za-z0-9]+$/.test(sessionId)) return false;
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  if (session.client_reference_id !== userId || session.mode !== "subscription" || session.status !== "complete") return false;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (subscriptionId) await syncSubscription(subscriptionId, userId);
  return true;
}

/** On account deletion: deleting the Stripe customer cancels any subscription straight away. */
export async function deleteStripeCustomer(userId: string): Promise<void> {
  if (!getStripeEnv()) return;
  const customer = await stripeCustomerFor(userId);
  if (customer) await getStripe().customers.del(customer);
}
