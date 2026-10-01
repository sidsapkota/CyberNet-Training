import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { NotSignedInError } from "@/lib/auth/verify";
import { getLesson } from "@/lib/content/server";
import { lessonAccessLevel } from "@/lib/pro/access";
import { countsTowardLimit, DAILY_LESSON_LIMIT } from "@/lib/pro/dailyLimit";
import { getEntitlement, hasFinishedLesson, openLessonToday } from "@/lib/pro/server";
import { isValidTimeZone } from "@/lib/progress/daily";
import { SupabaseEnvError } from "@/lib/supabase/env";

/**
 * A lesson's full content (cards and answers), for the player. Lessons guests can't play are only
 * ever sent from here, after the server verifies the session and, for free accounts, today's
 * lesson limit (src/lib/pro/dailyLimit.ts). Never cached: the answer depends on who's asking.
 *   200 { lesson }                         guest lesson; signed in with Pro, a replay, or room today
 *   401 { reason: "account" }              any other lesson, not signed in
 *   403 { reason: "limit", used, limit }   free account, no new lessons left today
 *   403 { reason: "pro" }                  Pro lesson on a copy without accounts (no Supabase)
 * `?tz=` is the browser's time zone, which dates the learner's day (the database only lets it
 * change once every 7 days).
 */
export const dynamic = "force-dynamic";

const PRIVATE = { "Cache-Control": "private, no-store" };

export async function GET(request: Request, { params }: RouteContext<"/api/lessons/[id]">) {
  const { id } = await params;
  const lesson = getLesson(id);
  if (!lesson) return NextResponse.json({ reason: "not-found" }, { status: 404, headers: PRIVATE });
  const level = lessonAccessLevel(lesson);
  // Guest lessons (each course's first lesson, the help modules) never count toward the limit.
  if (level === "guest") return NextResponse.json({ lesson }, { headers: PRIVATE });

  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof NotSignedInError) return NextResponse.json({ reason: "account" }, { status: 401, headers: PRIVATE });
    if (error instanceof SupabaseEnvError) {
      // No accounts on this copy (no Supabase settings): nobody can sign up, so free lessons stay
      // open (a gate would be a dead end), and nobody can have Pro.
      if (level === "account") return NextResponse.json({ lesson }, { headers: PRIVATE });
      return NextResponse.json({ reason: "pro" }, { status: 403, headers: PRIVATE });
    }
    throw error;
  }

  const { hasPro } = await getEntitlement(user);
  const finished = hasPro ? false : await hasFinishedLesson(user.id, lesson.id, lesson.kind);
  if (!countsTowardLimit({ guestOpen: false, hasPro, finished })) return NextResponse.json({ lesson }, { headers: PRIVATE });

  const tz = new URL(request.url).searchParams.get("tz");
  const opened = await openLessonToday(user.id, lesson.id, DAILY_LESSON_LIMIT, isValidTimeZone(tz) ? tz : null);
  if (!opened.allowed) {
    return NextResponse.json({ reason: "limit", used: opened.used, limit: DAILY_LESSON_LIMIT }, { status: 403, headers: PRIVATE });
  }
  return NextResponse.json({ lesson }, { headers: PRIVATE });
}
