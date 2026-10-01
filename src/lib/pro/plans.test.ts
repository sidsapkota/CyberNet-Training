import { describe, expect, it } from "vitest";
import {
  CELEBRATE_WITHIN_MS,
  currentProStart,
  FREE_BENEFITS,
  planSelectedData,
  plansSourceFrom,
  plansViewedData,
  PRO_BENEFITS,
  shouldCelebrate,
} from "./plans";

const NOW = Date.parse("2026-10-02T10:00:00Z");

describe("plan benefits", () => {
  it("lists four Pro benefits at most, and three free ones", () => {
    expect(PRO_BENEFITS.length).toBeLessThanOrEqual(4);
    expect(FREE_BENEFITS).toHaveLength(3);
  });

  it("never lists a benefit that isn't live", () => {
    // "Every new course" would suggest free accounts don't get new courses (they do).
    expect(PRO_BENEFITS.join(" ")).not.toMatch(/new course/i);
  });
});

describe("plan events (nothing personal)", () => {
  it("plans_viewed carries only a known screen", () => {
    expect(plansViewedData("dashboard")).toEqual({ source: "dashboard" });
    expect(plansViewedData("tiktok")).toEqual({});
  });

  it("plan_selected carries the plan and, for Pro, the interval", () => {
    expect(planSelectedData("free")).toEqual({ plan: "free" });
    expect(planSelectedData("free", "annual")).toEqual({ plan: "free" });
    expect(planSelectedData("pro", "monthly")).toEqual({ plan: "pro", interval: "monthly" });
    expect(planSelectedData("pro", "weekly")).toEqual({ plan: "pro" });
    expect(planSelectedData("someone@example.com")).toEqual({});
  });

  it("reads where /pro was opened from", () => {
    expect(plansSourceFrom("?from=dashboard")).toBe("dashboard");
    expect(plansSourceFrom("?from=account")).toBe("account");
    expect(plansSourceFrom("?from=nowhere")).toBe("pro_page");
    expect(plansSourceFrom("")).toBe("pro_page");
  });
});

describe("the welcome moment after upgrading", () => {
  const start = new Date(NOW - 3 * 86_400_000).toISOString();

  it("celebrates a new subscription once per device", () => {
    expect(shouldCelebrate(true, start, null, NOW)).toBe(true);
    expect(shouldCelebrate(true, start, start, NOW)).toBe(false);
  });

  it("celebrates again for a new subscription after an old one", () => {
    expect(shouldCelebrate(true, start, "2026-01-01T00:00:00.000Z", NOW)).toBe(true);
  });

  it("skips the early-user grant and old subscriptions", () => {
    expect(shouldCelebrate(false, start, null, NOW)).toBe(false);
    expect(shouldCelebrate(true, new Date(NOW - CELEBRATE_WITHIN_MS - 1).toISOString(), null, NOW)).toBe(false);
    expect(shouldCelebrate(true, null, null, NOW)).toBe(false);
  });

  it("finds the start of the Pro time that's still going", () => {
    const old = { start: NOW - 90 * 86_400_000, end: NOW - 60 * 86_400_000 };
    const live = { start: NOW - 86_400_000, end: null };
    expect(currentProStart([old, live], NOW)).toBe(new Date(live.start).toISOString());
    expect(currentProStart([old], NOW)).toBeNull();
  });
});
