import { describe, expect, it } from "vitest";
import { reactionExpression, reactionLine, RIGHT_LINES, WRONG_LINES } from "./reactions";

describe("mascot reactions", () => {
  it("are the same for the same card and attempt", () => {
    expect(reactionLine("meet-the-os", 3, 1, true)).toBe(reactionLine("meet-the-os", 3, 1, true));
  });

  it("never repeat on the next card or the next attempt", () => {
    for (let i = 0; i < 30; i++) {
      expect(reactionLine("bits-and-binary", i, 1, true)).not.toBe(reactionLine("bits-and-binary", i + 1, 1, true));
      expect(reactionLine("bits-and-binary", i, i + 1, false)).not.toBe(reactionLine("bits-and-binary", i, i + 2, false));
    }
  });

  it("say plainly whether the answer was right", () => {
    for (const line of WRONG_LINES) expect(line).toMatch(/^Not|^Close, but not/);
    for (const line of RIGHT_LINES) expect(line).not.toMatch(/\bnot\b/i);
    for (const line of [...RIGHT_LINES, ...WRONG_LINES]) expect(line.length).toBeLessThanOrEqual(40);
  });

  it("never mock", () => {
    for (const line of [...RIGHT_LINES, ...WRONG_LINES]) expect(line).not.toMatch(/easy|obvious|seriously|oops|wrong!/i);
  });

  it("use the mascot's existing expressions", () => {
    expect(reactionExpression(true, false, 1)).toBe("happy");
    expect(reactionExpression(true, true, 1)).toBe("celebrating");
    expect(["confused", "thinking"]).toContain(reactionExpression(false, false, 2));
  });
});
