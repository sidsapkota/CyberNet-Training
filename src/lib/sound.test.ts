import { describe, expect, it } from "vitest";
import { audioUnlocked, HAPTICS, playSound, SOUNDS } from "./sound";

describe("sound effects", () => {
  it("keeps every sound short: under 300 ms, except the lesson-complete chime", () => {
    for (const [name, notes] of Object.entries(SOUNDS)) {
      const length = Math.max(...notes.map((n) => n.at + n.dur));
      expect(length, name).toBeLessThanOrEqual(name === "lessonComplete" ? 0.6 : 0.3);
    }
  });

  it("keeps notes gentle (no gain above 0.6 before the master volume)", () => {
    for (const notes of Object.values(SOUNDS)) for (const n of notes) expect(n.gain ?? 0.4).toBeLessThanOrEqual(0.6);
  });

  it("never plays before the first user interaction", () => {
    expect(audioUnlocked()).toBe(false);
    expect(() => playSound("correct")).not.toThrow(); // silent no-op
  });

  it("uses light haptic patterns", () => {
    for (const pattern of Object.values(HAPTICS)) {
      const total = Array.isArray(pattern) ? pattern.reduce((a, b) => a + b, 0) : pattern;
      expect(total).toBeLessThanOrEqual(100);
    }
  });
});
