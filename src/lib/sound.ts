/**
 * Sound effects, synthesised with the Web Audio API: short oscillator notes with soft envelopes.
 * There are no audio files: every sound is original and defined here, so there's nothing to
 * license. (CLAUDE.md → Brand → Sound records this.)
 *
 * Browsers block audio until the user interacts, and we go further: nothing can play until the
 * first tap, click or key press on the page (`installAudioUnlock`). Before that, playSound is a
 * silent no-op. Whether sound is on at all is a learner preference, checked by `useFeedback()`.
 */

export type SoundName = "correct" | "wrong" | "complete" | "lessonComplete" | "goal" | "remove" | "snap";

interface Note {
  /** Hz; `to` glides the pitch over the note. */
  freq: number;
  to?: number;
  /** Seconds from the start of the sound. */
  at: number;
  dur: number;
  wave?: OscillatorType;
  /** Peak gain before the master volume (0 to 1). */
  gain?: number;
}

/** Every sound, as data. Kept quiet and short (< 300 ms except the lesson chime). */
export const SOUNDS: Record<SoundName, Note[]> = {
  correct: [
    { freq: 660, at: 0, dur: 0.09, gain: 0.5 },
    { freq: 990, at: 0.07, dur: 0.14, gain: 0.5 },
  ],
  wrong: [{ freq: 240, to: 170, at: 0, dur: 0.18, wave: "triangle", gain: 0.55 }],
  complete: [{ freq: 1180, at: 0, dur: 0.05, gain: 0.25 }],
  lessonComplete: [
    { freq: 523.25, at: 0, dur: 0.12, gain: 0.45 },
    { freq: 659.25, at: 0.1, dur: 0.12, gain: 0.45 },
    { freq: 783.99, at: 0.2, dur: 0.38, gain: 0.5 },
  ],
  // Daily goal reached: a quick rising three-note figure, brighter than "correct".
  goal: [
    { freq: 783.99, at: 0, dur: 0.1, gain: 0.4 },
    { freq: 987.77, at: 0.08, dur: 0.1, gain: 0.4 },
    { freq: 1318.51, at: 0.16, dur: 0.13, gain: 0.45 },
  ],
  remove: [
    { freq: 1500, to: 900, at: 0, dur: 0.05, wave: "triangle", gain: 0.35 },
    { freq: 520, at: 0.03, dur: 0.06, wave: "triangle", gain: 0.25 },
  ],
  snap: [{ freq: 880, to: 1320, at: 0, dur: 0.07, gain: 0.4 }],
};

const MASTER_VOLUME = 0.18;

let context: AudioContext | null = null;
let unlocked = false;
let listening = false;

/** Call once on the client. Audio unlocks on the first real interaction, never before. */
export function installAudioUnlock(): void {
  if (typeof window === "undefined" || listening || unlocked) return;
  listening = true;
  const unlock = () => {
    unlocked = true;
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx && !context) context = new Ctx();
      void context?.resume();
    } catch {
      context = null; // no audio support: stay silent
    }
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("keydown", unlock, true);
  };
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("keydown", unlock, true);
}

export function audioUnlocked(): boolean {
  return unlocked && context !== null;
}

export function playSound(name: SoundName): void {
  if (!unlocked || !context) return;
  const ctx = context;
  const start = ctx.currentTime + 0.005;
  for (const note of SOUNDS[name]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = note.wave ?? "sine";
    const t0 = start + note.at;
    const t1 = t0 + note.dur;
    osc.frequency.setValueAtTime(note.freq, t0);
    if (note.to) osc.frequency.exponentialRampToValueAtTime(note.to, t1);
    const peak = (note.gain ?? 0.4) * MASTER_VOLUME;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t1);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t1 + 0.02);
  }
}

export type HapticKind = "tap" | "success" | "error";
export const HAPTICS: Record<HapticKind, number | number[]> = {
  tap: 10,
  success: 12,
  error: [20, 40, 20],
};

/** Light vibration where supported (Android browsers; iOS Safari ignores it). */
export function vibrate(kind: HapticKind): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(HAPTICS[kind]);
  } catch {
    // Some browsers throw when vibration is blocked; it's only a nicety.
  }
}
