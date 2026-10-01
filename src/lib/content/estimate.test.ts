import { describe, expect, it } from "vitest";
import { bonusCards, estimateMinutes, SECONDS_PER_CARD, timeLine } from "./estimate";

const lesson = (core: number, bonus = 0) => ({
  cardCount: core + bonus,
  coreCardIds: Array.from({ length: core }, (_, i) => `c${i}`),
});

describe("estimateMinutes", () => {
  it("uses a conservative 45 seconds per card", () => {
    expect(SECONDS_PER_CARD).toBe(45);
  });

  it("counts core cards only, rounded to whole minutes", () => {
    expect(estimateMinutes(lesson(12))).toBe(9); // 540 s
    expect(estimateMinutes(lesson(10, 2))).toBe(8); // 450 s = 7.5, rounds up; bonus cards don't count
    expect(estimateMinutes(lesson(7))).toBe(5); // 315 s = 5.25
    expect(estimateMinutes(lesson(6, 2))).toBe(5); // 270 s = 4.5
  });

  it("never says less than a minute", () => {
    expect(estimateMinutes(lesson(1))).toBe(1);
    expect(estimateMinutes(lesson(0))).toBe(1);
  });
});

describe("timeLine", () => {
  it("names the bonus cards separately", () => {
    expect(bonusCards(lesson(6, 2))).toBe(2);
    expect(timeLine(lesson(6, 2))).toBe("about 5 min + 2 bonus cards");
    expect(timeLine(lesson(6, 1))).toBe("about 5 min + 1 bonus card");
    expect(timeLine(lesson(5))).toBe("about 4 min");
  });
});
