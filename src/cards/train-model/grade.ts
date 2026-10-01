import type { GradeResult } from "../types";
import { type Guess, guessTests } from "./model";
import type { TrainModelAnswer, TrainModelCard } from "./schema";

const settings = (card: TrainModelCard) =>
  card.model.kind === "nearest" ? { kind: "nearest" as const, k: card.model.k } : { kind: "word-vote" as const };

/** Nothing chosen or labelled to start with (zero-confusion rule: nothing pre-selected). */
export function initialTrainModelAnswer(): TrainModelAnswer {
  return { labels: {}, included: [] };
}

/** The examples the learner acts on: labels (label goal) or picks one from (fix goal). */
export const choices = (card: TrainModelCard) => card.examples.filter((e) => !e.given);
/** What the model already learned from (shown small, not tappable). */
export const given = (card: TrainModelCard) => card.examples.filter((e) => e.given);
/** Kept for older callers: the examples to label. */
export const labelable = choices;

/** The training set the answer makes: the given examples plus the learner's labels or pick. */
export function trainingSet(card: TrainModelCard, answer: TrainModelAnswer): (TrainModelCard["examples"][number] & { label: string })[] {
  if (card.task.goal === "fix") {
    const picked = new Set(Array.isArray(answer?.included) ? answer.included.slice(0, 1) : []);
    // add: the given examples plus the pick. remove: everything except the pick.
    return card.task.action === "remove" ? card.examples.filter((e) => e.given || !picked.has(e.id)) : card.examples.filter((e) => e.given || picked.has(e.id));
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

/** The first test the model gets wrong before the learner acts: the problem the card leads with. */
export function problemTest(card: TrainModelCard): TrainModelCard["tests"][number] {
  const before = trainModelGuesses(card, initialTrainModelAnswer());
  return card.tests.find((t) => before[t.id] !== t.truth) ?? card.tests[0]!;
}

export function isTrainModelReady(answer: TrainModelAnswer, card: TrainModelCard): boolean {
  if (card.task.goal === "label") return choices(card).every((e) => typeof answer.labels[e.id] === "string");
  return answer.included.length === 1;
}

export function gradeTrainModel(card: TrainModelCard, answer: TrainModelAnswer): GradeResult {
  if (card.task.goal === "label") return { correct: choices(card).every((e) => answer?.labels?.[e.id] === e.label) };
  const picked = Array.isArray(answer?.included) ? answer.included : [];
  return { correct: picked.length === 1 && choices(card).some((e) => e.id === picked[0]) && allRight(card, trainModelGuesses(card, answer)) };
}

/** Whether every test item was guessed as what it really is. */
export function allRight(card: TrainModelCard, guesses: Record<string, Guess>): boolean {
  return card.tests.every((t) => guesses[t.id] === t.truth);
}

/** Fix goal: the one example added (tapping it again takes it away). */
export function pickExample(answer: TrainModelAnswer, id: string): TrainModelAnswer {
  return { ...answer, included: answer.included[0] === id ? [] : [id] };
}

export function setLabel(answer: TrainModelAnswer, exampleId: string, labelId: string): TrainModelAnswer {
  return { ...answer, labels: { ...answer.labels, [exampleId]: labelId } };
}

/** After a wrong attempt, wrong labels are cleared (like sort_bins sending wrong items back). */
export function keepCorrectLabels(card: TrainModelCard, answer: TrainModelAnswer): TrainModelAnswer {
  return { ...answer, labels: Object.fromEntries(choices(card).filter((e) => answer.labels[e.id] === e.label).map((e) => [e.id, e.label])) };
}

const labelText = (card: TrainModelCard, id: string | undefined) => card.labels.find((l) => l.id === id)?.text ?? "nothing";

export function describeTrainModelAnswer(card: TrainModelCard, answer: TrainModelAnswer): string {
  if (card.task.goal === "fix") {
    const picked = card.examples.find((e) => e.id === answer?.included?.[0]);
    const verb = card.task.action === "remove" ? "Took out" : "Added";
    return picked ? `${verb}: ${picked.text}` : `${verb} nothing`;
  }
  return choices(card)
    .map((e) => `${e.text}: ${labelText(card, answer?.labels?.[e.id])}`)
    .join(" · ");
}

export function describeTrainModelCorrect(card: TrainModelCard): string {
  if (card.task.goal === "label") return choices(card).map((e) => `${e.text}: ${labelText(card, e.label)}`).join(" · ");
  const fix = choices(card).find((c) => allRight(card, trainModelGuesses(card, { labels: {}, included: [c.id] })));
  return fix ? `${card.task.action === "remove" ? "Take out" : "Add"} ${fix.text}` : "";
}
