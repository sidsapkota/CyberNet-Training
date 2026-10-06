"use server";

/**
 * CyberNet Pro actions (Stripe TEST MODE). Payment happens on Stripe's hosted Checkout and is
 * managed in Stripe's Customer Portal: no card details ever reach this site. Nothing here grants
 * Pro: only the Stripe webhook (and the early-user grant) do.
 */
import { headers } from "next/headers";
import { z } from "zod";
import { requireUser, requireUserId } from "@/lib/auth/server";
import type { Plan } from "@/lib/pro/env";
import { type ProInterval, proIntervals, type ProStatus, trialEligible } from "@/lib/pro/entitlement";
import { DAILY_LESSON_LIMIT, type DailyLessons, limitDay } from "@/lib/pro/dailyLimit";
import { FOUNDER_ERROR_TEXT, FOUNDER_METADATA, type FounderError } from "@/lib/pro/founder";
import { createParentLink } from "@/lib/pro/parentLink";
import { ensureStripeCustomer, getEntitlement, holdFounderSeat, stripeCustomerFor } from "@/lib/pro/server";
import { founderPriceId, getStripe, getStripeEnv } from "@/lib/pro/stripe";
import { returnOrigin } from "@/lib/pro/urls";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const TRIAL_DAYS = 7;
const PlanSchema = z.enum(["monthly", "annual"]);

type Result = { url: string } | { error: string };

async function origin(): Promise<string> {
  return returnOrigin((await headers()).get("origin"));
}

export interface MyPro {
  hasPro: boolean;
  status: ProStatus;
  intervals: ProInterval[];
  trialEligible: boolean;
  /** Stripe is set up on this copy. */
  available: boolean;
}

/**
 * What the browser shows about the learner's Pro (it never decides access: the server checks
 * again for every Pro lesson and XP write). Also creates the early-user grant when it's due.
 */
export async function getMyProAction(): Promise<MyPro> {
  const user = await requireUser();
  const entitlement = await getEntitlement(user);
  return {
    hasPro: entitlement.hasPro,
    status: entitlement.status,
    intervals: proIntervals(entitlement.subscriptions, entitlement.grant, entitlement.founder),
    trialEligible: trialEligible(entitlement.subscriptions),
    available: getStripeEnv() !== null,
  };
}

const LessonId = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(120);

/**
 * Today's new lessons, for the course path's "N left today" line (display only: the lesson API
 * decides). `openedToday`: this lesson already counted today, so opening it again is free.
 */
export async function getDailyLessonsAction(lessonId: string): Promise<DailyLessons & { openedToday: boolean }> {
  const user = await requireUser();
  const id = LessonId.parse(lessonId);
  if ((await getEntitlement(user)).hasPro) return { limited: false, used: 0, limit: DAILY_LESSON_LIMIT, openedToday: false };
  const admin = createSupabaseAdminClient();
  const { data: profile, error } = await admin.from("profiles").select("time_zone").eq("id", user.id).maybeSingle();
  if (error) throw new Error(`Couldn't read the profile: ${error.message}`);
  const { data: opens, error: opensError } = await admin
    .from("lesson_opens")
    .select("lesson_id")
    .match({ user_id: user.id, day: limitDay(profile?.time_zone, new Date()) });
  if (opensError) throw new Error(`Couldn't count lessons: ${opensError.message}`);
  const rows = opens ?? [];
  return { limited: true, used: rows.length, limit: DAILY_LESSON_LIMIT, openedToday: rows.some((r) => r.lesson_id === id) };
}

/** Starts Stripe Checkout for a plan. First-time subscribers get the 7-day trial. */
export async function startCheckoutAction(plan: Plan): Promise<Result> {
  const user = await requireUser();
  const env = getStripeEnv();
  if (!env) return { error: "Pro isn't available yet." };
  const chosen = PlanSchema.parse(plan);
  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin.from("profiles").select("age_confirmed").eq("id", user.id).maybeSingle();
  if (!profile?.age_confirmed) return { error: "Please confirm you're 13 or older first (on your account page)." };

  const entitlement = await getEntitlement(user);
  if (entitlement.status.kind === "subscription") return { error: "You already have Pro. You can manage it on your account page." };
  if (entitlement.status.kind === "founder") return { error: "You're a Founding Member: you already have Pro for life." };

  const customer = await ensureStripeCustomer(user.id);
  const base = await origin();
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: user.id,
    line_items: [{ price: env.prices[chosen], quantity: 1 }],
    payment_method_collection: "always",
    subscription_data: {
      metadata: { user_id: user.id },
      ...(trialEligible(entitlement.subscriptions) ? { trial_period_days: TRIAL_DAYS } : {}),
    },
    success_url: `${base}/pro/welcome?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/pro`,
  });
  if (!session.url) return { error: "Stripe didn't return a checkout page. Please try again." };
  return { url: session.url };
}

/** Stripe's shortest Checkout life is 30 minutes; the seat is held for exactly as long. */
const FOUNDER_CHECKOUT_MS = 31 * 60 * 1000;

/**
 * Starts Stripe Checkout for a Founding Member seat: one payment (payment mode, no subscription,
 * no trial), lifetime Pro. Refused while the offer is off, to anyone with a subscription or a seat,
 * and when every seat is sold or held in someone's checkout (the database decides, under a lock).
 */
export type FounderCheckoutResult = { url: string } | { error: string; code: FounderError };

const refuse = (code: FounderError): FounderCheckoutResult => ({ error: FOUNDER_ERROR_TEXT[code], code });

export async function startFounderCheckoutAction(): Promise<FounderCheckoutResult> {
  const user = await requireUser();
  const price = founderPriceId();
  if (!price) return refuse("off");
  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin.from("profiles").select("age_confirmed").eq("id", user.id).maybeSingle();
  // The button asks for the 13+ confirmation on the spot, then tries again.
  if (!profile?.age_confirmed) return refuse("age");

  const entitlement = await getEntitlement(user);
  if (entitlement.status.kind === "founder") return refuse("founder");
  if (entitlement.status.kind === "subscription") return refuse("has_pro");

  try {
    return await createFounderCheckout(user.id, price);
  } catch (error) {
    console.error("Founding checkout failed", error);
    return refuse("stripe");
  }
}

async function createFounderCheckout(userId: string, price: string): Promise<FounderCheckoutResult> {
  const user = { id: userId };
  const customer = await ensureStripeCustomer(user.id);
  const base = await origin();
  const expiresAt = new Date(Date.now() + FOUNDER_CHECKOUT_MS);
  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer,
    client_reference_id: user.id,
    line_items: [{ price, quantity: 1 }],
    metadata: { ...FOUNDER_METADATA, user_id: user.id },
    payment_intent_data: { metadata: { ...FOUNDER_METADATA, user_id: user.id } },
    expires_at: Math.floor(expiresAt.getTime() / 1000),
    success_url: `${base}/pro/welcome?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/pro`,
  });
  if (!(await holdFounderSeat(user.id, session.id, expiresAt))) {
    await getStripe().checkout.sessions.expire(session.id).catch(() => undefined);
    return refuse("all_held");
  }
  if (!session.url) return refuse("stripe");
  return { url: session.url };
}

export type ParentLinkResult = { url: string } | { error: string };

/**
 * "Send to a parent": a one-time link for a parent to pay for this learner's Founding Member seat on
 * their own device (no sign-in). The same checks as buying it yourself, except the 13+ one: the
 * parent pays.
 */
export async function createParentLinkAction(): Promise<ParentLinkResult> {
  const user = await requireUser();
  if (!founderPriceId()) return { error: FOUNDER_ERROR_TEXT.off };
  const entitlement = await getEntitlement(user);
  if (entitlement.status.kind === "founder") return { error: FOUNDER_ERROR_TEXT.founder };
  if (entitlement.status.kind === "subscription") return { error: FOUNDER_ERROR_TEXT.has_pro };
  const link = await createParentLink(user.id);
  if ("error" in link) return { error: "You've made 5 links today. Send one of those, or try again tomorrow." };
  return { url: `${await origin()}/pay?t=${link.token}` };
}

/** Opens Stripe's Customer Portal: switch plans, update the card, cancel. */
export async function openPortalAction(): Promise<Result> {
  const userId = await requireUserId();
  if (!getStripeEnv()) return { error: "Pro isn't available yet." };
  const customer = await stripeCustomerFor(userId);
  if (!customer) return { error: "There's no subscription to manage yet." };
  const session = await getStripe().billingPortal.sessions.create({ customer, return_url: `${await origin()}/account` });
  return { url: session.url };
}

/** The early-user thank-you has been shown (it only appears once). */
export async function markGrantThankedAction(): Promise<void> {
  const userId = await requireUserId();
  const { error } = await createSupabaseAdminClient()
    .from("pro_grants")
    .update({ thanked_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("thanked_at", null);
  if (error) throw new Error(`Couldn't save that: ${error.message}`);
}
