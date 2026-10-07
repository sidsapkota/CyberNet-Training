"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { CountUp } from "@/components/ui/CountUp";
import { Button } from "@/components/ui/Button";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { dailyGoalLabel } from "@/lib/progress/daily";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { streakLabel } from "@/lib/progress/streak";
import { useDaily } from "@/lib/progress/useDaily";
import { GoalPicker } from "./GoalPicker";
import { StreakIcon } from "./StreakIcon";

/**
 * The daily goal on the lesson- and quiz-complete screens (which already show the celebrating
 * mascot): "Daily goal reached" if this lesson met it, otherwise today's progress. The first time,
 * it also asks for a daily goal, with Regular already selected.
 */
export function DailyGoalSummary({ goalMetNow, freezeEarned }: { goalMetNow: boolean; freezeEarned: boolean }) {
  const daily = useDaily();
  const { store, snapshot } = useProgress();
  const [justChose, setJustChose] = useState(false);
  if (!daily || !snapshot) return null;
  const { today, streak } = daily;
  const { dailyGoal, dailyGoalChosen } = snapshot.preferences;

  const choose = (goal = dailyGoal) => {
    setJustChose(true);
    void store.setPreferences({ dailyGoal: goal, dailyGoalChosen: true });
  };

  return (
    <div className="mx-auto mt-6 max-w-sm text-left">
      {goalMetNow ? (
        <div role="status" className="flex items-center gap-3 rounded-card border border-accent-ink bg-accent-soft p-4">
          {/* The streak grows on screen: the chain pops bigger and the count ticks up by one. */}
          <motion.span
            className="shrink-0 text-accent-ink"
            initial={{ scale: 0.6 }}
            animate={{ scale: [0.6, 1.25, 1] }}
            transition={{ delay: 1, duration: 0.6, ease: "easeOut" }}
          >
            <StreakIcon lit className="size-8" />
          </motion.span>
          <div>
            <p className="font-semibold">Daily goal reached</p>
            <p className="text-small text-ink-muted">
              <span className="sr-only">{streakLabel(streak.current)}</span>
              <span aria-hidden="true">
                <CountUp from={Math.max(streak.current - 1, 0)} value={streak.current} delay={1.1} className="font-mono tabular-nums" />
                -day streak
              </span>
              {freezeEarned && ". You earned a streak freeze"}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2.5 text-small text-ink-muted">
          <span aria-hidden="true">
            <ProgressRing value={today.xp / today.goal} size={28} stroke={4} label="Today's goal" delay={0.8} />
          </span>
          <span>
            <span className="font-mono tabular-nums">
              {Math.min(today.xp, today.goal)} of {today.goal} XP
            </span>{" "}
            today{today.met ? ". Goal met" : ""}
          </span>
        </div>
      )}

      {(!dailyGoalChosen || justChose) && (
        <div className="mt-6 rounded-card border border-line bg-surface p-4">
          {justChose ? (
            <p role="status" className="text-small">
              Daily goal set: <strong>{dailyGoalLabel(dailyGoal)}</strong>, {dailyGoal} XP a day. You can change it on
              the dashboard.
            </p>
          ) : (
            <>
              <GoalPicker legend="Pick a daily goal" value={dailyGoal} onChange={(goal) => choose(goal)} />
              <Button variant="secondary" onClick={() => choose()} className="mt-3 w-full">
                Keep {dailyGoalLabel(dailyGoal)}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
