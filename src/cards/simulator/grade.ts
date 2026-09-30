import type { GradeResult } from "../types";
import { MODELS } from "./models";
import type { InputValue, OutputValue } from "./models/types";
import type { SimulatorAnswer, SimulatorCard, SimulatorControl } from "./schema";

/** A control's starting value: the card's `initial`, else the model's default. */
export function initialValue(card: SimulatorCard, control: SimulatorControl): InputValue {
  if (control.kind === "button") return false;
  if (control.initial !== undefined) return control.initial;
  const model = MODELS[card.model]!;
  return model.inputs(model.params.parse(card.params))[control.id]?.default ?? (control.kind === "slider" ? 0 : false);
}

export function initialSimulatorAnswer(card: SimulatorCard): SimulatorAnswer {
  return Object.fromEntries(card.controls.map((c) => [c.id, initialValue(card, c)]));
}

export function sliderRange(card: SimulatorCard, control: Extract<SimulatorControl, { kind: "slider" }>) {
  const model = MODELS[card.model]!;
  const spec = model.inputs(model.params.parse(card.params))[control.id];
  return { min: control.min ?? spec?.min ?? 0, max: control.max ?? spec?.max ?? 100, step: control.step };
}

/** Accepts only known controls with values of the right type, clamped to slider ranges. */
function cleanInputs(card: SimulatorCard, answer: SimulatorAnswer): Record<string, InputValue> {
  const out: Record<string, InputValue> = {};
  for (const control of card.controls) {
    const raw = answer?.[control.id];
    if (control.kind === "slider") {
      const { min, max } = sliderRange(card, control);
      const value = typeof raw === "number" && Number.isFinite(raw) ? raw : (initialValue(card, control) as number);
      out[control.id] = Math.min(max, Math.max(min, value));
    } else {
      out[control.id] = typeof raw === "boolean" ? raw : (initialValue(card, control) as boolean);
    }
  }
  return out;
}

/** Runs the card's model on the learner's current controls. Pure. */
export function runSimulator(card: SimulatorCard, answer: SimulatorAnswer): Record<string, OutputValue> {
  const model = MODELS[card.model]!;
  const params = model.params.parse(card.params);
  const defaults = Object.fromEntries(Object.entries(model.inputs(params)).map(([id, spec]) => [id, spec.default]));
  return model.run({ ...defaults, ...cleanInputs(card, answer) }, params);
}

const EPSILON = 1e-9;
function compare(actual: InputValue | OutputValue | undefined, op: "<=" | ">=" | "==", expected: number | boolean): boolean {
  if (typeof expected === "boolean") return op === "==" && actual === expected;
  if (typeof actual !== "number") return false;
  if (op === "<=") return actual <= expected + EPSILON;
  if (op === ">=") return actual >= expected - EPSILON;
  return Math.abs(actual - expected) < EPSILON;
}

export function goalMet(card: SimulatorCard, answer: SimulatorAnswer): boolean {
  const inputs = cleanInputs(card, answer);
  const outputs = runSimulator(card, answer);
  return card.goal.all.every((c) => compare(c.target === "control" ? inputs[c.id] : outputs[c.id], c.op, c.value));
}

/** Ready once the learner has changed something. */
export function isSimulatorReady(answer: SimulatorAnswer, card: SimulatorCard): boolean {
  const start = initialSimulatorAnswer(card);
  return card.controls.some((c) => answer?.[c.id] !== undefined && answer[c.id] !== start[c.id]);
}

export function gradeSimulator(card: SimulatorCard, answer: SimulatorAnswer): GradeResult {
  return { correct: goalMet(card, answer) };
}

function describeValue(control: SimulatorControl, value: InputValue): string {
  if (control.kind === "slider") return `${control.label} ${value}${control.unit ?? ""}`;
  if (control.kind === "button") return value ? (control.doneLabel ?? `${control.label}: done`) : "";
  return `${control.label} ${value ? "on" : "off"}`;
}

export function describeSimulatorAnswer(card: SimulatorCard, answer: SimulatorAnswer): string {
  const inputs = cleanInputs(card, answer);
  const parts = card.controls.map((c) => describeValue(c, inputs[c.id]!)).filter(Boolean);
  return `${parts.join(", ")} (${goalMet(card, answer) ? "goal met" : "goal not met"})`;
}

export function describeSimulatorCorrect(): string {
  return "Any settings that meet the goal";
}
