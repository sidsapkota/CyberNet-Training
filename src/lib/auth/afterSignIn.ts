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

/**
 * Where to land right after signing in: new accounts (no display name yet) pick one first, keeping
 * where they were going; everyone else goes straight there. Shared by /auth/callback (links and
 * Google) and the email code, which signs in without leaving the page. Pure.
 */
export function afterSignInPath(next: string, hasUsername: boolean): string {
  const safe = safeNextPath(next);
  if (hasUsername) return safe;
  return safe === "/" ? "/account?welcome=1" : `/account?welcome=1&next=${encodeURIComponent(safe)}`;
}

/** The saved return path (the cookie), read once and cleared. For the email code, in the browser. */
export function takeNextPath(): string {
  try {
    const raw = document.cookie.split("; ").find((c) => c.startsWith(`${NEXT_COOKIE}=`))?.slice(NEXT_COOKIE.length + 1);
    document.cookie = `${NEXT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    return readNextCookie(raw) ?? "/";
  } catch {
    return "/";
  }
}

/** The sign-in code from the email: digits only (spaces and dashes from copy-paste are dropped). */
export const CODE_LENGTH = 6;
export function cleanCode(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 8);
}
/** Ready to check: 6 digits (up to 8 accepted, in case the project's code length is set longer). */
export function isCodeReady(code: string): boolean {
  return /^\d{6,8}$/.test(code);
}

