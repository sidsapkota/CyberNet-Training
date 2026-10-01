/**
 * Where to go after signing in, and which lesson asked a guest to sign up. Set in the browser
 * just before sign-in starts, because the sign-in link (an email, or Google) comes back to
 * /auth/callback without our query string.
 *
 * - The path rides in a short-lived, same-site cookie (only a same-site path, never personal), so
 *   the callback route can read it on the server. It's cleared there.
 * - The lesson is kept in localStorage for a day, because a magic link often opens in a new tab.
 *   It's read once, for the `signed_up` event.
 */
import { safeNextPath } from "./redirect";

export const NEXT_COOKIE = "cybernet_next";
export const SIGNUP_LESSON_KEY = "cybernet.signupLesson";
const LESSON_TTL_MS = 24 * 60 * 60 * 1000;

/** The cookie for `path` (an hour, same-site only). Pure, so it's tested. */
export function nextCookie(path: string, secure: boolean): string {
  const safe = safeNextPath(path);
  return `${NEXT_COOKIE}=${encodeURIComponent(safe)}; Path=/; Max-Age=3600; SameSite=Lax${secure ? "; Secure" : ""}`;
}

/** The path to go to, from the cookie's raw value. Pure. */
export function readNextCookie(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const path = safeNextPath(decodeURIComponent(raw), "");
    return path || null;
  } catch {
    return null;
  }
}

export function rememberNextPath(path: string): void {
  try {
    document.cookie = nextCookie(path, window.location.protocol === "https:");
  } catch {
    // Cookies blocked: sign-in still works, and lands on the home page.
  }
}

export function rememberSignupLesson(lessonId: string, now = Date.now()): void {
  try {
    window.localStorage.setItem(SIGNUP_LESSON_KEY, JSON.stringify({ lesson: lessonId, at: now }));
  } catch {
    // Storage blocked: the event just goes without a lesson.
  }
}

/** The lesson that prompted the sign-up, if it was within a day. Read once. */
export function takeSignupLesson(now = Date.now()): string | undefined {
  try {
    const raw = window.localStorage.getItem(SIGNUP_LESSON_KEY);
    window.localStorage.removeItem(SIGNUP_LESSON_KEY);
    const parsed = raw ? (JSON.parse(raw) as { lesson?: unknown; at?: unknown }) : null;
    if (parsed && typeof parsed.lesson === "string" && typeof parsed.at === "number" && now - parsed.at < LESSON_TTL_MS) return parsed.lesson;
  } catch {
    // Ignore: no lesson.
  }
  return undefined;
}
