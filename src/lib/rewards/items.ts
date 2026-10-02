/**
 * Avatar items: a fixed list (the database stores only ids). Cosmetic only. No photos, ever:
 * mascot heads with an accessory and a tile colour, and tech badges. Every item is visible on the
 * Rewards page, with how it's earned.
 * - `starter`: everyone has them.
 * - `spin`: won from reward spins (earned by learning, never bought).
 * - `pro`: unlocked while the learner has Pro (never from a spin, so paying never changes a spin).
 */
export type Tone = "navy" | "cyan" | "mint" | "amber" | "coral" | "raised";
export type Accessory = "none" | "cap" | "headphones" | "glasses" | "scarf" | "crown";
export type BadgeIcon =
  | "shield" | "chip" | "terminal" | "wifi" | "router" | "rocket" | "satellite" | "key" | "cloud" | "globe"
  | "bot" | "gamepad" | "music" | "camera" | "bug" | "puzzle" | "telescope" | "lightbulb" | "server" | "compass" | "map";

export interface RewardItem {
  id: string;
  name: string;
  source: "starter" | "spin" | "pro";
  tone: Tone;
  look: { kind: "mascot"; accessory: Accessory } | { kind: "badge"; icon: BadgeIcon };
  /** The one animated item (Pro's trace frame): two beats, then still. */
  animated?: boolean;
}

const mascot = (id: string, name: string, source: RewardItem["source"], tone: Tone, accessory: Accessory = "none"): RewardItem => ({ id, name, source, tone, look: { kind: "mascot", accessory } });
const badge = (id: string, name: string, source: RewardItem["source"], tone: Tone, icon: BadgeIcon): RewardItem => ({ id, name, source, tone, look: { kind: "badge", icon } });

export const REWARD_ITEMS: readonly RewardItem[] = [
  // Starters
  mascot("mascot", "Mascot", "starter", "navy"),
  mascot("mascot-cyan", "Bright mascot", "starter", "cyan"),
  badge("badge-shield", "Shield", "starter", "navy", "shield"),
  badge("badge-chip", "Chip", "starter", "raised", "chip"),
  badge("badge-terminal", "Terminal", "starter", "navy", "terminal"),
  badge("badge-wifi", "Wi-Fi", "starter", "raised", "wifi"),
  // From spins
  mascot("mascot-mint", "Mint mascot", "spin", "mint"),
  mascot("mascot-amber", "Amber mascot", "spin", "amber"),
  mascot("mascot-coral", "Coral mascot", "spin", "coral"),
  mascot("cap-navy", "Cap", "spin", "navy", "cap"),
  mascot("cap-mint", "Mint cap", "spin", "mint", "cap"),
  mascot("headphones-navy", "Headphones", "spin", "navy", "headphones"),
  mascot("headphones-amber", "Amber headphones", "spin", "amber", "headphones"),
  mascot("glasses-navy", "Glasses", "spin", "navy", "glasses"),
  mascot("glasses-cyan", "Bright glasses", "spin", "cyan", "glasses"),
  mascot("scarf-coral", "Scarf", "spin", "coral", "scarf"),
  mascot("scarf-mint", "Mint scarf", "spin", "mint", "scarf"),
  badge("badge-router", "Router", "spin", "navy", "router"),
  badge("badge-rocket", "Rocket", "spin", "raised", "rocket"),
  badge("badge-satellite", "Satellite", "spin", "navy", "satellite"),
  badge("badge-key", "Key", "spin", "amber", "key"),
  badge("badge-cloud", "Cloud", "spin", "cyan", "cloud"),
  badge("badge-globe", "Globe", "spin", "mint", "globe"),
  badge("badge-bot", "Robot", "spin", "raised", "bot"),
  badge("badge-gamepad", "Gamepad", "spin", "coral", "gamepad"),
  badge("badge-music", "Music", "spin", "mint", "music"),
  badge("badge-camera", "Camera", "spin", "navy", "camera"),
  badge("badge-bug", "Bug hunter", "spin", "amber", "bug"),
  badge("badge-puzzle", "Puzzle", "spin", "cyan", "puzzle"),
  badge("badge-telescope", "Telescope", "spin", "navy", "telescope"),
  badge("badge-lightbulb", "Bright idea", "spin", "amber", "lightbulb"),
  badge("badge-server", "Server", "spin", "raised", "server"),
  badge("badge-compass", "Compass", "spin", "mint", "compass"),
  badge("badge-map", "Map", "spin", "coral", "map"),
  // With Pro
  badge("pro-holo-shield", "Holo shield", "pro", "cyan", "shield"),
  mascot("pro-crown", "Circuit crown", "pro", "navy", "crown"),
  { ...mascot("pro-trace", "Trace frame", "pro", "navy"), animated: true },
];

export const DEFAULT_AVATAR = "mascot";
export const itemById = (id: string | null | undefined): RewardItem | undefined => REWARD_ITEMS.find((i) => i.id === id);
export const STARTER_IDS = REWARD_ITEMS.filter((i) => i.source === "starter").map((i) => i.id);
export const SPIN_POOL = REWARD_ITEMS.filter((i) => i.source === "spin");
export const PRO_IDS = REWARD_ITEMS.filter((i) => i.source === "pro").map((i) => i.id);
