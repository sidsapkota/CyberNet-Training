import { describe, expect, it } from "vitest";
import { scenario } from "@/test/fixtures";
import {
  chooseScenario,
  describeScenarioAnswer,
  describeScenarioCorrect,
  gradeScenario,
  isScenarioReady,
  successPath,
  walkScenario,
} from "./grade";
import { ScenarioCardSchema } from "./schema";

const card = scenario();

describe("scenario walking and grading", () => {
  it("follows choices step by step", () => {
    const walk = walkScenario(card, ["cable"]);
    expect(walk.current?.id).toBe("second");
    expect(walk.outcome).toBeNull();
    expect(isScenarioReady(["cable"], card)).toBe(false);
  });

  it("is correct only on a success ending", () => {
    expect(gradeScenario(card, ["cable", "plug"]).correct).toBe(true);
    expect(gradeScenario(card, ["pin"]).correct).toBe(false);
    expect(gradeScenario(card, ["cable", "give-up"]).correct).toBe(false);
    expect(isScenarioReady(["pin"], card)).toBe(true);
  });

  it("retries a wrong ending from the same step by replacing the last choice", () => {
    expect(chooseScenario(card, ["pin"], "cable")).toEqual(["cable"]);
    expect(chooseScenario(card, ["cable", "give-up"], "plug")).toEqual(["cable", "plug"]);
    expect(chooseScenario(card, ["cable"], "plug")).toEqual(["cable", "plug"]);
  });

  it("rejects tampered or impossible paths", () => {
    expect(gradeScenario(card, ["plug"]).correct).toBe(false); // plug isn't a first-step choice
    expect(gradeScenario(card, ["cable", "plug", "pin"]).correct).toBe(false); // choices after the end
    expect(gradeScenario(card, "nonsense" as never).correct).toBe(false);
  });

  it("finds the shortest way to success and describes answers", () => {
    expect(successPath(card).map((c) => c.id)).toEqual(["cable", "plug"]);
    expect(describeScenarioCorrect(card)).toBe("Try another cable → Try another plug");
    expect(describeScenarioAnswer(card, [])).toBe("No choices made");
  });
});

describe("ScenarioCardSchema", () => {
  const messages = (c: unknown) => ScenarioCardSchema.safeParse(c).error?.issues.map((i) => i.message) ?? [];
  const steps = card.steps;

  it("needs exactly one of next or outcome on each choice", () => {
    const bad = structuredClone(steps);
    bad[0]!.choices[0] = { ...bad[0]!.choices[0]!, next: "second" };
    expect(messages(scenario({ steps: bad }))).toContain("each choice needs exactly one of `next` or `outcome`");
  });

  it("rejects missing steps, loops, unreachable steps and stories with no success", () => {
    const missing = structuredClone(steps);
    missing[0]!.choices[1]!.next = "nowhere";
    expect(messages(scenario({ steps: missing }))).toContain('next step "nowhere" doesn\'t exist');

    const loop = structuredClone(steps);
    loop[1]!.choices[1] = { id: "back", text: "Go back", consequence: "Round again.", next: "first" };
    expect(messages(scenario({ steps: loop }))).toContain('the story loops back to "first"');

    const orphan = [...structuredClone(steps), { id: "lost", text: "?", choices: steps[1]!.choices.map((c) => ({ ...c, id: `${c.id}-2` })) }];
    expect(messages(scenario({ steps: orphan }))).toContain('step "lost" can\'t be reached from the start');

    const noWin = structuredClone(steps);
    noWin[1]!.choices[0]!.outcome = "fail";
    expect(messages(scenario({ steps: noWin }))).toContain("no choice leads to a success ending");
  });
});
