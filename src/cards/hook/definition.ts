import type { StaticCardDefinition } from "../types";
import { HookCardView } from "./HookCardView";
import type { HookCard } from "./schema";

export const hookDefinition: StaticCardDefinition<HookCard> = {
  type: "hook",
  interactive: false,
  Component: HookCardView,
};
