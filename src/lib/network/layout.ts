/**
 * Pure layout maths for the network motif (course map, quiz results).
 * Kept free of React so it can be unit-tested.
 */

/** Quizzes with more questions than this use a compact grid instead of a ring. */
export const QUIZ_RING_MAX = 8;

export interface Point {
  x: number;
  y: number;
}

export type QuizNetworkLayout =
  | { mode: "ring"; positions: Point[] }
  | { mode: "grid"; columns: number };

/**
 * Question nodes for the quiz-results network.
 * Ring: `count` points on a circle of `radius` around (0, 0), starting at the top and going
 * clockwise, rounded to 2 decimals for stable SVG output.
 */
export function quizNetworkLayout(count: number, radius = 1): QuizNetworkLayout {
  if (count > QUIZ_RING_MAX) {
    return { mode: "grid", columns: Math.min(8, Math.ceil(Math.sqrt(count * 2))) };
  }
  const round = (n: number) => Math.round(n * 100) / 100 + 0; // + 0 normalises -0
  const positions = Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
    return { x: round(Math.cos(angle) * radius), y: round(Math.sin(angle) * radius) };
  });
  return { mode: "ring", positions };
}

/** Course-map lanes: nodes zig-zag between two lanes so connections form 45° traces. */
export type MapLane = 0 | 1;

export function mapLane(index: number): MapLane {
  return index % 2 === 0 ? 0 : 1;
}

/**
 * The item a learner should do next: the first one that is neither completed nor locked.
 * Works on anything shaped like the course state's lesson entries.
 */
export function findCurrentId<T extends { id: string; status: string }>(items: readonly T[]): string | null {
  return items.find((i) => i.status === "available" || i.status === "in_progress")?.id ?? null;
}
