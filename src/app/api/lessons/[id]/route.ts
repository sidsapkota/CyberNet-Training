import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { NotSignedInError } from "@/lib/auth/verify";
import { getLesson } from "@/lib/content/server";
import { lessonAccessLevel } from "@/lib/pro/access";
import { getEntitlement } from "@/lib/pro/server";
import { SupabaseEnvError } from "@/lib/supabase/env";

/**
 * A lesson's full content (cards and answers), for the player. Lessons guests can't play are only
 * ever sent from here, after the server verifies the session (and, for Pro, entitlement). Never
 * cached: the answer depends on who's asking.
 *   200 { lesson }            guest lesson; account lesson and signed in; Pro and entitled
 *   401 { reason: "account" } free lesson that needs an account, not signed in
 *   401 { reason: "sign-in" } Pro lesson, not signed in
 *   403 { reason: "pro" }     Pro lesson, signed in without Pro
 */
export const dynamic = "force-dynamic";

const PRIVATE = { "Cache-Control": "private, no-store" };

export async function GET(_request: Request, { params }: RouteContext<"/api/lessons/[id]">) {
  const { id } = await params;
  const lesson = getLesson(id);
  if (!lesson) return NextResponse.json({ reason: "not-found" }, { status: 404, headers: PRIVATE });
  const level = lessonAccessLevel(lesson);
  if (level === "guest") return NextResponse.json({ lesson }, { headers: PRIVATE });

  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof NotSignedInError) {
      return NextResponse.json({ reason: level === "account" ? "account" : "sign-in" }, { status: 401, headers: PRIVATE });
    }
    if (error instanceof SupabaseEnvError) {
      // No accounts on this copy (no Supabase settings): nobody can sign up, so free lessons stay
      // open (a gate would be a dead end), and nobody can have Pro.
      if (level === "account") return NextResponse.json({ lesson }, { headers: PRIVATE });
      return NextResponse.json({ reason: "pro" }, { status: 403, headers: PRIVATE });
    }
    throw error;
  }
  if (level === "account") return NextResponse.json({ lesson }, { headers: PRIVATE });
  const { hasPro } = await getEntitlement(user);
  if (!hasPro) return NextResponse.json({ reason: "pro" }, { status: 403, headers: PRIVATE });
  return NextResponse.json({ lesson }, { headers: PRIVATE });
}
