import { describe, expect, it } from "vitest";
import {
  binaryToggle,
  dragToOrder,
  explainer,
  matchPairs,
  multipleChoice,
  numericInput,
  packetPath,
  terminal,
} from "@/test/fixtures";
import { BinaryToggleCardSchema } from "./binary-toggle/schema";
import { DragToOrderCardSchema } from "./drag-to-order/schema";
import { ExplainerCardSchema } from "./explainer/schema";
import { MultipleChoiceCardSchema } from "./multiple-choice/schema";
import { CardSchema, isInteractiveCard } from "./schema";

function messages(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues.map((i) => i.message) ?? [];
}

describe("card base fields", () => {
  it("requires a kebab-case id", () => {
    expect(CardSchema.safeParse(explainer({ id: "Not Kebab" })).success).toBe(false);
    expect(CardSchema.safeParse(explainer({ id: "trailing-" })).success).toBe(false);
    expect(CardSchema.safeParse(explainer({ id: "ok-id-2" })).success).toBe(true);
  });

  it("requires difficulty to be core or challenge", () => {
    const withoutDifficulty: Record<string, unknown> = { ...explainer() };
    delete withoutDifficulty.difficulty;
    expect(CardSchema.safeParse(withoutDifficulty).success).toBe(false);
    expect(CardSchema.safeParse({ ...explainer(), difficulty: "hard" }).success).toBe(false);
    expect(CardSchema.safeParse(explainer({ difficulty: "challenge" })).success).toBe(true);
  });
});

describe("CardSchema (discriminated union)", () => {
  it("accepts every card type", () => {
    for (const card of [
      explainer(),
      multipleChoice(),
      dragToOrder(),
      binaryToggle(),
      numericInput(),
      matchPairs(),
      packetPath(),
      terminal(),
    ]) {
      expect(CardSchema.safeParse(card).success).toBe(true);
    }
  });

  it("rejects an unknown type", () => {
    expect(CardSchema.safeParse({ ...explainer(), type: "video" }).success).toBe(false);
  });

  it("rejects fields belonging to a different type", () => {
    // A multiple_choice card missing its options is invalid even with explainer fields present.
    expect(CardSchema.safeParse({ ...explainer(), type: "multiple_choice" }).success).toBe(false);
  });

  it("identifies interactive cards", () => {
    expect(isInteractiveCard(explainer())).toBe(false);
    expect(isInteractiveCard(multipleChoice())).toBe(true);
    expect(isInteractiveCard(dragToOrder())).toBe(true);
    expect(isInteractiveCard(binaryToggle())).toBe(true);
    for (const card of [numericInput(), matchPairs(), packetPath(), terminal()]) {
      expect(isInteractiveCard(card)).toBe(true);
    }
  });
});

describe("ExplainerCardSchema", () => {
  it("accepts an optional image with dimensions", () => {
    const card = explainer({ image: { src: "/a.svg", alt: "An image", width: 10, height: 10 } });
    expect(ExplainerCardSchema.safeParse(card).success).toBe(true);
  });

  it("rejects an image without alt text or with a relative src", () => {
    expect(
      ExplainerCardSchema.safeParse(explainer({ image: { src: "/a.svg", alt: "", width: 1, height: 1 } }))
        .success,
    ).toBe(false);
    expect(
      ExplainerCardSchema.safeParse(explainer({ image: { src: "a.svg", alt: "x", width: 1, height: 1 } }))
        .success,
    ).toBe(false);
  });

  it("rejects an empty body", () => {
    expect(ExplainerCardSchema.safeParse(explainer({ body: "   " })).success).toBe(false);
  });
});

describe("MultipleChoiceCardSchema", () => {
  it("requires 2 to 5 options", () => {
    const one = multipleChoice({ options: [{ id: "two", text: "2" }] });
    expect(messages(MultipleChoiceCardSchema.safeParse(one))).toContain("needs at least 2 options");

    const six = multipleChoice({
      options: ["a", "b", "c", "d", "e", "two"].map((id) => ({ id, text: id })),
    });
    expect(messages(MultipleChoiceCardSchema.safeParse(six))).toContain("allows at most 5 options");
  });

  it("requires correctOptionId to match an option", () => {
    const result = MultipleChoiceCardSchema.safeParse(multipleChoice({ correctOptionId: "nine" }));
    expect(messages(result)).toContain("correctOptionId must match one of the option ids");
  });

  it("requires unique option ids", () => {
    const result = MultipleChoiceCardSchema.safeParse(
      multipleChoice({
        options: [
          { id: "two", text: "2" },
          { id: "two", text: "also 2" },
        ],
      }),
    );
    expect(messages(result)).toContain("option ids must be unique");
  });

  it("requires a prompt and an explanation", () => {
    expect(MultipleChoiceCardSchema.safeParse(multipleChoice({ prompt: "" })).success).toBe(false);
    expect(MultipleChoiceCardSchema.safeParse(multipleChoice({ explanation: "" })).success).toBe(false);
  });
});

describe("DragToOrderCardSchema", () => {
  it("requires 3 to 7 items", () => {
    const two = dragToOrder({ items: [{ id: "a", label: "A" }, { id: "b", label: "B" }] });
    expect(messages(DragToOrderCardSchema.safeParse(two))).toContain("needs at least 3 items");

    const eight = dragToOrder({
      items: Array.from({ length: 8 }, (_, i) => ({ id: `i${i}`, label: `${i}` })),
    });
    expect(messages(DragToOrderCardSchema.safeParse(eight))).toContain("allows at most 7 items");
  });

  it("requires unique item ids", () => {
    const result = DragToOrderCardSchema.safeParse(
      dragToOrder({
        items: [
          { id: "a", label: "A" },
          { id: "a", label: "B" },
          { id: "c", label: "C" },
        ],
      }),
    );
    expect(messages(result)).toContain("item ids must be unique");
  });
});

describe("BinaryToggleCardSchema", () => {
  it.each([0, 1, 128, 255])("accepts target %i", (target) => {
    expect(BinaryToggleCardSchema.safeParse(binaryToggle({ target })).success).toBe(true);
  });

  it.each([-1, 256, 3.5])("rejects target %s", (target) => {
    expect(BinaryToggleCardSchema.safeParse(binaryToggle({ target })).success).toBe(false);
  });
});
