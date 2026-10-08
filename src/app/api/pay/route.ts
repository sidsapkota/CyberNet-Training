import { NextResponse } from "next/server";
import { startParentCheckout } from "@/lib/pro/parentLink";
import { returnOrigin } from "@/lib/pro/urls";

/**
 * "Send to a parent": the parent's "Pay" button posts the link's secret here. The secret is the only
 * authority (no account); startParentCheckout re-checks the link, then sends the parent to Stripe,
 * or back to the page with a reason.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const form = await request.formData();
  const token = String(form.get("t") ?? "");
  const origin = returnOrigin(request.headers.get("origin"));
  const result = await startParentCheckout(token, origin);
  if ("url" in result) return NextResponse.redirect(result.url, 303);
  return NextResponse.redirect(`${origin}/pay?t=${encodeURIComponent(token)}&problem=${result.error}`, 303);
}
