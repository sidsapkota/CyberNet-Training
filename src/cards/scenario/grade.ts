import type { GradeResult } from "../types";
import type { ScenarioAnswer, ScenarioCard, ScenarioChoice, ScenarioStep } from "./schema";

export interface ScenarioWalk {
  /** Each step visited with the choice made there. */
  history: { step: ScenarioStep; choice: ScenarioChoice }[];
  /** The step waiting for a choice, or null once the story has ended. */
  current: ScenarioStep | null;
  /** How the story ended, if it has. */
  outcome: "success" | "fail" | null;
  /** False if the answer doesn't follow the story (tampered or stale). */
  valid: boolean;
}

/** Replays the learner's choices through the story. Pure. */
export function walkScenario(card: ScenarioCard, answer: ScenarioAnswer): ScenarioWalk {
  const steps = new Map(card.steps.map((s) => [s.id, s]));
  const history: ScenarioWalk["history"] = [];
  let current = steps.get(card.start) ?? null;
  for (const choiceId of Array.isArray(answer) ? answer : []) {
    const choice = current?.choices.find((c) => c.id === choiceId);
    if (!current || !choice) return { history, current, outcome: null, valid: false };
    history.push({ step: current, choice });
    if (choice.outcome) return { history, current: null, outcome: choice.outcome, valid: history.length === answer.length };
    current = steps.get(choice.next ?? "") ?? null;
  }
  return { history, current, outcome: null, valid: true };
}

/**
 * Picks a choice. If the story had already ended (a wrong ending being retried), the last
 * choice is replaced, so the learner tries again from the same step.
 */
export function chooseScenario(card: ScenarioCard, answer: ScenarioAnswer, choiceId: string): ScenarioAnswer {
  const walk = walkScenario(card, answer);
  return walk.outcome ? [...answer.slice(0, -1), choiceId] : [...answer, choiceId];
}

export function isScenarioReady(answer: ScenarioAnswer, card: ScenarioCard): boolean {
  const walk = walkScenario(card, answer);
  return walk.valid && walk.outcome !== null;
}

export function gradeScenario(card: ScenarioCard, answer: ScenarioAnswer): GradeResult {
  const walk = walkScenario(card, answer);
  return { correct: walk.valid && walk.outcome === "success" };
}

/** The shortest path to a success ending, as choice texts. */
export function successPath(card: ScenarioCard): ScenarioChoice[] {
  const steps = new Map(card.steps.map((s) => [s.id, s]));
  const queue: { id: string; path: ScenarioChoice[] }[] = [{ id: card.start, path: [] }];
  while (queue.length) {
    const { id, path } = queue.shift()!;
    for (const choice of steps.get(id)?.choices ?? []) {
      if (choice.outcome === "success") return [...path, choice];
      if (choice.next) queue.push({ id: choice.next, path: [...path, choice] });
    }
  }
  return [];
}

export function describeScenarioAnswer(card: ScenarioCard, answer: ScenarioAnswer): string {
  const walk = walkScenario(card, answer);
  return walk.history.length ? walk.history.map((h) => h.choice.text).join(" → ") : "No choices made";
}

export function describeScenarioCorrect(card: ScenarioCard): string {
  return successPath(card).map((c) => c.text).join(" → ");
}
