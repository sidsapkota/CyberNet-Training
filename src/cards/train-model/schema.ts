import { z } from "zod";
import { CardId, interactiveCardBase, nonEmpty } from "../base";
import { guessTests, subsetsOf } from "./model";

const unique = (values: string[]) => new Set(values).size === values.length;

/** A position on the chart, 0 to 10 on each axis. */
const Coord = z.number().min(0).max(10);
const Axis = z.object({ label: nonEmpty.max(20), low: nonEmpty.max(12), high: nonEmpty.max(12) });

export const TrainModelCardSchema = z
  .object({
    ...interactiveCardBase,
    type: z.literal("train_model"),
    model: z.discriminatedUnion("kind", [
      /** Points on a 2D chart; guesses the label of the nearest training point(s). */
      z.object({ kind: z.literal("nearest"), k: z.union([z.literal(1), z.literal(3)]).default(1), x: Axis, y: Axis }),
      /** Short messages; each word votes for the labels it was seen with in training. */
      z.object({ kind: z.literal("word-vote") }),
    ]),
    /** The 2 or 3 labels (answers) the model learns. */
    labels: z
      .array(z.object({ id: CardId, text: nonEmpty.max(16) }))
      .min(2, "needs at least 2 labels")
      .max(3, "allows at most 3 labels"),
    /** Training examples, with their true label. `given` ones arrive labelled (label goal). */
    examples: z
      .array(
        z.object({
          id: CardId,
          text: nonEmpty.max(60),
          x: Coord.optional(),
          y: Coord.optional(),
          label: CardId,
          given: z.boolean().default(false),
        }),
      )
      .min(4, "needs at least 4 examples")
      .max(12, "allows at most 12 examples"),
    /** New items the trained model guesses. `truth` is what each really is. */
    tests: z
      .array(z.object({ id: CardId, text: nonEmpty.max(60), x: Coord.optional(), y: Coord.optional(), truth: CardId }))
      .min(1, "needs at least 1 test item")
      .max(4, "allows at most 4 test items"),
    task: z.discriminatedUnion("goal", [
      /** Label every example that isn't given; then the model trains and shows its guesses. */
      z.object({ goal: z.literal("label") }),
      /**
       * Choose which examples to train on, so the model guesses every test item correctly. (All of
       * them, not one: otherwise training on a single apple would "solve" an apple test.)
       */
      z.object({ goal: z.literal("include"), start: z.array(CardId).min(1, "start with at least 1 example") }),
    ]),
  })
  .superRefine((card, ctx) => {
    const issue = (message: string, path: (string | number)[]) => ctx.addIssue({ code: "custom", message, path });
    const labelIds = card.labels.map((l) => l.id);
    const exampleIds = card.examples.map((e) => e.id);
    if (!unique(labelIds)) issue("label ids must be unique", ["labels"]);
    if (!unique(card.labels.map((l) => l.text))) issue("label texts must be unique", ["labels"]);
    if (!unique([...exampleIds, ...card.tests.map((t) => t.id)])) issue("example and test ids must be unique", ["examples"]);
    card.examples.forEach((e, i) => {
      if (!labelIds.includes(e.label)) issue(`"${e.label}" isn't one of the labels`, ["examples", i, "label"]);
    });
    card.tests.forEach((t, i) => {
      if (!labelIds.includes(t.truth)) issue(`"${t.truth}" isn't one of the labels`, ["tests", i, "truth"]);
    });

    // Charts need a position for everything; messages never have one.
    const points = card.model.kind === "nearest";
    for (const [list, items] of [["examples", card.examples], ["tests", card.tests]] as const) {
      items.forEach((item, i) => {
        const has = item.x !== undefined && item.y !== undefined;
        if (points && !has) issue("nearest needs x and y", [list, i]);
        if (!points && (item.x !== undefined || item.y !== undefined)) issue("word-vote items don't take x or y", [list, i]);
      });
    }

    const model = card.model.kind === "nearest" ? { kind: "nearest" as const, k: card.model.k } : { kind: "word-vote" as const };
    const truthOf = new Map(card.tests.map((t) => [t.id, t.truth]));
    if (card.task.goal === "label") {
      if (card.examples.every((e) => e.given)) issue("label goal needs at least 1 example to label", ["examples"]);
      // Trained on the true labels, the model must get at least one test right and one wrong, so
      // the card always shows a mistake (that's the lesson) without looking useless.
      const guesses = guessTests(model, card.examples, card.tests);
      const right = card.tests.filter((t) => guesses[t.id] === t.truth).length;
      if (right === card.tests.length) issue("with the true labels the model must get at least 1 test wrong", ["tests"]);
      if (right === 0) issue("with the true labels the model must get at least 1 test right", ["tests"]);
    } else {
      const { start } = card.task;
      start.forEach((id, i) => {
        if (!exampleIds.includes(id)) issue(`"${id}" isn't an example`, ["task", "start", i]);
      });
      const correctWith = (ids: readonly string[]) => {
        const guesses = guessTests(model, card.examples.filter((e) => ids.includes(e.id)), card.tests);
        return card.tests.every((t) => guesses[t.id] === truthOf.get(t.id));
      };
      if (correctWith(start)) issue("the starting examples already get every test right (the card must start unsolved)", ["task", "start"]);
      if (!subsetsOf(exampleIds).some(correctWith)) issue("no choice of examples gets every test right (the card can't be solved)", ["task"]);
    }
  });

export type TrainModelCard = z.infer<typeof TrainModelCardSchema>;

/**
 * - `labels`: example id → the label the learner chose (label goal).
 * - `included`: the example ids to train on (include goal).
 */
export interface TrainModelAnswer {
  labels: Record<string, string>;
  included: string[];
}
