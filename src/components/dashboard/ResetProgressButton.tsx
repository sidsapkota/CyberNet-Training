"use client";

import { useProgress } from "@/lib/progress/ProgressProvider";

export function ResetProgressButton() {
  const { store, snapshot } = useProgress();
  const hasProgress = snapshot !== null && snapshot.totalXp + Object.keys(snapshot.cards).length > 0;
  if (!hasProgress) return null;

  return (
    <button
      type="button"
      onClick={() => {
        if (window.confirm("Reset all your progress and XP? This can't be undone.")) {
          void store.resetAll();
        }
      }}
      className="text-small text-ink-faint underline-offset-2 hover:text-ink-muted hover:underline"
    >
      Reset all progress
    </button>
  );
}
