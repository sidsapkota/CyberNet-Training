import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/progress/daily";
import { computeStreak } from "@/lib/progress/streak";
import type { DailyGoalDay } from "@/lib/progress/types";
import {
  type GrantRecord,
  grantGivesPro,
  hasPro,
  maxFreezesOn,
  proIntervals,
  proStatus,
  RENEWAL_GRACE_MS,
  type SubscriptionRecord,
  trialEligible,
} from "./entitlement";

const NOW = new Date("2026-10-10T00:00:00Z");
const iso = (d: string) => new Date(d).toISOString();
const sub = (over: Partial<SubscriptionRecord> = {}): SubscriptionRecord => ({
  id: "sub_1",
  status: "active",
  priceId: "price_month",
  interval: "month",
  currentPeriodEnd: iso("2026-11-01T00:00:00Z"),
  trialEnd: null,
  cancelAtPeriodEnd: false,
  startedAt: iso("2026-10-01T00:00:00Z"),
  endedAt: null,
  ...over,
});
const grant = (over: Partial<GrantRecord> = {}): GrantRecord => ({
  reason: "early_user",
  startsAt: iso("2026-10-01T00:00:00Z"),
  expiresAt: iso("2026-10-31T00:00:00Z"),
  thankedAt: null,
  ...over,
});

describe("hasPro", () => {
  it("is true for trialing, active and past_due (Stripe still retrying) subscriptions", () => {
    for (const status of ["trialing", "active", "past_due"] as const) expect(hasPro([sub({ status })], null, NOW), status).toBe(true);
  });

  it("is false for every other status", () => {
    for (const status of ["incomplete", "incomplete_expired", "canceled", "unpaid", "paused"] as const) {
      expect(hasPro([sub({ status })], null, NOW), status).toBe(false);
    }
  });

  it("ends once the paid period is over, after a short grace for the renewal webhook", () => {
    const end = "2026-10-09T00:00:00Z";
    expect(hasPro([sub({ currentPeriodEnd: iso(end) })], null, NOW)).toBe(true); // within grace
    const later = new Date(Date.parse(end) + RENEWAL_GRACE_MS + 1);
    expect(hasPro([sub({ currentPeriodEnd: iso(end) })], null, later)).toBe(false);
  });

  it("keeps Pro to the end of the period after cancelling", () => {
    expect(hasPro([sub({ cancelAtPeriodEnd: true })], null, NOW)).toBe(true);
  });

  it("counts an early-user grant only between its start and expiry", () => {
    expect(hasPro([], grant(), NOW)).toBe(true);
    expect(grantGivesPro(grant({ expiresAt: iso("2026-10-10T00:00:00Z") }), NOW)).toBe(false); // expired exactly now
    expect(grantGivesPro(grant({ startsAt: iso("2026-10-11T00:00:00Z"), expiresAt: iso("2026-11-10T00:00:00Z") }), NOW)).toBe(false);
    expect(hasPro([], null, NOW)).toBe(false);
  });
});

describe("trial and status", () => {
  it("offers the trial only to accounts that never had a subscription", () => {
    expect(trialEligible([])).toBe(true);
    expect(trialEligible([sub({ status: "incomplete_expired" })])).toBe(true); // checkout never finished
    expect(trialEligible([sub({ status: "canceled", endedAt: iso("2026-10-05T00:00:00Z") })])).toBe(false);
  });

  it("describes a live subscription over a grant", () => {
    expect(proStatus([sub({ status: "trialing", trialEnd: iso("2026-10-15T00:00:00Z") })], grant(), NOW)).toMatchObject({
      kind: "subscription",
      status: "trialing",
      trialEnd: iso("2026-10-15T00:00:00Z"),
    });
    expect(proStatus([sub({ cancelAtPeriodEnd: true })], null, NOW)).toMatchObject({ kind: "subscription", cancelling: true });
    expect(proStatus([sub({ status: "past_due" })], null, NOW)).toMatchObject({ status: "past_due" });
  });

  it("describes a grant, or nothing", () => {
    expect(proStatus([], grant(), NOW)).toEqual({ kind: "grant", expiresAt: grant().expiresAt, thanked: false });
    expect(proStatus([sub({ status: "canceled" })], null, NOW)).toEqual({ kind: "none", hadSubscription: true });
    expect(proStatus([], null, NOW)).toEqual({ kind: "none", hadSubscription: false });
  });
});

describe("Pro's extra streak freeze", () => {
  const SYD = "Australia/Sydney";
  const met = (days: string[]): Record<string, DailyGoalDay> =>
    Object.fromEntries(days.map((d) => [d, { tz: SYD, goal: 50, metAt: `${d}T01:00:00.000Z` }]));
  const run = (last: string, n: number) => Array.from({ length: n }, (_, i) => addDays(last, i - n + 1));

  it("is 3 on days with Pro and 2 otherwise", () => {
    const cap = maxFreezesOn(proIntervals([sub({ startedAt: iso("2026-10-01T00:00:00Z"), status: "canceled", endedAt: iso("2026-10-05T00:00:00Z") })], null));
    expect(cap("2026-09-25")).toBe(2);
    expect(cap("2026-10-03")).toBe(3);
    expect(cap("2026-10-12")).toBe(2);
    expect(maxFreezesOn([])("2026-10-03")).toBe(2);
  });

  it("lets a Pro learner hold 3 freezes after 21 days", () => {
    const cap = maxFreezesOn(proIntervals([sub({ startedAt: iso("2026-09-01T00:00:00Z"), currentPeriodEnd: iso("2026-12-01T00:00:00Z") })], null));
    const today = { day: "2026-10-21", tz: SYD };
    expect(computeStreak(met(run("2026-10-21", 21)), today, cap).freezes).toBe(3);
    expect(computeStreak(met(run("2026-10-21", 21)), today).freezes).toBe(2);
  });

  it("covers three missed days with Pro", () => {
    const cap = maxFreezesOn(proIntervals([sub({ startedAt: iso("2026-09-01T00:00:00Z"), currentPeriodEnd: iso("2026-12-01T00:00:00Z") })], null));
    const days = [...run("2026-10-21", 21), "2026-10-25"]; // 22, 23, 24 missed
    const s = computeStreak(met(days), { day: "2026-10-25", tz: SYD }, cap);
    expect(s).toMatchObject({ current: 22, freezes: 0, frozenDays: ["2026-10-22", "2026-10-23", "2026-10-24"] });
  });

  it("never breaks a streak after Pro ends: a used third freeze stays used, an unused one drops away", () => {
    // Pro from 1 Sep until 18 Oct.
    const cap = maxFreezesOn(
      proIntervals([sub({ startedAt: iso("2026-09-01T00:00:00Z"), status: "canceled", endedAt: iso("2026-10-18T00:00:00Z") })], null),
    );
    // Met 21 Sep to 11 Oct (21 days: 3 freezes while Pro), missed 12 to 14 Oct (Pro days: all 3
    // used), then met 15 to 25 Oct, after Pro ended. The streak survives.
    const days = [...run("2026-10-11", 21), ...run("2026-10-25", 11)];
    const s = computeStreak(met(days), { day: "2026-10-25", tz: SYD }, cap);
    expect(s.frozenDays).toEqual(["2026-10-12", "2026-10-13", "2026-10-14"]);
    expect(s.current).toBe(32);
    // A third freeze never used is capped back to 2 once Pro has ended.
    expect(computeStreak(met(run("2026-10-25", 35)), { day: "2026-10-25", tz: SYD }, cap).freezes).toBe(2);
  });
});
