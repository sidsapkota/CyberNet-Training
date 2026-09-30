import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { NotSignedInError } from "@/lib/auth/verify";
import { getLesson } from "@/lib/content/server";
import { getEntitlement } from "@/lib/pro/server";
import { SupabaseEnvError } from "@/lib/supabase/env";

/**
 * A lesson's full content (cards and answers), for the player. Pro lessons are only ever sent
 * from here, after the server verifies the session and checks entitlement. Never cached: the
 * answer depends on who's asking.
 *   200 { lesson }            free lesson, or Pro and entitled
 *   401 { reason: "sign-in" } Pro lesson, not signed in
 *   403 { reason: "pro" }     Pro lesson, signed in without Pro
 */
export const dynamic = "force-dynamic";

const PRIVATE = { "Cache-Control": "private, no-store" };

export async function GET(_request: Request, { params }: RouteContext<"/api/lessons/[id]">) {
  const { id } = await params;
  const lesson = getLesson(id);
  if (!lesson) return NextResponse.json({ reason: "not-found" }, { status: 404, headers: PRIVATE });
  if (lesson.access === "free") return NextResponse.json({ lesson }, { headers: PRIVATE });

  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof NotSignedInError) return NextResponse.json({ reason: "sign-in" }, { status: 401, headers: PRIVATE });
    // No accounts on this copy (no Supabase settings): nobody can have Pro.
    if (error instanceof SupabaseEnvError) return NextResponse.json({ reason: "pro" }, { status: 403, headers: PRIVATE });
    throw error;
  }
  const { hasPro } = await getEntitlement(user);
  if (!hasPro) return NextResponse.json({ reason: "pro" }, { status: 403, headers: PRIVATE });
  return NextResponse.json({ lesson }, { headers: PRIVATE });
}
