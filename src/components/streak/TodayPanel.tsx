"use client";

import { useId, useState } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { CheckIcon, ChevronDownIcon, FreezeIcon, GoalIcon } from "@/components/ui/icons";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { dailyGoalLabel } from "@/lib/progress/daily";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { MAX_FREEZES, streakSummary } from "@/lib/progress/streak";
import { useDaily } from "@/lib/progress/useDaily";
import { GoalPicker } from "./GoalPicker";
import { StreakCalendar } from "./StreakCalendar";
import { StreakIcon } from "./StreakIcon";

/**
 * The dashboard's "Today" panel: the goal ring (fills live as XP comes in), the streak, streak
 * freezes held, this month's calendar and the goal setting. After a streak ends it shows a gentle
 * "fresh start" note instead of what was lost.
 */
export function TodayPanel({ className = "" }: { className?: string }) {
  const daily = useDaily();
  const { store, snapshot } = useProgress();
  const [editing, setEditing] = useState(false);
  const pickerId = useId();
  if (!daily || !snapshot) return null;
  const { today, streak } = daily;
  const goal = snapshot.preferences.dailyGoal;

  return (
    <section aria-labelledby="today-title" className={`${className} p-5`}>
      <h2 id="today-title" className="text-lead font-semibold">
        Today
      </h2>
      <p className="sr-only" aria-live="polite">
        {streakSummary(daily)}
      </p>

      <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-5" aria-hidden="true">
          <ProgressRing
            value={today.xp / today.goal}
            size={104}
            stroke={9}
            label={`${Math.min(today.xp, today.goal)} of ${today.goal} XP today`}
          >
            {today.met ? (
              <CheckIcon className="size-9 text-accent-ink" />
            ) : (
              <span className="font-mono text-title font-semibold tabular-nums">
                {today.xp}
                <span className="text-caption text-ink-faint">/{today.goal}</span>
              </span>
            )}
          </ProgressRing>
          <div>
            <p className={`flex items-center gap-2 font-mono text-headline font-semibold tabular-nums ${streak.current ? "text-accent-ink" : "text-ink-muted"}`}>
              <StreakIcon lit={today.met} className="size-7" />
              {streak.current}
            </p>
            <p className="text-small text-ink-muted">{streak.current === 1 ? "day" : "days"} in a row</p>
            <p className="mt-2 flex items-center gap-1.5 text-small text-ink-muted">
              <FreezeIcon className="size-4" />
              {streak.freezes} of {MAX_FREEZES} freezes
            </p>
          </div>
        </div>
        <StreakCalendar
          today={today.day}
          metDays={new Set(Object.keys(snapshot.goalDays))}
          frozenDays={new Set(streak.frozenDays)}
        />
      </div>
      <p className="sr-only">
        {streak.freezes} of {MAX_FREEZES} streak freezes held.
      </p>

      {streak.ended && !today.met && (
        <div className="mt-5 flex items-center gap-3 rounded-card border border-line bg-surface-raised p-4">
          <Mascot expression="presenting" size={64} />
          <div>
            <p className="font-semibold">Fresh start</p>
            <p className="text-small text-ink-muted">
              Your XP and lessons are all still here. Reach today&apos;s goal to start a new streak.
            </p>
          </div>
        </div>
      )}

      <details className="group mt-5 text-small">
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 font-semibold text-ink-muted hover:text-ink [&::-webkit-details-marker]:hidden">
          How streaks work
          <ChevronDownIcon className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-ink-muted">
          <li>Reach your daily goal to add a day to your streak.</li>
          <li>Replaying lessons you&apos;ve finished counts toward today&apos;s goal too.</li>
          <li>Every 7 days in a row earns a streak freeze (you can hold {MAX_FREEZES}).</li>
          <li>A freeze covers a missed day for you, automatically.</li>
        </ul>
      </details>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <p className="flex items-center gap-1.5 text-small text-ink-muted">
          <GoalIcon className="size-4" />
          {dailyGoalLabel(goal)}: {goal} XP a day
        </p>
        <button
          type="button"
          aria-expanded={editing}
          aria-controls={pickerId}
          onClick={() => setEditing((v) => !v)}
          className="min-h-11 rounded-control px-2 text-small font-semibold text-accent-ink underline-offset-2 hover:underline"
        >
          {editing ? "Done" : "Change goal"}
        </button>
      </div>
      <div id={pickerId} hidden={!editing} className="mt-2">
        {editing && (
          <GoalPicker
            value={goal}
            onChange={(dailyGoal) => void store.setPreferences({ dailyGoal, dailyGoalChosen: true })}
          />
        )}
      </div>
    </section>
  );
}
