import { describe, expect, it } from "vitest";
import { describeTrueFalseAnswer, describeTrueFalseCorrect, gradeTrueFalse } from "./grade";
import type { TrueFalseCard } from "./schema";

const card: TrueFalseCard = {
  id: "ram-forgets",
  type: "true_false",
  difficulty: "core",
  prompt: "RAM keeps your files when the power goes off.",
  answer: false,
  explanation: "RAM forgets when the power goes off; storage keeps files.",
};

describe("true_false", () => {
  it("is right only for the matching pick", () => {
    expect(gradeTrueFalse(card, false).correct).toBe(true);
    expect(gradeTrueFalse(card, true).correct).toBe(false);
    expect(gradeTrueFalse(card, null).correct).toBe(false);
    expect(gradeTrueFalse(card, "false" as never).correct).toBe(false);
  });

  it("describes answers in words", () => {
    expect(describeTrueFalseAnswer(card, true)).toBe("True");
    expect(describeTrueFalseCorrect(card)).toBe("False");
  });
});
