import { seededShuffle } from "../shared/shuffle";
import type { GradeResult } from "../types";
import type { SortBinsAnswer, SortBinsCard } from "./schema";

/** Items in the tray's order: a stable shuffle so the answer isn't given away. */
export function trayOrder(card: SortBinsCard): SortBinsCard["items"] {
  return seededShuffle(card.items, `${card.id}:items`);
}

export function placeItem(answer: SortBinsAnswer, itemId: string, binId: string): SortBinsAnswer {
  return { ...answer, [itemId]: binId };
}

export function unplaceItem(answer: SortBinsAnswer, itemId: string): SortBinsAnswer {
  const next = { ...answer };
  delete next[itemId];
  return next;
}

/** Keeps only correctly placed items (wrong ones go back to the tray after Try again). */
export function keepCorrect(card: SortBinsCard, answer: SortBinsAnswer): SortBinsAnswer {
  return Object.fromEntries(card.items.filter((i) => answer[i.id] === i.bin).map((i) => [i.id, i.bin]));
}

export function isSortBinsReady(answer: SortBinsAnswer, card: SortBinsCard): boolean {
  return card.items.every((i) => typeof answer[i.id] === "string");
}

export function gradeSortBins(card: SortBinsCard, answer: SortBinsAnswer): GradeResult {
  return { correct: card.items.every((i) => answer?.[i.id] === i.bin) };
}

function describe(card: SortBinsCard, placement: (itemId: string) => string | undefined): string {
  return card.bins
    .map((bin) => {
      const items = card.items.filter((i) => placement(i.id) === bin.id).map((i) => i.label);
      return `${bin.label}: ${items.length ? items.join(", ") : "nothing"}`;
    })
    .join(" · ");
}

export function describeSortBinsAnswer(card: SortBinsCard, answer: SortBinsAnswer): string {
  return describe(card, (id) => answer?.[id]);
}

export function describeSortBinsCorrect(card: SortBinsCard): string {
  return describe(card, (id) => card.items.find((i) => i.id === id)?.bin);
}
