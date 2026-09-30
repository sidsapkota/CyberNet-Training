import { describe, expect, it } from "vitest";
import { QUIZ_RING_MAX, quizNetworkLayout } from "./layout";

describe("quizNetworkLayout", () => {
  it("places up to 8 questions on a ring, starting at the top, clockwise", () => {
    const layout = quizNetworkLayout(4, 10);
    expect(layout).toEqual({
      mode: "ring",
      positions: [
        { x: 0, y: -10 },
        { x: 10, y: 0 },
        { x: 0, y: 10 },
        { x: -10, y: 0 },
      ],
    });
  });

  it("puts every ring node on the circle", () => {
    const layout = quizNetworkLayout(QUIZ_RING_MAX, 5);
    expect(layout.mode).toBe("ring");
    if (layout.mode === "ring") {
      expect(layout.positions).toHaveLength(QUIZ_RING_MAX);
      for (const p of layout.positions) expect(Math.hypot(p.x, p.y)).toBeCloseTo(5, 1);
    }
  });

  it("falls back to a grid above 8 questions", () => {
    expect(quizNetworkLayout(9).mode).toBe("grid");
    expect(quizNetworkLayout(30)).toEqual({ mode: "grid", columns: 8 });
  });

  it("uses a sensible column count for small grids", () => {
    const layout = quizNetworkLayout(9);
    expect(layout.mode === "grid" && layout.columns).toBe(5);
  });
});
