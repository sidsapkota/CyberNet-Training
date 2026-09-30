import type { StaticCardDefinition } from "../types";
import { PhotoCardView } from "./PhotoCardView";
import type { PhotoCard } from "./schema";

export const photoDefinition: StaticCardDefinition<PhotoCard> = {
  type: "photo",
  interactive: false,
  Component: PhotoCardView,
};
