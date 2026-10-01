import "server-only";
import { FEEDBACK_INBOX, SITE_NAME } from "@/lib/site";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { busyNote, feedbackEmail, feedbackEmailDecision, type FeedbackForEmail } from "./notify";

/**
 * Emails a feedback message that has just been stored (vetted secret-key use: it only counts the
 * last hour's rows, to cap the emails). Never throws: the message is already saved, and a failed
 * email must never fail the form. Without RESEND_API_KEY (previews, local) it does nothing.
 */
export async function emailFeedback(f: FeedbackForEmail): Promise<"sent" | "busy-note" | "skipped" | "no-key" | "failed"> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return "no-key";
  try {
    const admin = createSupabaseAdminClient();
    const since = new Date(f.at.getTime() - 60 * 60 * 1000).toISOString();
    const { count, error } = await admin.from("feedback").select("id", { count: "exact", head: true }).gte("created_at", since);
    if (error) throw new Error(error.message);
    const decision = feedbackEmailDecision(count ?? 1);
    if (decision === "skip") return "skipped";
    const { subject, text } = decision === "send" ? feedbackEmail(f) : busyNote();
    const hour = f.at.toISOString().slice(0, 13);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        // One busy note per hour, even if two requests race past the cap together.
        ...(decision === "busy-note" ? { "Idempotency-Key": `feedback-busy/${hour}` } : {}),
      },
      body: JSON.stringify({ from: `${SITE_NAME} <noreply@cybernettraining.com>`, to: [FEEDBACK_INBOX], subject, text }),
    });
    if (!response.ok) throw new Error(`Resend refused the feedback email (${response.status})`);
    return decision === "send" ? "sent" : "busy-note";
  } catch (error) {
    console.error("Feedback email:", error);
    return "failed";
  }
}
