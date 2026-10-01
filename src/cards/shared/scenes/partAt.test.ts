import { describe, expect, it } from "vitest";
import { partAt } from "./SceneStage";

const parts = [
  { id: "subject", box: { x: 10, y: 20, w: 200, h: 12 } },
  { id: "greeting", box: { x: 10, y: 36, w: 120, h: 12 } },
  { id: "board", box: { x: 0, y: 0, w: 320, h: 200 } },
];

describe("partAt (taps go to the drawn part, not an overlapping 44px button)", () => {
  it("picks the smallest part under the tap", () => {
    expect(partAt(parts, 50, 25, 5)).toBe("subject");
    expect(partAt(parts, 50, 40, 5)).toBe("greeting");
    expect(partAt(parts, 300, 150, 5)).toBe("board");
  });

  it("picks the nearest part within the tolerance, else nothing", () => {
    const small = [{ id: "screw", box: { x: 100, y: 100, w: 4, h: 4 } }];
    expect(partAt(small, 110, 102, 8)).toBe("screw");
    expect(partAt(small, 130, 102, 8)).toBeNull();
  });
});
