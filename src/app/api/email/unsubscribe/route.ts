import { NextResponse } from "next/server";
import { unsubscribe } from "@/lib/reminders/server";

/**
 * One-tap unsubscribe from reminder emails, by the token in the email (no sign-in). GET is the link
 * in the email (it unsubscribes straight away, then shows the confirmation page); POST is the
 * one-click button mail apps show (List-Unsubscribe-Post, RFC 8058).
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ok = await unsubscribe(url.searchParams.get("t")).catch(() => false);
  return NextResponse.redirect(new URL(ok ? "/unsubscribed" : "/unsubscribed?unknown=1", url.origin), 303);
}

export async function POST(request: Request) {
  const ok = await unsubscribe(new URL(request.url).searchParams.get("t")).catch(() => false);
  return new Response(ok ? "Unsubscribed" : "Unknown link", { status: ok ? 200 : 404 });
}
