/**
 * Avatar items (avatars v2): accessories for the mascot, one per slot. A fixed list; the database
 * stores only ids. Cosmetic only, never photos. Every item is visible on the avatar page with how
 * it's earned (art direction: docs/brand/avatars.png).
 * - `free`: everyone has them from the start.
 * - `spin`: won from reward spins (earned by learning, never bought).
 * - `milestone`: unlocked for good by a streak or a finished course (worked out from progress).
 * - `pro`: worn while the learner has Pro (never from a spin, so paying never changes a spin).
 */
export const SLOTS = ["head", "face", "neck", "body", "back"] as const;
export type Slot = (typeof SLOTS)[number];
export const SLOT_LABEL: Record<Slot, string> = { head: "Head", face: "Face", neck: "Neck", body: "Body", back: "Back" };

export type Milestone = { kind: "streak"; days: 7 | 30 } | { kind: "course" };

export interface AvatarItem {
  id: string;
  name: string;
  slot: Slot;
  source: "free" | "spin" | "milestone" | "pro";
  milestone?: Milestone;
}

export const AVATAR_ITEMS: readonly AvatarItem[] = [
  { id: "cap", name: "Backwards cap", slot: "head", source: "free" },
  { id: "glasses", name: "Round glasses", slot: "face", source: "free" },
  { id: "hoodie", name: "Hoodie", slot: "body", source: "free" },
  { id: "beanie", name: "Beanie", slot: "head", source: "spin" },
  { id: "headband", name: "Headband", slot: "head", source: "spin" },
  { id: "headset", name: "Headset", slot: "head", source: "spin" },
  { id: "visor", name: "VR visor", slot: "face", source: "spin" },
  { id: "scarf", name: "Scarf", slot: "neck", source: "milestone", milestone: { kind: "streak", days: 7 } },
  { id: "grad-cap", name: "Grad cap", slot: "head", source: "milestone", milestone: { kind: "course" } },
  { id: "jetpack", name: "Jetpack", slot: "back", source: "milestone", milestone: { kind: "streak", days: 30 } },
  { id: "crown", name: "Circuit crown", slot: "head", source: "pro" },
  { id: "cape", name: "Cape", slot: "back", source: "pro" },
];

export const itemById = (id: string | null | undefined): AvatarItem | undefined => AVATAR_ITEMS.find((i) => i.id === id);
export const FREE_IDS = AVATAR_ITEMS.filter((i) => i.source === "free").map((i) => i.id);
export const SPIN_POOL = AVATAR_ITEMS.filter((i) => i.source === "spin");
export const PRO_IDS = AVATAR_ITEMS.filter((i) => i.source === "pro").map((i) => i.id);

/** How an item is earned, in a few words (shown under a locked item's silhouette). */
export function unlockLabel(item: AvatarItem): string {
  if (item.source === "free") return "Free";
  if (item.source === "spin") return "From a spin";
  if (item.source === "pro") return "Pro";
  if (item.milestone?.kind === "streak") return `${item.milestone.days}-day streak`;
  return "Finish a course";
}
