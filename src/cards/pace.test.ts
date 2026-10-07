import { describe, expect, it } from "vitest";
import { afterAnswer, NO_PACING, nextCardIndex, requiredForLesson, skipEasy } from "./pace";

describe("adaptive pacing", () => {
  const cards = [{}, {}, {}, { pace: "easy" as const }, {}, { pace: "extra" as const }, {}];

  it("skips the easy win after 3 right first time, and only then", () => {
    let s = NO_PACING;
    for (let i = 0; i < 3; i++) s = afterAnswer(s, true);
    expect(skipEasy(s)).toBe(true);
    expect(nextCardIndex(cards, 2, s)).toBe(4);
    const missed = afterAnswer(afterAnswer(afterAnswer(NO_PACING, true), false), true);
    expect(skipEasy(missed)).toBe(false);
    expect(nextCardIndex(cards, 2, missed)).toBe(3);
  });

  it("shows the extra example only straight after a miss", () => {
    expect(nextCardIndex(cards, 4, afterAnswer(NO_PACING, true))).toBe(6);
    expect(nextCardIndex(cards, 4, afterAnswer(NO_PACING, false))).toBe(5);
  });

  it("always shows cards played before, and ends past the last card", () => {
    let s = NO_PACING;
    for (let i = 0; i < 3; i++) s = afterAnswer(s, true);
    expect(nextCardIndex(cards, 2, s, (i) => i === 3)).toBe(3);
    expect(nextCardIndex(cards, 6, s)).toBe(7);
  });

  it("paced cards are never required to finish", () => {
    expect(requiredForLesson({ difficulty: "core" })).toBe(true);
    expect(requiredForLesson({ difficulty: "core", pace: "easy" })).toBe(false);
    expect(requiredForLesson({ difficulty: "challenge" })).toBe(false);
  });
});
