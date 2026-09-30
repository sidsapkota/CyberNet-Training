import { z } from "zod";
import { CardId, interactiveCardBase, nonEmpty } from "../base";
import { SceneIdSchema } from "../hotspot/schema";
import { getScene, hiddenInView } from "../shared/scenes/manifests";

/** Verbs that take a part off (or out), and verbs that put it back. */
export const REMOVE_VERBS = ["unscrew", "lift", "slide-out", "unplug"] as const;
export const REFIT_VERBS = ["insert", "fasten", "plug-in"] as const;

export const TeardownCardSchema = z
  .object({
    ...interactiveCardBase,
    type: z.literal("teardown"),
    scene: SceneIdSchema,
    /** Starting state of the scene. Defaults to everything in place. */
    view: nonEmpty.optional(),
    /**
     * The steps, in any order the learner likes as long as each action's `after` steps are done
     * first. Reassembly is just more actions (insert, fasten, plug-in) with their own `after`.
     */
    actions: z
      .array(
        z.object({
          id: CardId,
          part: CardId,
          verb: z.enum([...REMOVE_VERBS, ...REFIT_VERBS]),
          after: z.array(CardId).optional(),
          /** Shown when this is tried too early, e.g. "Take all four screws out first." */
          nudge: nonEmpty.max(100),
        }),
      )
      .min(1)
      .max(14, "allows at most 14 actions"),
    /** Optional: more nudges than this makes the answer wrong (useful in quizzes). */
    maxNudges: z.number().int().min(0).optional(),
  })
  .superRefine((card, ctx) => {
    const scene = getScene(card.scene);
    if (!scene) return;
    if (card.view && !(card.view in scene.views)) {
      ctx.addIssue({ code: "custom", message: `scene "${card.scene}" has no view "${card.view}"`, path: ["view"] });
    }
    const ids = new Map(card.actions.map((a) => [a.id, a]));
    if (ids.size !== card.actions.length) ctx.addIssue({ code: "custom", message: "action ids must be unique", path: ["actions"] });
    const hidden = new Set(hiddenInView(card.scene, card.view));

    card.actions.forEach((action, i) => {
      if (!scene.parts.some((p) => p.id === action.part)) {
        ctx.addIssue({ code: "custom", message: `"${action.part}" isn't a part of scene "${card.scene}"`, path: ["actions", i, "part"] });
      } else if (hidden.has(action.part)) {
        ctx.addIssue({ code: "custom", message: `"${action.part}" is already off in view "${card.view}"`, path: ["actions", i, "part"] });
      }
      for (const dep of action.after ?? []) {
        if (!ids.has(dep)) ctx.addIssue({ code: "custom", message: `"${dep}" isn't an action`, path: ["actions", i, "after"] });
      }
    });

    // No cycles, and a refit must come after that part was removed (directly or indirectly).
    const requires = (id: string, seen = new Set<string>()): Set<string> => {
      for (const dep of ids.get(id)?.after ?? []) {
        if (seen.has(dep)) continue;
        seen.add(dep);
        requires(dep, seen);
      }
      return seen;
    };
    card.actions.forEach((action, i) => {
      const before = requires(action.id);
      if (before.has(action.id)) {
        ctx.addIssue({ code: "custom", message: `"${action.id}" depends on itself`, path: ["actions", i, "after"] });
      }
      if ((REFIT_VERBS as readonly string[]).includes(action.verb)) {
        const removedFirst = [...before].some((dep) => {
          const d = ids.get(dep);
          return d?.part === action.part && (REMOVE_VERBS as readonly string[]).includes(d.verb);
        });
        if (!removedFirst) {
          ctx.addIssue({
            code: "custom",
            message: `"${action.id}" puts back "${action.part}" before it was taken off`,
            path: ["actions", i, "after"],
          });
        }
      }
    });
  });

export type TeardownCard = z.infer<typeof TeardownCardSchema>;
export type TeardownAction = TeardownCard["actions"][number];
export interface TeardownAnswer {
  /** Action ids, in the order they were done. */
  done: string[];
  /** How many times the learner tried something too early. */
  nudges: number;
}
