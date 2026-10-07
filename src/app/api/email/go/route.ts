import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/auth/redirect";
import { markReturned } from "@/lib/reminders/server";

/** The reminder email's button: notes the return, then goes to the page (same-site paths only). */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  await markReturned(url.searchParams.get("r"), url.searchParams.get("k")).catch((error: unknown) => console.error("Reminders: return", error));
  return NextResponse.redirect(new URL(safeNextPath(url.searchParams.get("to")), url.origin), 303);
}
