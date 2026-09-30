/**
 * Privacy-friendly analytics (Vercel Web Analytics: no cookies, no personal data).
 *
 * Where a visitor came from is worked out once per browser tab and kept in sessionStorage
 * (never a cookie): a `utm_source` in the first URL they open, or a tagged path like
 * `/from/tiktok`. Custom events carry at most two properties, `lesson` and `source`, which fits
 * Vercel Pro's limit. (On Hobby, custom events aren't collected at all; page views of the
 * `/from/<platform>` paths still show which video sent people. See CLAUDE.md → Analytics.)
 */
import { track } from "@vercel/analytics";

export const SOURCE_KEY = "cybernet.source";

export type AnalyticsEvent = "landing_cta" | "lesson_start" | "lesson_complete" | "quiz_pass" | "signup_complete";

/**
 * The URL analytics may see: query strings are dropped except `utm_*` (so a sign-in token or an
 * email address can never be sent), and dev pages aren't tracked at all (null). Pure.
 */
export function redactUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.pathname.startsWith("/dev")) return null;
    const kept = new URLSearchParams();
    for (const [k, v] of url.searchParams) if (k.startsWith("utm_")) kept.set(k, v.slice(0, 60));
    url.search = kept.toString();
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

/** A source label is short, lower-case and plain, so nothing personal can ride along in it. */
export function cleanSource(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim().toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{0,29}$/.test(s) ? s : null;
}

/** The source in a URL: `?utm_source=…` wins, then a `/from/<platform>` path. Pure. */
export function sourceFromUrl(pathname: string, search: string): string | null {
  const utm = cleanSource(new URLSearchParams(search).get("utm_source"));
  if (utm) return utm;
  const match = /^\/from\/([^/]+)/.exec(pathname);
  return match ? cleanSource(decodeURIComponent(match[1]!)) : null;
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null; // blocked storage: analytics still works, just without a source
  }
}

/** Call once per page load: remembers the first source seen in this tab. */
export function rememberSource(pathname: string, search: string): void {
  const store = storage();
  const found = sourceFromUrl(pathname, search);
  if (!store || !found) return;
  try {
    if (!store.getItem(SOURCE_KEY)) store.setItem(SOURCE_KEY, found);
  } catch {
    // ignore
  }
}

export function currentSource(): string | null {
  try {
    return cleanSource(storage()?.getItem(SOURCE_KEY));
  } catch {
    return null;
  }
}

/** Sends a custom event with at most `lesson` and `source`. Never throws. */
export function trackEvent(name: AnalyticsEvent, lesson?: string): void {
  try {
    const data: Record<string, string> = {};
    if (lesson) data.lesson = lesson.slice(0, 80);
    const source = currentSource();
    if (source) data.source = source;
    track(name, data);
  } catch {
    // analytics must never break the app
  }
}
