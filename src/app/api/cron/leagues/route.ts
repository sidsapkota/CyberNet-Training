import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { finalizeDueWeeks, reconcileCurrentWeek, sendReportSummary } from "@/lib/leagues/server";

/**
 * The hourly league job (Vercel Cron, see vercel.json). Vercel sends `Authorization: Bearer
 * $CRON_SECRET`; anything else is refused before any data is touched. It:
 * 1. places anyone who earned XP this week but isn't in a league yet (onXpEarned's after() can be
 *    dropped by Vercel, so this is the safety net),
 * 2. settles every finished week that isn't settled yet (safe to repeat), and
 * 3. emails yesterday's handle reports from 8 am Sydney time, once a day, only if there were any.
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
  const placed = await reconcileCurrentWeek();
  const settled = await finalizeDueWeeks();
  const summary = await sendReportSummary().catch((error: unknown) => {
    console.error("Leagues: report summary failed", error);
    return "failed" as const;
  });
  return NextResponse.json({ placed, settled, summary });
}
