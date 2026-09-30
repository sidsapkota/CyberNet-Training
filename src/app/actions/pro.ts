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
import { ensureStripeCustomer, getEntitlement, stripeCustomerFor } from "@/lib/pro/server";
import { getStripe, getStripeEnv } from "@/lib/pro/stripe";
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
    intervals: proIntervals(entitlement.subscriptions, entitlement.grant),
    trialEligible: trialEligible(entitlement.subscriptions),
    available: getStripeEnv() !== null,
  };
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
