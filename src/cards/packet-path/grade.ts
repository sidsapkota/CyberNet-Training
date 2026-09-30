import type { GradeResult } from "../types";
import type { PacketPathAnswer, PacketPathCard } from "./schema";

export function areLinked(card: PacketPathCard, a: string, b: string): boolean {
  return card.links.some((l) => (l.from === a && l.to === b) || (l.from === b && l.to === a));
}

/** Whether `id` can be the next hop: linked to the last hop, not visited, route not finished. */
export function canAddHop(card: PacketPathCard, path: PacketPathAnswer, id: string): boolean {
  const last = path.at(-1);
  if (last === undefined || last === card.destination) return false;
  return !path.includes(id) && areLinked(card, last, id);
}

/**
 * The learner tapped a node. Tapping the last hop undoes it (the source can't be removed);
 * tapping a valid next hop adds it; anything else leaves the path unchanged. Pure.
 */
export function tapNode(card: PacketPathCard, path: PacketPathAnswer, id: string): PacketPathAnswer {
  if (path.length > 1 && path.at(-1) === id) return path.slice(0, -1);
  if (canAddHop(card, path, id)) return [...path, id];
  return path;
}

const isPrefixOf = (prefix: readonly string[], full: readonly string[]) =>
  prefix.length <= full.length && prefix.every((id, i) => full[i] === id);

/**
 * Index of the first hop where the route leaves every valid path, or null if the route so
 * far matches one. The packet animation stops at this hop.
 */
export function firstWrongHop(card: PacketPathCard, path: PacketPathAnswer): number | null {
  for (let i = 0; i < path.length; i++) {
    const prefix = path.slice(0, i + 1);
    if (!card.validPaths.some((valid) => isPrefixOf(prefix, valid))) return i;
  }
  return null;
}

export function isPacketPathReady(answer: PacketPathAnswer, card: PacketPathCard): boolean {
  return answer.length >= 2 && answer[0] === card.source && answer.at(-1) === card.destination;
}

export function gradePacketPath(card: PacketPathCard, answer: PacketPathAnswer): GradeResult {
  return {
    correct: card.validPaths.some((valid) => valid.length === answer.length && isPrefixOf(answer, valid)),
  };
}

function labels(card: PacketPathCard, ids: readonly string[]): string {
  const byId = new Map(card.nodes.map((n) => [n.id, n.label]));
  return ids.map((id) => byId.get(id) ?? id).join(" → ");
}

export function describePacketPathAnswer(card: PacketPathCard, answer: PacketPathAnswer): string {
  return answer.length > 0 ? labels(card, answer) : "No route";
}

export function describePacketPathCorrect(card: PacketPathCard): string {
  return card.validPaths.map((p) => labels(card, p)).join("  or  ");
}

export interface PlacedNode {
  id: string;
  col: number;
  row: number;
}

/**
 * Grid layout. On narrow screens a layout wider than it is tall is rotated 90° (columns become
 * rows), so small networks fit a phone without panning. Grid size is trimmed to used cells.
 */
export function layoutNetwork(
  card: PacketPathCard,
  narrow: boolean,
): { nodes: PlacedNode[]; cols: number; rows: number } {
  const minCol = Math.min(...card.nodes.map((n) => n.col));
  const minRow = Math.min(...card.nodes.map((n) => n.row));
  const cols = Math.max(...card.nodes.map((n) => n.col)) - minCol + 1;
  const rows = Math.max(...card.nodes.map((n) => n.row)) - minRow + 1;
  const rotate = narrow && cols > rows;
  return {
    nodes: card.nodes.map((n) =>
      rotate
        ? { id: n.id, col: n.row - minRow, row: n.col - minCol }
        : { id: n.id, col: n.col - minCol, row: n.row - minRow },
    ),
    cols: rotate ? rows : cols,
    rows: rotate ? cols : rows,
  };
}
