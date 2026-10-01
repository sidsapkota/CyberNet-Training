import type { InteractiveCardDefinition } from "../types";
import { DragToOrderCardView } from "./DragToOrderCardView";
import { describeDragToOrderAnswer, describeDragToOrderCorrect, gradeDragToOrder } from "./grade";
import type { DragToOrderAnswer, DragToOrderCard } from "./schema";
import { seededShuffle } from "../shared/shuffle";

const startingOrder = (card: DragToOrderCard) =>
  seededShuffle(
    card.items.map((item) => item.id),
    card.id,
  );

export const dragToOrderDefinition: InteractiveCardDefinition<DragToOrderCard, DragToOrderAnswer> = {
  type: "drag_to_order",
  interactive: true,
  initialAnswer: startingOrder,
  // Check waits until something has moved (pressing it on the shuffled start isn't a real try),
  // unless the shuffle happened to start in the right order.
  isAnswerReady: (answer, card) => {
    const start = startingOrder(card);
    const unchanged = answer.length === start.length && answer.every((id, i) => id === start[i]);
    return !unchanged || gradeDragToOrder(card, start).correct;
  },
  grade: gradeDragToOrder,
  describeAnswer: describeDragToOrderAnswer,
  describeCorrectAnswer: describeDragToOrderCorrect,
  Component: DragToOrderCardView,
};
