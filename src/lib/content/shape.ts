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
import { isGuidedCard } from "@/cards/schema";
import { cardSeconds } from "./estimate";
import type { RegularLesson } from "./schema";

/**
 * Modules rewritten for "learn before you do" (docs/plans/learn-before-you-do.md): their lessons
 * use the time-based rules below instead of the card count. Every course moves over in turn.
 */
export const LEARN_FIRST_MODULES = new Set([
  "pull-it-apart",
  // Stay Safe Online (rollout 1)
  "lock-your-accounts",
  "spot-the-scam",
  "guard-your-privacy",
  "when-things-go-wrong",
]);

export const TIME_RULES = {
  /** Core cards: about 3–5 minutes (estimate.ts). */
  coreSeconds: { min: 180, max: 300 },
  /** At least this share of the core time is hands-on (graded, explore or learning cards). */
  handsOnShare: 0.6,
  /** At least this many different interaction styles among the core cards. */
  stylesMin: 3,
} as const;

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

export const isNonInteractive = (card: Card) => card.type === "explainer" || card.type === "photo" || card.type === "hook";
/** Graded cards and explore hotspots (ungraded but hands-on). */
export const isHandsOn = (card: Card) => !isNonInteractive(card);

/** An interaction style: hotspot modes count separately; learning cards are one style. */
const styleOf = (card: Card) => (card.type === "hotspot" ? `hotspot-${card.mode}` : card.type);

/** Lesson Blueprint v1.1 (CLAUDE.md): the shape of a lesson built to it (`blueprint` on the lesson). */
export const BLUEPRINT_RULES = { cards: { min: 6, max: 8 }, explainersMax: 2, optionsMin: 3 } as const;

function blueprintShapeProblems(lesson: RegularLesson, opts: { helpModule?: boolean }): string[] {
  const problems: string[] = [];
  const cards = lesson.cards.filter((c) => c.type !== "photo");
  if (cards.length < BLUEPRINT_RULES.cards.min || cards.length > BLUEPRINT_RULES.cards.max) {
    problems.push(`has ${cards.length} cards (Lesson Blueprint: ${BLUEPRINT_RULES.cards.min}–${BLUEPRINT_RULES.cards.max})`);
  }
  const explainers = cards.filter((c) => c.type === "explainer");
  if (explainers.length > BLUEPRINT_RULES.explainersMax) problems.push(`has ${explainers.length} explainers (at most ${BLUEPRINT_RULES.explainersMax}: Name it and the Wrap)`);
  if (cards[0]?.type === "explainer") problems.push("opens with an explainer (the Hook is a picture and a line, or hands-on)");
  if (lesson.cards.filter((c) => c.type === "photo").length > RULES.photosMax) problems.push(`has more than ${RULES.photosMax} photo`);
  if (lesson.cards.filter((c) => c.difficulty === "challenge").length > RULES.bonusMax) problems.push(`has more than ${RULES.bonusMax} bonus cards`);
  cards.forEach((card, i) => {
    if (card.type === "multiple_choice" && card.options.length < BLUEPRINT_RULES.optionsMin) {
      problems.push(`${card.id}: has ${card.options.length} answers (at least ${BLUEPRINT_RULES.optionsMin}, never 2)`);
    }
    if (card.type === "true_false") problems.push(`${card.id}: true or false has only 2 answers (at least ${BLUEPRINT_RULES.optionsMin})`);
    if (card.type === "explainer") {
      const limit = card.mascot || opts.helpModule ? RULES.explainerWordsLong : RULES.explainerWords;
      const words = wordCount(card.body);
      if (words > limit) problems.push(`${card.id}: explainer is ${words} words (at most ${limit})`);
    }
    const previous = cards[i - 1];
    if (previous && isNonInteractive(previous) && isNonInteractive(card)) problems.push(`${previous.id} → ${card.id}: two non-interactive cards in a row`);
  });
  const last = cards.at(-1);
  if (last?.type !== "explainer") problems.push("doesn't end with the Wrap (an explainer)");
  else {
    if (!/\bTry this:/.test(last.body)) problems.push(`${last.id}: the Wrap needs a "Try this: …" line`);
    if (!/\bNext:/.test(last.body)) problems.push(`${last.id}: the Wrap needs a one-line "Next: …" tease`);
    const bullets = last.body.split("\n").filter((line) => /^\s*[-*]\s+/.test(line)).length;
    if (bullets > RULES.recapBullets) problems.push(`${last.id}: the Wrap has ${bullets} bullets (at most ${RULES.recapBullets})`);
  }
  return problems;
}

export function lessonShapeProblems(lesson: RegularLesson, opts: { helpModule?: boolean } = {}): string[] {
  if (lesson.blueprint) return blueprintShapeProblems(lesson, opts);
  const problems: string[] = [];
  const cards = lesson.cards;
  const counted = cards.filter((c) => c.type !== "photo");
  const core = counted.filter((c) => c.difficulty === "core");
  const bonus = counted.filter((c) => c.difficulty === "challenge");

  if (LEARN_FIRST_MODULES.has(lesson.moduleId)) {
    // Time-based: many quick cards are fine; the lesson still takes about 3–5 minutes.
    const seconds = core.reduce((sum, c) => sum + cardSeconds(c), 0);
    if (seconds < TIME_RULES.coreSeconds.min || seconds > TIME_RULES.coreSeconds.max) {
      problems.push(`takes about ${Math.round(seconds / 6) / 10} min in its core cards (needs 3–5)`);
    }
    const handsOnSeconds = core.filter((c) => isHandsOn(c) || isGuidedCard(c)).reduce((sum, c) => sum + cardSeconds(c), 0);
    if (seconds > 0 && handsOnSeconds / seconds < TIME_RULES.handsOnShare) {
      problems.push(`is ${Math.round((handsOnSeconds / seconds) * 100)}% hands-on by time (needs ${TIME_RULES.handsOnShare * 100}%)`);
    }
    const styles = new Set(core.filter((c) => !isNonInteractive(c)).map(styleOf));
    if (styles.size < TIME_RULES.stylesMin) problems.push(`uses ${styles.size} interaction styles (needs at least ${TIME_RULES.stylesMin})`);
  } else {
    if (core.length < RULES.core.min || core.length > RULES.core.max) {
      problems.push(`has ${core.length} core cards (needs ${RULES.core.min}–${RULES.core.max})`);
    }
    const handsOn = core.filter(isHandsOn).length;
    if (core.length > 0 && handsOn / core.length < RULES.handsOnShare) {
      problems.push(`is ${Math.round((handsOn / core.length) * 100)}% hands-on in its core cards (needs ${RULES.handsOnShare * 100}%)`);
    }
  }
  if (bonus.length > RULES.bonusMax) problems.push(`has ${bonus.length} bonus cards (at most ${RULES.bonusMax})`);
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
  // Design playbook rule 7 (useful today): rolled-out lessons end with one real-life action.
  if (LEARN_FIRST_MODULES.has(lesson.moduleId) && last?.type === "explainer" && !/\bTry this:/.test(last.body)) {
    problems.push(`${last.id}: the recap needs a "Try this: …" line (one thing to do in real life)`);
  }
  return problems;
}
