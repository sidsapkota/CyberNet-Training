import { describe, expect, it } from "vitest";
import { cappedMs, CardPlaySchema, cardStats, MAX_MS, mostFailed, slowest } from "./cardPlays";

const play = (card: string, ms: number, first_try: boolean) => ({ lesson_id: "l", card_id: card, ms, first_try });

describe("card measurements", () => {
  it("accept only content-shaped ids and nothing personal", () => {
    expect(CardPlaySchema.safeParse({ lessonId: "strong-passwords", cardId: "make-5", ms: 1200, firstTry: true }).success).toBe(true);
    expect(CardPlaySchema.safeParse({ lessonId: "Strong Passwords!", cardId: "x", ms: 1, firstTry: true }).success).toBe(false);
    expect(Object.keys(CardPlaySchema.shape)).toEqual(["lessonId", "cardId", "ms", "firstTry", "quiz"]);
  });

  it("caps silly times", () => {
    expect(cappedMs(-5)).toBe(0);
    expect(cappedMs(MAX_MS * 3)).toBe(MAX_MS);
  });

  it("works out medians and first-try rates, leaving out cards with few plays", () => {
    const stats = cardStats([play("a", 1000, true), play("a", 3000, false), play("a", 2000, true), play("b", 9000, false), play("b", 7000, false), play("c", 1, true)], 2);
    expect(stats.find((s) => s.cardId === "a")).toMatchObject({ plays: 3, medianSeconds: 2, firstTryRate: 2 / 3 });
    expect(stats.find((s) => s.cardId === "b")).toMatchObject({ medianSeconds: 8, firstTryRate: 0 });
    expect(stats.find((s) => s.cardId === "c")).toBeUndefined();
    expect(slowest(stats)[0]?.cardId).toBe("b");
    expect(mostFailed(stats)[0]?.cardId).toBe("b");
  });
});
