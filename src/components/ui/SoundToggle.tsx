"use client";

import { useProgress } from "@/lib/progress/ProgressProvider";
import { playSound } from "@/lib/sound";
import { SoundOffIcon, SoundOnIcon } from "./icons";

/** Sound effects and haptics on/off. Saved with the learner's progress preferences. */
export function SoundToggle() {
  const { store, snapshot } = useProgress();
  const on = snapshot?.preferences.sound ?? true;
  const label = on ? "Turn sound off" : "Turn sound on";
  return (
    <button
      type="button"
      onClick={() => {
        void store.setPreferences({ sound: !on });
        if (!on) playSound("snap"); // a tiny confirmation when turning it on
      }}
      aria-label={label}
      aria-pressed={on}
      title={label}
      disabled={!snapshot}
      className="grid size-10 place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink disabled:opacity-40"
    >
      {on ? <SoundOnIcon className="size-5" /> : <SoundOffIcon className="size-5" />}
    </button>
  );
}
