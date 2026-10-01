/**
 * "What's stopping you?": after "Not now" on a Pro screen, one optional question with four one-tap
 * answers and Skip. Asked at most once a week per device (localStorage, never synced), and the
 * event carries only the answer and which screen it came from. Pure, apart from the storage helpers.
 */

export const DECLINED_ASKED_KEY = "cybernet.proDeclined.askedAt";

/** At most once in this long, per device. */
export const DECLINED_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export const DECLINE_REASONS = [
  { id: "too_expensive", label: "Too expensive" },
  { id: "ask_parent", label: "Need to ask a parent" },
  { id: "not_sure", label: "Not sure it's worth it yet" },
  { id: "just_exploring", label: "Just exploring" },
] as const;

export type DeclineReason = (typeof DECLINE_REASONS)[number]["id"] | "skipped";

/** Which Pro screen "Not now" was pressed on. */
export type DeclineSource = "paywall" | "limit" | "pro_page";

const REASONS = new Set<string>([...DECLINE_REASONS.map((r) => r.id), "skipped"]);
const SOURCES = new Set<string>(["paywall", "limit", "pro_page"]);

/** Whether to ask now, given when this device last asked (an ISO time, or null). Pure. */
export function shouldAskDeclined(lastAsked: string | null, now: number): boolean {
  if (!lastAsked) return true;
  const at = Date.parse(lastAsked);
  // An unreadable time, or one in the future (a changed clock), asks again rather than never.
  if (Number.isNaN(at) || at > now) return true;
  return now - at >= DECLINED_INTERVAL_MS;
}

/** `pro_declined`'s properties: the answer and the screen, nothing else. Pure. */
export function declinedEventData(reason: string, source: string): Record<string, string> {
  const data: Record<string, string> = {};
  if (REASONS.has(reason)) data.reason = reason;
  if (SOURCES.has(source)) data.source = source;
  return data;
}

/** Whether this device is due the question. False when storage is blocked (never nag blind). */
export function declinedQuestionDue(now = Date.now()): boolean {
  try {
    return shouldAskDeclined(localStorage.getItem(DECLINED_ASKED_KEY), now);
  } catch {
    return false;
  }
}

/** Records that the question was shown, so it waits a week. */
export function markDeclinedAsked(now = Date.now()): void {
  try {
    localStorage.setItem(DECLINED_ASKED_KEY, new Date(now).toISOString());
  } catch {
    // storage blocked: declinedQuestionDue is already false
  }
}
