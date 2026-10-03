/**
 * Privacy-friendly analytics (Vercel Web Analytics: no cookies, no personal data).
 *
 * Where a visitor came from is worked out once per browser tab and kept in sessionStorage
 * (never a cookie): a `utm_source` in the first URL they open, or a tagged path like
 * `/from/tiktok`. Custom events carry at most two properties, `lesson` (or `course`) and `source`, which fits
 * Vercel Pro's limit. (On Hobby, custom events aren't collected at all; page views of the
 * `/from/<platform>` paths still show which video sent people. See CLAUDE.md → Analytics.)
 */
import { track } from "@vercel/analytics";

export const SOURCE_KEY = "cybernet.source";

export type AnalyticsEvent =
  | "landing_cta"
  | "lesson_start"
  | "lesson_complete"
  | "quiz_pass"
  // The sign-up gate: a guest saw it (on a lesson that needs an account, or after lesson 1), and a
  // new account finished setting up (with the lesson that prompted it, when there was one).
  | "signup_prompt_viewed"
  | "signed_up"
  // The Pro funnel (lesson or course id and source only).
  | "paywall_viewed"
  // A free account reached today's lesson limit (with the lesson they tried to open).
  | "limit_reached"
  // Someone left a lesson without finishing it: the lesson and the card they were on (1-based).
  | "lesson_quit"
  // After "Not now" on a Pro screen: the one-tap answer to "What's stopping you?" and the screen
  // (`declinedEventData` in src/lib/pro/declined.ts), without the visitor's source.
  | "pro_declined"
  // The plans section: opened (with the screen it came from) and a plan picked (free or pro, and
  // monthly or annual). Their data comes from src/lib/pro/plans.ts, without the visitor's source.
  | "plans_viewed"
  | "plan_selected"
  | "teaser_played"
  // Founding Member: the offer was on screen, its button was pressed (both with the screen, from
  // founderEventData), and a seat was bought (on /pro/welcome, after the server confirmed it).
  | "founder_viewed"
  | "founder_clicked"
  | "founder_purchased"
  | "checkout_started"
  | "trial_started"
  | "subscribed"
  | "certificate_issued"
  // Someone clicked "Email us" about a family/household deal, in /pro's parent section (no properties).
  | "family_interest";

/** What an event is about: a lesson id (a plain string), or a course. */
export type EventTarget = string | { course: string };

const CONTENT_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * An event's properties: at most `lesson` or `course`, plus `source`. Only a content id
 * (kebab-case) is ever sent, so nothing personal can ride along. Pure.
 */
export function eventData(target: EventTarget | undefined, source: string | null): Record<string, string> {
  const data: Record<string, string> = {};
  const [key, id] = typeof target === "string" ? ["lesson", target] : target ? ["course", target.course] : [null, ""];
  if (key && CONTENT_ID.test(id) && id.length <= 80) data[key] = id;
  if (source) data.source = source;
  return data;
}

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

type VaWindow = { va?: (...params: unknown[]) => void; vaq?: unknown[][] };

/**
 * Makes sure events sent before Vercel's script starts are queued, not lost. `track()` only calls
 * `window.va`, which `<Analytics>` creates in its effect, and that runs after the page's own effects:
 * so `lesson_start`, `paywall_viewed` and the like, sent as a page first loads, were silently
 * dropped. This is the same queue Vercel's own `initQueue` makes; its script reads `vaq` on load.
 */
export function ensureAnalyticsQueue(): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as VaWindow;
  if (w.va) return;
  w.va = (...params: unknown[]) => {
    (w.vaq ??= []).push(params);
  };
}

/**
 * `lesson_quit`'s properties: the lesson id and the card number (1–99), nothing else (Vercel keeps
 * 2 properties an event on our plan, so this one leaves out `source`). Pure.
 */
export function quitEventData(lessonId: string, cardNumber: number): Record<string, string> {
  const data: Record<string, string> = {};
  if (CONTENT_ID.test(lessonId) && lessonId.length <= 80) data.lesson = lessonId;
  if (Number.isInteger(cardNumber) && cardNumber >= 1 && cardNumber <= 99) data.card = String(cardNumber);
  return data;
}

/** Someone left a lesson unfinished on this card. Never throws. */
export function trackLessonQuit(lessonId: string, cardNumber: number): void {
  try {
    ensureAnalyticsQueue();
    track("lesson_quit", quitEventData(lessonId, cardNumber));
  } catch {
    // analytics must never break the app
  }
}

/** "What's stopping you?" was answered (or skipped) on this Pro screen. Never throws. */
export function trackProDeclined(data: Record<string, string>): void {
  trackWith("pro_declined", data);
}

/** An event whose data was already checked by its own pure function. Never throws. */
export function trackWith(name: "pro_declined" | "plans_viewed" | "plan_selected" | "founder_viewed" | "founder_clicked", data: Record<string, string>): void {
  try {
    ensureAnalyticsQueue();
    track(name, data);
  } catch {
    // analytics must never break the app
  }
}

/** Sends a custom event with at most `lesson` (or `course`) and `source`. Never throws. */
export function trackEvent(name: AnalyticsEvent, target?: EventTarget): void {
  try {
    ensureAnalyticsQueue();
    track(name, eventData(target, currentSource()));
  } catch {
    // analytics must never break the app
  }
}
