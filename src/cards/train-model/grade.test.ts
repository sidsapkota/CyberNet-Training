import { describe, expect, it } from "vitest";
import { trainModel, trainModelFix, trainModelWords } from "@/test/fixtures";
import {
  describeTrainModelCorrect,
  gradeTrainModel,
  initialTrainModelAnswer,
  isTrainModelReady,
  keepCorrectLabels,
  pickExample,
  problemTest,
  setLabel,
  trainModelGuesses,
} from "./grade";
import { predictNearest, predictWordVote } from "./model";
import { TrainModelCardSchema } from "./schema";

describe("the models", () => {
  it("nearest: takes the closest example's label, or the majority of 3", () => {
    const training = [
      { x: 9, y: 1, label: "apple" },
      { x: 1, y: 9, label: "banana" },
      { x: 2, y: 8, label: "banana" },
    ];
    expect(predictNearest(training, { x: 8, y: 2 }, 1)).toBe("apple");
    expect(predictNearest(training, { x: 8, y: 2 }, 3)).toBe("banana");
  });

  it("word-vote: words vote for their labels; a tie is not sure", () => {
    const training = [
      { text: "win a free prize", label: "spam" },
      { text: "pizza tonight", label: "ok" },
    ];
    expect(predictWordVote(training, "free prize inside")).toBe("spam");
    expect(predictWordVote(training, "free pizza")).toBeNull();
  });
});

describe("label goal", () => {
  const card = trainModel();
  it("starts with nothing chosen and is ready once every example has a label", () => {
    let answer = initialTrainModelAnswer();
    expect(answer).toEqual({ labels: {}, included: [] });
    expect(isTrainModelReady(answer, card)).toBe(false);
    for (const id of ["a1", "a2", "b1", "b3"]) answer = setLabel(answer, id, id.startsWith("a") ? "apple" : "banana");
    expect(isTrainModelReady(answer, card)).toBe(true);
    expect(gradeTrainModel(card, answer).correct).toBe(true);
  });

  it("trained on the true labels it still gets the yellow apple wrong (the lesson)", () => {
    const answer = ["a1", "a2", "b1", "b3"].reduce((a, id) => setLabel(a, id, id.startsWith("a") ? "apple" : "banana"), initialTrainModelAnswer());
    expect(trainModelGuesses(card, answer)).toMatchObject({ t1: "apple", t2: "banana", t3: "banana" });
  });

  it("Try again keeps only the right labels", () => {
    const answer = setLabel(setLabel(initialTrainModelAnswer(), "a1", "apple"), "b1", "apple");
    expect(keepCorrectLabels(card, answer).labels).toEqual({ a1: "apple" });
  });

  it("works for messages too", () => {
    expect(TrainModelCardSchema.safeParse(trainModelWords()).success).toBe(true);
  });
});

describe("fix goal", () => {
  const card = trainModelFix();
  it("leads with the test the model gets wrong", () => {
    expect(problemTest(card).id).toBe("t1");
  });

  it("starts with nothing picked; one pick makes it ready; tapping again takes it away", () => {
    const start = initialTrainModelAnswer();
    expect(isTrainModelReady(start, card)).toBe(false);
    const picked = pickExample(start, "c2");
    expect(picked.included).toEqual(["c2"]);
    expect(isTrainModelReady(picked, card)).toBe(true);
    expect(pickExample(picked, "c2").included).toEqual([]);
    expect(pickExample(picked, "c1").included).toEqual(["c1"]);
  });

  it("is right only when the added example fixes every test", () => {
    expect(gradeTrainModel(card, { labels: {}, included: ["c1"] }).correct).toBe(true);
    expect(gradeTrainModel(card, { labels: {}, included: ["c2"] }).correct).toBe(false);
    expect(gradeTrainModel(card, { labels: {}, included: ["c3"] }).correct).toBe(false);
    // A tampered answer can't add a given example or several at once.
    expect(gradeTrainModel(card, { labels: {}, included: ["a1"] }).correct).toBe(false);
    expect(gradeTrainModel(card, { labels: {}, included: ["c1", "c2"] }).correct).toBe(false);
    expect(describeTrainModelCorrect(card)).toBe("Add Golden apple");
  });

  it("the guess flips when the right example is added", () => {
    expect(trainModelGuesses(card, initialTrainModelAnswer()).t1).toBe("banana");
    expect(trainModelGuesses(card, { labels: {}, included: ["c1"] }).t1).toBe("apple");
  });
});

describe("schema (zero-confusion rule)", () => {
  it("accepts the fixtures", () => {
    expect(TrainModelCardSchema.safeParse(trainModel()).success).toBe(true);
    expect(TrainModelCardSchema.safeParse(trainModelFix()).success).toBe(true);
  });

  it("allows at most 4 examples to act on", () => {
    const base = trainModelFix();
    const extra = [1, 2].map((i) => ({ id: `c${i + 3}`, text: `Red apple ${i}`, x: 9, y: 1, label: "apple", given: false }));
    expect(TrainModelCardSchema.safeParse({ ...base, examples: [...base.examples, ...extra] }).success).toBe(false);
  });

  it("a fix card must be a real choice and solvable", () => {
    const base = trainModelFix();
    const golden = base.examples.find((e) => e.id === "c1")!;
    const onlyFixes = [...base.examples.filter((e) => e.given), golden, { ...golden, id: "c9" }];
    expect(TrainModelCardSchema.safeParse({ ...base, examples: onlyFixes }).success).toBe(false);
    expect(TrainModelCardSchema.safeParse({ ...base, examples: base.examples.filter((e) => e.id !== "c1") }).success).toBe(false);
  });
});
