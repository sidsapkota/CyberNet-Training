import { describe, expect, it } from "vitest";
import { simulator } from "@/test/fixtures";
import {
  describeSimulatorAnswer,
  goalMet,
  gradeSimulator,
  initialSimulatorAnswer,
  isSimulatorReady,
  runSimulator,
} from "./grade";
import { SimulatorCardSchema } from "./schema";

const card = simulator();

describe("simulator grading", () => {
  it("starts from the controls' initial values", () => {
    expect(initialSimulatorAnswer(card)).toEqual({ music: true, game: true });
  });

  it("runs the model on the learner's controls", () => {
    expect(runSimulator(card, { music: true, game: true }).smooth).toBeLessThan(0.9); // 4.5 GB in 4 GB RAM
    expect(runSimulator(card, { music: true, game: false }).smooth).toBe(1);
  });

  it("is correct only when every goal condition holds", () => {
    expect(gradeSimulator(card, { music: true, game: false }).correct).toBe(true);
    expect(gradeSimulator(card, { music: false, game: false }).correct).toBe(false); // music required
    expect(gradeSimulator(card, { music: true, game: true }).correct).toBe(false);
  });

  it("is ready once something changed", () => {
    expect(isSimulatorReady({ music: true, game: true }, card)).toBe(false);
    expect(isSimulatorReady({ music: true, game: false }, card)).toBe(true);
  });

  it("ignores unknown controls and wrong value types (tampered answers)", () => {
    expect(goalMet(card, { music: "yes" as never, game: false, hack: true } as never)).toBe(true); // bad music → its initial (true)
    expect(gradeSimulator(card, null as never).correct).toBe(false);
  });

  it("describes the settings", () => {
    expect(describeSimulatorAnswer(card, { music: true, game: false })).toBe("Music on, Game off (goal met)");
  });
});

describe("SimulatorCardSchema", () => {
  const messages = (c: unknown) => SimulatorCardSchema.safeParse(c).error?.issues.map((i) => i.message) ?? [];

  it("checks params against the model", () => {
    expect(messages(simulator({ params: { ramGb: 4 } })).some((m) => m.startsWith("params:"))).toBe(true);
  });

  it("checks controls and outputs exist in the model with the right kinds", () => {
    expect(messages(simulator({ controls: [{ id: "nope", kind: "toggle", label: "X" }] }))).toContain('model "memory" has no input "nope"');
    expect(messages(simulator({ controls: [{ id: "music", kind: "slider", label: "X", step: 1 }] }))).toContain(
      '"music" is a boolean input; a slider can\'t drive it',
    );
    expect(messages(simulator({ outputs: [{ id: "apps", kind: "meter", label: "X" }] }))).toContain('output "apps" is a list; "meter" can\'t show it');
  });

  it("checks goal conditions refer to real controls and numbers", () => {
    expect(
      messages(simulator({ goal: { all: [{ target: "output", id: "apps", op: ">=", value: 1 }] } })),
    ).toContain('goal on "apps" must compare a number');
    expect(
      messages(simulator({ goal: { all: [{ target: "control", id: "game", op: "==", value: 3 }] } })),
    ).toContain('goal value for "game" has the wrong type');
  });
});
