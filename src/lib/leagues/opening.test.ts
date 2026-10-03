import { describe, expect, it } from "vitest";
import { leaguesOpenSeenKey, shouldShowOpening } from "./opening";

describe("leaguesOpenSeenKey", () => {
  it("is per learner", () => {
    expect(leaguesOpenSeenKey("abc")).toBe("cybernet.leaguesOpenSeen.abc");
    expect(leaguesOpenSeenKey("abc")).not.toBe(leaguesOpenSeenKey("def"));
  });
});

describe("shouldShowOpening", () => {
  const base = { status: "open", userId: "u1", seen: null, onDashboard: true } as const;

  it("shows once when on the dashboard, leagues are open, signed in, and not seen", () => {
    expect(shouldShowOpening(base)).toBe(true);
  });

  it("never shows away from the dashboard (lessons, onboarding, other pages)", () => {
    expect(shouldShowOpening({ ...base, onDashboard: false })).toBe(false);
  });

  it("stays hidden once this device has seen it", () => {
    expect(shouldShowOpening({ ...base, seen: "2026-10-06" })).toBe(false);
  });

  it("never shows while the open flag is loading", () => {
    expect(shouldShowOpening({ ...base, status: "loading" })).toBe(false);
  });

  it("never shows while leagues are closed", () => {
    expect(shouldShowOpening({ ...base, status: "closed" })).toBe(false);
  });

  it("never shows to guests", () => {
    expect(shouldShowOpening({ ...base, userId: null })).toBe(false);
  });
});
