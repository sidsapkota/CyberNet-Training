/** League tiers, lowest to highest. The ids match the database's check constraints. */
export const TIERS = ["packet", "switch", "router", "firewall", "server", "mainframe", "quantum"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_NAMES: Record<Tier, string> = {
  packet: "Packet",
  switch: "Switch",
  router: "Router",
  firewall: "Firewall",
  server: "Server",
  mainframe: "Mainframe",
  quantum: "Quantum",
};

export function isTier(value: unknown): value is Tier {
  return typeof value === "string" && (TIERS as readonly string[]).includes(value);
}

export const tierIndex = (tier: Tier): number => TIERS.indexOf(tier);

/** One tier up or down, never past Quantum or below Packet. */
export function moveTier(tier: Tier, by: -1 | 0 | 1): Tier {
  const i = Math.min(TIERS.length - 1, Math.max(0, tierIndex(tier) + by));
  return TIERS[i]!;
}

/** "Router League". */
export const leagueName = (tier: Tier): string => `${TIER_NAMES[tier]} League`;
