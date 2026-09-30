"use client";

import { useReducedMotion } from "motion/react";
import { useMemo } from "react";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { type HapticKind, playSound, type SoundName, vibrate } from "./sound";

/**
 * Sound and haptics for UI moments, respecting the learner's sound preference (default on).
 * Haptics also follow the sound switch, and are off under prefers-reduced-motion.
 * Nothing plays before the first interaction (see `installAudioUnlock`).
 */
export function useFeedback() {
  const { snapshot } = useProgress();
  const reduceMotion = useReducedMotion();
  const enabled = snapshot?.preferences.sound ?? true;
  return useMemo(
    () => ({
      enabled,
      play(name: SoundName) {
        if (enabled) playSound(name);
      },
      haptic(kind: HapticKind) {
        if (enabled && !reduceMotion) vibrate(kind);
      },
    }),
    [enabled, reduceMotion],
  );
}
