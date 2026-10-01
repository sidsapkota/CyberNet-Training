import { NextResponse } from "next/server";
import { pitchPrices } from "@/lib/pro/pricing";
import { getPlanPrices } from "@/lib/pro/stripe";

/**
 * The plans' prices for the Pro screens in the app (the same for everyone; amounts come from
 * Stripe, never from code). Refreshed hourly, like /pro. `null` when Pro isn't set up here.
 */
export const revalidate = 3600;

export async function GET() {
  const prices = await getPlanPrices().catch((error: unknown) => {
    console.error(error);
    return null;
  });
  return NextResponse.json(prices ? pitchPrices(prices.monthly, prices.annual) : null);
}
