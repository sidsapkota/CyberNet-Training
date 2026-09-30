import { binaryToggleDefinition } from "./binary-toggle/definition";
import { dragToOrderDefinition } from "./drag-to-order/definition";
import { explainerDefinition } from "./explainer/definition";
import { matchPairsDefinition } from "./match-pairs/definition";
import { multipleChoiceDefinition } from "./multiple-choice/definition";
import { numericInputDefinition } from "./numeric-input/definition";
import { packetPathDefinition } from "./packet-path/definition";
import { photoDefinition } from "./photo/definition";
import { hotspotDefinition, hotspotExploreDefinition } from "./hotspot/definition";
import { scenarioDefinition } from "./scenario/definition";
import { simulatorDefinition } from "./simulator/definition";
import { sortBinsDefinition } from "./sort-bins/definition";
import { teardownDefinition } from "./teardown/definition";
import { terminalDefinition } from "./terminal/definition";
import { type Card, type CardType, isExploreCard } from "./schema";
import type { GuidedCardDefinition, InteractiveCardDefinition, StaticCardDefinition } from "./types";

/**
 * card type → definition. Registration step 2 of 2 when adding a card type
 * (step 1 is `schema.ts`). `satisfies` makes the compiler reject a missing
 * type or a definition registered under the wrong key.
 */
const definitions = {
  explainer: explainerDefinition,
  photo: photoDefinition,
  multiple_choice: multipleChoiceDefinition,
  drag_to_order: dragToOrderDefinition,
  binary_toggle: binaryToggleDefinition,
  numeric_input: numericInputDefinition,
  match_pairs: matchPairsDefinition,
  packet_path: packetPathDefinition,
  terminal: terminalDefinition,
  hotspot: hotspotDefinition,
  teardown: teardownDefinition,
  simulator: simulatorDefinition,
  scenario: scenarioDefinition,
  sort_bins: sortBinsDefinition,
} satisfies { [K in CardType]: { type: K } };

/** Type-erased views used by the player, which treats answers as opaque values. */
export type AnyInteractiveDefinition = InteractiveCardDefinition<Card, unknown>;
export type AnyStaticDefinition = StaticCardDefinition<Card>;
export type AnyGuidedDefinition = GuidedCardDefinition<Card, unknown>;
export type AnyCardDefinition = AnyInteractiveDefinition | AnyStaticDefinition | AnyGuidedDefinition;

export function isGuidedDefinition(definition: AnyCardDefinition): definition is AnyGuidedDefinition {
  return "guided" in definition;
}

export function getCardDefinition(card: Card): AnyCardDefinition {
  // Hotspot's explore mode is ungraded, so it has its own (guided) definition.
  if (isExploreCard(card)) return hotspotExploreDefinition as unknown as AnyCardDefinition;
  // Safe: `definitions` is keyed by card type, and each definition only ever
  // receives cards of its own type plus answers it created itself.
  return definitions[card.type] as unknown as AnyCardDefinition;
}
