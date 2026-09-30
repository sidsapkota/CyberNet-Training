import { describe, expect, it } from "vitest";
import { CardSchema } from "@/cards/schema";
import { CARD_SAMPLES } from "./card-samples";

describe("dev card samples", () => {
  it("covers every card type", () => {
    const types = new Set(CARD_SAMPLES.map((c) => c.type));
    for (const option of CardSchema.options) expect(types).toContain(option.shape.type.value);
  });

  it("uses unique ids", () => {
    expect(new Set(CARD_SAMPLES.map((c) => c.id)).size).toBe(CARD_SAMPLES.length);
  });
});
