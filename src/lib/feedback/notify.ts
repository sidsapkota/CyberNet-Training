/**
 * Emailing new feedback to the owner (Resend). Pure parts, tested: whether to email, and the email
 * itself. Feedback is still stored in the `feedback` table first; the email is a copy.
 *
 * Nothing personal: the message (and anything the sender chose to write in it), the lesson and page
 * it came from, the rating, the time, and only *whether* the sender was signed in, never who.
 */

/** At most this many feedback emails an hour; the rest wait in the table (one "busy" note says so). */
export const FEEDBACK_EMAILS_PER_HOUR = 12;

export type FeedbackEmailDecision = "send" | "busy-note" | "skip";

/**
 * `countLastHour` includes the message just stored. Under the cap: email it. The first one over: a
 * single "more is waiting" note instead. After that: nothing until the hour has passed. Pure.
 */
export function feedbackEmailDecision(countLastHour: number, cap = FEEDBACK_EMAILS_PER_HOUR): FeedbackEmailDecision {
  if (countLastHour <= cap) return "send";
  if (countLastHour === cap + 1) return "busy-note";
  return "skip";
}

/** A same-site path to show as "the page it came from" (no query strings, no other sites). Pure. */
export function cleanPage(raw: unknown, origin: string): string | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const url = new URL(raw, origin);
    if (url.origin !== new URL(origin).origin) return null;
    return url.pathname.slice(0, 120);
  } catch {
    return null;
  }
}

export interface FeedbackForEmail {
  message: string;
  lessonId: string | null;
  lessonTitle: string | null;
  rating: number | null;
  page: string | null;
  signedIn: boolean;
  at: Date;
}

/** The email: a short subject and a plain-text body (no HTML, so nothing in a message can inject any). Pure. */
export function feedbackEmail(f: FeedbackForEmail, timeZone = "Australia/Sydney"): { subject: string; text: string } {
  const firstLine = f.message.split("\n")[0]!.trim();
  const subject = `Feedback: ${firstLine.length > 50 ? `${firstLine.slice(0, 50)}…` : firstLine}`;
  const when = new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short", timeZone }).format(f.at);
  const lines = [
    f.message,
    "",
    "—",
    `Lesson: ${f.lessonTitle ? `${f.lessonTitle} (${f.lessonId})` : (f.lessonId ?? "none")}`,
    `Page: ${f.page ?? "unknown"}`,
    `Rating: ${f.rating ? `${f.rating} of 5` : "none"}`,
    `Signed in: ${f.signedIn ? "yes" : "no"}`,
    `Time: ${when} (Sydney), ${f.at.toISOString()}`,
    "",
    "Stored in the feedback table. Reply-to is not set: the sender is anonymous unless they wrote their email in the message.",
  ];
  return { subject, text: lines.join("\n") };
}

/** The busy-hour note, sent once when the hourly cap is passed. */
export function busyNote(cap = FEEDBACK_EMAILS_PER_HOUR): { subject: string; text: string } {
  return {
    subject: "Feedback: more messages are waiting",
    text: `More than ${cap} feedback messages arrived in the last hour, so the rest weren't emailed. They're all in the feedback table (Supabase dashboard).`,
  };
}
