/**
 * What the learner does on a card (content quality pass, docs/plans/retention-and-fun.md):
 * - recognise: pick or sort labels (multiple choice, true or false, fill the gap, match, sort, tap a part);
 * - predict: guess before seeing (a "what happens if…?" question, next word's "which word comes next");
 * - build: make something (flip bits, type a value, put steps in order, label examples to train a model);
 * - consequence: the action visibly changes something (simulators, teardowns, routes, terminals,
 *   scenarios, fixing a model, the temperature slider).
 * Teaching cards (explainers, reveals, photos, explore cards) aren't counted. A card's \`play\` field
 * overrides the default. Pure; `play.test.ts` holds converted courses to the target.
 */
import type { Card } from "@/cards/schema";

export type Play = "recognise" | "predict" | "build" | "consequence";

const PREDICT_PROMPT = /what (do you think|happens|will happen|would happen)|predict|guess|which (one )?will|what will|happens next/i;

export function playOf(card: Card): Play | null {
  if (card.play) return card.play;
  switch (card.type) {
    case "explainer":
    case "photo":
    case "reveal":
      return null;
    case "hotspot":
      return card.mode === "explore" ? null : "recognise";
    case "multiple_choice":
    case "sort_bins":
      return PREDICT_PROMPT.test(card.prompt) ? "predict" : "recognise";
    case "true_false":
    case "fill_gap":
    case "match_pairs":
      return "recognise";
    case "drag_to_order":
    case "binary_toggle":
    case "numeric_input":
      return "build";
    case "train_model":
      return card.task.goal === "fix" ? "consequence" : "build";
    case "next_word":
      return card.goal.type === "pick" ? "predict" : "consequence";
    default:
      return "consequence"; // simulator, teardown, packet_path, terminal, scenario
  }
}

export interface PlayMix {
  graded: number;
  recognise: number;
  predict: number;
  build: number;
  consequence: number;
}

/** The mix over a lesson's core cards (the ones everyone plays). */
export function playMix(cards: readonly Card[]): PlayMix {
  const mix: PlayMix = { graded: 0, recognise: 0, predict: 0, build: 0, consequence: 0 };
  for (const card of cards) {
    if (card.difficulty !== "core") continue;
    const play = playOf(card);
    if (!play) continue;
    mix.graded++;
    mix[play]++;
  }
  return mix;
}

/** The target: at least one predict, at least one build or consequence, recognise no more than half. */
export function playProblems(mix: PlayMix): string[] {
  const out: string[] = [];
  if (mix.predict === 0) out.push("no PREDICT card");
  if (mix.build + mix.consequence === 0) out.push("no BUILD or CONSEQUENCE card");
  if (mix.recognise * 2 > mix.graded) out.push(`mostly RECOGNISE (${mix.recognise} of ${mix.graded})`);
  return out;
}
