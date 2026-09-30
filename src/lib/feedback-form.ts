/** Feedback form rules, shared by the form and its tests. The database enforces the same limits. */
export const FEEDBACK_MAX = 1000;
export const FEEDBACK_SESSION_KEY = "cybernet.feedback.session";

/** A random id for this browser tab, used only for the per-session rate limit. */
export function feedbackSessionId(): string {
  try {
    const existing = sessionStorage.getItem(FEEDBACK_SESSION_KEY);
    if (existing && /^[0-9a-f-]{36}$/.test(existing)) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(FEEDBACK_SESSION_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/** Plain words for what went wrong (the database's rate-limit messages are already friendly). */
export function friendlyFeedbackError(message: string): string {
  if (/too much feedback|lots of feedback/i.test(message)) return message;
  return "Couldn't send that. Check your connection and try again.";
}

/** A lesson id from the URL, only if it's a real lesson. */
export function feedbackLesson(raw: string | string[] | undefined, lessonIds: readonly string[]): string | null {
  const id = Array.isArray(raw) ? raw[0] : raw;
  return id && lessonIds.includes(id) ? id : null;
}
