import { z } from "zod";
import { interactiveCardBase, nonEmpty } from "../base";
import { meetsGoal, temperatureStops } from "./model";

export const NextWordCardSchema = z
  .object({
    ...interactiveCardBase,
    type: z.literal("next_word"),
    /** The text so far, e.g. "The cat sat on the". The next word goes after it. */
    context: nonEmpty.max(120),
    /** Pre-written chances for the next word at temperature 1. They add up to 1. */
    candidates: z
      .array(z.object({ word: nonEmpty.max(20), p: z.number().gt(0).max(1) }))
      .min(3, "needs at least 3 candidate words")
      .max(6, "allows at most 6 candidate words"),
    /** The temperature slider (probability goal). A pick goal always uses `start`, with no slider. */
    temperature: z
      .object({
        min: z.number().min(0.1).max(3).default(0.2),
        max: z.number().min(0.1).max(3).default(2),
        start: z.number().min(0.1).max(3).default(1),
        step: z.number().positive().default(0.1),
      })
      .default({ min: 0.2, max: 2, start: 1, step: 0.1 }),
    goal: z.discriminatedUnion("type", [
      /** "Which word is the model most likely to choose?" The chances stay hidden until Check. */
      z.object({ type: z.literal("pick"), word: nonEmpty }),
      /** "Set the temperature so 'mat' is at least 80%" (no `word`: the likeliest word). */
      z.object({
        type: z.literal("probability"),
        word: nonEmpty.optional(),
        atLeast: z.number().min(0).max(1).optional(),
        atMost: z.number().min(0).max(1).optional(),
      }),
    ]),
  })
  .superRefine((card, ctx) => {
    const issue = (message: string, path: (string | number)[]) => ctx.addIssue({ code: "custom", message, path });
    const words = card.candidates.map((c) => c.word.toLowerCase());
    if (new Set(words).size !== words.length) issue("candidate words must be unique", ["candidates"]);
    const total = card.candidates.reduce((sum, c) => sum + c.p, 0);
    if (Math.abs(total - 1) > 0.001) issue(`chances must add up to 1 (they add up to ${total.toFixed(3)})`, ["candidates"]);

    const { min, max, start, step } = card.temperature;
    if (min >= max) issue("min must be below max", ["temperature"]);
    if (start < min || start > max) issue("start must be between min and max", ["temperature", "start"]);
    const stops = temperatureStops(min, max, step);
    if (stops.length > 101) issue("too many slider stops (use a bigger step)", ["temperature", "step"]);
    if (!stops.includes(Math.round(start * 100) / 100)) issue("start must be on a slider stop", ["temperature", "start"]);

    if (card.goal.type === "pick") {
      const goalWord = card.goal.word;
      const index = card.candidates.findIndex((c) => c.word === goalWord);
      if (index < 0) return issue(`"${goalWord}" isn't a candidate`, ["goal", "word"]);
      // The answer is the likeliest word, and only that one.
      const best = Math.max(...card.candidates.map((c) => c.p));
      if (card.candidates[index]!.p !== best || card.candidates.filter((c) => c.p === best).length > 1) {
        issue("the pick goal's word must be the single likeliest candidate", ["goal", "word"]);
      }
      return;
    }
    const goal = card.goal;
    if (goal.atLeast === undefined && goal.atMost === undefined) return issue("needs atLeast or atMost", ["goal"]);
    if (goal.word !== undefined && !card.candidates.some((c) => c.word === goal.word)) {
      return issue(`"${goal.word}" isn't a candidate`, ["goal", "word"]);
    }
    if (meetsGoal(card.candidates, goal, start)) issue("the goal is already met at the start (the card must start unsolved)", ["goal"]);
    if (!stops.some((t) => meetsGoal(card.candidates, goal, t))) issue("no slider stop meets the goal (the card can't be solved)", ["goal"]);
  });

export type NextWordCard = z.infer<typeof NextWordCardSchema>;

/** `temperature`: the slider's value (probability goal). `pick`: the chosen word (pick goal). */
export interface NextWordAnswer {
  temperature: number;
  pick: string | null;
}
