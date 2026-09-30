/**
 * Layout maths for the course path: nodes zig-zag left and right down the page, joined by
 * circuit traces made of a vertical stub, a 45° diagonal and another stub (the brand's trace).
 * Pure numbers only, so it's unit-tested and the component just draws what it's given.
 */

export type PathNodeKind = "lesson" | "quiz";

/** Horizontal step between neighbouring nodes, px. */
export const PATH_STEP = 44;
/** Visible vertical stub at each end of a trace, px. */
export const PATH_STUB = 14;
export const NODE_SIZE: Record<PathNodeKind, number> = { lesson: 72, quiz: 96 };

/** Offsets in steps: centre, right, far right, right, centre, left, far left, left, … */
const ZIGZAG = [0, 1, 2, 1, 0, -1, -2, -1] as const;

export function zigzagOffset(index: number): number {
  return ZIGZAG[((index % ZIGZAG.length) + ZIGZAG.length) % ZIGZAG.length] ?? 0;
}

export interface PathNodeLayout {
  /** Centre, px, relative to the path's centre line and the top of the module's path. */
  x: number;
  y: number;
  size: number;
}

export interface PathTrace {
  /** Index of the node the trace leaves (it joins node `from` to node `from + 1`). */
  from: number;
  /** SVG path data, in the same coordinates as the nodes. */
  d: string;
}

export interface ModulePathLayout {
  nodes: PathNodeLayout[];
  traces: PathTrace[];
  /** Total height, px, from the top of the first node to the bottom of the last. */
  height: number;
  /** Half the width needed either side of the centre line, px. */
  halfWidth: number;
}

/**
 * Positions a module's nodes. Neighbours are always one step apart sideways, and the gap between
 * them is exactly one diagonal plus two stubs, so every trace is vertical, then 45°, then vertical.
 * `startIndex` continues the zig-zag from earlier modules, so the whole course weaves both ways.
 */
export function modulePathLayout(kinds: readonly PathNodeKind[], startIndex = 0): ModulePathLayout {
  const nodes: PathNodeLayout[] = [];
  const traces: PathTrace[] = [];
  let y = 0;

  kinds.forEach((kind, i) => {
    const size = NODE_SIZE[kind];
    const x = zigzagOffset(startIndex + i) * PATH_STEP;
    const previous = nodes[i - 1];
    if (previous) {
      const top = previous.y + previous.size / 2;
      const gap = Math.abs(x - previous.x) + PATH_STUB * 2;
      y = top + gap + size / 2;
      const bottom = y - size / 2;
      traces.push({
        from: i - 1,
        d: `M${previous.x} ${top}V${top + PATH_STUB}L${x} ${bottom - PATH_STUB}V${bottom}`,
      });
    } else {
      y = size / 2;
    }
    nodes.push({ x, y, size });
  });

  const last = nodes.at(-1);
  return {
    nodes,
    traces,
    height: last ? last.y + last.size / 2 : 0,
    halfWidth: Math.max(0, ...nodes.map((n) => Math.abs(n.x) + n.size / 2)),
  };
}
