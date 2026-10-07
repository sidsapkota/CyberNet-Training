import { describe, expect, it } from "vitest";
import { loadContent } from "@/lib/content/load";
import { canChallenge, canSendEmote, challengeCards, CHALLENGE_SIZE, EMOTES, health, outcome, outcomeLine, score } from "./rules";

describe("challenge questions", () => {
  const lessons = [...loadContent().lessons.values()].filter((l) => l.kind === "lesson");

  it("are only interactive core cards, at most 5, in lesson order", () => {
    for (const lesson of lessons) {
      const cards = challengeCards(lesson.cards);
      expect(cards.length).toBeLessThanOrEqual(CHALLENGE_SIZE);
      for (const c of cards) {
        expect(c.difficulty).toBe("core");
        expect(["explainer", "photo", "reveal"]).not.toContain(c.type);
        if (c.type === "hotspot") expect(c.mode).not.toBe("explore");
      }
      const order = cards.map((c) => lesson.cards.indexOf(c));
      expect([...order].sort((a, b) => a - b)).toEqual(order);
    }
  });

  it("most lessons can be challenged", () => {
    expect(lessons.filter((l) => canChallenge(l.cards)).length).toBeGreaterThan(lessons.length * 0.8);
  });
});

describe("the duel", () => {
  it("scores and decides from the player's side", () => {
    expect(score([true, false, true])).toBe(2);
    expect(outcome([true, true], [true, false])).toBe("win");
    expect(outcome([true, false], [false, true])).toBe("draw");
    expect(outcome([false, false], [true, false])).toBe("lose");
  });

  it("health drops one per wrong answer so far", () => {
    const r = [true, false, false, true, true];
    expect(health(r, 0)).toBe(5);
    expect(health(r, 2)).toBe(4);
    expect(health(r, 5)).toBe(3);
  });

  it("says it kindly", () => {
    expect(outcomeLine("lose", "Pip")).toBe("So close! Pip wins this one.");
    expect(outcomeLine("win", "Pip")).toBe("You beat Pip!");
  });
});

describe("emotes", () => {
  it("are a fixed list; the animated ones are Pro", () => {
    expect(EMOTES.map((e) => e.label)).toEqual(["GG", "Nice one", "Rematch?", "On fire", "Wow", "Bring it"]);
    expect(canSendEmote("gg", false)).toBe(true);
    expect(canSendEmote("wow", false)).toBe(false);
    expect(canSendEmote("wow", true)).toBe(true);
    expect(canSendEmote("anything else", true)).toBe(false);
  });
});
