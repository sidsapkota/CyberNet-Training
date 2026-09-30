import { getScene, hiddenInView, type ScenePart, visibleParts } from "../shared/scenes/manifests";
import { seededShuffle } from "../shared/shuffle";
import type { GradeResult } from "../types";
import type { HotspotAnswer, HotspotCard, HotspotExploreState } from "./schema";

const safe = (answer: HotspotAnswer | null | undefined): HotspotAnswer => ({
  selected: Array.isArray(answer?.selected) ? answer.selected : [],
  placed: answer?.placed && typeof answer.placed === "object" ? answer.placed : {},
});

/** Parts the learner can tap: every visible part (tap mode), or the labelled or listed parts. */
export function tappableParts(card: HotspotCard): ScenePart[] {
  const hidden = new Set(hiddenInView(card.scene, card.view));
  const listed = new Set(card.mode === "explore" ? card.parts?.map((p) => p.part) : card.labels?.map((l) => l.part));
  return visibleParts(card.scene, hidden).filter((p) => card.mode === "tap" || listed.has(p.id));
}

/** Label chips in a stable shuffled order. */
export function labelOrder(card: HotspotCard): number[] {
  return seededShuffle(
    (card.labels ?? []).map((_, i) => i),
    `${card.id}:labels`,
  );
}

export function toggleTap(card: HotspotCard, answer: HotspotAnswer, part: string): HotspotAnswer {
  const a = safe(answer);
  if (a.selected.includes(part)) return { ...a, selected: a.selected.filter((p) => p !== part) };
  if (a.selected.length >= (card.targets?.length ?? 0)) return a; // full: unselect one first
  return { ...a, selected: [...a.selected, part] };
}

/** Puts label `labelIndex` on `part`, moving it off any other part. */
export function placeLabel(answer: HotspotAnswer, part: string, labelIndex: number): HotspotAnswer {
  const a = safe(answer);
  const placed = Object.fromEntries(Object.entries(a.placed).filter(([, i]) => i !== labelIndex));
  placed[part] = labelIndex;
  return { ...a, placed };
}

export function removeLabel(answer: HotspotAnswer, part: string): HotspotAnswer {
  const a = safe(answer);
  const placed = { ...a.placed };
  delete placed[part];
  return { ...a, placed };
}

export function isHotspotReady(answer: HotspotAnswer, card: HotspotCard): boolean {
  const a = safe(answer);
  return card.mode === "tap"
    ? a.selected.length === (card.targets?.length ?? 0)
    : Object.keys(a.placed).length === (card.labels?.length ?? 0);
}

export function gradeHotspot(card: HotspotCard, answer: HotspotAnswer): GradeResult {
  if (card.mode === "explore") return { correct: false }; // never graded; can't be in a quiz
  const a = safe(answer);
  if (card.mode === "tap") {
    const targets = new Set(card.targets ?? []);
    return { correct: a.selected.length === targets.size && a.selected.every((p) => targets.has(p)) };
  }
  const labels = card.labels ?? [];
  return { correct: labels.every((l, i) => a.placed[l.part] === i) && Object.keys(a.placed).length === labels.length };
}

/* ── Explore mode (not graded) ─────────────────────────────────────────────────────────── */

const seenOf = (state: HotspotExploreState | null | undefined): string[] =>
  Array.isArray(state?.seen) ? state.seen.filter((p): p is string => typeof p === "string") : [];

/** Records a tapped part (idempotent). */
export function markSeen(state: HotspotExploreState, part: string): HotspotExploreState {
  const seen = seenOf(state);
  return seen.includes(part) ? { seen } : { seen: [...seen, part] };
}

/** Continue unlocks once every listed part has been tapped. */
export function isExploreComplete(state: HotspotExploreState, card: HotspotCard): boolean {
  const seen = new Set(seenOf(state));
  return (card.parts ?? []).every((p) => seen.has(p.part));
}

const partName = (card: HotspotCard, id: string) => getScene(card.scene)?.parts.find((p) => p.id === id)?.name ?? id;

export function describeHotspotAnswer(card: HotspotCard, answer: HotspotAnswer): string {
  const a = safe(answer);
  if (card.mode === "tap") return a.selected.length ? a.selected.map((p) => partName(card, p)).join(", ") : "Nothing selected";
  const entries = Object.entries(a.placed);
  if (!entries.length) return "No labels placed";
  return entries.map(([part, i]) => `${card.labels?.[i]?.label ?? "?"} → ${partName(card, part)}`).join("; ");
}

export function describeHotspotCorrect(card: HotspotCard): string {
  if (card.mode === "tap") return (card.targets ?? []).map((p) => partName(card, p)).join(", ");
  return (card.labels ?? []).map((l) => `${l.label} → ${partName(card, l.part)}`).join("; ");
}
