import { describe, expect, it } from "vitest";
import { leagueRankKey, rankImprovement } from "./rankMoment";

describe("leagueRankKey", () => {
  it("is per learner", () => {
    expect(leagueRankKey("abc")).toBe("cybernet.leagueRank.abc");
    expect(leagueRankKey("abc")).not.toBe(leagueRankKey("def"));
  });
});

describe("rankImprovement", () => {
  it("celebrates a rise (lower number is better)", () => {
    expect(rankImprovement(5, 2)).toBe(2);
    expect(rankImprovement(2, 1)).toBe(1);
  });

  it("says nothing when the rank is unchanged", () => {
    expect(rankImprovement(3, 3)).toBeNull();
  });

  it("says nothing when the rank dropped", () => {
    expect(rankImprovement(2, 5)).toBeNull();
  });

  it("says nothing without a previous rank (the first finished lesson)", () => {
    expect(rankImprovement(null, 1)).toBeNull();
  });

  it("says nothing when the learner isn't ranked", () => {
    expect(rankImprovement(3, null)).toBeNull();
  });
});
