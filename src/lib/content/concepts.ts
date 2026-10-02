import { isInteractiveCard } from "@/cards/schema";
import type { LoadedContent } from "./load";

/**
 * The prior-knowledge rule (owner, 2 Oct 2026): every question must be answerable using only what
 * the learner has seen earlier in the same course: an earlier card in the module, or an earlier
 * module. No outside knowledge, ever.
 *
 * Cards declare the concepts they `teaches` (explainers, reveals, a prompt that explains an idea
 * itself) and the concepts they `uses`. Walking each course in order (modules, lessons, cards), a
 * used concept must already have been taught by an earlier core card, or by the card itself. Bonus
 * cards may lean on other bonus cards; core cards and quizzes never do (nothing may depend on a
 * bonus card). Concept ids are scoped to their course.
 */

export interface ConceptProblem {
  courseId: string;
  lessonId: string;
  cardId: string;
  concept: string;
  /** `later`: taught after this card; `bonus-only`: only a bonus card teaches it; `never`: nowhere. */
  kind: "later" | "bonus-only" | "never";
  /** Where it's taught, when it is (`lesson/card`). */
  taughtAt?: string;
}

interface Place {
  lessonId: string;
  cardId: string;
  core: boolean;
}

function ordered(content: LoadedContent) {
  return content.courses.map((course) => ({
    course,
    cards: course.modules.flatMap((mod) =>
      mod.lessons.flatMap((outline) => {
        const lesson = content.lessons.get(outline.id);
        return lesson ? lesson.cards.map((card) => ({ lesson, card })) : [];
      }),
    ),
  }));
}

export function conceptProblems(content: LoadedContent): ConceptProblem[] {
  const problems: ConceptProblem[] = [];
  for (const { course, cards } of ordered(content)) {
    // Every place each concept is taught in this course, in order.
    const everywhere = new Map<string, Place[]>();
    for (const { lesson, card } of cards) {
      for (const concept of card.teaches ?? []) {
        everywhere.set(concept, [...(everywhere.get(concept) ?? []), { lessonId: lesson.id, cardId: card.id, core: card.difficulty === "core" }]);
      }
    }
    const taughtCore = new Set<string>();
    const taughtAny = new Set<string>();
    for (const { lesson, card } of cards) {
      const own = new Set(card.teaches ?? []);
      const bonus = card.difficulty === "challenge" && lesson.kind === "lesson";
      for (const concept of card.uses ?? []) {
        if (own.has(concept) || taughtCore.has(concept) || (bonus && taughtAny.has(concept))) continue;
        const places = everywhere.get(concept) ?? [];
        const before = taughtAny.has(concept);
        const later = places.find((p) => p.core && !(p.lessonId === lesson.id && p.cardId === card.id));
        problems.push({
          courseId: course.id,
          lessonId: lesson.id,
          cardId: card.id,
          concept,
          kind: before ? "bonus-only" : places.length === 0 ? "never" : later ? "later" : "bonus-only",
          taughtAt: places[0] ? `${places[0].lessonId}/${places[0].cardId}` : undefined,
        });
      }
      for (const concept of own) {
        taughtAny.add(concept);
        if (card.difficulty === "core") taughtCore.add(concept);
      }
    }
  }
  return problems;
}

/** Graded cards (lessons and quizzes) that don't say what they rely on yet. */
export function cardsWithoutUses(content: LoadedContent): string[] {
  const missing: string[] = [];
  for (const { cards } of ordered(content)) {
    for (const { lesson, card } of cards) {
      if (isInteractiveCard(card) && card.uses === undefined) missing.push(`${lesson.id}/${card.id}`);
    }
  }
  return missing;
}
