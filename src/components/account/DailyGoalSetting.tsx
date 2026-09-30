"use client";

import { GoalPicker } from "@/components/streak/GoalPicker";
import { useProgress } from "@/lib/progress/ProgressProvider";

/** The daily goal on /account. Saved as soon as it's picked (to the account, like other settings). */
export function DailyGoalSetting({ className = "" }: { className?: string }) {
  const { store, snapshot } = useProgress();
  if (!snapshot) return null;
  return (
    <div className={className}>
      <GoalPicker
        value={snapshot.preferences.dailyGoal}
        onChange={(dailyGoal) => void store.setPreferences({ dailyGoal, dailyGoalChosen: true })}
      />
    </div>
  );
}
