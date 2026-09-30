import { describe, expect, it } from "vitest";
import { addDays, dayDiff, dayStart, localDay } from "./daily";
import { computeStreak, MAX_FREEZES, milestoneReached, missedDaysBetween } from "./streak";
import type { DailyGoalDay } from "./types";

const SYD = "Australia/Sydney";
const NY = "America/New_York";
const LA = "America/Los_Angeles";

/** Goal days on consecutive-or-not dates, all in one time zone unless given as [day, tz]. */
function met(tz: string, ...days: (string | [string, string])[]): Record<string, DailyGoalDay> {
  return Object.fromEntries(
    days.map((d) => {
      const [day, zone] = Array.isArray(d) ? d : [d, tz];
      return [day, { tz: zone, goal: 50, metAt: `${day}T10:00:00.000Z` }];
    }),
  );
}
/** `n` consecutive days ending on `last`. */
function run(tz: string, last: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(last, i - n + 1));
}

describe("local days and time zones", () => {
  it("dates a moment in the learner's own time zone, either side of midnight", () => {
    // 13:59 UTC on 30 Sep is 23:59 in Sydney (AEST, +10); a minute later it's 1 Oct there.
    expect(localDay(Date.parse("2026-09-30T13:59:00Z"), "Australia/Brisbane")).toBe("2026-09-30");
    expect(localDay(Date.parse("2026-09-30T14:00:00Z"), "Australia/Brisbane")).toBe("2026-10-01");
    // The same instant is still the day before in New York.
    expect(localDay(Date.parse("2026-09-30T14:00:00Z"), NY)).toBe("2026-09-30");
  });

  it("does calendar arithmetic without time zones, across months and leap days", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(dayDiff("2026-09-30", "2026-10-02")).toBe(2);
  });

  it("finds the start of a day, including daylight-saving days (23 and 25 hours long)", () => {
    // Sydney springs forward on 4 Oct 2026 (02:00 → 03:00): that day is 23 hours long.
    expect((dayStart("2026-10-05", SYD) - dayStart("2026-10-04", SYD)) / 3_600_000).toBe(23);
    // New York falls back on 1 Nov 2026: that day is 25 hours long.
    expect((dayStart("2026-11-02", NY) - dayStart("2026-11-01", NY)) / 3_600_000).toBe(25);
    expect(localDay(dayStart("2026-10-04", SYD), SYD)).toBe("2026-10-04");
  });
});

describe("missed days", () => {
  it("counts calendar dates in one time zone", () => {
    expect(missedDaysBetween({ day: "2026-10-01", tz: SYD }, { day: "2026-10-02", tz: SYD })).toBe(0);
    expect(missedDaysBetween({ day: "2026-10-01", tz: SYD }, { day: "2026-10-03", tz: SYD })).toBe(1);
    expect(missedDaysBetween({ day: "2026-10-01", tz: SYD }, { day: "2026-10-05", tz: SYD })).toBe(3);
  });

  it("ignores daylight saving: consecutive days either side of the change aren't missed", () => {
    expect(missedDaysBetween({ day: "2026-10-03", tz: SYD }, { day: "2026-10-05", tz: SYD })).toBe(1);
    expect(missedDaysBetween({ day: "2026-10-04", tz: SYD }, { day: "2026-10-05", tz: SYD })).toBe(0);
    expect(missedDaysBetween({ day: "2026-10-31", tz: NY }, { day: "2026-11-02", tz: NY })).toBe(1);
  });

  it("never counts a calendar date skipped by flying east over the date line", () => {
    // Met on 1 Oct in Los Angeles, landed in Sydney where it's already 3 Oct.
    expect(missedDaysBetween({ day: "2026-10-01", tz: LA }, { day: "2026-10-03", tz: SYD })).toBe(0);
  });

  it("still counts a whole day missed after changing time zone", () => {
    expect(missedDaysBetween({ day: "2026-10-01", tz: LA }, { day: "2026-10-04", tz: SYD })).toBe(1);
    // A one-hour move (e.g. Sydney to Brisbane) with a genuinely empty day in between.
    expect(missedDaysBetween({ day: "2026-10-05", tz: SYD }, { day: "2026-10-07", tz: "Australia/Brisbane" })).toBe(1);
  });
});

describe("computeStreak", () => {
  const today = (day: string, tz = SYD) => ({ day, tz });

  it("is zero with no met days, and not 'ended'", () => {
    expect(computeStreak({}, today("2026-10-10"))).toMatchObject({ current: 0, longest: 0, freezes: 0, ended: false });
  });

  it("counts consecutive met days, including today", () => {
    const s = computeStreak(met(SYD, ...run(SYD, "2026-10-10", 4)), today("2026-10-10"));
    expect(s).toMatchObject({ current: 4, longest: 4, todayMet: true });
  });

  it("keeps the streak alive while today is still open", () => {
    const s = computeStreak(met(SYD, ...run(SYD, "2026-10-09", 4)), today("2026-10-10"));
    expect(s).toMatchObject({ current: 4, todayMet: false, ended: false });
  });

  it("restarts after a missed day with no freezes, gently marked as ended", () => {
    const s = computeStreak(met(SYD, ...run(SYD, "2026-10-08", 4)), today("2026-10-10"));
    expect(s).toMatchObject({ current: 0, longest: 4, ended: true });
    const again = computeStreak(met(SYD, ...run(SYD, "2026-10-05", 4), "2026-10-10"), today("2026-10-10"));
    expect(again).toMatchObject({ current: 1, longest: 4, ended: false });
  });

  it("earns a freeze every 7 days, holding at most 2", () => {
    expect(computeStreak(met(SYD, ...run(SYD, "2026-10-10", 6)), today("2026-10-10")).freezes).toBe(0);
    expect(computeStreak(met(SYD, ...run(SYD, "2026-10-10", 7)), today("2026-10-10")).freezes).toBe(1);
    expect(computeStreak(met(SYD, ...run(SYD, "2026-10-14", 14)), today("2026-10-14")).freezes).toBe(2);
    expect(computeStreak(met(SYD, ...run(SYD, "2026-10-21", 21)), today("2026-10-21")).freezes).toBe(MAX_FREEZES);
  });

  it("uses a freeze automatically on a missed day, without adding to the streak", () => {
    const days = [...run(SYD, "2026-10-07", 7), "2026-10-09", "2026-10-10"]; // 8 Oct missed
    const s = computeStreak(met(SYD, ...days), today("2026-10-10"));
    expect(s).toMatchObject({ current: 9, freezes: 0, frozenDays: ["2026-10-08"] });
  });

  it("uses a freeze for yesterday while today is still open", () => {
    const s = computeStreak(met(SYD, ...run(SYD, "2026-10-08", 7)), today("2026-10-10"));
    expect(s).toMatchObject({ current: 7, freezes: 0, frozenDays: ["2026-10-09"], ended: false });
  });

  it("covers two missed days with two freezes, but not three", () => {
    const base = run(SYD, "2026-10-14", 14);
    const two = computeStreak(met(SYD, ...base, "2026-10-17"), today("2026-10-17"));
    expect(two).toMatchObject({ current: 15, freezes: 0, frozenDays: ["2026-10-15", "2026-10-16"] });
    const three = computeStreak(met(SYD, ...base, "2026-10-18"), today("2026-10-18"));
    expect(three).toMatchObject({ current: 1, longest: 14, freezes: 0 });
  });

  it("isn't broken by daylight saving", () => {
    // Every day from 1 to 7 Oct in Sydney, across the 4 Oct change.
    const s = computeStreak(met(SYD, ...run(SYD, "2026-10-07", 7)), today("2026-10-07"));
    expect(s).toMatchObject({ current: 7, frozenDays: [] });
  });

  it("isn't broken by flying east over the date line", () => {
    const days = met(LA, "2026-09-30", "2026-10-01", ["2026-10-03", SYD]);
    expect(computeStreak(days, today("2026-10-03", SYD))).toMatchObject({ current: 3, frozenDays: [] });
  });

  it("isn't doubled by flying west (the same date can't be met twice)", () => {
    const days = met(SYD, "2026-10-01", ["2026-10-02", LA]);
    expect(computeStreak(days, today("2026-10-02", LA))).toMatchObject({ current: 2 });
  });

  it("ignores met days after today (clock changes)", () => {
    expect(computeStreak(met(SYD, "2026-10-11"), today("2026-10-10")).current).toBe(0);
  });
});

describe("milestones", () => {
  it("fires once when a milestone is reached", () => {
    expect(milestoneReached(2, 3)).toBe(3);
    expect(milestoneReached(3, 4)).toBeNull();
    expect(milestoneReached(6, 7)).toBe(7);
    expect(milestoneReached(99, 100)).toBe(100);
    expect(milestoneReached(0, 1)).toBeNull();
  });
});
