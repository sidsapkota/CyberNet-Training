import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/server";
import { emote } from "@/lib/challenges/rules";
import { setEmote } from "@/lib/challenges/server";
import { getEntitlement } from "@/lib/pro/server";

/**
 * The player's one preset emote after a challenge (no free text anywhere). Checked against the
 * attempt's key from their device. The animated emotes are for Pro: those need the verified session
 * and an active Pro entitlement.
 */
export const dynamic = "force-dynamic";

const Body = z.object({ attemptId: z.number().int().positive(), key: z.string().max(40), emote: z.string().max(20) });

export async function POST(request: Request, ctx: RouteContext<"/api/challenges/[id]/emote">) {
  const { id } = await ctx.params;
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success || !emote(body.data.emote)) return NextResponse.json({ error: "bad-emote" }, { status: 400 });
  let hasPro = false;
  if (emote(body.data.emote)?.pro) {
    const user = await requireUser().catch(() => null);
    hasPro = user ? (await getEntitlement(user)).hasPro : false;
    if (!hasPro) return NextResponse.json({ error: "pro" }, { status: 403 });
  }
  const ok = await setEmote(id, body.data.attemptId, body.data.key, body.data.emote, hasPro);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
