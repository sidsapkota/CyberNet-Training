/**
 * Teaser cards: one playable card from each Pro module, shown on the "What's next" screen to
 * learners without Pro. It's deliberately public (the rest of the module isn't), so it must stand
 * on its own: an interactive core card from the module's first lesson, and not a scene card
 * (hotspot or teardown), which relies on parts being explored first. Pure, so it's tested alone.
 */
import { isInteractiveCard, type Card } from "@/cards/schema";

export interface TeaserRef {
  lesson: string;
  card: string;
}

export function teaserProblem(
  mod: { access: "free" | "pro"; teaserCard?: TeaserRef },
  lessons: readonly { id: string; kind: "lesson" | "quiz"; order: number; cards: readonly Card[] }[],
): string | null {
  if (mod.access === "free") return mod.teaserCard ? "a free module has no teaserCard (only Pro modules do)" : null;
  if (!mod.teaserCard) return "a Pro module needs a teaserCard ({ lesson, card }) for the \"What's next\" screen";
  const first = [...lessons].filter((l) => l.kind === "lesson").sort((a, b) => a.order - b.order)[0];
  if (!first || first.id !== mod.teaserCard.lesson) return `teaserCard.lesson must be the module's first lesson (${first?.id ?? "none"})`;
  const card = first.cards.find((c) => c.id === mod.teaserCard!.card);
  if (!card) return `teaserCard.card "${mod.teaserCard.card}" isn't in ${first.id}`;
  if (!isInteractiveCard(card)) return "teaserCard must be an interactive card (not an explainer or photo)";
  if (card.difficulty !== "core") return "teaserCard must be a core card";
  if (card.type === "hotspot" || card.type === "teardown") return "teaserCard can't be a scene card (its parts are explored earlier in the lesson)";
  return null;
}

/** The teaser card itself, once validated. */
export function teaserCardOf(mod: { teaserCard?: TeaserRef }, lessons: readonly { id: string; cards: readonly Card[] }[]): Card | undefined {
  if (!mod.teaserCard) return undefined;
  return lessons.find((l) => l.id === mod.teaserCard!.lesson)?.cards.find((c) => c.id === mod.teaserCard!.card);
}
