import { describe, expect, it } from "vitest";
import { multipleChoice } from "@/test/fixtures";
import { gradeUntrusted } from "../grading";
import {
  displayOptions,
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

describe("displayOptions (the order on screen)", () => {
  const card = multipleChoice({ id: "shuffle-me" });

  it("shows every option exactly once, in a different order from the file", () => {
    const shown = displayOptions(card).map((o) => o.id);
    expect([...shown].sort()).toEqual(card.options.map((o) => o.id).sort());
    expect(shown).not.toEqual(card.options.map((o) => o.id));
  });

  it("is the same every time for a card, and differs between cards", () => {
    expect(displayOptions(card)).toEqual(displayOptions(card));
    const orders = new Set(["a", "b", "c", "d", "e", "f"].map((id) => displayOptions(multipleChoice({ id })).map((o) => o.id).join()));
    expect(orders.size).toBeGreaterThan(1);
  });

  it("can't change grading: answers are option ids, checked the same on the server", () => {
    expect(gradeMultipleChoice(card, card.correctOptionId).correct).toBe(true);
    expect(gradeUntrusted(card, card.correctOptionId)).toBe(true);
    for (const option of displayOptions(card)) {
      expect(gradeUntrusted(card, option.id)).toBe(option.id === card.correctOptionId);
    }
  });
});

