import type { GradeResult } from "../types";
import { atTemperature, meetsGoal, temperatureStops } from "./model";
import type { NextWordAnswer, NextWordCard } from "./schema";

export function initialNextWordAnswer(card: NextWordCard): NextWordAnswer {
  return { temperature: card.temperature.start, pick: null };
}

/** Pick goal: a word chosen. Probability goal: the slider has moved (Check at the start is never a real try). */
export function isNextWordReady(answer: NextWordAnswer, card: NextWordCard): boolean {
  return card.goal.type === "pick" ? answer.pick !== null : answer.temperature !== card.temperature.start;
}

/** The answer's temperature, if it's a real stop on the card's slider (anything else is refused). */
function validTemperature(card: NextWordCard, value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const { min, max, step } = card.temperature;
  const rounded = Math.round(value * 100) / 100;
  return temperatureStops(min, max, step).includes(rounded) ? rounded : null;
}

export function gradeNextWord(card: NextWordCard, answer: NextWordAnswer): GradeResult {
  if (card.goal.type === "pick") return { correct: answer?.pick === card.goal.word };
  const temperature = validTemperature(card, answer?.temperature);
  return { correct: temperature !== null && meetsGoal(card.candidates, card.goal, temperature) };
}

/**
 * A share as a percentage with one decimal ("45.5%"): exactly the precision goals are checked at
 * (3 decimal places of the share, `meetsGoal`), so a bar can never look like it meets a goal the
 * grader fails (45.5% showing as "45%").
 */
export function percent(share: number): string {
  return `${(Math.round(share * 1000) / 10).toFixed(1)}%`;
}

function goalWordShare(card: NextWordCard, temperature: number): string {
  const shares = atTemperature(card.candidates, temperature);
  const goalWord = card.goal.type === "probability" ? card.goal.word : undefined;
  const index = goalWord === undefined ? shares.indexOf(Math.max(...shares)) : card.candidates.findIndex((c) => c.word === goalWord);
  return `${card.candidates[index]?.word ?? "?"}: ${percent(shares[index] ?? 0)}`;
}

export function describeNextWordAnswer(card: NextWordCard, answer: NextWordAnswer): string {
  if (card.goal.type === "pick") return answer?.pick ?? "No word picked";
  const temperature = validTemperature(card, answer?.temperature);
  return temperature === null ? "No temperature set" : `Temperature ${temperature.toFixed(1)} (${goalWordShare(card, temperature)})`;
}

export function describeNextWordCorrect(card: NextWordCard): string {
  if (card.goal.type === "pick") return card.goal.word;
  const goal = card.goal;
  const ok = temperatureStops(card.temperature.min, card.temperature.max, card.temperature.step).filter((t) =>
    meetsGoal(card.candidates, goal, t),
  );
  if (ok.length === 0) return "";
  const [low, high] = [ok[0]!, ok.at(-1)!];
  return low === high ? `Temperature ${low.toFixed(1)}` : `Any temperature from ${low.toFixed(1)} to ${high.toFixed(1)}`;
}
