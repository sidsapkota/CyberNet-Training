/**
 * Who has CyberNet Pro, decided from the subscriptions the Stripe webhook saved and the early-user
 * grant. Pure (pass `now` in), so it's unit-tested and shared by the server (which makes every
 * decision) and the UI (which only shows status).
 *
 * Pro means either:
 * - a subscription that's `trialing`, `active` or `past_due` (Stripe is still retrying a failed
 *   payment; up to about two weeks, then it cancels) whose paid period hasn't ended, allowing a short grace
 *   for the renewal webhook to arrive; or
 * - an early-user grant that hasn't expired.
 */

export type SubscriptionStatus =
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused";

export interface SubscriptionRecord {
  id: string;
  status: SubscriptionStatus;
  priceId: string;
  interval: "month" | "year" | null;
  /** ISO. End of the period that's been paid for (or the trial). */
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
  startedAt: string;
  endedAt: string | null;
}

export interface GrantRecord {
  reason: "early_user";
  startsAt: string;
  expiresAt: string;
  thankedAt: string | null;
}

/** Statuses that give Pro (while the period lasts). */
export const PRO_STATUSES: readonly SubscriptionStatus[] = ["trialing", "active", "past_due"];
/** How long after a period's end access continues while the renewal is confirmed. */
export const RENEWAL_GRACE_MS = 2 * 24 * 60 * 60 * 1000;
export const EARLY_USER_DAYS = 30;

const ms = (iso: string | null) => (iso === null ? Number.NaN : Date.parse(iso));

export function subscriptionGivesPro(s: SubscriptionRecord, now: Date): boolean {
  if (!PRO_STATUSES.includes(s.status)) return false;
  const end = ms(s.currentPeriodEnd);
  return Number.isNaN(end) || now.getTime() < end + RENEWAL_GRACE_MS;
}

export function grantGivesPro(g: GrantRecord | null, now: Date): boolean {
  if (!g) return false;
  const t = now.getTime();
  return ms(g.startsAt) <= t && t < ms(g.expiresAt);
}

export function hasPro(subs: readonly SubscriptionRecord[], grant: GrantRecord | null, now: Date): boolean {
  return subs.some((s) => subscriptionGivesPro(s, now)) || grantGivesPro(grant, now);
}

/** The 7-day trial is for first-time subscribers: accounts that have never had a subscription. */
export function trialEligible(subs: readonly SubscriptionRecord[]): boolean {
  return subs.every((s) => s.status === "incomplete" || s.status === "incomplete_expired");
}

export type ProStatus =
  | { kind: "none"; hadSubscription: boolean }
  | { kind: "grant"; expiresAt: string; thanked: boolean }
  | {
      kind: "subscription";
      status: "trialing" | "active" | "past_due";
      interval: "month" | "year" | null;
      /** When it renews, or ends if cancelling (ISO). */
      periodEnd: string | null;
      trialEnd: string | null;
      cancelling: boolean;
    };

/** What to show the learner about their Pro. A live subscription wins over the grant. */
export function proStatus(subs: readonly SubscriptionRecord[], grant: GrantRecord | null, now: Date): ProStatus {
  const live = subs
    .filter((s) => subscriptionGivesPro(s, now))
    .sort((a, b) => ms(b.startedAt) - ms(a.startedAt))[0];
  if (live) {
    return {
      kind: "subscription",
      status: live.status as "trialing" | "active" | "past_due",
      interval: live.interval,
      periodEnd: live.currentPeriodEnd,
      trialEnd: live.status === "trialing" ? live.trialEnd : null,
      cancelling: live.cancelAtPeriodEnd,
    };
  }
  if (grant && grantGivesPro(grant, now)) return { kind: "grant", expiresAt: grant.expiresAt, thanked: grant.thankedAt !== null };
  return { kind: "none", hadSubscription: !trialEligible(subs) };
}

// ── Streak freezes: Pro holds one more, day by day ──────────────────────────

/**
 * Until when the learner has Pro, for the cosmetic Pro frame on league cards (null: no Pro now).
 * The latest end among the subscriptions and grant that give Pro right now.
 */
export function proCosmeticUntil(subs: readonly SubscriptionRecord[], grant: GrantRecord | null, now: Date): string | null {
  const ends: number[] = [];
  for (const s of subs) {
    if (!subscriptionGivesPro(s, now)) continue;
    const end = ms(s.currentPeriodEnd);
    ends.push(Number.isNaN(end) ? now.getTime() + 86_400_000 : end + RENEWAL_GRACE_MS);
  }
  if (grant && grantGivesPro(grant, now)) ends.push(ms(grant.expiresAt));
  return ends.length ? new Date(Math.max(...ends)).toISOString() : null;
}

export const FREE_MAX_FREEZES = 2;
export const PRO_MAX_FREEZES = 3;

export interface ProInterval {
  start: number;
  /** null: still going. */
  end: number | null;
}

/** When the learner had Pro: each paid (or trial) subscription's life, and the grant. */
export function proIntervals(subs: readonly SubscriptionRecord[], grant: GrantRecord | null): ProInterval[] {
  const out: ProInterval[] = [];
  for (const s of subs) {
    if (s.status === "incomplete" || s.status === "incomplete_expired") continue;
    const start = ms(s.startedAt);
    if (Number.isNaN(start)) continue;
    const ended = ms(s.endedAt);
    const periodEnd = ms(s.currentPeriodEnd);
    const end = !Number.isNaN(ended)
      ? ended
      : PRO_STATUSES.includes(s.status)
        ? Number.isNaN(periodEnd) ? null : periodEnd + RENEWAL_GRACE_MS
        : Number.isNaN(periodEnd) ? start : periodEnd;
    out.push({ start, end });
  }
  if (grant) out.push({ start: ms(grant.startsAt), end: ms(grant.expiresAt) });
  return out;
}

/**
 * The most freezes a learner could hold on a local day ("YYYY-MM-DD"): 3 on any day they had Pro,
 * otherwise 2. A day counts if Pro overlapped it anywhere in the world (the day spans UTC−12 to
 * UTC+14), so the rounding only ever favours the learner.
 */
export function maxFreezesOn(intervals: readonly ProInterval[]): (day: string) => number {
  if (intervals.length === 0) return () => FREE_MAX_FREEZES;
  return (day) => {
    const midnightUtc = Date.parse(`${day}T00:00:00Z`);
    const from = midnightUtc - 14 * 3_600_000;
    const to = midnightUtc + 36 * 3_600_000;
    return intervals.some((i) => i.start < to && (i.end === null || i.end > from)) ? PRO_MAX_FREEZES : FREE_MAX_FREEZES;
  };
}

// ── The early-user thank-you ─────────────────────────────────────────────────

/**
 * Accounts created before Pro launched get 30 days of Pro, starting on their first visit after
 * launch. `launchAt` is PRO_LAUNCH_AT (unset: Pro hasn't launched, so no grants yet).
 */
export function earlyGrantEligible(createdAt: string | null, launchAt: Date | null, now: Date): boolean {
  if (!launchAt || !createdAt) return false;
  const created = Date.parse(createdAt);
  return !Number.isNaN(created) && created < launchAt.getTime() && now.getTime() >= launchAt.getTime();
}

export function newEarlyGrant(now: Date): { starts_at: string; expires_at: string; reason: "early_user" } {
  return {
    reason: "early_user",
    starts_at: now.toISOString(),
    expires_at: new Date(now.getTime() + EARLY_USER_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/** PRO_LAUNCH_AT parsed; null when unset or not a valid date. */
export function parseLaunchAt(value: string | undefined): Date | null {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : new Date(t);
}
