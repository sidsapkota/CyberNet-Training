import type { InteractiveCardDefinition } from "../types";
import { DragToOrderCardView } from "./DragToOrderCardView";
import { describeDragToOrderAnswer, describeDragToOrderCorrect, gradeDragToOrder } from "./grade";
import type { DragToOrderAnswer, DragToOrderCard } from "./schema";
import { seededShuffle } from "./shuffle";

export const dragToOrderDefinition: InteractiveCardDefinition<DragToOrderCard, DragToOrderAnswer> = {
  type: "drag_to_order",
  interactive: true,
  initialAnswer: (card) =>
    seededShuffle(
      card.items.map((item) => item.id),
      card.id,
    ),
  isAnswerReady: () => true,
  grade: gradeDragToOrder,
  describeAnswer: describeDragToOrderAnswer,
  describeCorrectAnswer: describeDragToOrderCorrect,
  Component: DragToOrderCardView,
};
