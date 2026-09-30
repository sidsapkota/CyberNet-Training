import { z } from "zod";
import { CardId, interactiveCardBase, nonEmpty } from "../base";

const Choice = z.object({
  id: CardId,
  /** What the learner picks. */
  text: nonEmpty.max(80),
  /** What happens next (markdown, keep it to a sentence or two). Teaches on wrong choices. */
  consequence: nonEmpty.max(320),
  /** Continue to another step... */
  next: CardId.optional(),
  /** ...or end the story here. */
  outcome: z.enum(["success", "fail"]).optional(),
});

export const ScenarioCardSchema = z
  .object({
    ...interactiveCardBase,
    type: z.literal("scenario"),
    start: CardId,
    steps: z
      .array(
        z.object({
          id: CardId,
          /** The situation (markdown). */
          text: nonEmpty.max(400),
          choices: z.array(Choice).min(2, "needs at least 2 choices").max(4, "allows at most 4 choices"),
        }),
      )
      .min(1)
      .max(8, "allows at most 8 steps"),
  })
  .superRefine((card, ctx) => {
    const steps = new Map(card.steps.map((s) => [s.id, s]));
    if (steps.size !== card.steps.length) ctx.addIssue({ code: "custom", message: "step ids must be unique", path: ["steps"] });
    const choiceIds = card.steps.flatMap((s) => s.choices.map((c) => c.id));
    if (new Set(choiceIds).size !== choiceIds.length) {
      ctx.addIssue({ code: "custom", message: "choice ids must be unique across the whole scenario", path: ["steps"] });
    }
    if (!steps.has(card.start)) ctx.addIssue({ code: "custom", message: `start "${card.start}" isn't a step`, path: ["start"] });

    card.steps.forEach((step, s) =>
      step.choices.forEach((choice, c) => {
        const path = ["steps", s, "choices", c];
        if ((choice.next === undefined) === (choice.outcome === undefined)) {
          ctx.addIssue({ code: "custom", message: "each choice needs exactly one of `next` or `outcome`", path });
        }
        if (choice.next !== undefined && !steps.has(choice.next)) {
          ctx.addIssue({ code: "custom", message: `next step "${choice.next}" doesn't exist`, path: [...path, "next"] });
        }
      }),
    );

    // Walk from the start: no loops, every step reachable, and at least one success ending.
    const reached = new Set<string>();
    let success = false;
    const visit = (id: string, trail: string[]): void => {
      if (trail.includes(id)) {
        ctx.addIssue({ code: "custom", message: `the story loops back to "${id}"`, path: ["steps"] });
        return;
      }
      reached.add(id);
      for (const choice of steps.get(id)?.choices ?? []) {
        if (choice.outcome === "success") success = true;
        if (choice.next && steps.has(choice.next)) visit(choice.next, [...trail, id]);
      }
    };
    if (steps.has(card.start)) visit(card.start, []);
    for (const step of card.steps) {
      if (!reached.has(step.id)) ctx.addIssue({ code: "custom", message: `step "${step.id}" can't be reached from the start`, path: ["steps"] });
    }
    if (!success) ctx.addIssue({ code: "custom", message: "no choice leads to a success ending", path: ["steps"] });
  });

export type ScenarioCard = z.infer<typeof ScenarioCardSchema>;
export type ScenarioStep = ScenarioCard["steps"][number];
export type ScenarioChoice = ScenarioStep["choices"][number];
/** The choice ids picked, in order from the start. */
export type ScenarioAnswer = string[];
