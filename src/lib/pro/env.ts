/**
 * Stripe settings, checked before use. Pure: `src/lib/pro/stripe.ts` (server-only) is the only file
 * that reads the real environment. Stripe is in TEST MODE ONLY: live keys are refused.
 *
 * - STRIPE_SECRET_KEY       server only; sk_test_… (or a restricted rk_test_… key)
 * - STRIPE_WEBHOOK_SECRET   server only; whsec_… (from the webhook endpoint, or `stripe listen`)
 * - STRIPE_PRICE_MONTHLY    price_… (the monthly AUD price; amounts live in Stripe, never in code)
 * - STRIPE_PRICE_ANNUAL     price_…
 */

export class StripeEnvError extends Error {
  constructor(problem: string) {
    super(
      `${problem}\nSet STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_MONTHLY and STRIPE_PRICE_ANNUAL ` +
        "in .env.local (and in Vercel for deployments). See docs/stripe-checklist.md.",
    );
    this.name = "StripeEnvError";
  }
}

export interface StripeEnv {
  secretKey: string;
  webhookSecret: string;
  prices: { monthly: string; annual: string };
}

export interface RawStripeEnv {
  secretKey?: string;
  webhookSecret?: string;
  priceMonthly?: string;
  priceAnnual?: string;
}

/** True when none of the Stripe settings are present: Pro isn't set up on this copy (not an error). */
export function stripeNotConfigured(raw: RawStripeEnv): boolean {
  return !raw.secretKey && !raw.webhookSecret && !raw.priceMonthly && !raw.priceAnnual;
}

export function parseStripeEnv(raw: RawStripeEnv): StripeEnv {
  const secretKey = raw.secretKey?.trim() ?? "";
  if (/^(sk|rk)_live_/.test(secretKey)) {
    throw new StripeEnvError("STRIPE_SECRET_KEY is a LIVE key. CyberNet Pro runs in Stripe test mode only: use a sk_test_ key.");
  }
  if (!/^(sk|rk)_test_[A-Za-z0-9]+$/.test(secretKey)) throw new StripeEnvError("STRIPE_SECRET_KEY is missing or isn't a Stripe test key (sk_test_…).");
  const webhookSecret = raw.webhookSecret?.trim() ?? "";
  if (!/^whsec_[A-Za-z0-9]+$/.test(webhookSecret)) throw new StripeEnvError("STRIPE_WEBHOOK_SECRET is missing or isn't a webhook signing secret (whsec_…).");
  const monthly = raw.priceMonthly?.trim() ?? "";
  const annual = raw.priceAnnual?.trim() ?? "";
  for (const [name, value] of [["STRIPE_PRICE_MONTHLY", monthly], ["STRIPE_PRICE_ANNUAL", annual]] as const) {
    if (!/^price_[A-Za-z0-9]+$/.test(value)) throw new StripeEnvError(`${name} is missing or isn't a Stripe price id (price_…).`);
  }
  if (monthly === annual) throw new StripeEnvError("STRIPE_PRICE_MONTHLY and STRIPE_PRICE_ANNUAL must be different prices.");
  return { secretKey, webhookSecret, prices: { monthly, annual } };
}

export type Plan = "monthly" | "annual";
