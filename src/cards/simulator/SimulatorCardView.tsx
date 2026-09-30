"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { CheckIcon, WarningIcon, XIcon } from "@/components/ui/icons";
import { CardPrompt } from "../CardPrompt";
import { CardStatusNote } from "../CardStatusNote";
import type { CardComponentProps } from "../types";
import { initialValue, runSimulator, sliderRange } from "./grade";
import type { ListItem, OutputValue } from "./models/types";
import type { SimulatorAnswer, SimulatorCard, SimulatorControl, SimulatorOutput } from "./schema";

/* ── Outputs ───────────────────────────────────────────────────────────────────────────── */

function smoothness(value: number): { text: string; tone: "good" | "ok" | "bad"; Icon: typeof CheckIcon } {
  if (value >= 0.9) return { text: "Smooth", tone: "good", Icon: CheckIcon };
  if (value >= 0.6) return { text: "A bit slow", tone: "ok", Icon: WarningIcon };
  if (value > 0) return { text: "Laggy", tone: "bad", Icon: WarningIcon };
  return { text: "Frozen", tone: "bad", Icon: XIcon };
}

const toneText = { good: "text-success", ok: "text-warning", bad: "text-danger" } as const;

/** A generic phone or laptop whose screen scrolls smoothly, stutters, or freezes. */
function DeviceMockup({ smooth, frame, label }: { smooth: number; frame: "phone" | "laptop"; label: string }) {
  const reduceMotion = useReducedMotion();
  const status = smoothness(smooth);
  // Fewer frames and a slower scroll as lag rises: the screen visibly stutters.
  const frames = Math.max(3, Math.round(48 * smooth));
  const duration = 2.4 / (0.3 + 0.7 * Math.max(smooth, 0.01));
  const frozen = smooth <= 0;
  const rows = [0, 1, 2, 3, 4, 5];
  const feed = (
    <motion.div
      key={`${frames}-${frozen}`}
      className="space-y-1.5"
      animate={reduceMotion || frozen ? undefined : { y: [0, -44] }}
      transition={{ duration, repeat: Infinity, ease: (t: number) => Math.floor(t * frames) / frames }}
    >
      {rows.map((i) => (
        <div key={i} className="flex h-4 items-center gap-1.5 rounded-sm bg-scene-part px-1.5">
          <span className="size-2 rounded-sm bg-scene-edge" />
          <span className="h-1 flex-1 rounded-sm bg-scene-edge/60" style={{ maxWidth: `${50 + ((i * 17) % 40)}%` }} />
        </div>
      ))}
    </motion.div>
  );

  return (
    <figure className="flex flex-col items-center gap-2">
      <div className="rounded-card bg-screen p-3">
        {frame === "phone" ? (
          <div className="relative h-36 w-20 overflow-hidden rounded-[14px] border-2 border-scene-edge bg-scene-shell p-1.5">
            {feed}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="relative h-24 w-36 overflow-hidden rounded-sm border-2 border-scene-edge bg-scene-shell p-1.5">{feed}</div>
            <div className="h-2 w-44 rounded-b-sm bg-scene-edge" />
          </div>
        )}
      </div>
      <figcaption className={`inline-flex items-center gap-1.5 text-small font-semibold ${toneText[status.tone]}`} aria-live="polite">
        <status.Icon className="size-4" />
        <span className="sr-only">{label}: </span>
        {status.text}
      </figcaption>
    </figure>
  );
}

function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function NumberOutput({ output, value }: { output: SimulatorOutput; value: number }) {
  const text = output.kind === "timer" ? `${formatNumber(value)} s` : `${formatNumber(value)}${output.unit ? ` ${output.unit}` : ""}`;
  return (
    <div className="rounded-control border border-line bg-surface p-3" aria-live="polite">
      <p className="text-caption text-ink-muted">{output.label}</p>
      <p className="font-mono text-title font-semibold text-ink tabular-nums">{text}</p>
    </div>
  );
}

function BarOutput({ output, value }: { output: SimulatorOutput; value: number }) {
  const full = value >= 0.97;
  return (
    <div className="rounded-control border border-line bg-surface p-3" aria-live="polite">
      <div className="flex items-baseline justify-between gap-2 text-caption">
        <span className="text-ink-muted">{output.label}</span>
        <span className={`inline-flex items-center gap-1 font-mono font-semibold tabular-nums ${full ? "text-danger" : "text-ink"}`}>
          {full && <WarningIcon className="size-3.5" />}
          {full ? "Full" : `${Math.round(value * 100)}%`}
        </span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-sm bg-line" role="presentation">
        <motion.div className={`h-full rounded-sm ${full ? "bg-danger" : "bg-accent"}`} animate={{ width: `${value * 100}%` }} transition={{ duration: 0.3 }} />
      </div>
    </div>
  );
}

function ListOutput({ output, items }: { output: SimulatorOutput; items: ListItem[] }) {
  return (
    <div className="rounded-control border border-line bg-surface p-3">
      <p className="text-caption text-ink-muted">{output.label}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item.id} className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 text-small ${item.state === "off" ? "text-ink-faint" : "text-ink"}`}>
            <span className={`truncate ${item.state === "off" ? "line-through" : ""}`}>
              {item.label}
              {item.state === "system" && <span className="ml-1.5 rounded-sm border border-line-strong px-1 text-caption text-ink-muted">system</span>}
              {item.state === "high" && (
                <span className="ml-1.5 inline-flex items-center gap-0.5 text-caption font-semibold text-warning">
                  <WarningIcon className="size-3" />
                  high
                </span>
              )}
            </span>
            <span className="font-mono text-caption text-ink-muted tabular-nums">{item.detail}</span>
            <span className="col-span-2 h-1.5 overflow-hidden rounded-sm bg-line">
              <span className={`block h-full rounded-sm ${item.state === "high" ? "bg-warning" : "bg-accent"}`} style={{ width: `${Math.round(item.value * 100)}%` }} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OutputView({ output, value }: { output: SimulatorOutput; value: OutputValue | undefined }) {
  if (output.kind === "list") return Array.isArray(value) ? <ListOutput output={output} items={value} /> : null;
  if (typeof value !== "number") return null;
  if (output.kind === "device") return <DeviceMockup smooth={value} frame={output.frame ?? "phone"} label={output.label} />;
  if (output.kind === "bar") return <BarOutput output={output} value={value} />;
  return <NumberOutput output={output} value={value} />;
}

/* ── Controls ──────────────────────────────────────────────────────────────────────────── */

function ControlView({
  card,
  control,
  value,
  locked,
  onChange,
}: {
  card: SimulatorCard;
  control: SimulatorControl;
  value: number | boolean;
  locked: boolean;
  onChange: (v: number | boolean) => void;
}) {
  const id = useId();
  if (control.kind === "toggle") {
    const on = value === true;
    return (
      <button
        type="button"
        role="switch"
        aria-checked={on}
        data-keyboard-passthrough
        disabled={locked}
        onClick={() => onChange(!on)}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-control border border-line bg-surface px-3 text-left text-small font-semibold text-ink disabled:cursor-default"
      >
        {control.label}
        <span className="flex items-center gap-2">
          <span className="font-mono text-caption text-ink-muted">{on ? "On" : "Off"}</span>
          <span className={`relative h-6 w-10 rounded-node border-2 transition-colors ${on ? "border-accent-ink bg-accent" : "border-line-strong bg-surface-raised"}`}>
            <span className={`absolute top-0.5 size-4 rounded-node bg-surface shadow-card transition-[left] ${on ? "left-[18px]" : "left-0.5"}`} />
          </span>
        </span>
      </button>
    );
  }
  if (control.kind === "slider") {
    const { min, max, step } = sliderRange(card, control);
    return (
      <div className="rounded-control border border-line bg-surface px-3 py-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor={id} className="text-small font-semibold text-ink">
            {control.label}
          </label>
          <span className="font-mono text-small text-ink tabular-nums">
            {String(value)}
            {/* The schema trims units, so the space goes here (none before % or °: "50%", "30°C"). */}
            {control.unit ? (/^[%°]/.test(control.unit) ? control.unit : ` ${control.unit}`) : ""}
          </span>
        </div>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={Number(value)}
          disabled={locked}
          onChange={(e) => onChange(Number(e.target.value))}
          className="mt-2 h-8 w-full accent-[var(--color-accent)]"
        />
      </div>
    );
  }
  const done = value === true;
  return (
    <button
      type="button"
      data-keyboard-passthrough
      disabled={locked || done}
      onClick={() => onChange(true)}
      className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-control border px-3 text-left text-small font-semibold ${
        done ? "border-line bg-surface-raised text-ink-faint" : "border-line-strong bg-surface text-ink hover:border-accent-ink hover:text-accent-ink"
      }`}
    >
      {done ? (control.doneLabel ?? `${control.label}: done`) : control.label}
      {done && <CheckIcon className="size-4" />}
    </button>
  );
}

/* ── Card ──────────────────────────────────────────────────────────────────────────────── */

export function SimulatorCardView({ card, answer, onAnswerChange, status }: CardComponentProps<SimulatorCard, SimulatorAnswer>) {
  const locked = status !== "answering";
  const outputs = runSimulator(card, answer);
  const device = card.outputs.filter((o) => o.kind === "device");
  const others = card.outputs.filter((o) => o.kind !== "device");

  return (
    <div>
      <CardPrompt>{card.prompt}</CardPrompt>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <section aria-label="What's happening" className="space-y-2.5">
          {device.map((o) => (
            <OutputView key={o.id} output={o} value={outputs[o.id]} />
          ))}
          {others.map((o) => (
            <OutputView key={o.id} output={o} value={outputs[o.id]} />
          ))}
        </section>
        <section aria-label="Controls" className="space-y-2">
          {card.controls.map((control) => (
            <ControlView
              key={control.id}
              card={card}
              control={control}
              value={answer[control.id] ?? initialValue(card, control)}
              locked={locked}
              onChange={(v) => onAnswerChange({ ...answer, [control.id]: v })}
            />
          ))}
        </section>
      </div>
      <CardStatusNote status={status} correctText="Goal reached" incorrectText="Not quite: the goal isn't met yet" />
    </div>
  );
}
