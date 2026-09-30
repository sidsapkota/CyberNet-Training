import { describe, expect, it } from "vitest";
import {
  addXpEvent,
  checkGoal,
  currentDay,
  isDailyGoal,
  isValidTimeZone,
  type Ledger,
  MAX_LOCAL_XP_EVENTS,
  plausibleEvent,
  safeTimeZone,
  todayProgress,
} from "./daily";
import { emptySnapshot, type XpEvent } from "./types";

const SYD = "Australia/Sydney";
const LA = "America/Los_Angeles";
const empty = (): Ledger => ({ xpEvents: [], goalDays: {} });
const at = (iso: string) => new Date(iso);

describe("addXpEvent", () => {
  it("dates the event with the learner's local day", () => {
    // 20:00 UTC on 9 Oct is 07:00 on 10 Oct in Sydney (AEDT, +11).
    const { event } = addXpEvent(empty(), { kind: "card", lessonId: "l", cardId: "c", xp: 10 }, at("2026-10-09T20:00:00Z"), SYD, 50);
    expect(event).toMatchObject({ day: "2026-10-10", tz: SYD, xp: 10, kind: "card" });
  });

  it("records nothing for zero XP", () => {
    const r = addXpEvent(empty(), { kind: "card", lessonId: "l", cardId: "c", xp: 0 }, at("2026-10-10T01:00:00Z"), SYD, 50);
    expect(r.event).toBeNull();
    expect(r.ledger.xpEvents).toHaveLength(0);
  });

  it("meets the goal on the event that crosses it, once", () => {
    let ledger = empty();
    const now = at("2026-10-10T01:00:00Z");
    const results = [10, 10, 10, 10, 10, 10].map((xp, i) => {
      const r = addXpEvent(ledger, { kind: "card", lessonId: "l", cardId: `c${i}`, xp }, now, SYD, 50);
      ledger = r.ledger;
      return r.goalMet;
    });
    expect(results).toEqual([null, null, null, null, "2026-10-10", null]);
    expect(ledger.goalDays["2026-10-10"]).toMatchObject({ tz: SYD, goal: 50 });
  });

  it("counts practice once per card per day", () => {
    const now = at("2026-10-10T01:00:00Z");
    const first = addXpEvent(empty(), { kind: "practice", lessonId: "l", cardId: "c", xp: 5 }, now, SYD, 50);
    const again = addXpEvent(first.ledger, { kind: "practice", lessonId: "l", cardId: "c", xp: 5 }, now, SYD, 50);
    expect(again.event).toBeNull();
    const other = addXpEvent(first.ledger, { kind: "practice", lessonId: "l", cardId: "d", xp: 5 }, now, SYD, 50);
    expect(other.event).not.toBeNull();
    const tomorrow = addXpEvent(first.ledger, { kind: "practice", lessonId: "l", cardId: "c", xp: 5 }, at("2026-10-11T01:00:00Z"), SYD, 50);
    expect(tomorrow.event?.day).toBe("2026-10-11");
  });

  it("never dates an event earlier than the latest one (flying west)", () => {
    // Met-ish in Sydney on 10 Oct; an hour later in Los Angeles it's still 9 Oct locally.
    const first = addXpEvent(empty(), { kind: "card", lessonId: "l", cardId: "a", xp: 10 }, at("2026-10-09T20:00:00Z"), SYD, 50);
    const second = addXpEvent(first.ledger, { kind: "card", lessonId: "l", cardId: "b", xp: 10 }, at("2026-10-09T21:00:00Z"), LA, 50);
    expect(second.event?.day).toBe("2026-10-10");
    expect(currentDay(at("2026-10-09T21:00:00Z"), LA, second.ledger.xpEvents)).toBe("2026-10-10");
  });

  it("keeps at most MAX_LOCAL_XP_EVENTS events, dropping the oldest", () => {
    const events: XpEvent[] = Array.from({ length: MAX_LOCAL_XP_EVENTS }, (_, i) => ({
      at: "2026-10-01T00:00:00.000Z", day: "2026-10-01", tz: SYD, kind: "card", lessonId: "l", cardId: `c${i}`, xp: 1,
    }));
    const r = addXpEvent({ xpEvents: events, goalDays: {} }, { kind: "card", lessonId: "l", cardId: "new", xp: 1 }, at("2026-10-10T01:00:00Z"), SYD, 50);
    expect(r.ledger.xpEvents).toHaveLength(MAX_LOCAL_XP_EVENTS);
    expect(r.ledger.xpEvents.at(-1)?.cardId).toBe("new");
    expect(r.ledger.xpEvents[0]?.cardId).toBe("c1");
  });
});

describe("goals", () => {
  it("meets the goal straight away when it's lowered below today's XP", () => {
    const now = at("2026-10-10T01:00:00Z");
    const { ledger } = addXpEvent(empty(), { kind: "lesson", lessonId: "l", xp: 30 }, now, SYD, 50);
    expect(checkGoal(ledger, "2026-10-10", SYD, 50, now).goalMet).toBeNull();
    expect(checkGoal(ledger, "2026-10-10", SYD, 20, now).goalMet).toBe("2026-10-10");
  });

  it("accepts only the three goals", () => {
    expect([20, 50, 100].every(isDailyGoal)).toBe(true);
    expect([0, 10, 75, "50", null].some(isDailyGoal)).toBe(false);
  });

  it("reports today's progress", () => {
    const now = at("2026-10-10T01:00:00Z");
    const { ledger } = addXpEvent(empty(), { kind: "card", lessonId: "l", cardId: "c", xp: 10 }, now, SYD, 50);
    const snapshot = { ...emptySnapshot(), ...ledger };
    expect(todayProgress(snapshot, now, SYD)).toEqual({ day: "2026-10-10", xp: 10, goal: 50, met: false });
  });
});

describe("time zones", () => {
  it("accepts IANA names and rejects anything else", () => {
    expect(isValidTimeZone(SYD)).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Not/AZone")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
    expect(isValidTimeZone(42)).toBe(false);
    expect(safeTimeZone("nope")).toBe("UTC");
  });
});

describe("plausibleEvent (checking uploaded guest events)", () => {
  const now = at("2026-10-10T12:00:00Z");
  const base: XpEvent = { at: "2026-10-10T01:00:00.000Z", day: "2026-10-10", tz: SYD, kind: "card", lessonId: "l", cardId: "c", xp: 10 };

  it("accepts an event dated its own local day, or one day later (travel)", () => {
    expect(plausibleEvent(base, now)).toBe(true);
    expect(plausibleEvent({ ...base, day: "2026-10-11" }, at("2026-10-11T12:00:00Z"))).toBe(true);
  });

  it("rejects backdated days, future times, bad zones and bad dates", () => {
    expect(plausibleEvent({ ...base, day: "2026-10-09" }, now)).toBe(false);
    expect(plausibleEvent({ ...base, day: "2026-10-12" }, now)).toBe(false);
    expect(plausibleEvent({ ...base, at: "2026-10-11T00:00:00.000Z", day: "2026-10-11" }, now)).toBe(false);
    expect(plausibleEvent({ ...base, tz: "Mars/Olympus" }, now)).toBe(false);
    expect(plausibleEvent({ ...base, at: "yesterday" }, now)).toBe(false);
  });
});
