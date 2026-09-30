import { NextResponse } from "next/server";
import { getStripe, getStripeEnv } from "@/lib/pro/stripe";
import { handleStripeEvent, type StripeEventLike, type StripeSubscriptionLike, type WebhookDeps } from "@/lib/pro/webhook";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Stripe's webhook (TEST MODE). The only writer of subscriptions:
 * 1. verify Stripe's signature on the raw body (anything unsigned or tampered is rejected, before
 *    the database is touched);
 * 2. hand the event to handleStripeEvent (src/lib/pro/webhook.ts): idempotent, and it re-fetches
 *    each subscription from Stripe, so duplicate or out-of-order events can't leave stale data.
 * A 500 makes Stripe retry later; 200 means handled (or deliberately ignored).
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const env = getStripeEnv();
  if (!env) return NextResponse.json({ error: "Stripe isn't configured" }, { status: 503 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  const body = await request.text();
  const stripe = getStripe();
  let event: StripeEventLike;
  try {
    event = stripe.webhooks.constructEvent(body, signature, env.webhookSecret) as unknown as StripeEventLike;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const deps: WebhookDeps = {
    async isProcessed(id) {
      const { data, error } = await admin.from("stripe_events").select("id").eq("id", id).maybeSingle();
      if (error) throw error;
      return data !== null;
    },
    async markProcessed(id, type) {
      const { error } = await admin.from("stripe_events").upsert({ id, type }, { onConflict: "id", ignoreDuplicates: true });
      if (error) throw error;
    },
    async retrieveSubscription(id) {
      try {
        return (await stripe.subscriptions.retrieve(id)) as unknown as StripeSubscriptionLike;
      } catch (error) {
        if ((error as { code?: string }).code === "resource_missing") return null;
        throw error;
      }
    },
    async saveSubscription(row) {
      const { error } = await admin.from("subscriptions").upsert(row, { onConflict: "id" });
      if (error) throw error;
    },
    async linkCustomer(userId, customerId) {
      const { error } = await admin.from("stripe_customers").upsert({ user_id: userId, customer_id: customerId }, { onConflict: "user_id" });
      if (error) throw error;
    },
    async userForCustomer(customerId) {
      const { data, error } = await admin.from("stripe_customers").select("user_id").eq("customer_id", customerId).maybeSingle();
      if (error) throw error;
      return data?.user_id ?? null;
    },
    now: () => new Date(),
  };

  try {
    const outcome = await handleStripeEvent(event, deps);
    return NextResponse.json({ received: true, outcome });
  } catch (error) {
    console.error("Stripe webhook failed", event.type, event.id, error);
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 500 });
  }
}
