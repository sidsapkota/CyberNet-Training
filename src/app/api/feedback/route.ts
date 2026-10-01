import { after, NextResponse } from "next/server";
import { z } from "zod";
import { getLesson } from "@/lib/content/server";
import { FEEDBACK_MAX, friendlyFeedbackError } from "@/lib/feedback-form";
import { cleanPage } from "@/lib/feedback/notify";
import { emailFeedback } from "@/lib/feedback/server";
import { siteUrl } from "@/lib/site";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const Body = z.object({
  message: z.string().trim().min(1).max(FEEDBACK_MAX),
  lessonId: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80)
    .nullable(),
  rating: z.number().int().min(1).max(5).nullable(),
  sessionId: z.uuid(),
  page: z.string().max(500).nullable(),
});

/**
 * Stores a feedback message exactly as before (the visitor's own session, so the insert-only RLS
 * and the rate-limit trigger apply), then emails a copy to the owner after the response is sent.
 * The email says only whether the sender was signed in, never who.
 */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check your message and try again." }, { status: 400 });
  const { message, lessonId, rating, sessionId, page } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("feedback").insert({ message, lesson_id: lessonId, rating, session_id: sessionId });
  if (error) return NextResponse.json({ error: friendlyFeedbackError(error.message) }, { status: 400 });

  const { data } = await supabase.auth.getUser();
  const signedIn = Boolean(data.user);
  const at = new Date();
  after(() =>
    emailFeedback({
      message,
      lessonId,
      lessonTitle: lessonId ? (getLesson(lessonId)?.title ?? null) : null,
      rating,
      page: cleanPage(page, siteUrl().origin),
      signedIn,
      at,
    }),
  );
  return NextResponse.json({ ok: true });
}
