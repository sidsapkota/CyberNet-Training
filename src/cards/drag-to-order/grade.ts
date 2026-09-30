import type { GradeResult } from "../types";
import type { DragToOrderAnswer, DragToOrderCard } from "./schema";

export function gradeDragToOrder(card: DragToOrderCard, answer: DragToOrderAnswer): GradeResult {
  const correct =
    answer.length === card.items.length && card.items.every((item, i) => item.id === answer[i]);
  return { correct };
}

function labelsFor(card: DragToOrderCard, ids: readonly string[]): string {
  const byId = new Map(card.items.map((i) => [i.id, i.label]));
  return ids.map((id) => byId.get(id) ?? "?").join(" → ");
}

export function describeDragToOrderAnswer(card: DragToOrderCard, answer: DragToOrderAnswer): string {
  return labelsFor(card, answer);
}

export function describeDragToOrderCorrect(card: DragToOrderCard): string {
  return labelsFor(
    card,
    card.items.map((i) => i.id),
  );
}
