import { NextResponse } from "next/server";
import { type FounderOffer, founderCopy, founderCounter, type OneOffPrice } from "@/lib/pro/founder";
import type { StripePrice } from "@/lib/pro/pricing";
import { getFounderPrice, getPlanPrices } from "@/lib/pro/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The Founding Member offer for the Pro screens: the price and the comparison (worked out from
 * Stripe's live prices) and the real counter from the database. `null` while the offer is off
 * (FOUNDER_OFFER) or every seat is sold. Never cached: the counter must be true.
 */
export const dynamic = "force-dynamic";

// The prices change rarely: read from Stripe at most every 10 minutes per server instance.
let cached: { at: number; founder: OneOffPrice | null; monthly: StripePrice | null } | null = null;
const PRICE_TTL_MS = 10 * 60 * 1000;

async function prices() {
  if (cached && Date.now() - cached.at < PRICE_TTL_MS) return cached;
  const [founder, plans] = await Promise.all([getFounderPrice(), getPlanPrices()]);
  cached = { at: Date.now(), founder, monthly: plans?.monthly ?? null };
  return cached;
}

export async function GET() {
  const offer = await (async (): Promise<FounderOffer | null> => {
    const { founder, monthly } = await prices();
    if (!founder) return null;
    // The counter is public (numbers only): read with the visitor's own session, never the secret key.
    const { data, error } = await (await createSupabaseServerClient()).rpc("founder_seats");
    const seats = data?.[0];
    if (error || !seats) throw new Error(`Couldn't count founding seats: ${error?.message ?? "no result"}`);
    const counter = founderCounter(seats);
    if (counter.soldOut) return null;
    return { ...founderCopy(founder, monthly), counter };
  })().catch((error: unknown) => {
    console.error(error);
    return null;
  });
  return NextResponse.json(offer, { headers: { "Cache-Control": "no-store" } });
}
