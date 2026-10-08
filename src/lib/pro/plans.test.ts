import { describe, expect, it } from "vitest";
import { DAILY_LESSON_LIMIT } from "./dailyLimit";
import { FREE_MAX_FREEZES, PRO_MAX_FREEZES } from "./entitlement";
import {
  bestValueChoice,
  CELEBRATE_WITHIN_MS,
  choiceNote,
  defaultChoice,
  currentProStart,
  FREE_BENEFITS,
  PLAN_TABLE,
  planSelectedData,
  plansSourceFrom,
  plansViewedData,
  PRO_BENEFITS,
  proChoices,
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

describe("the Free vs Pro table", () => {
  it("has 4 or 5 rows, unlimited lessons first", () => {
    expect(PLAN_TABLE.length).toBeGreaterThanOrEqual(4);
    expect(PLAN_TABLE.length).toBeLessThanOrEqual(5);
    expect(PLAN_TABLE[0]).toEqual({ feature: "Unlimited lessons every day", free: `${DAILY_LESSON_LIMIT} a day`, pro: true });
  });

  it("gives Pro every row, and states the real numbers", () => {
    expect(PLAN_TABLE.every((r) => r.pro !== false)).toBe(true);
    expect(PLAN_TABLE.find((r) => r.feature === "Streak freezes")).toEqual({
      feature: "Streak freezes",
      free: `Up to ${FREE_MAX_FREEZES}`,
      pro: `Up to ${PRO_MAX_FREEZES}`,
    });
    expect(PRO_MAX_FREEZES).toBe(FREE_MAX_FREEZES + 1); // "an extra streak freeze"
  });

  it("only lists what Pro really has (every Pro benefit is a row)", () => {
    for (const benefit of PRO_BENEFITS.filter((b) => !/streak freeze/.test(b))) {
      expect(PLAN_TABLE.map((r) => r.feature)).toContain(benefit);
    }
    expect(PLAN_TABLE.map((r) => r.feature).join(" ")).not.toMatch(/new course/i);
  });
});

describe("the Pro box: Lifetime, Yearly, Monthly", () => {
  it("offers Lifetime first, and selects it, while Founding Member seats remain", () => {
    expect(proChoices(true)).toEqual(["lifetime", "annual", "monthly"]);
    expect(defaultChoice(true)).toBe("lifetime");
    expect(bestValueChoice(true, true)).toBe("lifetime");
  });

  it("drops Lifetime when seats run out, and Yearly becomes Best value (only if it saves)", () => {
    expect(proChoices(false)).toEqual(["annual", "monthly"]);
    expect(defaultChoice(false)).toBe("annual");
    expect(bestValueChoice(false, true)).toBe("annual");
    expect(bestValueChoice(false, false)).toBeNull();
  });

  it("never says Cancel anytime about a one-off payment", () => {
    expect(choiceNote("annual")).toBe("Cancel anytime · Under 18? Ask a parent");
    expect(choiceNote("monthly")).toBe("Cancel anytime · Under 18? Ask a parent");
    expect(choiceNote("lifetime")).not.toMatch(/cancel/i);
    expect(choiceNote("lifetime")).toContain("Under 18? Ask a parent");
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
    expect(planSelectedData("pro", "lifetime")).toEqual({ plan: "pro", interval: "lifetime" });
    expect(planSelectedData("pro", "weekly")).toEqual({ plan: "pro" });
    expect(planSelectedData("someone@example.com")).toEqual({});
  });

  it("reads where /pro was opened from", () => {
    expect(plansSourceFrom("?from=dashboard")).toBe("dashboard");
    expect(plansSourceFrom("?from=account")).toBe("account");
    expect(plansSourceFrom("?from=nav")).toBe("nav");
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
