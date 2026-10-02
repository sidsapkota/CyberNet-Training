import { describe, expect, it } from "vitest";
import { initialRevealState, isRevealComplete } from "./grade";
import { RevealCardSchema } from "./schema";

const base = { id: "meet-battery", type: "reveal", difficulty: "core", sentence: "This is the **battery**: it stores the energy." };

describe("reveal (the learning card)", () => {
  it("is complete once tapped", () => {
    expect(isRevealComplete(initialRevealState())).toBe(false);
    expect(isRevealComplete({ revealed: true })).toBe(true);
    expect(isRevealComplete(null)).toBe(false);
  });

  it("accepts a scene part, an icon or a glossary word", () => {
    expect(RevealCardSchema.safeParse({ ...base, show: { kind: "part", scene: "phone", part: "battery", view: "open" } }).success).toBe(true);
    expect(RevealCardSchema.safeParse({ ...base, show: { kind: "icon", icon: "cpu" } }).success).toBe(true);
    expect(RevealCardSchema.safeParse({ ...base, show: { kind: "term", term: "cpu" } }).success).toBe(true);
  });

  it("rejects unknown parts, hidden parts, unknown words, two sentences and bonus cards", () => {
    expect(RevealCardSchema.safeParse({ ...base, show: { kind: "part", scene: "phone", part: "warp-drive" } }).success).toBe(false);
    expect(RevealCardSchema.safeParse({ ...base, show: { kind: "part", scene: "phone", part: "battery" } }).success).toBe(false); // under the back cover
    expect(RevealCardSchema.safeParse({ ...base, show: { kind: "term", term: "not-a-word" } }).success).toBe(false);
    expect(RevealCardSchema.safeParse({ ...base, show: { kind: "icon", icon: "cpu" }, sentence: "One. Two." }).success).toBe(false);
    expect(RevealCardSchema.safeParse({ ...base, difficulty: "challenge", show: { kind: "icon", icon: "cpu" } }).success).toBe(false);
  });
});
