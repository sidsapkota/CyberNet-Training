"use client";

import { useId } from "react";
import { CheckIcon } from "@/components/ui/icons";
import { DAILY_GOALS, type DailyGoal } from "@/lib/progress/daily";

/** Roughly what each goal takes, so the choice means something (a lesson pays 100 to 120 XP). */
const EFFORT: Record<DailyGoal, string> = {
  20: "About two cards a day.",
  50: "About half a lesson a day.",
  100: "About one lesson a day.",
};

/**
 * The daily goal choice: three native radio buttons drawn as tiles (arrow keys move between them).
 * The selected one has a check as well as the cyan border, so it's never colour alone.
 */
export function GoalPicker({
  value,
  onChange,
  legend = "Daily goal",
}: {
  value: DailyGoal;
  onChange: (goal: DailyGoal) => void;
  legend?: string;
}) {
  const name = useId();
  const effortId = useId();
  return (
    <fieldset aria-describedby={effortId}>
      <legend className="text-small font-semibold">{legend}</legend>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {DAILY_GOALS.map((goal) => {
          const checked = goal.xp === value;
          return (
            <label
              key={goal.xp}
              className={`relative flex min-h-16 cursor-pointer flex-col items-center justify-center rounded-control border-2 p-2 text-center transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-ink ${
                checked ? "border-accent-ink bg-accent-soft" : "border-line bg-surface hover:border-line-strong"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={goal.xp}
                checked={checked}
                onChange={() => onChange(goal.xp)}
                className="sr-only"
              />
              <span className="text-body font-semibold">{goal.label}</span>
              <span className={`inline-flex items-center gap-1 font-mono text-caption ${checked ? "text-accent-ink" : "text-ink-muted"}`}>
                {checked && <CheckIcon className="size-3.5" />}
                {goal.xp} XP
              </span>
            </label>
          );
        })}
      </div>
      <p id={effortId} className="mt-2 text-small text-ink-muted">
        {EFFORT[value]}
      </p>
    </fieldset>
  );
}
