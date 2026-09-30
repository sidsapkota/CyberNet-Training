import { z } from "zod";
import { BinaryToggleCardSchema } from "./binary-toggle/schema";
import { DragToOrderCardSchema } from "./drag-to-order/schema";
import { ExplainerCardSchema } from "./explainer/schema";
import { MatchPairsCardSchema } from "./match-pairs/schema";
import { MultipleChoiceCardSchema } from "./multiple-choice/schema";
import { NumericInputCardSchema } from "./numeric-input/schema";
import { PacketPathCardSchema } from "./packet-path/schema";
import { HotspotCardSchema } from "./hotspot/schema";
import { ScenarioCardSchema } from "./scenario/schema";
import { SimulatorCardSchema } from "./simulator/schema";
import { SortBinsCardSchema } from "./sort-bins/schema";
import { TeardownCardSchema } from "./teardown/schema";
import { TerminalCardSchema } from "./terminal/schema";

/**
 * Every card type. Registration step 1 of 2 when adding a card type
 * (step 2 is `registry.ts`).
 */
export const CardSchema = z.discriminatedUnion("type", [
  ExplainerCardSchema,
  MultipleChoiceCardSchema,
  DragToOrderCardSchema,
  BinaryToggleCardSchema,
  NumericInputCardSchema,
  MatchPairsCardSchema,
  PacketPathCardSchema,
  TerminalCardSchema,
  HotspotCardSchema,
  TeardownCardSchema,
  SimulatorCardSchema,
  ScenarioCardSchema,
  SortBinsCardSchema,
]);

export type Card = z.infer<typeof CardSchema>;
export type CardType = Card["type"];

/** Card types that can be graded (everything except read-only ones). */
export type InteractiveCard = Exclude<Card, { type: "explainer" }>;

/** A hotspot in explore mode: hands-on but never graded (see `GuidedCardDefinition`). */
export function isExploreCard(card: Card): boolean {
  return card.type === "hotspot" && card.mode === "explore";
}

/**
 * Whether a card is graded. False for explainers and explore-mode hotspots. (Only the true branch
 * narrows usefully: a false result can also be a hotspot in explore mode.)
 */
export function isInteractiveCard(card: Card): card is InteractiveCard {
  return card.type !== "explainer" && !isExploreCard(card);
}
