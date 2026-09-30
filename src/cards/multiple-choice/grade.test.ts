import { describe, expect, it } from "vitest";
import { multipleChoice } from "@/test/fixtures";
import {
  describeMultipleChoiceAnswer,
  describeMultipleChoiceCorrect,
  gradeMultipleChoice,
} from "./grade";

describe("gradeMultipleChoice", () => {
  const card = multipleChoice();

  it("marks the correct option as correct", () => {
    expect(gradeMultipleChoice(card, "two")).toEqual({ correct: true });
  });

  it("marks any other option as incorrect", () => {
    expect(gradeMultipleChoice(card, "one")).toEqual({ correct: false });
    expect(gradeMultipleChoice(card, "ten")).toEqual({ correct: false });
  });

  it("marks no answer as incorrect", () => {
    expect(gradeMultipleChoice(card, null)).toEqual({ correct: false });
  });

  it("marks an unknown option id as incorrect", () => {
    expect(gradeMultipleChoice(card, "does-not-exist")).toEqual({ correct: false });
  });
});

describe("describeMultipleChoice*", () => {
  const card = multipleChoice();

  it("describes the chosen option by its text", () => {
    expect(describeMultipleChoiceAnswer(card, "ten")).toBe("10");
  });

  it("handles no answer", () => {
    expect(describeMultipleChoiceAnswer(card, null)).toBe("No answer");
  });

  it("describes the correct answer", () => {
    expect(describeMultipleChoiceCorrect(card)).toBe("2");
  });
});
