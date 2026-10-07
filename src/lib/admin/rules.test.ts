import { describe, expect, it } from "vitest";
import { isAdmin, maskEmail, parseAdminIds, perDay, recentSignIn, returningLearners } from "./rules";

const ID = "cf5b0efc-1c8f-490c-b90d-a1ca081b16e8";
const now = new Date("2026-10-07T10:00:00Z");

describe("the admin allowlist", () => {
  it("is Supabase user ids only, from the env var", () => {
    expect(parseAdminIds(` ${ID} , not-an-id, owner@example.com,`)).toEqual(new Set([ID]));
    expect(parseAdminIds(undefined).size).toBe(0);
    expect(parseAdminIds("").size).toBe(0);
  });

  it("needs the id and a sign-in under 12 hours old", () => {
    const list = parseAdminIds(ID);
    expect(isAdmin(ID, "2026-10-07T01:00:00Z", list, now)).toBe(true);
    expect(isAdmin(ID.toUpperCase(), "2026-10-07T01:00:00Z", list, now)).toBe(true);
    expect(isAdmin(ID, "2026-10-06T21:59:00Z", list, now)).toBe(false); // 12h01m
    expect(isAdmin("00000000-0000-4000-8000-000000000000", "2026-10-07T09:00:00Z", list, now)).toBe(false);
    expect(isAdmin(null, "2026-10-07T09:00:00Z", list, now)).toBe(false);
    expect(isAdmin(ID, "2026-10-07T09:00:00Z", new Set(), now)).toBe(false);
  });

  it("doesn't trust a missing or future sign-in time", () => {
    expect(recentSignIn(null, now)).toBe(false);
    expect(recentSignIn("2026-10-08T10:00:00Z", now)).toBe(false);
    expect(recentSignIn("nonsense", now)).toBe(false);
  });
});

describe("dashboard sums", () => {
  it("counts per day, filling empty days", () => {
    expect(perDay(["2026-10-07", "2026-10-07", "2026-10-05"], "2026-10-07", 3)).toEqual([
      { day: "2026-10-05", n: 1 },
      { day: "2026-10-06", n: 0 },
      { day: "2026-10-07", n: 2 },
    ]);
  });
  it("counts learners back on a second day", () => {
    expect(returningLearners([{ user_id: "a", day: "1" }, { user_id: "a", day: "1" }, { user_id: "b", day: "1" }, { user_id: "b", day: "2" }])).toBe(1);
  });
  it("masks emails", () => {
    expect(maskEmail("sam@example.com")).toBe("s***@example.com");
    expect(maskEmail(null)).toBe("none");
  });
});
