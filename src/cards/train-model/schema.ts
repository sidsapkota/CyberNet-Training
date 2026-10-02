import { z } from "zod";
import { CardId, interactiveCardBase, nonEmpty } from "../base";
import { guessTests } from "./model";

const unique = (values: string[]) => new Set(values).size === values.length;

/** Where an item sits in the model's view, 0 to 10 on each axis (drawn as a real picture). */
const Coord = z.number().min(0).max(10);

/**
 * What the pictures show (zero-confusion rule: real pictures in real colours, never a chart).
 * - `fruit`: x = shape (long → round), y = colour (red → yellow); labels apple, banana or lemon.
 * - `ball`: x = size (small → big), y = weight (light → heavy); labels tennis or basketball.
 * - `weather`: x = cloud (clear → cloudy), y = air (dry → damp).
 * - `daynight`: x = brightness (dark → bright), y = how much sky (none → lots).
 * Word-vote cards show chat bubbles instead.
 */
export const PICTURE_SCENES = ["fruit", "ball", "weather", "daynight"] as const;
export type PictureScene = (typeof PICTURE_SCENES)[number];

/** Most choices a card may offer (zero-confusion rule: 3–4 on Easy and Medium cards). */
export const MAX_CHOICES = 4;

export const TrainModelCardSchema = z
  .object({
    ...interactiveCardBase,
    type: z.literal("train_model"),
    model: z.discriminatedUnion("kind", [
      /** Items with a place in the model's view; guesses the label of the nearest example(s). */
      z.object({ kind: z.literal("nearest"), k: z.union([z.literal(1), z.literal(3)]).default(1), scene: z.enum(PICTURE_SCENES) }),
      /** Short messages; each word votes for the labels it was seen with in training. */
      z.object({ kind: z.literal("word-vote") }),
    ]),
    /** The 2 or 3 labels (answers) the model learns. */
    labels: z
      .array(z.object({ id: CardId, text: nonEmpty.max(14) }))
      .min(2, "needs at least 2 labels")
      .max(3, "allows at most 3 labels"),
    /**
     * Examples with their true label. `given` ones are what the model has already learned from
     * (shown small, not tappable); the rest are what the learner acts on: labels them (label goal)
     * or picks one to add (fix goal). At most 4 of those.
     */
    examples: z
      .array(z.object({ id: CardId, text: nonEmpty.max(48), x: Coord.optional(), y: Coord.optional(), label: CardId, given: z.boolean().default(false) }))
      .min(3, "needs at least 3 examples")
      .max(12, "allows at most 12 examples"),
    /** New items the trained model guesses. `truth` is what each really is. */
    tests: z
      .array(z.object({ id: CardId, text: nonEmpty.max(48), x: Coord.optional(), y: Coord.optional(), truth: CardId }))
      .min(1, "needs at least 1 test item")
      .max(3, "allows at most 3 test items"),
    task: z.discriminatedUnion("goal", [
      /** Label each example that isn't given; then the model trains and shows its guesses. */
      z.object({ goal: z.literal("label") }),
      /**
       * Fix the model's mistake with ONE change. `add` (default): it learned from the given
       * examples and gets a test wrong; the learner adds one of the others. `remove`: it learned
       * from every example (one is mislabelled, say); the learner takes one of the non-given ones
       * out. Correct when it then gets every test right.
       */
      z.object({ goal: z.literal("fix"), action: z.enum(["add", "remove"]).default("add") }),
    ]),
  })
  .superRefine((card, ctx) => {
    const issue = (message: string, path: (string | number)[]) => ctx.addIssue({ code: "custom", message, path });
    const labelIds = card.labels.map((l) => l.id);
    if (!unique(labelIds)) issue("label ids must be unique", ["labels"]);
    if (!unique(card.labels.map((l) => l.text))) issue("label texts must be unique", ["labels"]);
    if (!unique([...card.examples.map((e) => e.id), ...card.tests.map((t) => t.id)])) issue("example and test ids must be unique", ["examples"]);
    card.examples.forEach((e, i) => {
      if (!labelIds.includes(e.label)) issue(`"${e.label}" isn't one of the labels`, ["examples", i, "label"]);
    });
    card.tests.forEach((t, i) => {
      if (!labelIds.includes(t.truth)) issue(`"${t.truth}" isn't one of the labels`, ["tests", i, "truth"]);
    });

    const points = card.model.kind === "nearest";
    for (const [list, items] of [["examples", card.examples], ["tests", card.tests]] as const) {
      items.forEach((item, i) => {
        const has = item.x !== undefined && item.y !== undefined;
        if (points && !has) issue("pictures need x and y", [list, i]);
        if (!points && (item.x !== undefined || item.y !== undefined)) issue("word-vote items don't take x or y", [list, i]);
      });
    }

    const choices = card.examples.filter((e) => !e.given);
    const given = card.examples.filter((e) => e.given);
    if (choices.length > MAX_CHOICES) issue(`at most ${MAX_CHOICES} examples to act on (the rest are given)`, ["examples"]);

    const model = card.model.kind === "nearest" ? { kind: "nearest" as const, k: card.model.k } : { kind: "word-vote" as const };
    const rightCount = (training: typeof card.examples) => {
      const guesses = guessTests(model, training, card.tests);
      return card.tests.filter((t) => guesses[t.id] === t.truth).length;
    };
    if (card.task.goal === "label") {
      if (choices.length === 0) issue("label goal needs at least 1 example to label", ["examples"]);
      // Trained on the true labels, the model must get at least one test right and one wrong, so
      // the card always shows a mistake (that's the lesson) without looking useless.
      const right = rightCount(card.examples);
      if (right === card.tests.length) issue("with the true labels the model must get at least 1 test wrong", ["tests"]);
      if (right === 0) issue("with the true labels the model must get at least 1 test right", ["tests"]);
    } else {
      if (choices.length < 2) issue("fix goal needs 2 to 4 examples to choose from", ["examples"]);
      if (given.length === 0) issue("fix goal needs given examples (what the model learned first)", ["examples"]);
      const remove = card.task.action === "remove";
      const start = remove ? card.examples : given;
      if (rightCount(start) === card.tests.length) issue("the model must start with a test wrong (the problem to fix)", ["tests"]);
      const after = (c: (typeof choices)[number]) => (remove ? card.examples.filter((e) => e.id !== c.id) : [...given, c]);
      const fixes = choices.filter((c) => rightCount(after(c)) === card.tests.length);
      if (fixes.length === 0) issue("no single example fixes the model (the card can't be solved)", ["examples"]);
      if (fixes.length === choices.length) issue("every example fixes it (it must be a real choice)", ["examples"]);
    }
  });

export type TrainModelCard = z.infer<typeof TrainModelCardSchema>;

/**
 * - `labels`: example id → the label the learner chose (label goal).
 * - `included`: the one example the learner added (fix goal): empty, or a single id.
 */
export interface TrainModelAnswer {
  labels: Record<string, string>;
  included: string[];
}
