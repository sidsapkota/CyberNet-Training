import { describe, expect, it } from "vitest";
import { nextWord } from "@/test/fixtures";
import {
  describeNextWordAnswer,
  describeNextWordCorrect,
  gradeNextWord,
  initialNextWordAnswer,
  isNextWordReady,
  percent,
} from "./grade";
import { atTemperature, meetsGoal, samplePicks, temperatureStops } from "./model";
import { NextWordCardSchema } from "./schema";

const pick = NextWordCardSchema.parse(nextWord());
const atLeast = NextWordCardSchema.parse(nextWord({ id: "cat-cold", goal: { type: "probability", word: "mat", atLeast: 0.8 } }));
const spread = NextWordCardSchema.parse(nextWord({ id: "cat-hot", goal: { type: "probability", atMost: 0.45 } }));

describe("temperature", () => {
  it("leaves the written chances alone at 1", () => {
    expect(atTemperature(pick.candidates, 1).map((p) => p.toFixed(3))).toEqual(["0.600", "0.200", "0.150", "0.050"]);
  });

  it("makes the likeliest word likelier below 1, and evens things out above 1", () => {
    const cold = atTemperature(pick.candidates, 0.5);
    const hot = atTemperature(pick.candidates, 2);
    expect(cold[0]).toBeCloseTo(0.36 / 0.425, 6); // 0.6², 0.2², 0.15², 0.05² scaled
    expect(cold[0]!).toBeGreaterThan(0.6);
    expect(hot[0]!).toBeLessThan(0.6);
    expect(hot[3]!).toBeGreaterThan(0.05);
    for (const shares of [cold, hot]) expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it("never changes the order of the words", () => {
    for (const t of temperatureStops(0.2, 2, 0.1)) {
      const shares = atTemperature(pick.candidates, t);
      expect([...shares].sort((a, b) => b - a)).toEqual(shares);
    }
  });

  it("has clean slider stops", () => {
    expect(temperatureStops(0.2, 1, 0.1)).toEqual([0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]);
  });

  it("checks goals to 3 decimal places", () => {
    expect(meetsGoal(pick.candidates, { word: "mat", atLeast: 0.6 }, 1)).toBe(true);
    expect(meetsGoal(pick.candidates, { word: "mat", atLeast: 0.601 }, 1)).toBe(false);
    expect(meetsGoal(pick.candidates, { atMost: 0.6 }, 1)).toBe(true);
  });

  it("samples the same picks every time for a card and temperature", () => {
    const a = samplePicks(pick.candidates, 1.5, "cat");
    expect(a).toHaveLength(5);
    expect(samplePicks(pick.candidates, 1.5, "cat")).toEqual(a);
    expect(new Set(samplePicks(pick.candidates, 0.2, "cat", 20))).toEqual(new Set(["mat"])); // cold: nearly always "mat"
  });
});

describe("next_word cards: pick goal", () => {
  it("is ready once a word is picked, and right only for the likeliest word", () => {
    expect(isNextWordReady(initialNextWordAnswer(pick), pick)).toBe(false);
    expect(isNextWordReady({ temperature: 1, pick: "sofa" }, pick)).toBe(true);
    expect(gradeNextWord(pick, { temperature: 1, pick: "mat" }).correct).toBe(true);
    expect(gradeNextWord(pick, { temperature: 1, pick: "sofa" }).correct).toBe(false);
    expect(describeNextWordAnswer(pick, { temperature: 1, pick: "sofa" })).toBe("sofa");
    expect(describeNextWordCorrect(pick)).toBe("mat");
  });
});

describe("next_word cards: probability goal", () => {
  it("isn't ready until the slider moves", () => {
    expect(isNextWordReady(initialNextWordAnswer(atLeast), atLeast)).toBe(false);
    expect(isNextWordReady({ temperature: 0.9, pick: null }, atLeast)).toBe(true);
  });

  it("is right when the goal holds at the chosen temperature", () => {
    expect(gradeNextWord(atLeast, { temperature: 0.5, pick: null }).correct).toBe(true);
    expect(gradeNextWord(atLeast, { temperature: 0.9, pick: null }).correct).toBe(false);
    expect(gradeNextWord(spread, { temperature: 2, pick: null }).correct).toBe(true);
    expect(gradeNextWord(spread, { temperature: 1.2, pick: null }).correct).toBe(false);
  });

  it("refuses temperatures that aren't on the slider (a tampered answer)", () => {
    expect(gradeNextWord(atLeast, { temperature: 0.05, pick: null }).correct).toBe(false);
    expect(gradeNextWord(atLeast, { temperature: 0.55, pick: null }).correct).toBe(false);
    expect(gradeNextWord(atLeast, { temperature: "0.5" } as never).correct).toBe(false);
    expect(gradeNextWord(atLeast, null as never).correct).toBe(false);
  });

  it("describes answers and the working range for the quiz review", () => {
    expect(describeNextWordAnswer(atLeast, { temperature: 0.5, pick: null })).toBe("Temperature 0.5 (mat: 84.7%)");
    expect(describeNextWordCorrect(atLeast)).toBe("Any temperature from 0.2 to 0.5");
    expect(describeNextWordCorrect(spread)).toMatch(/^Any temperature from 1\.\d to 2\.0$/);
    expect(percent(0.847)).toBe("84.7%");
    expect(percent(0.4554)).toBe("45.5%"); // never "45%", which would look like it meets "at most 45%"
  });
});

describe("next_word schema", () => {
  const problems = (card: unknown) => {
    const result = NextWordCardSchema.safeParse(card);
    return result.success ? [] : result.error.issues.map((i) => i.message);
  };

  it("accepts the fixtures", () => {
    for (const card of [pick, atLeast, spread]) expect(problems(card)).toEqual([]);
  });

  it("needs chances that add up to 1, and unique words", () => {
    expect(problems(nextWord({ candidates: [{ word: "a", p: 0.5 }, { word: "b", p: 0.3 }, { word: "c", p: 0.1 }] })).join()).toMatch(/add up to 1/);
    expect(problems(nextWord({ candidates: [{ word: "Mat", p: 0.5 }, { word: "mat", p: 0.3 }, { word: "c", p: 0.2 }] })).join()).toMatch(/unique/);
  });

  it("only picks the single likeliest word", () => {
    expect(problems(nextWord({ goal: { type: "pick", word: "sofa" } })).join()).toMatch(/single likeliest/);
    expect(problems(nextWord({ goal: { type: "pick", word: "dog" } })).join()).toMatch(/isn't a candidate/);
  });

  it("needs probability goals that start unsolved and can be reached", () => {
    expect(problems(nextWord({ goal: { type: "probability", word: "mat", atLeast: 0.5 } })).join()).toMatch(/already met/);
    expect(problems(nextWord({ goal: { type: "probability", word: "moon", atLeast: 0.9 } })).join()).toMatch(/can't be solved/);
    expect(problems(nextWord({ goal: { type: "probability", word: "mat" } })).join()).toMatch(/atLeast or atMost/);
  });

  it("checks the slider", () => {
    expect(problems(nextWord({ temperature: { min: 1, max: 0.5, start: 1, step: 0.1 } })).join()).toMatch(/min must be below max/);
    expect(problems(nextWord({ temperature: { min: 0.2, max: 2, start: 1.05, step: 0.1 } })).join()).toMatch(/slider stop/);
  });
});
