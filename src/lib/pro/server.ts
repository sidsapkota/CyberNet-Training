import "server-only";
import { after } from "next/server";
import { stampProCosmetic } from "@/lib/leagues/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import {
  earlyGrantEligible,
  type FounderRecord,
  type GrantRecord,
  hasPro,
  newEarlyGrant,
  parseLaunchAt,
  type ProStatus,
  proStatus,
  type SubscriptionRecord,
  type SubscriptionStatus,
} from "./entitlement";
import { type FounderPurchase, founderPurchaseOf } from "./founder";
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
  /** A live (unrefunded) Founding Member seat. */
  founder: FounderRecord | null;
}

/**
 * The learner's Pro, creating their early-user grant first if they're due one (idempotent: the
 * grant's primary key is the user, so it's only ever created once).
 */
export async function getEntitlement(user: { id: string; createdAt: string | null }, now = new Date()): Promise<Entitlement> {
  const admin = createSupabaseAdminClient();
  const [subs, grantRow, seat] = await Promise.all([
    admin.from("subscriptions").select("*").eq("user_id", user.id),
    admin.from("pro_grants").select("*").eq("user_id", user.id).maybeSingle(),
    admin.from("founding_members").select("purchased_at").eq("user_id", user.id).is("refunded_at", null).maybeSingle(),
  ]);
  if (subs.error || grantRow.error || seat.error) throw new Error(`Couldn't check Pro: ${(subs.error ?? grantRow.error ?? seat.error)!.message}`);
  const founder: FounderRecord | null = seat.data ? { purchasedAt: seat.data.purchased_at } : null;
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
  // The Pro frame on league cards follows the same entitlement (cosmetic only).
  after(() => stampProCosmetic(user.id, subscriptions, grant, now, founder));
  return {
    hasPro: hasPro(subscriptions, grant, now, founder),
    status: proStatus(subscriptions, grant, now, founder),
    subscriptions,
    grant,
    founder,
  };
}

export class ProRequiredError extends Error {
  constructor() {
    super("That lesson is part of CyberNet Pro.");
    this.name = "ProRequiredError";
  }
}

// ── The daily lesson limit (free accounts; rules in ./dailyLimit.ts) ─────────

/** A replay: the lesson was finished (or the quiz passed) before. Replays never count. */
export async function hasFinishedLesson(userId: string, lessonId: string, kind: "lesson" | "quiz"): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { count, error } =
    kind === "quiz"
      ? await admin.from("quiz_attempts").select("id", { count: "exact", head: true }).match({ user_id: userId, quiz_id: lessonId, passed: true })
      : await admin.from("lesson_completions").select("lesson_id", { count: "exact", head: true }).match({ user_id: userId, lesson_id: lessonId });
  if (error) throw new Error(`Couldn't check the lesson: ${error.message}`);
  return (count ?? 0) > 0;
}

/**
 * Counts a new lesson for the learner's today if there's room (the database decides, under a lock
 * per learner). `timeZone` is the browser's, already validated; the database applies the 7-day rule.
 */
export async function openLessonToday(
  userId: string,
  lessonId: string,
  limit: number,
  timeZone: string | null,
): Promise<{ allowed: boolean; used: number; day: string }> {
  const { data, error } = await createSupabaseAdminClient().rpc("open_lesson", {
    p_user: userId,
    p_lesson: lessonId,
    p_limit: limit,
    ...(timeZone ? { p_time_zone: timeZone } : {}),
  });
  const row = data?.[0];
  if (error || !row) throw new Error(`Couldn't open the lesson: ${error?.message ?? "no result"}`);
  return row;
}

/** Whether the learner was let into this lesson (on any day): their XP for it may be recorded. */
export async function hasOpenedLesson(userId: string, lessonId: string): Promise<boolean> {
  const { count, error } = await createSupabaseAdminClient()
    .from("lesson_opens")
    .select("lesson_id", { count: "exact", head: true })
    .match({ user_id: userId, lesson_id: lessonId });
  if (error) throw new Error(`Couldn't check lesson opens: ${error.message}`);
  return (count ?? 0) > 0;
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
 * After Checkout: if the session is this learner's and complete, save the subscription (or claim
 * the founding seat) now, so the welcome page is right even before the webhook arrives. False for
 * anyone else's session.
 */
export async function syncCheckoutSession(userId: string, sessionId: string): Promise<boolean> {
  if (!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId)) return false;
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  if (session.client_reference_id !== userId || session.status !== "complete") return false;
  if (session.mode === "payment") {
    const purchase = founderPurchaseOf(session as unknown as Record<string, unknown>);
    if (!purchase || purchase.userId !== userId) return false;
    await claimFounderSeat(purchase);
    return true;
  }
  if (session.mode !== "subscription") return false;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (subscriptionId) await syncSubscription(subscriptionId, userId);
  return true;
}

// ── Founding Member ───────────────────────────────────────────────────────────

/** Records a paid founding seat (idempotent per Checkout session; the database decides). */
export async function claimFounderSeat(p: FounderPurchase): Promise<void> {
  const { error } = await createSupabaseAdminClient().rpc("claim_founder_seat", {
    p_user: p.userId,
    p_session: p.sessionId,
    p_payment: p.paymentIntentId,
    p_amount: p.amountTotal,
    p_currency: p.currency,
  });
  if (error) throw new Error(`Couldn't record the founding seat: ${error.message}`);
}

/** A full refund: the seat ends and is free again. The learner, or null if it wasn't a founding payment. */
export async function refundFounderSeat(paymentIntentId: string): Promise<string | null> {
  const { data, error } = await createSupabaseAdminClient().rpc("refund_founder_seat", { p_payment: paymentIntentId });
  if (error) throw new Error(`Couldn't refund the founding seat: ${error.message}`);
  return data ?? null;
}

/**
 * Holds a seat for a new Checkout session: the learner's earlier founding sessions are expired in
 * Stripe first (so only one can ever be paid), then the database holds the seat or refuses.
 */
export async function holdFounderSeat(userId: string, sessionId: string, expiresAt: Date): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { data: old, error: oldError } = await admin.from("founder_holds").select("checkout_session_id").eq("user_id", userId);
  if (oldError) throw new Error(`Couldn't read seat holds: ${oldError.message}`);
  for (const h of old ?? []) {
    if (h.checkout_session_id === sessionId) continue;
    await getStripe().checkout.sessions.expire(h.checkout_session_id).catch(() => undefined); // already paid or expired
  }
  const { data, error } = await admin.rpc("reserve_founder_seat", { p_user: userId, p_session: sessionId, p_expires: expiresAt.toISOString() });
  if (error) throw new Error(`Couldn't hold a founding seat: ${error.message}`);
  return data === true;
}

/** On account deletion: deleting the Stripe customer cancels any subscription straight away. */
export async function deleteStripeCustomer(userId: string): Promise<void> {
  if (!getStripeEnv()) return;
  const customer = await stripeCustomerFor(userId);
  if (customer) await getStripe().customers.del(customer);
}
