import "server-only";
import Stripe from "stripe";
import { parseStripeEnv, type StripeEnv, stripeNotConfigured } from "./env";
import type { StripePrice } from "./pricing";

/**
 * The Stripe client and settings. Server only, and the only file that reads the Stripe env vars
 * (a test enforces both). Test mode only: `parseStripeEnv` refuses live keys.
 */

/** Stripe's settings, or null when Pro isn't set up on this copy (the app then runs without it). */
export function getStripeEnv(): StripeEnv | null {
  const raw = {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    priceMonthly: process.env.STRIPE_PRICE_MONTHLY,
    priceAnnual: process.env.STRIPE_PRICE_ANNUAL,
  };
  return stripeNotConfigured(raw) ? null : parseStripeEnv(raw);
}

let client: Stripe | null = null;

/** The Stripe client. Throws if Stripe isn't configured (callers check `getStripeEnv()` first). */
export function getStripe(): Stripe {
  const env = getStripeEnv();
  if (!env) throw new Error("Stripe isn't configured (see docs/stripe-checklist.md).");
  client ??= new Stripe(env.secretKey, { appInfo: { name: "CyberNet Training" } });
  return client;
}

/** The two plans' prices, from Stripe (amounts are never written in code). Null if Pro isn't set up. */
export async function getPlanPrices(): Promise<{ monthly: StripePrice; annual: StripePrice } | null> {
  const env = getStripeEnv();
  if (!env) return null;
  const stripe = getStripe();
  const [monthly, annual] = await Promise.all([stripe.prices.retrieve(env.prices.monthly), stripe.prices.retrieve(env.prices.annual)]);
  const toPrice = (p: Stripe.Price): StripePrice => {
    const interval = p.recurring?.interval;
    if (p.unit_amount === null || interval === undefined || (interval !== "month" && interval !== "year")) {
      throw new Error(`Stripe price ${p.id} must be a recurring monthly or yearly price with a fixed amount.`);
    }
    return { unitAmount: p.unit_amount, currency: p.currency, interval: interval as "month" | "year" };
  };
  return { monthly: toPrice(monthly), annual: toPrice(annual) };
}
