import type { z } from "zod";

/** A control's value: toggles and buttons are booleans, sliders are numbers. */
export type InputValue = number | boolean;

/** One row of a list output (per-core load, running processes, files…). */
export interface ListItem {
  id: string;
  label: string;
  /** 0 to 1, drawn as a small bar. */
  value: number;
  /** Short mono detail, e.g. "35% CPU · 1.2 GB". */
  detail?: string;
  /** Visual state; always shown with text, never colour alone. */
  state?: "normal" | "high" | "off" | "system";
}

export type OutputValue = number | ListItem[];

export interface InputSpec {
  type: "boolean" | "number";
  default: InputValue;
  min?: number;
  max?: number;
}

export interface OutputSpec {
  type: "number" | "list";
}

/**
 * A simulator model: a pure function from inputs to outputs, configured by `params` from the card.
 * Models are code (registered in models/index.ts, unit-tested), never evaluated from content.
 */
export interface SimulatorModel<P> {
  id: string;
  /** One line for authors: what the model simulates. */
  summary: string;
  params: z.ZodType<P>;
  inputs(params: P): Record<string, InputSpec>;
  outputs(params: P): Record<string, OutputSpec>;
  run(inputs: Record<string, InputValue>, params: P): Record<string, OutputValue>;
}

export const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
export const round = (n: number, places = 1) => Math.round(n * 10 ** places) / 10 ** places;
export const num = (v: InputValue | undefined, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
export const bool = (v: InputValue | undefined, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
