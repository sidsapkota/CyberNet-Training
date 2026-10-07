import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sendDueReminders } from "@/lib/reminders/server";

/**
 * The hourly reminder job (Vercel Cron, see vercel.json): opt-in streak and league reminder emails,
 * at most one a day per learner (src/lib/reminders/). Vercel sends `Authorization: Bearer
 * $CRON_SECRET`; anything else is refused before any data is touched.
 */
export const dynamic = "force-dynamic";

function authorised(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16 || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function GET(request: Request) {
  if (!authorised(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  return NextResponse.json(await sendDueReminders());
}
