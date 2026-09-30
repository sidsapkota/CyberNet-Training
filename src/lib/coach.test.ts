import { describe, expect, it } from "vitest";
import { explainer, hotspot, multipleChoice } from "@/test/fixtures";
import { cleanCoachSeen, COACH_KEYS, coachKeyFor, markCoachSeen, shouldShowCoach } from "./coach";

describe("first-time how-to-play panels", () => {
  it("gives each interaction style its own panel, and none to explainers or multiple choice", () => {
    expect(coachKeyFor(explainer())).toBeNull();
    expect(coachKeyFor(multipleChoice())).toBeNull();
    expect(coachKeyFor(hotspot())).toBe("hotspot-tap");
    expect(coachKeyFor(hotspot({ mode: "label" }))).toBe("hotspot-label");
    expect(coachKeyFor(hotspot({ mode: "explore" }))).toBe("hotspot-explore");
  });

  it("shows a panel only until it has been dismissed once", () => {
    const card = hotspot();
    expect(shouldShowCoach([], card)).toBe("hotspot-tap");
    expect(shouldShowCoach(undefined, card)).toBe("hotspot-tap");
    const seen = markCoachSeen([], "hotspot-tap");
    expect(shouldShowCoach(seen, card)).toBeNull();
    // Other hotspot modes still get their own panel.
    expect(shouldShowCoach(seen, hotspot({ mode: "label" }))).toBe("hotspot-label");
  });

  it("stores known keys once, and ignores junk", () => {
    expect(markCoachSeen(["terminal"], "terminal")).toEqual(["terminal"]);
    expect(cleanCoachSeen(["x", 3, "sort_bins", "sort_bins", null])).toEqual(["sort_bins"]);
    expect(cleanCoachSeen(null)).toEqual([]);
    expect(COACH_KEYS.length).toBeLessThanOrEqual(32); // the database caps coach_seen at 32
  });
});
