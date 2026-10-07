import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth/server";
import { ChallengeProblem, recordAttempt } from "@/lib/challenges/server";

/**
 * A friend's go at a challenge: anyone with the link can play, no account needed. The answers are
 * re-graded on the server; the player is taken from the verified session (never from the request),
 * or recorded as a guest.
 */
export const dynamic = "force-dynamic";

const Body = z.object({ answers: z.array(z.unknown()).max(5) });

export async function POST(request: Request, ctx: RouteContext<"/api/challenges/[id]/attempts">) {
  const { id } = await ctx.params;
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "bad-answers" }, { status: 400 });
  const playerId = await requireUserId().catch(() => null); // a guest
  try {
    return NextResponse.json(await recordAttempt(id, body.data.answers, playerId), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof ChallengeProblem) return NextResponse.json({ error: error.code }, { status: error.code === "not-found" ? 404 : 409 });
    throw error;
  }
}
