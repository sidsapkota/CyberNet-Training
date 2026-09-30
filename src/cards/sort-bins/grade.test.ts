import { describe, expect, it } from "vitest";
import { sortBins } from "@/test/fixtures";
import {
  describeSortBinsAnswer,
  describeSortBinsCorrect,
  gradeSortBins,
  isSortBinsReady,
  keepCorrect,
  placeItem,
  trayOrder,
  unplaceItem,
} from "./grade";
import { SortBinsCardSchema } from "./schema";

const card = sortBins();
const all = { a: "ram", b: "storage", c: "ram", d: "storage" };

describe("sort_bins grading", () => {
  it("is correct only when every item is in its bin", () => {
    expect(gradeSortBins(card, all).correct).toBe(true);
    expect(gradeSortBins(card, { ...all, d: "ram" }).correct).toBe(false);
    expect(gradeSortBins(card, { a: "ram" }).correct).toBe(false);
  });

  it("is ready once every item is placed", () => {
    expect(isSortBinsReady({ a: "ram", b: "storage", c: "ram" }, card)).toBe(false);
    expect(isSortBinsReady(all, card)).toBe(true);
  });

  it("places, moves and removes items", () => {
    let answer = placeItem({}, "a", "storage");
    answer = placeItem(answer, "a", "ram");
    expect(answer).toEqual({ a: "ram" });
    expect(unplaceItem(answer, "a")).toEqual({});
  });

  it("sends only wrong items back to the tray after Try again", () => {
    expect(keepCorrect(card, { a: "storage", b: "storage", c: "ram" })).toEqual({ b: "storage", c: "ram" });
  });

  it("treats malformed answers as wrong", () => {
    expect(gradeSortBins(card, null as never).correct).toBe(false);
  });

  it("shuffles the tray stably", () => {
    expect(trayOrder(card).map((i) => i.id).sort()).toEqual(["a", "b", "c", "d"]);
    expect(trayOrder(card)).toEqual(trayOrder(card));
  });

  it("describes answers per bin", () => {
    expect(describeSortBinsCorrect(card)).toBe("RAM: Open game, Unsaved essay · Storage: Saved photos, Installed apps");
    expect(describeSortBinsAnswer(card, { a: "storage" })).toBe("RAM: nothing · Storage: Open game");
  });
});

describe("SortBinsCardSchema", () => {
  const messages = (c: unknown) => SortBinsCardSchema.safeParse(c).error?.issues.map((i) => i.message) ?? [];

  it("needs 2 to 3 bins and 4 to 10 items", () => {
    expect(messages(sortBins({ bins: [{ id: "ram", label: "RAM" }] }))).toContain("needs at least 2 bins");
    expect(messages(sortBins({ items: card.items.slice(0, 3) }))).toContain("needs at least 4 items");
  });

  it("checks every item's bin exists and every bin gets an item", () => {
    expect(messages(sortBins({ items: [...card.items.slice(0, 3), { id: "d", label: "X", bin: "cloud" }] }))).toContain(
      '"cloud" isn\'t one of the bins',
    );
    expect(
      messages(sortBins({ bins: [...card.bins, { id: "cloud", label: "Cloud" }] })),
    ).toContain('bin "cloud" has no items');
  });
});
