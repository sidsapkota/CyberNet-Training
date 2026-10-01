import { describe, expect, it } from "vitest";
import { DECLINE_REASONS, DECLINED_INTERVAL_MS, declinedEventData, shouldAskDeclined } from "./declined";

const NOW = Date.parse("2026-10-02T10:00:00Z");

describe("shouldAskDeclined (at most once a week per device)", () => {
  it("asks a device that has never been asked", () => {
    expect(shouldAskDeclined(null, NOW)).toBe(true);
  });

  it("waits a full week after asking", () => {
    expect(shouldAskDeclined(new Date(NOW - 60_000).toISOString(), NOW)).toBe(false);
    expect(shouldAskDeclined(new Date(NOW - DECLINED_INTERVAL_MS + 1).toISOString(), NOW)).toBe(false);
    expect(shouldAskDeclined(new Date(NOW - DECLINED_INTERVAL_MS).toISOString(), NOW)).toBe(true);
  });

  it("asks again after an unreadable or future time", () => {
    expect(shouldAskDeclined("not a date", NOW)).toBe(true);
    expect(shouldAskDeclined(new Date(NOW + 60_000).toISOString(), NOW)).toBe(true);
  });
});

describe("declinedEventData (nothing personal)", () => {
  it("sends the answer and the screen", () => {
    expect(declinedEventData("too_expensive", "limit")).toEqual({ reason: "too_expensive", source: "limit" });
    expect(declinedEventData("skipped", "pro_page")).toEqual({ reason: "skipped", source: "pro_page" });
  });

  it("drops anything that isn't a known answer or screen", () => {
    expect(declinedEventData("someone@example.com", "tiktok")).toEqual({});
  });

  it("has four answers, each short enough for one line", () => {
    expect(DECLINE_REASONS).toHaveLength(4);
    for (const r of DECLINE_REASONS) expect(r.label.length).toBeLessThanOrEqual(28);
  });
});
