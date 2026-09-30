import { describe, expect, it } from "vitest";
import { estimateMinutes, SECONDS_PER_CARD } from "./estimate";

describe("estimateMinutes", () => {
  it("uses a conservative 45 seconds per card", () => {
    expect(SECONDS_PER_CARD).toBe(45);
  });

  it("rounds to whole minutes", () => {
    expect(estimateMinutes({ cardCount: 12 })).toBe(9); // 540 s
    expect(estimateMinutes({ cardCount: 11 })).toBe(8); // 495 s = 8.25
    expect(estimateMinutes({ cardCount: 10 })).toBe(8); // 450 s = 7.5, rounds up
    expect(estimateMinutes({ cardCount: 7 })).toBe(5); // 315 s = 5.25
  });

  it("never says less than a minute", () => {
    expect(estimateMinutes({ cardCount: 1 })).toBe(1);
    expect(estimateMinutes({ cardCount: 0 })).toBe(1);
  });
});
