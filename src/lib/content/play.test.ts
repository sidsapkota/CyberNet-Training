import { describe, expect, it } from "vitest";
import { loadContent } from "./load";
import { playMix, playProblems } from "./play";

/**
 * Courses converted in the content quality pass: every lesson meets the target (a PREDICT, a BUILD
 * or CONSEQUENCE, RECOGNISE no more than half). Add a course here once it's converted, so it can't
 * slip back. Run `npx tsx scripts/play-audit.ts` to see every lesson's mix.
 */
export const PLAY_TARGET_COURSES: readonly string[] = [];

describe("play mix", () => {
  const { lessons } = loadContent();

  it("converted courses meet the target in every lesson", () => {
    const problems: string[] = [];
    for (const lesson of lessons.values()) {
      if (lesson.kind !== "lesson" || !PLAY_TARGET_COURSES.includes(lesson.courseId)) continue;
      for (const p of playProblems(playMix(lesson.cards))) problems.push(`${lesson.id}: ${p}`);
    }
    expect(problems).toEqual([]);
  });

  it("counts only core, graded cards", () => {
    const mix = playMix([
      { id: "a", type: "explainer", difficulty: "core", title: "t", body: "b" },
      { id: "b", type: "true_false", difficulty: "core", prompt: "p", explanation: "e", answer: true },
      { id: "c", type: "true_false", difficulty: "challenge", prompt: "p", explanation: "e", answer: true },
      { id: "d", type: "true_false", difficulty: "core", prompt: "p", explanation: "e", answer: true, play: "predict" },
    ] as never);
    expect(mix).toEqual({ graded: 2, recognise: 1, predict: 1, build: 0, consequence: 0 });
    expect(playProblems(mix)).toEqual(["no BUILD or CONSEQUENCE card"]);
  });
});
