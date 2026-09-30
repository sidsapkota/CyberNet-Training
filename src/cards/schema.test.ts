import { describe, expect, it } from "vitest";
import {
  binaryToggle,
  dragToOrder,
  explainer,
  hotspot,
  matchPairs,
  multipleChoice,
  numericInput,
  packetPath,
  photo,
  scenario,
  simulator,
  sortBins,
  teardown,
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
      hotspot(),
      teardown(),
      simulator(),
      scenario(),
      sortBins(),
    ]) {
      expect(CardSchema.safeParse(card).success, card.type).toBe(true);
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
  it("allows nudges on wrong options only", () => {
    const base = multipleChoice();
    const wrong = base.options.find((o) => o.id !== base.correctOptionId)!;
    const withWrongNudge = { ...base, options: base.options.map((o) => (o.id === wrong.id ? { ...o, nudge: "Not quite this idea." } : o)) };
    expect(MultipleChoiceCardSchema.safeParse(withWrongNudge).success).toBe(true);
    const withRightNudge = { ...base, options: base.options.map((o) => (o.id === base.correctOptionId ? { ...o, nudge: "Hmm" } : o)) };
    expect(messages(MultipleChoiceCardSchema.safeParse(withRightNudge))).toContain(
      "the correct option can't have a nudge (nudges are for wrong answers)",
    );
  });
});

describe("hints and nudges (every interactive card)", () => {
  it("are optional, but can't be empty or too long", () => {
    expect(CardSchema.safeParse(numericInput({ hint: "Divide first.", nudge: "Check which number you divided by." })).success).toBe(true);
    expect(CardSchema.safeParse(numericInput({ hint: "" })).success).toBe(false);
    expect(CardSchema.safeParse(numericInput({ hint: "x".repeat(301) })).success).toBe(false);
    expect(CardSchema.safeParse(numericInput({ nudge: "x".repeat(221) })).success).toBe(false);
  });
});

describe("PacketPathCardSchema: nodes that are down", () => {
  it("never lets a valid route go through a node that's down", () => {
    const card = packetPath();
    const downB = { ...card, nodes: card.nodes.map((n) => (n.id === "b" ? { ...n, down: true } : n)) };
    expect(messages(CardSchema.safeParse(downB))).toContain("a valid path can't go through a node that's down");
    expect(
      CardSchema.safeParse({ ...downB, validPaths: [["laptop", "home", "a", "server"]] }).success,
    ).toBe(true);
    const downStart = { ...card, nodes: card.nodes.map((n) => (n.id === "laptop" ? { ...n, down: true } : n)) };
    expect(messages(CardSchema.safeParse(downStart))).toContain("the source can't be down");
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

describe("photo cards", () => {
  const valid = photo();

  it("accepts a credited photo with an allowed licence", () => {
    expect(CardSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects NonCommercial and NoDerivatives licences", () => {
    for (const licence of ["CC BY-NC 4.0", "CC BY-ND 4.0", "CC BY-NC-SA 4.0", "All rights reserved"]) {
      expect(CardSchema.safeParse({ ...valid, credit: { ...valid.credit, licence } }).success, licence).toBe(false);
    }
  });

  it("requires an author, a licence link and a Wikimedia Commons source", () => {
    expect(CardSchema.safeParse({ ...valid, credit: { ...valid.credit, author: undefined } }).success).toBe(false);
    expect(CardSchema.safeParse({ ...valid, credit: { ...valid.credit, sourceUrl: "https://example.com/photo.jpg" } }).success).toBe(false);
    expect(CardSchema.safeParse({ ...valid, credit: undefined }).success).toBe(false);
  });

  it("only uses files from /public/photos", () => {
    expect(CardSchema.safeParse({ ...valid, photo: { ...valid.photo, src: "https://example.com/x.jpg" } }).success).toBe(false);
  });

  it("isn't graded", () => {
    expect(isInteractiveCard(valid)).toBe(false);
  });
});
