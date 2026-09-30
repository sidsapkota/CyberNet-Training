import { z } from "zod";
import { CardId, interactiveCardBase, nonEmpty } from "../base";
import { getScene, hiddenInView, SCENE_IDS, type SceneId, visibleParts } from "../shared/scenes/manifests";

export const SceneIdSchema = z.enum(SCENE_IDS as [SceneId, ...SceneId[]]);

export const HotspotCardSchema = z
  .object({
    ...interactiveCardBase,
    type: z.literal("hotspot"),
    /** A registered scene (src/cards/shared/scenes). */
    scene: SceneIdSchema,
    /** Starting state of the scene, e.g. "open" (cover off). Defaults to all parts shown. */
    view: nonEmpty.optional(),
    /**
     * "tap": the learner taps exactly the `targets` ("Tap every part that…").
     * "label": the learner places each label on its part.
     * "explore": not graded. The learner taps each of `parts` to see its name and job; Continue
     * unlocks once every one has been tapped. Use it before a scene's parts are first tested.
     */
    mode: z.enum(["tap", "label", "explore"]),
    targets: z.array(CardId).min(1).max(6).optional(),
    labels: z
      .array(z.object({ part: CardId, label: nonEmpty.max(24) }))
      .min(2)
      .max(6)
      .optional(),
    /** Explore mode: the parts to discover, each with a one-line job and look (plain text). */
    parts: z
      .array(z.object({ part: CardId, job: nonEmpty.max(140) }))
      .min(2)
      .max(10)
      .optional(),
  })
  .superRefine((card, ctx) => {
    const scene = getScene(card.scene);
    if (!scene) return;
    if (card.view && !(card.view in scene.views)) {
      ctx.addIssue({ code: "custom", message: `scene "${card.scene}" has no view "${card.view}"`, path: ["view"] });
    }
    const visible = new Set(visibleParts(card.scene, new Set(hiddenInView(card.scene, card.view))).map((p) => p.id));
    const checkPart = (part: string, path: (string | number)[]) => {
      if (!scene.parts.some((p) => p.id === part)) {
        ctx.addIssue({ code: "custom", message: `"${part}" isn't a part of scene "${card.scene}"`, path });
      } else if (!visible.has(part)) {
        ctx.addIssue({ code: "custom", message: `"${part}" can't be seen in view "${card.view ?? "default"}"`, path });
      }
    };
    const others = (fields: ("targets" | "labels" | "parts")[]) => {
      for (const f of fields) {
        if (card[f]) ctx.addIssue({ code: "custom", message: `${card.mode} mode doesn't use \`${f}\``, path: [f] });
      }
    };
    if (card.mode === "explore") {
      if (!card.parts) ctx.addIssue({ code: "custom", message: "explore mode needs `parts`", path: ["parts"] });
      others(["targets", "labels"]);
      if (card.difficulty !== "core") ctx.addIssue({ code: "custom", message: "explore cards teach, so they must be core", path: ["difficulty"] });
      card.parts?.forEach((p, i) => checkPart(p.part, ["parts", i, "part"]));
      if (card.parts && new Set(card.parts.map((p) => p.part)).size !== card.parts.length) {
        ctx.addIssue({ code: "custom", message: "each part can only be listed once", path: ["parts"] });
      }
      return;
    }
    others(["parts"]);
    if (card.mode === "tap") {
      if (!card.targets) ctx.addIssue({ code: "custom", message: "tap mode needs `targets`", path: ["targets"] });
      if (card.labels) ctx.addIssue({ code: "custom", message: "tap mode doesn't use `labels`", path: ["labels"] });
      card.targets?.forEach((t, i) => checkPart(t, ["targets", i]));
      if (card.targets && new Set(card.targets).size !== card.targets.length) {
        ctx.addIssue({ code: "custom", message: "targets must be unique", path: ["targets"] });
      }
    } else {
      if (!card.labels) ctx.addIssue({ code: "custom", message: "label mode needs `labels`", path: ["labels"] });
      if (card.targets) ctx.addIssue({ code: "custom", message: "label mode doesn't use `targets`", path: ["targets"] });
      card.labels?.forEach((l, i) => checkPart(l.part, ["labels", i, "part"]));
      if (card.labels && new Set(card.labels.map((l) => l.part)).size !== card.labels.length) {
        ctx.addIssue({ code: "custom", message: "each part can only have one label", path: ["labels"] });
      }
      if (card.labels && new Set(card.labels.map((l) => l.label)).size !== card.labels.length) {
        ctx.addIssue({ code: "custom", message: "labels must be unique", path: ["labels"] });
      }
    }
  });

export type HotspotCard = z.infer<typeof HotspotCardSchema>;

/** Explore mode's progress: the parts tapped so far. Never graded. */
export interface HotspotExploreState {
  seen: string[];
}
export interface HotspotAnswer {
  /** Tap mode: the parts selected. */
  selected: string[];
  /** Label mode: part id → index into `card.labels`. */
  placed: Record<string, number>;
}
