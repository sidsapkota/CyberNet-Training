"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { ExploreModeIcon, PathModeIcon } from "@/components/ui/icons";
import { PRESS_SPRING } from "@/lib/motion";
import { useProgress } from "@/lib/progress/ProgressProvider";
import type { LearningMode } from "@/lib/progress/types";

const OPTIONS = [
  { mode: "path", label: "Path", Icon: PathModeIcon },
  { mode: "explore", label: "Explore", Icon: ExploreModeIcon },
] as const;

/**
 * Path (unlock in order) or Explore (everything open). Two native radio buttons, so keyboard and
 * screen readers work without extra code. The choice is saved with progress.
 */
export function ModeToggle({ className = "" }: { className?: string }) {
  const { store, snapshot } = useProgress();
  const current: LearningMode = snapshot?.preferences.mode ?? "path";
  // The toggle appears twice (phone header, desktop side panel); each needs its own radio group.
  const name = useId();

  return (
    <fieldset className={className}>
      <legend className="sr-only">Learning mode</legend>
      <div className="grid grid-cols-2 gap-1 rounded-control border border-line bg-surface-raised p-1">
        {OPTIONS.map(({ mode, label, Icon }) => {
          const active = current === mode;
          return (
            <label key={mode} className="relative cursor-pointer">
              <input
                type="radio"
                name={name}
                value={mode}
                checked={active}
                onChange={() => void store.setPreferences({ mode })}
                className="peer sr-only"
              />
              {active && (
                <motion.span
                  layoutId={`${name}-pill`}
                  transition={PRESS_SPRING}
                  aria-hidden="true"
                  className="absolute inset-0 rounded-sm border border-accent-ink bg-surface shadow-card"
                />
              )}
              <span
                className={`relative flex min-h-10 items-center justify-center gap-1.5 rounded-sm text-small font-semibold transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-ink ${
                  active ? "text-accent-ink" : "text-ink-muted hover:text-ink"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
