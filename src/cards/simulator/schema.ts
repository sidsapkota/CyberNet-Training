import { z } from "zod";
import { interactiveCardBase, nonEmpty } from "../base";
import { MODEL_IDS, MODELS } from "./models";
import type { InputValue } from "./models/types";

const Label = nonEmpty.max(32);
/** A model's input or output name (e.g. `usedPct`, `end-game`); not a progress key. */
const ModelKey = z.string().regex(/^[A-Za-z][A-Za-z0-9-]*$/, "must be a model input or output name");

const Control = z.discriminatedUnion("kind", [
  z.object({ id: ModelKey, kind: z.literal("toggle"), label: Label, initial: z.boolean().optional() }),
  z.object({
    id: ModelKey,
    kind: z.literal("slider"),
    label: Label,
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().positive().default(1),
    initial: z.number().optional(),
    unit: nonEmpty.max(8).optional(),
  }),
  /** One-way action, e.g. "End task": sets its input to true. */
  z.object({ id: ModelKey, kind: z.literal("button"), label: Label, doneLabel: Label.optional() }),
]);

const Output = z.object({
  id: ModelKey,
  kind: z.enum(["meter", "bar", "timer", "device", "list"]),
  label: Label,
  unit: nonEmpty.max(8).optional(),
  /** Device mockup frame. */
  frame: z.enum(["phone", "laptop"]).optional(),
});

const Condition = z.object({
  target: z.enum(["output", "control"]),
  id: ModelKey,
  op: z.enum(["<=", ">=", "=="]),
  value: z.union([z.number(), z.boolean()]),
});

export const SimulatorCardSchema = z
  .object({
    ...interactiveCardBase,
    type: z.literal("simulator"),
    /** A registered model (src/cards/simulator/models). */
    model: z.enum(MODEL_IDS),
    /** The model's settings, checked against its own schema. */
    params: z.record(z.string(), z.unknown()),
    controls: z.array(Control).min(1).max(10),
    outputs: z.array(Output).min(1).max(5),
    /** Every condition must hold for the final state. */
    goal: z.object({ all: z.array(Condition).min(1).max(5) }),
  })
  .superRefine((card, ctx) => {
    const model = MODELS[card.model];
    if (!model) return;
    const parsed = model.params.safeParse(card.params);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({ code: "custom", message: `params: ${issue.message}`, path: ["params", ...issue.path.map(String)] });
      }
      return;
    }
    const inputs = model.inputs(parsed.data);
    const outputs = model.outputs(parsed.data);

    const controlIds = new Set<string>();
    card.controls.forEach((control, i) => {
      const spec = inputs[control.id];
      if (controlIds.has(control.id)) ctx.addIssue({ code: "custom", message: "control ids must be unique", path: ["controls", i] });
      controlIds.add(control.id);
      if (!spec) {
        ctx.addIssue({ code: "custom", message: `model "${card.model}" has no input "${control.id}"`, path: ["controls", i, "id"] });
        return;
      }
      const wants = control.kind === "slider" ? "number" : "boolean";
      if (spec.type !== wants) {
        ctx.addIssue({ code: "custom", message: `"${control.id}" is a ${spec.type} input; a ${control.kind} can't drive it`, path: ["controls", i, "kind"] });
      }
      if (control.kind === "slider") {
        const min = control.min ?? spec.min ?? 0;
        const max = control.max ?? spec.max ?? 100;
        const initial = control.initial ?? (spec.default as number);
        if (min >= max || initial < min || initial > max) {
          ctx.addIssue({ code: "custom", message: `slider "${control.id}" needs min < initial ≤ max`, path: ["controls", i] });
        }
      }
    });

    const outputIds = new Set<string>();
    card.outputs.forEach((output, i) => {
      const spec = outputs[output.id];
      if (outputIds.has(output.id)) ctx.addIssue({ code: "custom", message: "output ids must be unique", path: ["outputs", i] });
      outputIds.add(output.id);
      if (!spec) {
        ctx.addIssue({ code: "custom", message: `model "${card.model}" has no output "${output.id}"`, path: ["outputs", i, "id"] });
      } else if ((output.kind === "list") !== (spec.type === "list")) {
        ctx.addIssue({ code: "custom", message: `output "${output.id}" is a ${spec.type}; "${output.kind}" can't show it`, path: ["outputs", i, "kind"] });
      }
    });

    card.goal.all.forEach((cond, i) => {
      const path = ["goal", "all", i];
      if (cond.target === "control") {
        const control = card.controls.find((c) => c.id === cond.id);
        if (!control) ctx.addIssue({ code: "custom", message: `goal refers to unknown control "${cond.id}"`, path });
        else if ((control.kind === "slider") !== (typeof cond.value === "number")) {
          ctx.addIssue({ code: "custom", message: `goal value for "${cond.id}" has the wrong type`, path });
        }
      } else {
        const spec = outputs[cond.id];
        if (!spec) ctx.addIssue({ code: "custom", message: `goal refers to unknown output "${cond.id}"`, path });
        else if (spec.type !== "number" || typeof cond.value !== "number") {
          ctx.addIssue({ code: "custom", message: `goal on "${cond.id}" must compare a number`, path });
        }
      }
    });
  });

export type SimulatorCard = z.infer<typeof SimulatorCardSchema>;
export type SimulatorControl = SimulatorCard["controls"][number];
export type SimulatorOutput = SimulatorCard["outputs"][number];
/** control id → its value. */
export type SimulatorAnswer = Record<string, InputValue>;
