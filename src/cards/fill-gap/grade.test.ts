import { describe, expect, it } from "vitest";
import { describeFillGapCorrect, filled, gapOptions, gradeFillGap } from "./grade";
import { type FillGapCard, FillGapCardSchema } from "./schema";

const card: FillGapCard = {
  id: "desk-or-cupboard",
  type: "fill_gap",
  difficulty: "core",
  prompt: "Open apps live in ___ while you use them.",
  options: [
    { id: "ram", text: "RAM" },
    { id: "storage", text: "storage", nudge: "Storage keeps files for later; open apps need fast space now." },
    { id: "battery", text: "the battery" },
  ],
  correctOptionId: "ram",
  explanation: "RAM is the fast desk for what you're using now.",
};

describe("fill_gap", () => {
  it("is right only for the correct word", () => {
    expect(gradeFillGap(card, "ram").correct).toBe(true);
    expect(gradeFillGap(card, "storage").correct).toBe(false);
    expect(gradeFillGap(card, null).correct).toBe(false);
  });

  it("fills the sentence", () => {
    expect(filled(card, "storage")).toBe("Open apps live in storage while you use them.");
    expect(describeFillGapCorrect(card)).toBe("Open apps live in RAM while you use them.");
  });

  it("shows the words in a stable shuffle", () => {
    expect(gapOptions(card)).toEqual(gapOptions(card));
    expect(gapOptions(card).map((o) => o.id).sort()).toEqual(["battery", "ram", "storage"]);
  });

  it("needs exactly one gap and a valid right word", () => {
    expect(FillGapCardSchema.safeParse(card).success).toBe(true);
    expect(FillGapCardSchema.safeParse({ ...card, prompt: "No gap here." }).success).toBe(false);
    expect(FillGapCardSchema.safeParse({ ...card, prompt: "___ and ___" }).success).toBe(false);
    expect(FillGapCardSchema.safeParse({ ...card, correctOptionId: "nope" }).success).toBe(false);
  });
});
