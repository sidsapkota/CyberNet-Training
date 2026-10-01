import { describe, expect, it } from "vitest";
import { parseStripeEnv, StripeEnvError, stripeNotConfigured } from "./env";
import {
  handleStripeEvent,
  type StripeEventLike,
  type StripeSubscriptionLike,
  subscriptionIdOf,
  type SubscriptionRow,
  toSubscriptionRow,
  type WebhookDeps,
} from "./webhook";

const USER = "11111111-2222-4333-8444-555555555555";
const NOW = new Date("2026-10-10T00:00:00Z");
const unix = (iso: string) => Math.floor(Date.parse(iso) / 1000);

function stripeSub(over: Partial<StripeSubscriptionLike> = {}): StripeSubscriptionLike {
  return {
    id: "sub_A",
    customer: "cus_A",
    status: "trialing",
    metadata: { user_id: USER },
    cancel_at_period_end: false,
    cancel_at: null,
    trial_end: unix("2026-10-17T00:00:00Z"),
    start_date: unix("2026-10-10T00:00:00Z"),
    ended_at: null,
    items: { data: [{ current_period_end: unix("2026-10-17T00:00:00Z"), price: { id: "price_M", recurring: { interval: "month" } } }] },
    ...over,
  };
}

/** An in-memory stand-in for Stripe and our tables. `stripe` is Stripe's *current* state. */
function fakes(stripe: Record<string, StripeSubscriptionLike> = {}) {
  const processed = new Map<string, string>();
  const rows = new Map<string, SubscriptionRow>();
  const customers = new Map<string, string>(); // customer → user
  const reminders: string[] = []; // "user:subscription"
  const deps: WebhookDeps = {
    isProcessed: async (id) => processed.has(id),
    markProcessed: async (id, type) => void processed.set(id, type),
    retrieveSubscription: async (id) => stripe[id] ?? null,
    saveSubscription: async (row) => void rows.set(row.id, row),
    linkCustomer: async (user, customer) => void customers.set(customer, user),
    userForCustomer: async (customer) => customers.get(customer) ?? null,
    sendTrialReminder: async (user, sub) => void reminders.push(`${user}:${sub.id}`),
    now: () => NOW,
  };
  return { deps, processed, rows, customers, stripe, reminders };
}

const event = (id: string, type: string, object: Record<string, unknown>): StripeEventLike => ({ id, type, data: { object } });

describe("handleStripeEvent", () => {
  it("checkout completed: links the customer and saves the subscription as Stripe has it", async () => {
    const f = fakes({ sub_A: stripeSub() });
    const outcome = await handleStripeEvent(
      event("evt_1", "checkout.session.completed", { mode: "subscription", client_reference_id: USER, customer: "cus_A", subscription: "sub_A" }),
      f.deps,
    );
    expect(outcome).toBe("processed");
    expect(f.customers.get("cus_A")).toBe(USER);
    expect(f.rows.get("sub_A")).toMatchObject({ user_id: USER, status: "trialing", billing_interval: "month", price_id: "price_M" });
  });

  it("is idempotent: the same event twice is handled once", async () => {
    const f = fakes({ sub_A: stripeSub() });
    const e = event("evt_1", "customer.subscription.updated", { id: "sub_A" });
    expect(await handleStripeEvent(e, f.deps)).toBe("processed");
    f.stripe.sub_A = stripeSub({ status: "canceled" }); // even if Stripe changed since
    expect(await handleStripeEvent(e, f.deps)).toBe("duplicate");
    expect(f.rows.get("sub_A")?.status).toBe("trialing");
  });

  it("handles events out of order: an old event arriving late saves Stripe's current state", async () => {
    // Stripe's truth is now "canceled"; the stale "created" event arrives after "deleted".
    const f = fakes({ sub_A: stripeSub({ status: "canceled", ended_at: unix("2026-10-12T00:00:00Z") }) });
    await handleStripeEvent(event("evt_2", "customer.subscription.deleted", { id: "sub_A", status: "canceled" }), f.deps);
    await handleStripeEvent(event("evt_1", "customer.subscription.created", { id: "sub_A", status: "trialing" }), f.deps);
    expect(f.rows.get("sub_A")).toMatchObject({ status: "canceled", ended_at: "2026-10-12T00:00:00.000Z" });
  });

  it("subscription updated: records a cancellation at the period's end (flag or cancel_at)", async () => {
    const f = fakes({ sub_A: stripeSub({ status: "active", cancel_at: unix("2026-11-10T00:00:00Z") }) });
    await handleStripeEvent(event("evt_3", "customer.subscription.updated", { id: "sub_A" }), f.deps);
    expect(f.rows.get("sub_A")).toMatchObject({ status: "active", cancel_at_period_end: true });
  });

  it("payment failed: finds the subscription through the invoice and saves past_due", async () => {
    const f = fakes({ sub_A: stripeSub({ status: "past_due" }) });
    await handleStripeEvent(
      event("evt_4", "invoice.payment_failed", { parent: { subscription_details: { subscription: "sub_A" } } }),
      f.deps,
    );
    expect(f.rows.get("sub_A")?.status).toBe("past_due");
  });

  it("trial ending: refreshes the subscription and sends our reminder once", async () => {
    const f = fakes({ sub_A: stripeSub() });
    expect(await handleStripeEvent(event("evt_5", "customer.subscription.trial_will_end", { id: "sub_A" }), f.deps)).toBe("processed");
    expect(f.rows.get("sub_A")?.trial_end).toBe("2026-10-17T00:00:00.000Z");
    expect(f.reminders).toEqual([`${USER}:sub_A`]);
    // Stripe delivers the same event again: no second email.
    expect(await handleStripeEvent(event("evt_5", "customer.subscription.trial_will_end", { id: "sub_A" }), f.deps)).toBe("duplicate");
    expect(f.reminders).toHaveLength(1);
  });

  it("trial ending: no reminder when the trial is already cancelling or over", async () => {
    for (const sub of [stripeSub({ cancel_at_period_end: true }), stripeSub({ cancel_at: unix("2026-10-17T00:00:00Z") }), stripeSub({ status: "active" })]) {
      const f = fakes({ sub_A: sub });
      await handleStripeEvent(event("evt_7", "customer.subscription.trial_will_end", { id: "sub_A" }), f.deps);
      expect(f.reminders).toEqual([]);
    }
  });

  it("only the trial-ending event sends a reminder", async () => {
    const f = fakes({ sub_A: stripeSub() });
    await handleStripeEvent(event("evt_8", "customer.subscription.updated", { id: "sub_A" }), f.deps);
    expect(f.reminders).toEqual([]);
  });

  it("finds the account from the customer when the subscription has no user id", async () => {
    const f = fakes({ sub_A: stripeSub({ metadata: {} }) });
    f.customers.set("cus_A", USER);
    await handleStripeEvent(event("evt_6", "customer.subscription.updated", { id: "sub_A" }), f.deps);
    expect(f.rows.get("sub_A")?.user_id).toBe(USER);
  });

  it("saves nothing for a subscription with no account (e.g. deleted), but still marks the event", async () => {
    const f = fakes({ sub_A: stripeSub({ metadata: {} }) });
    expect(await handleStripeEvent(event("evt_7", "customer.subscription.updated", { id: "sub_A" }), f.deps)).toBe("processed");
    expect(f.rows.size).toBe(0);
    expect(f.processed.has("evt_7")).toBe(true);
  });

  it("ignores events it doesn't handle, and one-off payments", async () => {
    const f = fakes();
    expect(await handleStripeEvent(event("evt_8", "charge.refunded", {}), f.deps)).toBe("ignored");
    await handleStripeEvent(event("evt_9", "checkout.session.completed", { mode: "payment", client_reference_id: USER }), f.deps);
    expect(f.rows.size).toBe(0);
  });

  it("never trusts a client reference that isn't an account id", async () => {
    const f = fakes({ sub_A: stripeSub({ metadata: {} }) });
    await handleStripeEvent(
      event("evt_10", "checkout.session.completed", { mode: "subscription", client_reference_id: "admin", customer: "cus_A", subscription: "sub_A" }),
      f.deps,
    );
    expect(f.customers.size).toBe(0);
    expect(f.rows.size).toBe(0);
  });
});

describe("toSubscriptionRow and subscriptionIdOf", () => {
  it("maps Stripe's fields, reading the period from the subscription item", () => {
    const row = toSubscriptionRow(stripeSub({ status: "active", customer: { id: "cus_B" } }), USER, NOW);
    expect(row).toEqual({
      id: "sub_A",
      user_id: USER,
      customer_id: "cus_B",
      status: "active",
      price_id: "price_M",
      billing_interval: "month",
      current_period_end: "2026-10-17T00:00:00.000Z",
      trial_end: "2026-10-17T00:00:00.000Z",
      cancel_at_period_end: false,
      started_at: "2026-10-10T00:00:00.000Z",
      ended_at: null,
      synced_at: NOW.toISOString(),
    });
  });

  it("finds the subscription on invoices from either field", () => {
    expect(subscriptionIdOf(event("e", "invoice.paid", { subscription: "sub_X" }))).toBe("sub_X");
    expect(subscriptionIdOf(event("e", "invoice.paid", { parent: { subscription_details: { subscription: { id: "sub_Y" } } } }))).toBe("sub_Y");
  });
});

describe("parseStripeEnv", () => {
  const good = { secretKey: "sk_test_abc", webhookSecret: "whsec_abc", priceMonthly: "price_m", priceAnnual: "price_a" };

  it("accepts test-mode settings", () => {
    expect(parseStripeEnv(good)).toEqual({ secretKey: "sk_test_abc", webhookSecret: "whsec_abc", prices: { monthly: "price_m", annual: "price_a" } });
    expect(parseStripeEnv({ ...good, secretKey: "rk_test_abc" }).secretKey).toBe("rk_test_abc");
  });

  it("refuses live keys outside production (local dev, tests and previews are test mode only)", () => {
    expect(() => parseStripeEnv({ ...good, secretKey: "sk_live_abc" })).toThrow(/LIVE key outside production/);
    expect(() => parseStripeEnv({ ...good, secretKey: "rk_live_abc" })).toThrow(StripeEnvError);
    expect(() => parseStripeEnv({ ...good, secretKey: "sk_live_abc" }, { production: false })).toThrow(StripeEnvError);
    expect(parseStripeEnv({ ...good, secretKey: "sk_live_abc" }, { production: true }).secretKey).toBe("sk_live_abc");
    expect(parseStripeEnv(good, { production: true }).secretKey).toBe("sk_test_abc");
    expect(() => parseStripeEnv({ ...good, secretKey: "pk_live_abc" }, { production: true })).toThrow(StripeEnvError);
  });

  it("rejects missing or malformed values", () => {
    expect(() => parseStripeEnv({ ...good, webhookSecret: "" })).toThrow(/STRIPE_WEBHOOK_SECRET/);
    expect(() => parseStripeEnv({ ...good, priceAnnual: "7.99" })).toThrow(/STRIPE_PRICE_ANNUAL/);
    expect(() => parseStripeEnv({ ...good, priceAnnual: "price_m" })).toThrow(/different prices/);
    expect(() => parseStripeEnv({ ...good, secretKey: "pk_test_abc" })).toThrow(/test key/);
  });

  it("treats no settings at all as 'Pro not set up'", () => {
    expect(stripeNotConfigured({})).toBe(true);
    expect(stripeNotConfigured({ priceMonthly: "price_m" })).toBe(false);
  });
});
