/**
 * The maths behind `next_word` cards. Pure: every probability is written in the content (at
 * temperature 1), and temperature only reshapes them. Nothing is generated live.
 *
 * At temperature T each word's share is p^(1/T), scaled so they add up to 1 again. That's the same
 * as dividing a language model's scores by T before softmax: below 1 the likeliest word gets
 * likelier; above 1 the choices even out. The order of the words never changes.
 */
import { hashString, mulberry32 } from "../shared/shuffle";

export interface Candidate {
  word: string;
  p: number;
}

export function atTemperature(candidates: readonly Candidate[], temperature: number): number[] {
  const weights = candidates.map((c) => c.p ** (1 / temperature));
  const total = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => w / total);
}

/** The slider's stops, rounded so 0.1 steps don't drift (0.30000000000000004). */
export function temperatureStops(min: number, max: number, step: number): number[] {
  const count = Math.round((max - min) / step);
  return Array.from({ length: count + 1 }, (_, i) => Math.round((min + i * step) * 100) / 100);
}

export interface ProbabilityGoal {
  /** The word the goal is about; absent: the likeliest word (so "no word above X"). */
  word?: string | undefined;
  atLeast?: number | undefined;
  atMost?: number | undefined;
}

/** Whether a probability goal holds at `temperature`. Shares are compared to 3 decimal places. */
export function meetsGoal(candidates: readonly Candidate[], goal: ProbabilityGoal, temperature: number): boolean {
  const shares = atTemperature(candidates, temperature);
  const index = goal.word === undefined ? shares.indexOf(Math.max(...shares)) : candidates.findIndex((c) => c.word === goal.word);
  if (index < 0) return false;
  const share = Math.round(shares[index]! * 1000) / 1000;
  return (goal.atLeast === undefined || share >= goal.atLeast) && (goal.atMost === undefined || share <= goal.atMost);
}

/** "Generate 5": sample picks at this temperature, seeded so the same card shows the same picks. */
export function samplePicks(candidates: readonly Candidate[], temperature: number, seed: string, count = 5): string[] {
  const shares = atTemperature(candidates, temperature);
  const random = mulberry32(hashString(`${seed}:${temperature.toFixed(2)}`));
  return Array.from({ length: count }, () => {
    let r = random();
    for (let i = 0; i < shares.length; i++) {
      r -= shares[i]!;
      if (r < 0) return candidates[i]!.word;
    }
    return candidates.at(-1)!.word;
  });
}
