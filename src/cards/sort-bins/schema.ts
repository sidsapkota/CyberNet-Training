import { z } from "zod";
import { CardId, interactiveCardBase, nonEmpty } from "../base";

const unique = (values: string[]) => new Set(values).size === values.length;

export const SortBinsCardSchema = z
  .object({
    ...interactiveCardBase,
    type: z.literal("sort_bins"),
    /** 2 or 3 labelled bins. */
    bins: z
      .array(z.object({ id: CardId, label: nonEmpty.max(24) }))
      .min(2, "needs at least 2 bins")
      .max(3, "allows at most 3 bins"),
    /** Items to sort, each with the bin it belongs in. Shown in a seeded shuffle. */
    items: z
      .array(z.object({ id: CardId, label: nonEmpty.max(40), bin: CardId }))
      .min(4, "needs at least 4 items")
      .max(10, "allows at most 10 items"),
  })
  .superRefine((card, ctx) => {
    const binIds = card.bins.map((b) => b.id);
    if (!unique(binIds)) ctx.addIssue({ code: "custom", message: "bin ids must be unique", path: ["bins"] });
    if (!unique(card.bins.map((b) => b.label))) ctx.addIssue({ code: "custom", message: "bin labels must be unique", path: ["bins"] });
    if (!unique(card.items.map((i) => i.id))) ctx.addIssue({ code: "custom", message: "item ids must be unique", path: ["items"] });
    if (!unique(card.items.map((i) => i.label))) ctx.addIssue({ code: "custom", message: "item labels must be unique", path: ["items"] });
    card.items.forEach((item, i) => {
      if (!binIds.includes(item.bin)) {
        ctx.addIssue({ code: "custom", message: `"${item.bin}" isn't one of the bins`, path: ["items", i, "bin"] });
      }
    });
    for (const bin of binIds) {
      if (!card.items.some((i) => i.bin === bin)) {
        ctx.addIssue({ code: "custom", message: `bin "${bin}" has no items`, path: ["bins"] });
      }
    }
  });

export type SortBinsCard = z.infer<typeof SortBinsCardSchema>;
/** item id → the bin id the learner put it in. Unplaced items are absent. */
export type SortBinsAnswer = Record<string, string>;
