import { z } from "zod";
import { LESSON_ICONS } from "@/lib/content/lessonIcons";
import { glossaryEntry, isOneSentence } from "@/lib/glossary";
import { cardBase, CardId, nonEmpty } from "../base";
import { getScene, hiddenInView, SCENE_IDS, type SceneId, visibleParts } from "../shared/scenes/manifests";

const SceneIdSchema = z.enum(SCENE_IDS as [SceneId, ...SceneId[]]);

/**
 * The learning card ("learn before you do"): one thing, one sentence. The learner taps it (a part of
 * a scene, an icon, or a word) and it glows once as its sentence appears. Ungraded and hands-on,
 * like an explore card: Continue unlocks once it's been tapped, and it pays a small XP once.
 */
export const RevealCardSchema = z
  .object({
    ...cardBase,
    type: z.literal("reveal"),
    /** At most a few words, e.g. "Tap the phone." Optional; the card says "Tap to see" without it. */
    prompt: nonEmpty.max(60).optional(),
    show: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("part"), scene: SceneIdSchema, part: CardId, view: z.string().optional() }),
      z.object({ kind: z.literal("icon"), icon: z.enum(LESSON_ICONS) }),
      /** A glossary word (its id); the card shows the entry's term. */
      z.object({ kind: z.literal("term"), term: CardId }),
    ]),
    /** One sentence (≤ 120 characters); the thing it names in **bold**. Markdown. */
    sentence: nonEmpty.max(120).refine(isOneSentence, "must be one sentence (one full stop, at the end)"),
  })
  .superRefine((card, ctx) => {
    if (card.difficulty !== "core") ctx.addIssue({ code: "custom", message: "learning cards teach, so they must be core", path: ["difficulty"] });
    const { show } = card;
    if (show.kind === "part") {
      const scene = getScene(show.scene);
      if (!scene) return;
      if (show.view && !(show.view in scene.views)) ctx.addIssue({ code: "custom", message: `scene "${show.scene}" has no view "${show.view}"`, path: ["show", "view"] });
      const visible = new Set(visibleParts(show.scene, new Set(hiddenInView(show.scene, show.view))).map((p) => p.id));
      if (!scene.parts.some((p) => p.id === show.part)) ctx.addIssue({ code: "custom", message: `"${show.part}" isn't a part of scene "${show.scene}"`, path: ["show", "part"] });
      else if (!visible.has(show.part)) ctx.addIssue({ code: "custom", message: `"${show.part}" can't be seen in view "${show.view ?? "default"}"`, path: ["show", "part"] });
    }
    if (show.kind === "term" && !glossaryEntry(show.term)) ctx.addIssue({ code: "custom", message: `"${show.term}" isn't in the glossary`, path: ["show", "term"] });
  });

export type RevealCard = z.infer<typeof RevealCardSchema>;
/** Whether the learner has tapped it yet. */
export interface RevealState {
  revealed: boolean;
}
