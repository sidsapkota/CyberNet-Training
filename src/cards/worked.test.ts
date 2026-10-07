import { describe, expect, it } from "vitest";
import { getCardDefinition } from "./registry";
import { CardSchema } from "./schema";

const binary = (worked: unknown) => ({ id: "b", type: "binary_toggle", difficulty: "core", prompt: "Make 42.", explanation: "32 + 8 + 2.", target: 42, worked });

describe("worked examples", () => {
  it("lock only place values that are part of the target", () => {
    expect(CardSchema.safeParse(binary({ steps: ["32 fits, switch it on."], locked: [32] })).success).toBe(true);
    expect(CardSchema.safeParse(binary({ steps: ["x"], locked: [16] })).success).toBe(false); // 42 has no 16
    expect(CardSchema.safeParse(binary({ steps: ["x"], locked: [3] })).success).toBe(false); // not a place value
    expect(CardSchema.safeParse(binary({ steps: [], locked: [] })).success).toBe(false); // needs a step
  });

  it("start with the locked bits on, and the solved card is right as it stands", () => {
    const solved = CardSchema.parse(binary({ steps: ["32 + 8 + 2 = 42."], locked: [32, 8, 2] }));
    const definition = getCardDefinition(solved);
    if (!definition.interactive) throw new Error("interactive");
    const start = definition.initialAnswer(solved) as boolean[];
    expect(start.filter(Boolean).length).toBe(3);
    expect(definition.grade(solved, start).correct).toBe(true);
  });

  it("number cards can start filled in", () => {
    const card = CardSchema.parse({ id: "n", type: "numeric_input", difficulty: "core", prompt: "p", explanation: "e", answer: 255, worked: { steps: ["128+64+32+16+8+4+2+1"], prefill: "255" } });
    const definition = getCardDefinition(card);
    if (!definition.interactive) throw new Error("interactive");
    expect(definition.initialAnswer(card)).toBe("255");
  });
});
