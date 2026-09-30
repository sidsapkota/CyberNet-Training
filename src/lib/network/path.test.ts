import { describe, expect, it } from "vitest";
import { modulePathLayout, NODE_SIZE, PATH_STEP, PATH_STUB, zigzagOffset } from "./path";

/** Parses "M x y V y L x y V y" into points. */
type Point = [number, number];
function points(d: string): [Point, Point, Point, Point] {
  const m = /^M(-?[\d.]+) (-?[\d.]+)V(-?[\d.]+)L(-?[\d.]+) (-?[\d.]+)V(-?[\d.]+)$/.exec(d);
  if (!m) throw new Error(`unexpected path ${d}`);
  const [x0, y0, y1, x2, y2, y3] = m.slice(1).map(Number) as [number, number, number, number, number, number];
  return [
    [x0, y0],
    [x0, y1],
    [x2, y2],
    [x2, y3],
  ];
}

describe("zigzagOffset", () => {
  it("swings right, then left, and repeats", () => {
    expect(Array.from({ length: 9 }, (_, i) => zigzagOffset(i))).toEqual([0, 1, 2, 1, 0, -1, -2, -1, 0]);
  });
});

describe("modulePathLayout", () => {
  const layout = modulePathLayout(["lesson", "lesson", "lesson", "quiz"]);

  it("places one node per item, the quiz as a larger hub", () => {
    expect(layout.nodes.map((n) => n.size)).toEqual([72, 72, 72, NODE_SIZE.quiz]);
    expect(layout.nodes.map((n) => n.x)).toEqual([0, PATH_STEP, PATH_STEP * 2, PATH_STEP]);
    expect(layout.nodes[0]?.y).toBe(36);
  });

  it("joins neighbours with stub, exact 45° diagonal, stub, touching each node's edge", () => {
    expect(layout.traces).toHaveLength(3);
    layout.traces.forEach((trace, i) => {
      const from = layout.nodes[i]!;
      const to = layout.nodes[i + 1]!;
      const [a, b, c, d] = points(trace.d);
      expect(a).toEqual([from.x, from.y + from.size / 2]);
      expect(b[1] - a[1]).toBe(PATH_STUB);
      expect(Math.abs(c[0] - b[0])).toBe(Math.abs(c[1] - b[1])); // 45°
      expect(d[1] - c[1]).toBe(PATH_STUB);
      expect(d).toEqual([to.x, to.y - to.size / 2]);
    });
  });

  it("reports the height and width the path needs", () => {
    const last = layout.nodes.at(-1)!;
    expect(layout.height).toBe(last.y + last.size / 2);
    expect(layout.halfWidth).toBe(PATH_STEP * 2 + 36);
  });

  it("continues the zig-zag from an earlier module", () => {
    const next = modulePathLayout(["lesson", "lesson", "quiz"], 4);
    expect(next.nodes.map((n) => n.x)).toEqual([0, -PATH_STEP, -PATH_STEP * 2]);
  });

  it("handles an empty module", () => {
    expect(modulePathLayout([])).toEqual({ nodes: [], traces: [], height: 0, halfWidth: 0 });
  });
});
