"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useId } from "react";
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
/** `statusOnlyOnPhones`: hidden (at every size), because the list beside it shows the status (`DeviceStatus`) in its header. */
function DeviceMockup({ smooth, frame, label, statusOnlyOnPhones = false }: { smooth: number; frame: "phone" | "laptop"; label: string; statusOnlyOnPhones?: boolean }) {
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
    <figure className={`flex flex-col items-center gap-2 ${statusOnlyOnPhones ? "hidden" : ""}`}>
      <div className="rounded-card bg-screen p-2.5 sm:p-3">
        {frame === "phone" ? (
          <div className="relative h-28 w-16 overflow-hidden rounded-[14px] border-2 border-scene-edge bg-scene-shell p-1.5 sm:h-36 sm:w-20 [@media(max-height:600px)]:h-22">
            {feed}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="relative h-20 w-28 overflow-hidden rounded-sm border-2 border-scene-edge bg-scene-shell p-1.5 sm:h-24 sm:w-36">{feed}</div>
            <div className="h-2 w-34 rounded-b-sm bg-scene-edge sm:w-44" />
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

/** The device's status alone, for a list's header on phones. */
function DeviceStatus({ smooth, label }: { smooth: number; label: string }) {
  const status = smoothness(smooth);
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 text-caption font-semibold ${toneText[status.tone]}`} aria-live="polite">
      <status.Icon className="size-3.5" />
      <span className="sr-only">{label}: </span>
      {status.text}
    </span>
  );
}

function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** `inline`: label and value on one line on phones (beside a list, where height is short). */
function NumberOutput({ output, value, inline = false }: { output: SimulatorOutput; value: number; inline?: boolean }) {
  const text = output.kind === "timer" ? `${formatNumber(value)} s` : `${formatNumber(value)}${output.unit ? ` ${output.unit}` : ""}`;
  return (
    <div className={`rounded-control border border-line bg-surface p-2.5 sm:p-3 ${inline ? "max-sm:flex max-sm:h-full max-sm:items-center max-sm:justify-between max-sm:gap-2 max-sm:py-2" : ""}`} aria-live="polite">
      <p className="text-caption text-ink-muted">{output.label}</p>
      <p className={`font-mono font-semibold text-ink tabular-nums sm:text-title ${inline ? "text-body" : "text-lead"}`}>{text}</p>
    </div>
  );
}

function BarOutput({ output, value }: { output: SimulatorOutput; value: number }) {
  const full = value >= 0.97;
  return (
    <div className="rounded-control border border-line bg-surface p-2.5 sm:p-3" aria-live="polite">
      <div className="flex items-baseline justify-between gap-2 text-caption">
        <span className="text-ink-muted">{output.label}</span>
        <span className={`inline-flex items-center gap-1 font-mono font-semibold tabular-nums ${full ? "text-danger" : "text-ink"}`}>
          {full && <WarningIcon className="size-3.5" />}
          {full ? "Full" : `${Math.round(value * 100)}%`}
        </span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-sm bg-line sm:mt-2" role="presentation">
        <motion.div className={`h-full rounded-sm ${full ? "bg-danger" : "bg-accent"}`} animate={{ width: `${value * 100}%` }} transition={{ duration: 0.3 }} />
      </div>
    </div>
  );
}

/** `action`: a button for a row (the task manager's "End"), so each process and its button share a line. */
function ListOutput({ output, items, action, status }: { output: SimulatorOutput; items: ListItem[]; action?: (id: string) => ReactNode; status?: ReactNode }) {
  return (
    <div className="rounded-control border border-line bg-surface p-2.5 sm:p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-caption text-ink-muted">{output.label}</p>
        {status}
      </div>
      {/* Rows with a button are 44px tall already, so they need no gap on phones. */}
      <ul className={`mt-1.5 sm:mt-2 sm:space-y-1.5 ${action ? "" : "space-y-1"}`}>
        {items.map((item) => (
          <li key={item.id} className={`grid items-center gap-x-2 text-small ${action ? "grid-cols-[minmax(0,1fr)_auto_auto]" : "grid-cols-[minmax(0,1fr)_auto]"} ${item.state === "off" ? "text-ink-faint" : "text-ink"}`}>
            <span className={`min-w-0 [overflow-wrap:anywhere] ${item.state === "off" ? "line-through" : ""}`}>
              {item.label}
              {item.state === "system" && <span className="ml-1.5 inline-block rounded-sm border border-line-strong px-1 text-caption whitespace-nowrap text-ink-muted">system</span>}
              {item.state === "high" && (
                <span className="ml-1.5 inline-flex items-center gap-0.5 text-caption font-semibold text-warning">
                  <WarningIcon className="size-3" />
                  high
                </span>
              )}
            </span>
            <span className="font-mono text-caption text-ink-muted tabular-nums">{item.detail}</span>
            {action && <span className="row-span-2 self-center">{action(item.id)}</span>}
            <span className="col-span-2 h-1.5 overflow-hidden rounded-sm bg-line">
              <span className={`block h-full rounded-sm ${item.state === "high" ? "bg-warning" : "bg-accent"}`} style={{ width: `${Math.round(item.value * 100)}%` }} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OutputView({ output, value, statusOnlyOnPhones, action, status, inline }: { output: SimulatorOutput; value: OutputValue | undefined; statusOnlyOnPhones?: boolean; action?: (id: string) => ReactNode; status?: ReactNode; inline?: boolean }) {
  if (output.kind === "list") return Array.isArray(value) ? <ListOutput output={output} items={value} action={action} status={status} /> : null;
  if (typeof value !== "number") return null;
  if (output.kind === "device") return <DeviceMockup smooth={value} frame={output.frame ?? "phone"} label={output.label} statusOnlyOnPhones={statusOnlyOnPhones} />;
  if (output.kind === "bar") return <BarOutput output={output} value={value} />;
  return <NumberOutput output={output} value={value} inline={inline} />;
}

/* ── Controls ──────────────────────────────────────────────────────────────────────────── */

function ControlView({
  card,
  control,
  value,
  locked,
  onChange,
  compact = false,
}: {
  card: SimulatorCard;
  control: SimulatorControl;
  value: number | boolean;
  locked: boolean;
  onChange: (v: number | boolean) => void;
  /** Half-width switch on phones: the On/Off word is for screen readers only there (the knob shows it). */
  compact?: boolean;
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
        className={`flex min-h-12 w-full items-center justify-between rounded-control border border-line bg-surface px-3 text-left text-small font-semibold text-ink disabled:cursor-default ${compact ? "gap-2 py-1.5 sm:gap-3 sm:py-0" : "gap-3"}`}
      >
        {control.label}
        <span className="flex items-center gap-2">
          <span className={`font-mono text-caption text-ink-muted ${compact ? "max-sm:sr-only" : ""}`}>{on ? "On" : "Off"}</span>
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
      <div className="flex items-center gap-3 rounded-control border border-line bg-surface px-3 py-0.5 sm:block sm:py-2.5">
        <div className="flex shrink-0 items-baseline justify-between gap-2 max-sm:flex-col max-sm:gap-0">
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
          className="h-11 w-full min-w-0 accent-[var(--color-accent)] sm:mt-1"
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
  const tiles = others.filter((o) => o.kind !== "list");
  // Three or more switches or buttons sit two to a row on phones; sliders keep the full width.
  // A control for one row of a list output sits on that row, not below: `end-<row>` (a button, the
  // task manager), `delete-<row>` (a switch, storage) or `<row>` itself (a switch: an app on or off).
  const listOutput = card.outputs.find((o) => o.kind === "list");
  const listIds = new Set(listOutput && Array.isArray(outputs[listOutput.id]) ? (outputs[listOutput.id] as ListItem[]).map((i) => i.id) : []);
  const rowOf = (c: SimulatorControl): string | undefined => {
    const m = /^(end|delete)-(.+)$/.exec(c.id);
    if (m?.[1] === "end" && c.kind === "button" && listIds.has(m[2]!)) return m[2];
    if (m?.[1] === "delete" && c.kind === "toggle" && listIds.has(m[2]!)) return m[2];
    if (c.kind === "toggle" && listIds.has(c.id)) return c.id;
    return undefined;
  };
  const rowControls = new Map(card.controls.flatMap((c) => { const row = rowOf(c); return row ? [[row, c] as const] : []; }));
  const otherControls = card.controls.filter((c) => rowOf(c) === undefined);
  const rowAction = rowControls.size === 0 ? undefined : (id: string) => {
    const control = rowControls.get(id);
    if (!control) return null;
    if (control.kind === "toggle") {
      const on = (answer[control.id] ?? initialValue(card, control)) === true;
      const verb = control.id.startsWith("delete-") ? "Delete" : on ? "On" : "Off";
      return (
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={control.label}
          data-keyboard-passthrough
          disabled={locked}
          onClick={() => onAnswerChange({ ...answer, [control.id]: !on })}
          className="flex min-h-11 items-center gap-2 rounded-control px-1.5 text-caption font-semibold text-ink-muted disabled:cursor-default"
        >
          <span aria-hidden className="font-mono">{verb}</span>
          <span aria-hidden className={`relative h-6 w-10 rounded-node border-2 transition-colors ${on ? "border-accent-ink bg-accent" : "border-line-strong bg-surface-raised"}`}>
            <span className={`absolute top-0.5 size-4 rounded-node bg-surface shadow-card transition-[left] ${on ? "left-[18px]" : "left-0.5"}`} />
          </span>
        </button>
      );
    }
    if (control.kind !== "button") return null;
    const done = answer[control.id] === true;
    return (
      <button
        type="button"
        data-keyboard-passthrough
        disabled={locked || done}
        onClick={() => onAnswerChange({ ...answer, [control.id]: true })}
        aria-label={done ? (control.doneLabel ?? `${control.label}: done`) : control.label}
        className="min-h-11 rounded-control border border-line-strong bg-surface px-3 text-small font-semibold text-ink enabled:hover:border-accent-ink enabled:hover:text-accent-ink disabled:cursor-default disabled:text-ink-faint"
      >
        {done ? "Ended" : "End"}
      </button>
    );
  };
  const compact = otherControls.filter((c) => c.kind !== "slider").length >= 3;
  // A list (the task manager) needs the full width on phones: the device shows only its status.
  const listBeside = device.length > 0 && others.some((o) => o.kind === "list");

  return (
    <div>
      <CardPrompt>{card.prompt}</CardPrompt>
      <div className="mt-3 grid gap-3 sm:mt-5 sm:grid-cols-2 sm:gap-4">
        {/* On phones the device sits beside the other outputs, so the controls stay on screen. */}
        <section aria-label="What's happening" className={listBeside ? "sm:space-y-2.5" : device.length > 0 ? "flex items-start gap-3 sm:block sm:space-y-2.5" : "space-y-2.5"}>
          {device.map((o) => (
            <OutputView key={o.id} output={o} value={outputs[o.id]} statusOnlyOnPhones={listBeside} />
          ))}
          {others.length > 0 && (
            // Two or more number tiles sit side by side on phones (they're short on width, tall on height).
            <div className={`min-w-0 flex-1 ${device.length === 0 && others.length >= 2 && others.every((o) => o.kind === "meter") ? "grid grid-cols-2 gap-2.5" : "space-y-2.5"}`}>
              {listOutput && tiles.length >= 2 ? (
                // Beside a list, the number and bar tiles share a row on phones, so the list's rows stay on screen.
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 sm:gap-2.5">
                  {tiles.map((o) => (
                    <OutputView key={o.id} output={o} value={outputs[o.id]} inline />
                  ))}
                </div>
              ) : (
                tiles.map((o) => <OutputView key={o.id} output={o} value={outputs[o.id]} inline={Boolean(listOutput)} />)
              )}
              {listOutput && (
                <OutputView
                  output={listOutput}
                  value={outputs[listOutput.id]}
                  action={rowAction}
                  status={listBeside && typeof outputs[device[0]!.id] === "number" ? <DeviceStatus smooth={outputs[device[0]!.id] as number} label={device[0]!.label} /> : undefined}
                />
              )}
            </div>
          )}
        </section>
        {/* Three or more switches or buttons sit two to a row on phones, so every control stays on screen. */}
        {otherControls.length > 0 && (
          // Beside a list with its own row controls, what's left (a slider) comes first on phones: set it, then act on the rows.
          <section aria-label="Controls" className={`${rowControls.size > 0 ? "max-sm:order-first" : ""} ${compact ? "max-sm:grid max-sm:grid-cols-2 max-sm:gap-2 max-sm:[&>div]:col-span-2 sm:space-y-2" : "space-y-2"}`}>
            {otherControls.map((control) => (
              <ControlView
                key={control.id}
                card={card}
                control={control}
                value={answer[control.id] ?? initialValue(card, control)}
                locked={locked}
                onChange={(v) => onAnswerChange({ ...answer, [control.id]: v })}
                compact={compact}
              />
            ))}
          </section>
        )}
      </div>
      <CardStatusNote status={status} correctText="Goal reached" incorrectText="Not quite: the goal isn't met yet" />
    </div>
  );
}
