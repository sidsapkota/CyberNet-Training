import type { GradeResult } from "../types";
import { type Guess, guessTests, subsetsOf } from "./model";
import type { TrainModelAnswer, TrainModelCard } from "./schema";

const settings = (card: TrainModelCard) =>
  card.model.kind === "nearest" ? { kind: "nearest" as const, k: card.model.k } : { kind: "word-vote" as const };

export function initialTrainModelAnswer(card: TrainModelCard): TrainModelAnswer {
  return { labels: {}, included: card.task.goal === "include" ? [...card.task.start] : [] };
}

/** The examples the learner labels (label goal): every one that isn't given. */
export const labelable = (card: TrainModelCard) => card.examples.filter((e) => !e.given);

/** The training set the answer makes: chosen labels (label goal) or chosen examples (include goal). */
export function trainingSet(card: TrainModelCard, answer: TrainModelAnswer): (TrainModelCard["examples"][number] & { label: string })[] {
  if (card.task.goal === "include") {
    const included = new Set(Array.isArray(answer?.included) ? answer.included : []);
    return card.examples.filter((e) => included.has(e.id));
  }
  const labels = answer?.labels ?? {};
  return card.examples.flatMap((e) => {
    const label = e.given ? e.label : labels[e.id];
    return typeof label === "string" ? [{ ...e, label }] : [];
  });
}

/** The model's guess for every test item, trained on what the answer chose. */
export function trainModelGuesses(card: TrainModelCard, answer: TrainModelAnswer): Record<string, Guess> {
  return guessTests(settings(card), trainingSet(card, answer), card.tests);
}

export function isTrainModelReady(answer: TrainModelAnswer, card: TrainModelCard): boolean {
  if (card.task.goal === "label") return labelable(card).every((e) => typeof answer.labels[e.id] === "string");
  // Include goal: something to train on, and a change from the starting choice.
  const start = new Set(card.task.start);
  return answer.included.length > 0 && (answer.included.length !== start.size || answer.included.some((id) => !start.has(id)));
}

export function gradeTrainModel(card: TrainModelCard, answer: TrainModelAnswer): GradeResult {
  if (card.task.goal === "label") return { correct: labelable(card).every((e) => answer?.labels?.[e.id] === e.label) };
  return { correct: trainingSet(card, answer).length > 0 && allRight(card, trainModelGuesses(card, answer)) };
}

/** Whether every test item was guessed as what it really is. */
export function allRight(card: TrainModelCard, guesses: Record<string, Guess>): boolean {
  return card.tests.every((t) => guesses[t.id] === t.truth);
}

/** Toggles an example in or out of the training set, keeping the card's order. */
export function toggleIncluded(card: TrainModelCard, answer: TrainModelAnswer, id: string): TrainModelAnswer {
  const included = new Set(answer.included);
  if (included.has(id)) included.delete(id);
  else included.add(id);
  return { ...answer, included: card.examples.map((e) => e.id).filter((e) => included.has(e)) };
}

export function setLabel(answer: TrainModelAnswer, exampleId: string, labelId: string): TrainModelAnswer {
  return { ...answer, labels: { ...answer.labels, [exampleId]: labelId } };
}

/** After a wrong attempt, wrong labels are cleared (like sort_bins sending wrong items back). */
export function keepCorrectLabels(card: TrainModelCard, answer: TrainModelAnswer): TrainModelAnswer {
  return { ...answer, labels: Object.fromEntries(labelable(card).filter((e) => answer.labels[e.id] === e.label).map((e) => [e.id, e.label])) };
}

const labelText = (card: TrainModelCard, id: string | undefined) => card.labels.find((l) => l.id === id)?.text ?? "nothing";

export function describeTrainModelAnswer(card: TrainModelCard, answer: TrainModelAnswer): string {
  if (card.task.goal === "include") {
    const chosen = trainingSet(card, answer).map((e) => e.text);
    return chosen.length ? `Trained on: ${chosen.join(", ")}` : "Trained on nothing";
  }
  return labelable(card)
    .map((e) => `${e.text}: ${labelText(card, answer?.labels?.[e.id])}`)
    .join(" · ");
}

export function describeTrainModelCorrect(card: TrainModelCard): string {
  if (card.task.goal === "label") return labelable(card).map((e) => `${e.text}: ${labelText(card, e.label)}`).join(" · ");
  // The working choice closest to the start (the schema guarantees there is one), as changes.
  const start = new Set(card.task.start);
  const changes = (ids: readonly string[]) => card.examples.filter((e) => ids.includes(e.id) !== start.has(e.id)).length;
  const works = subsetsOf(card.examples.map((e) => e.id))
    .filter((ids) => allRight(card, trainModelGuesses(card, { labels: {}, included: ids })))
    .sort((a, b) => changes(a) - changes(b))[0];
  if (!works) return "";
  const add = card.examples.filter((e) => works.includes(e.id) && !start.has(e.id)).map((e) => e.text);
  const drop = card.examples.filter((e) => !works.includes(e.id) && start.has(e.id)).map((e) => e.text);
  return [add.length ? `Add ${add.join(", ")}` : "", drop.length ? `leave out ${drop.join(", ")}` : ""].filter(Boolean).join("; ");
}
