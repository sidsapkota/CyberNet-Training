import { describe, expect, it } from "vitest";
import { dragToOrder } from "@/test/fixtures";
import { describeDragToOrderAnswer, describeDragToOrderCorrect, gradeDragToOrder } from "./grade";
import { seededShuffle } from "../shared/shuffle";

describe("gradeDragToOrder", () => {
  const card = dragToOrder();

  it("is correct only in the authored order", () => {
    expect(gradeDragToOrder(card, ["a", "b", "c"])).toEqual({ correct: true });
  });

  it("is incorrect for any other order", () => {
    expect(gradeDragToOrder(card, ["b", "a", "c"])).toEqual({ correct: false });
    expect(gradeDragToOrder(card, ["c", "b", "a"])).toEqual({ correct: false });
  });

  it("is incorrect when items are missing or extra", () => {
    expect(gradeDragToOrder(card, ["a", "b"])).toEqual({ correct: false });
    expect(gradeDragToOrder(card, ["a", "b", "c", "d"])).toEqual({ correct: false });
    expect(gradeDragToOrder(card, [])).toEqual({ correct: false });
  });
});

describe("describeDragToOrder*", () => {
  const card = dragToOrder();

  it("lists labels in the learner's order", () => {
    expect(describeDragToOrderAnswer(card, ["c", "a", "b"])).toBe("00000100 → 00000001 → 00000010");
  });

  it("lists labels in the correct order", () => {
    expect(describeDragToOrderCorrect(card)).toBe("00000001 → 00000010 → 00000100");
  });
});

describe("seededShuffle", () => {
  const ids = ["a", "b", "c", "d", "e"];

  it("returns a permutation of the input", () => {
    const shuffled = seededShuffle(ids, "seed");
    expect([...shuffled].sort()).toEqual([...ids].sort());
  });

  it("is deterministic for the same seed", () => {
    expect(seededShuffle(ids, "card-1")).toEqual(seededShuffle(ids, "card-1"));
  });

  it("never returns the original order", () => {
    for (let i = 0; i < 500; i++) {
      for (const list of [ids.slice(0, 2), ids.slice(0, 3), ids]) {
        expect(seededShuffle(list, `seed-${i}`)).not.toEqual(list);
      }
    }
  });

  it("does not mutate the input", () => {
    const input = [...ids];
    seededShuffle(input, "x");
    expect(input).toEqual(ids);
  });

  it("leaves 0 or 1 items alone", () => {
    expect(seededShuffle([], "x")).toEqual([]);
    expect(seededShuffle(["only"], "x")).toEqual(["only"]);
  });
});
