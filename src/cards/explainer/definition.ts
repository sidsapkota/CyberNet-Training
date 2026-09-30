import type { StaticCardDefinition } from "../types";
import { ExplainerCardView } from "./ExplainerCardView";
import type { ExplainerCard } from "./schema";

export const explainerDefinition: StaticCardDefinition<ExplainerCard> = {
  type: "explainer",
  interactive: false,
  Component: ExplainerCardView,
};
