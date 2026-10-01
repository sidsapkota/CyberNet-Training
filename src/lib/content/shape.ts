/**
 * The "right level" lesson rules (approved October 2026), as a pure check that returns every
 * problem so `load.test.ts` and the content audits can report them all at once:
 *
 * - **5–7 core cards** (about 3–5 minutes at 45 s a card) plus **0–2 bonus** (challenge) cards.
 *   Photo cards don't count, and there's at most one per lesson.
 * - **At least 60% of the core cards are hands-on** (graded, or an explore hotspot), so the 60% holds
 *   even for a learner who skips every bonus card.
 * - **Explainers are short:** a body of at most 60 words (80 for a safety note or a help module, which
 *   are split rather than cut). The lesson ends with a recap explainer of at most 3 bullets.
 * - **Do first:** never two non-interactive cards (explainer or photo) in a row. The opening card may
 *   be hands-on, set up by its own prompt.
 * - At most 3 multiple-choice cards.
 */
import type { Card } from "@/cards/schema";
import type { RegularLesson } from "./schema";

export const RULES = {
  core: { min: 5, max: 7 },
  bonusMax: 2,
  handsOnShare: 0.6,
  explainerWords: 60,
  explainerWordsLong: 80,
  recapBullets: 3,
  multipleChoiceMax: 3,
  photosMax: 1,
} as const;

/** Words a reader actually reads: markdown, links and glossary marks removed. */
export function wordCount(markdown: string): number {
  const text = markdown
    .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`#>|]/g, " ");
  return text.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

export const isNonInteractive = (card: Card) => card.type === "explainer" || card.type === "photo";
/** Graded cards and explore hotspots (ungraded but hands-on). */
export const isHandsOn = (card: Card) => !isNonInteractive(card);

export function lessonShapeProblems(lesson: RegularLesson, opts: { helpModule?: boolean } = {}): string[] {
  const problems: string[] = [];
  const cards = lesson.cards;
  const counted = cards.filter((c) => c.type !== "photo");
  const core = counted.filter((c) => c.difficulty === "core");
  const bonus = counted.filter((c) => c.difficulty === "challenge");

  if (core.length < RULES.core.min || core.length > RULES.core.max) {
    problems.push(`has ${core.length} core cards (needs ${RULES.core.min}–${RULES.core.max})`);
  }
  if (bonus.length > RULES.bonusMax) problems.push(`has ${bonus.length} bonus cards (at most ${RULES.bonusMax})`);
  const handsOn = core.filter(isHandsOn).length;
  if (core.length > 0 && handsOn / core.length < RULES.handsOnShare) {
    problems.push(`is ${Math.round((handsOn / core.length) * 100)}% hands-on in its core cards (needs ${RULES.handsOnShare * 100}%)`);
  }
  if (cards.filter((c) => c.type === "photo").length > RULES.photosMax) problems.push(`has more than ${RULES.photosMax} photo`);
  if (cards.filter((c) => c.type === "multiple_choice").length > RULES.multipleChoiceMax) {
    problems.push(`has more than ${RULES.multipleChoiceMax} multiple-choice cards`);
  }

  cards.forEach((card, i) => {
    if (card.type === "explainer") {
      const limit = card.mascot || opts.helpModule ? RULES.explainerWordsLong : RULES.explainerWords;
      const words = wordCount(card.body);
      if (words > limit) problems.push(`${card.id}: explainer is ${words} words (at most ${limit})`);
    }
    const previous = cards[i - 1];
    if (previous && isNonInteractive(previous) && isNonInteractive(card)) {
      problems.push(`${previous.id} → ${card.id}: two non-interactive cards in a row`);
    }
  });

  const last = cards.at(-1);
  if (last?.type !== "explainer") problems.push("doesn't end with a recap explainer");
  else {
    const bullets = last.body.split("\n").filter((line) => /^\s*[-*]\s+/.test(line)).length;
    if (bullets > RULES.recapBullets) problems.push(`${last.id}: recap has ${bullets} bullets (at most ${RULES.recapBullets})`);
  }
  return problems;
}
