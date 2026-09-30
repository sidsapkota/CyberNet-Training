import { describe, expect, it } from "vitest";
import { matchPairs } from "@/test/fixtures";
import {
  connect,
  describeMatchPairsAnswer,
  describeMatchPairsCorrect,
  disconnect,
  gradeMatchPairs,
  isMatchPairsReady,
  pairResults,
  rightColumnOrder,
} from "./grade";
import { MatchPairsCardSchema } from "./schema";

const all = { http: "http", https: "https", dns: "dns" };

describe("gradeMatchPairs", () => {
  const card = matchPairs();

  it("is correct when every pair is connected to its own match", () => {
    expect(gradeMatchPairs(card, all)).toEqual({ correct: true });
  });

  it("is incorrect when any pair is swapped", () => {
    expect(gradeMatchPairs(card, { http: "https", https: "http", dns: "dns" })).toEqual({ correct: false });
  });

  it("is incorrect when a pair is missing", () => {
    expect(gradeMatchPairs(card, { http: "http", https: "https" })).toEqual({ correct: false });
  });
});

describe("pairResults", () => {
  it("reports which connections are wrong, in left order", () => {
    expect(pairResults(matchPairs(), { http: "https", https: "http", dns: "dns" })).toEqual([
      { leftId: "http", rightId: "https", correct: false },
      { leftId: "https", rightId: "http", correct: false },
      { leftId: "dns", rightId: "dns", correct: true },
    ]);
  });

  it("marks unconnected items as not correct", () => {
    expect(pairResults(matchPairs(), {})[0]).toEqual({ leftId: "http", rightId: null, correct: false });
  });
});

describe("connect / disconnect", () => {
  it("replaces an existing link on either side", () => {
    const start = { http: "http", https: "https" };
    // Connecting dns to http's right item takes it away from http.
    expect(connect(start, "dns", "http")).toEqual({ https: "https", dns: "http" });
    // Reconnecting http elsewhere drops its old link.
    expect(connect(start, "http", "dns")).toEqual({ https: "https", http: "dns" });
  });

  it("does not mutate the input", () => {
    const start = { http: "http" };
    connect(start, "dns", "dns");
    disconnect(start, "http");
    expect(start).toEqual({ http: "http" });
  });

  it("disconnects a left item", () => {
    expect(disconnect(all, "dns")).toEqual({ http: "http", https: "https" });
  });
});

describe("isMatchPairsReady", () => {
  it("needs every left item connected", () => {
    const card = matchPairs();
    expect(isMatchPairsReady({ http: "http", https: "https" }, card)).toBe(false);
    expect(isMatchPairsReady(all, card)).toBe(true);
  });
});

describe("rightColumnOrder", () => {
  it("is a deterministic permutation that never matches the left order", () => {
    const card = matchPairs();
    const order = rightColumnOrder(card);
    expect([...order].sort()).toEqual(["dns", "http", "https"]);
    expect(order).not.toEqual(["http", "https", "dns"]);
    expect(rightColumnOrder(card)).toEqual(order);
  });
});

describe("describe*", () => {
  it("describes answers without backticks", () => {
    const card = matchPairs();
    expect(describeMatchPairsAnswer(card, { http: "https", dns: "dns" })).toBe("HTTP → 443; HTTPS → (no match); DNS → 53");
    expect(describeMatchPairsCorrect(card)).toBe("HTTP → 80; HTTPS → 443; DNS → 53");
  });
});

describe("MatchPairsCardSchema", () => {
  it("accepts 3 to 6 pairs", () => {
    expect(MatchPairsCardSchema.safeParse(matchPairs()).success).toBe(true);
    const two = matchPairs({ pairs: matchPairs().pairs.slice(0, 2) });
    expect(MatchPairsCardSchema.safeParse(two).success).toBe(false);
    const seven = matchPairs({
      pairs: Array.from({ length: 7 }, (_, i) => ({ id: `p${i}`, left: `L${i}`, right: `R${i}` })),
    });
    expect(MatchPairsCardSchema.safeParse(seven).success).toBe(false);
  });

  it("rejects duplicate ids and duplicate texts on either side", () => {
    const [a, b, c] = matchPairs().pairs as [
      { id: string; left: string; right: string },
      { id: string; left: string; right: string },
      { id: string; left: string; right: string },
    ];
    expect(MatchPairsCardSchema.safeParse(matchPairs({ pairs: [a, { ...b, id: a.id }, c] })).success).toBe(false);
    expect(MatchPairsCardSchema.safeParse(matchPairs({ pairs: [a, { ...b, left: a.left }, c] })).success).toBe(false);
    expect(MatchPairsCardSchema.safeParse(matchPairs({ pairs: [a, { ...b, right: a.right }, c] })).success).toBe(false);
  });
});
