/**
 * The mascot's reactions: short, one-shot motions played on parts of the SVG (never swapped images),
 * each under 600 ms and never blocking anything (they're decoration: nothing waits for them). Plus
 * the signature "security scan", under 1.2 s. Under reduced motion none of them play: the mascot
 * shows its still expression (and the scan its end state, the check). Pure data, tested.
 */

export type MascotReaction = "bob" | "hop" | "tilt" | "scan";

/** One-shot reactions, in ms (each under 600). */
export const REACTION_MS = {
  /** A gentle bob when it appears (once; no idle loop). */
  bob: 460,
  /** A small hop on a right answer. */
  hop: 360,
  /** A head tilt on a wrong answer. */
  tilt: 450,
  /** The welcome wave (the waving arm, `happy`). */
  wave: 560,
} as const;

/** How far each reaction moves, in viewBox units (the mascot is 200 × 232). */
export const REACTION_SIZE = { bob: 3, hop: 7, tiltDeg: 8 } as const;

/**
 * The security scan, as phases on one timeline (ms from the start). The shield's outline glows
 * cyan, a scan line sweeps the head from top to bottom, the eyes light up, then a small check pops
 * with a tiny spring. The check stays; everything else fades.
 */
export const SCAN = {
  glowIn: [0, 220],
  sweep: [160, 700],
  eyes: [560, 860],
  check: [820, 1080],
  glowOut: [900, 1150],
  total: 1150,
} as const;

/** Where the head turns for the tilt: the bottom of the shield, in viewBox units. */
export const NECK = { x: 102, y: 158 } as const;

/** The check badge on the shield's lower right corner, in the head's 64-unit coordinates. */
export const SCAN_CHECK = { x: 49, y: 46, r: 5.6 } as const;

/** A phase as `times` (0 to 1) for keyframes on the scan's whole timeline. */
export function scanTimes(from: number, to: number): [number, number] {
  return [from / SCAN.total, to / SCAN.total];
}
