import type { InteractiveCardDefinition } from "../types";
import {
  describePacketPathAnswer,
  describePacketPathCorrect,
  gradePacketPath,
  isPacketPathReady,
} from "./grade";
import { PacketPathCardView } from "./PacketPathCardView";
import type { PacketPathAnswer, PacketPathCard } from "./schema";

export const packetPathDefinition: InteractiveCardDefinition<PacketPathCard, PacketPathAnswer> = {
  type: "packet_path",
  interactive: true,
  initialAnswer: (card) => [card.source],
  isAnswerReady: isPacketPathReady,
  grade: gradePacketPath,
  describeAnswer: describePacketPathAnswer,
  describeCorrectAnswer: describePacketPathCorrect,
  Component: PacketPathCardView,
};
