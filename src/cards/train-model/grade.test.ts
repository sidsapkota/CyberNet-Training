import { describe, expect, it } from "vitest";
import { trainModel, trainModelWords } from "@/test/fixtures";
import {
  describeTrainModelAnswer,
  describeTrainModelCorrect,
  gradeTrainModel,
  initialTrainModelAnswer,
  isTrainModelReady,
  keepCorrectLabels,
  setLabel,
  toggleIncluded,
  trainModelGuesses,
} from "./grade";
import { predictNearest, predictWordVote, subsetsOf, wordsOf } from "./model";
import { TrainModelCardSchema } from "./schema";

const fruit = TrainModelCardSchema.parse(trainModel());
const messages = TrainModelCardSchema.parse(trainModelWords());
const trueLabels = { a1: "apple", a2: "apple", b1: "banana", b3: "banana" };

/** The fruit card with a golden apple to choose, and the goal of getting every test right. */
const fruitInclude = TrainModelCardSchema.parse(
  trainModel({
    id: "fruit-include",
    examples: [...trainModel().examples, { id: "g1", text: "Golden apple", x: 8, y: 9, label: "apple", given: false }],
    task: { goal: "include", start: ["a1", "a2", "a3", "b1", "b2", "b3"] },
  }),
);

describe("the nearest model", () => {
  const training = [
    { x: 0, y: 0, label: "a" },
    { x: 10, y: 10, label: "b" },
    { x: 9, y: 9, label: "b" },
  ];

  it("takes the nearest point's label (k = 1)", () => {
    expect(predictNearest(training, { x: 1, y: 1 }, 1)).toBe("a");
    expect(predictNearest(training, { x: 8, y: 8 }, 1)).toBe("b");
  });

  it("takes the majority of the 3 nearest (k = 3), even when the nearest one disagrees", () => {
    expect(predictNearest(training, { x: 2, y: 2 }, 3)).toBe("b");
  });

  it("lets the nearest decide when three labels all differ, and breaks distance ties by order", () => {
    const three = [
      { x: 5, y: 5, label: "c" },
      { x: 0, y: 0, label: "a" },
      { x: 10, y: 10, label: "b" },
    ];
    expect(predictNearest(three, { x: 4, y: 4 }, 3)).toBe("c");
    expect(predictNearest([{ x: 0, y: 1, label: "first" }, { x: 1, y: 0, label: "second" }], { x: 0, y: 0 }, 1)).toBe("first");
  });

  it("is not sure with nothing to learn from", () => {
    expect(predictNearest([], { x: 1, y: 1 }, 1)).toBeNull();
  });
});

describe("the word-vote model", () => {
  it("uses each lower-case word of 3+ letters once", () => {
    expect(wordsOf("FREE free pizza at 5pm, ok?")).toEqual(["free", "pizza"]);
  });

  it("lets each word vote for the labels it was seen with", () => {
    const training = [
      { text: "free prize", label: "spam" },
      { text: "free phone", label: "spam" },
      { text: "pizza tonight", label: "ok" },
    ];
    expect(predictWordVote(training, "free pizza")).toBe("spam"); // free: 2, pizza: 1
    expect(predictWordVote(training, "pizza tonight")).toBe("ok");
  });

  it("is not sure on a tie, or with no words in common", () => {
    expect(predictWordVote([{ text: "free", label: "spam" }, { text: "pizza", label: "ok" }], "free pizza")).toBeNull();
    expect(predictWordVote([{ text: "free", label: "spam" }], "hello there")).toBeNull();
  });
});

describe("train_model cards: label goal", () => {
  it("is ready once every example that isn't given has a label", () => {
    let answer = initialTrainModelAnswer(fruit);
    expect(isTrainModelReady(answer, fruit)).toBe(false);
    for (const [id, label] of Object.entries(trueLabels)) answer = setLabel(answer, id, label);
    expect(isTrainModelReady(answer, fruit)).toBe(true);
  });

  it("is graded on the labels only, never on the model's guesses", () => {
    const answer = { labels: trueLabels, included: [] };
    expect(gradeTrainModel(fruit, answer).correct).toBe(true);
    // Correct labels, yet the model still calls the yellow apple a banana: that's the lesson.
    expect(trainModelGuesses(fruit, answer)).toEqual({ t1: "apple", t2: "banana", t3: "banana" });
    expect(gradeTrainModel(fruit, { labels: { ...trueLabels, a2: "banana" }, included: [] }).correct).toBe(false);
  });

  it("trains on the learner's labels, so wrong labels change the guesses", () => {
    const flipped = { labels: { a1: "banana", a2: "banana", b1: "apple", b3: "apple" }, included: [] };
    expect(trainModelGuesses(fruit, flipped).t1).toBe("banana");
  });

  it("clears only the wrong labels for Try again", () => {
    expect(keepCorrectLabels(fruit, { labels: { ...trueLabels, a2: "banana" }, included: [] }).labels).toEqual({
      a1: "apple",
      b1: "banana",
      b3: "banana",
    });
  });

  it("works on messages: the friendly message with \"free\" is called spam", () => {
    const labels = { m1: "spam", m2: "spam", m4: "ok", m5: "ok" };
    expect(gradeTrainModel(messages, { labels, included: [] }).correct).toBe(true);
    expect(trainModelGuesses(messages, { labels, included: [] })).toEqual({ t1: "spam", t2: "spam" });
  });

  it("describes answers for the quiz review", () => {
    expect(describeTrainModelAnswer(fruit, { labels: { a1: "banana" }, included: [] })).toBe(
      "Red apple: Banana · Small red apple: nothing · Banana: nothing · Spotty banana: nothing",
    );
    expect(describeTrainModelCorrect(fruit)).toBe("Red apple: Apple · Small red apple: Apple · Banana: Banana · Spotty banana: Banana");
  });

  it("refuses malformed answers instead of throwing", () => {
    expect(gradeTrainModel(fruit, null as never).correct).toBe(false);
    expect(gradeTrainModel(fruit, { labels: "x" } as never).correct).toBe(false);
  });
});

describe("train_model cards: include goal", () => {
  it("starts with the card's examples chosen, and isn't ready until that changes", () => {
    const start = initialTrainModelAnswer(fruitInclude);
    expect(start.included).toEqual(["a1", "a2", "a3", "b1", "b2", "b3"]);
    expect(isTrainModelReady(start, fruitInclude)).toBe(false);
    expect(isTrainModelReady(toggleIncluded(fruitInclude, start, "g1"), fruitInclude)).toBe(true);
  });

  it("is correct when the model, trained on the chosen examples, gets every test right", () => {
    const start = initialTrainModelAnswer(fruitInclude);
    expect(gradeTrainModel(fruitInclude, start).correct).toBe(false);
    const withGolden = toggleIncluded(fruitInclude, start, "g1");
    expect(withGolden.included.at(-1)).toBe("g1");
    expect(gradeTrainModel(fruitInclude, withGolden).correct).toBe(true);
    expect(gradeTrainModel(fruitInclude, { labels: {}, included: [] }).correct).toBe(false);
    expect(gradeTrainModel(fruitInclude, { labels: {}, included: ["not-an-example"] }).correct).toBe(false);
    // Training on apples alone calls everything an apple: the banana test fails.
    expect(gradeTrainModel(fruitInclude, { labels: {}, included: ["a1", "g1"] }).correct).toBe(false);
  });

  it("describes the closest working choice as changes from the start", () => {
    expect(describeTrainModelCorrect(fruitInclude)).toBe("Add Golden apple");
  });

  it("lists every subset, smallest first", () => {
    expect(subsetsOf(["a", "b", "c"])).toEqual([["a"], ["b"], ["c"], ["a", "b"], ["a", "c"], ["b", "c"], ["a", "b", "c"]]);
  });
});

describe("train_model schema", () => {
  const problems = (card: unknown) => {
    const result = TrainModelCardSchema.safeParse(card);
    return result.success ? [] : result.error.issues.map((i) => i.message);
  };

  it("accepts the fixtures", () => {
    expect(problems(trainModel())).toEqual([]);
    expect(problems(trainModelWords())).toEqual([]);
    expect(problems(fruitInclude)).toEqual([]);
  });

  it("requires the model to make at least one mistake (and get one right)", () => {
    const fixed = trainModel({ tests: trainModel().tests.slice(0, 2) });
    expect(problems(fixed).join()).toMatch(/at least 1 test wrong/);
    const useless = trainModel({ tests: [trainModel().tests[2]!] });
    expect(problems(useless).join()).toMatch(/at least 1 test right/);
  });

  it("requires include cards to start unsolved and be solvable", () => {
    const solved = { ...fruitInclude, task: { goal: "include", start: ["a1", "a2", "a3", "b1", "b2", "b3", "g1"] } };
    expect(problems(solved).join()).toMatch(/must start unsolved/);
    const unsolvable = { ...fruitInclude, examples: trainModel().examples, task: { goal: "include", start: ["a1"] } };
    expect(problems(unsolvable).join()).toMatch(/can't be solved/);
  });

  it("checks labels, ids and positions", () => {
    expect(problems(trainModel({ examples: [...trainModel().examples.slice(1), { ...trainModel().examples[0]!, label: "pear" }] })).join()).toMatch(
      /"pear" isn't one of the labels/,
    );
    expect(problems(trainModel({ tests: [{ id: "a1", text: "Clash", x: 1, y: 1, truth: "apple" }] })).join()).toMatch(/must be unique/);
    expect(problems({ ...trainModelWords(), examples: [{ ...trainModelWords().examples[0]!, x: 1, y: 1 }, ...trainModelWords().examples.slice(1)] }).join()).toMatch(
      /don't take x or y/,
    );
    const noX = { ...trainModel().examples[0]!, x: undefined };
    expect(problems(trainModel({ examples: [noX as never, ...trainModel().examples.slice(1)] })).join()).toMatch(/needs x and y/);
  });

  it("needs something to label in a label card", () => {
    expect(problems(trainModel({ examples: trainModel().examples.map((e) => ({ ...e, given: true })) })).join()).toMatch(/at least 1 example to label/);
  });
});
