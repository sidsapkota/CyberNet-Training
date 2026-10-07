import { describe, expect, it } from "vitest";
import { comboLabel, comboPitch, nextCombo } from "./combo";

describe("combo", () => {
  it("counts right-first-time answers and resets on a wrong one", () => {
    let combo = 0;
    for (let i = 0; i < 3; i++) combo = nextCombo(combo, true, 1);
    expect(combo).toBe(3);
    combo = nextCombo(combo, false, 1);
    expect(combo).toBe(0);
  });

  it("a right answer after a retry doesn't add, and doesn't reset", () => {
    expect(nextCombo(0, true, 2)).toBe(0);
    expect(nextCombo(2, true, 3)).toBe(2);
  });

  it("is shown from 3", () => {
    expect(comboLabel(2)).toBeNull();
    expect(comboLabel(3)).toBe("3 in a row!");
    expect(comboLabel(7)).toBe("7 in a row!");
  });

  it("rises a semitone a step, then stops", () => {
    expect(comboPitch(3)).toBe(1);
    expect(comboPitch(4)).toBeCloseTo(2 ** (1 / 12));
    expect(comboPitch(8)).toBeCloseTo(comboPitch(20));
    expect(comboPitch(1)).toBe(1);
  });
});
