"use client";

import { useState } from "react";
import type { Card } from "@/cards/schema";
import { type CoachKey, markCoachSeen, shouldShowCoach } from "@/lib/coach";
import { useProgress } from "@/lib/progress/ProgressProvider";

/**
 * The "how to play" panel for `card`, if the learner hasn't dismissed it before. `dismiss` hides
 * it at once and saves it in preferences, so it never shows again for this learner (synced when
 * signed in). Pressing Check with the panel open also counts: they've clearly found their way.
 */
export function useCoach(card: Card): { coachKey: CoachKey | null; dismiss: () => void } {
  const { store, snapshot } = useProgress();
  const [dismissed, setDismissed] = useState<ReadonlySet<CoachKey>>(() => new Set());
  const seen = snapshot?.preferences.coachSeen ?? [];
  const pending = shouldShowCoach(seen, card);
  const coachKey = pending && !dismissed.has(pending) ? pending : null;

  function dismiss() {
    if (!coachKey) return;
    setDismissed((current) => new Set(current).add(coachKey));
    void store.setPreferences({ coachSeen: markCoachSeen(seen, coachKey) });
  }

  return { coachKey, dismiss };
}
