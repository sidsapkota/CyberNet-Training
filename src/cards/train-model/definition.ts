import type { InteractiveCardDefinition } from "../types";
import { describeTrainModelAnswer, describeTrainModelCorrect, gradeTrainModel, initialTrainModelAnswer, isTrainModelReady } from "./grade";
import type { TrainModelAnswer, TrainModelCard } from "./schema";
import { TrainModelCardView } from "./TrainModelCardView";

export const trainModelDefinition: InteractiveCardDefinition<TrainModelCard, TrainModelAnswer> = {
  type: "train_model",
  interactive: true,
  initialAnswer: initialTrainModelAnswer,
  isAnswerReady: isTrainModelReady,
  grade: gradeTrainModel,
  describeAnswer: describeTrainModelAnswer,
  describeCorrectAnswer: describeTrainModelCorrect,
  Component: TrainModelCardView,
};
