import { NextResponse } from "next/server";
import { z } from "zod";
import { adminOrNull } from "@/lib/admin/auth";
import { revealEmail } from "@/lib/admin/server";

/** Reveals one learner's email to the admin (logged). Everyone else gets a plain 404. */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await adminOrNull())) return new Response("Not found", { status: 404 }); // before anything is read
  const body = z.object({ userId: z.uuid() }).safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "bad" }, { status: 400 });
  return NextResponse.json({ email: await revealEmail(body.data.userId) }, { headers: { "Cache-Control": "private, no-store" } });
}
