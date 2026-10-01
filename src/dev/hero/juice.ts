"use client";
/**
 * Prototype "juice" for /dev/hero: sounds through Howler (synthesised in the browser, so there are
 * still no audio files to license), a tiny vibration, brand colours from the theme tokens, a
 * slow-device check for the fallbacks, and the marks the perf script reads (window.__hero).
 */
import { Howl } from "howler";

type SpriteName = "snap" | "whoosh" | "ding" | "soft";
const VOICES: Record<SpriteName, { freq: [number, number]; ms: number; type: OscillatorType; gain: number }> = {
  snap: { freq: [880, 660], ms: 70, type: "triangle", gain: 0.25 },
  whoosh: { freq: [300, 900], ms: 220, type: "sine", gain: 0.12 },
  ding: { freq: [988, 1319], ms: 260, type: "sine", gain: 0.22 },
  soft: { freq: [330, 247], ms: 180, type: "sine", gain: 0.16 },
};

/** Renders the four voices back to back into one WAV (a Howler sprite). */
async function renderSprite(): Promise<{ url: string; sprite: Record<SpriteName, [number, number]> }> {
  const rate = 22050;
  const gap = 0.05;
  const names = Object.keys(VOICES) as SpriteName[];
  const total = names.reduce((s, n) => s + VOICES[n].ms / 1000 + gap, 0);
  const ctx = new OfflineAudioContext(1, Math.ceil(total * rate), rate);
  const sprite = {} as Record<SpriteName, [number, number]>;
  let t = 0;
  for (const name of names) {
    const v = VOICES[name];
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = v.type;
    osc.frequency.setValueAtTime(v.freq[0], t);
    osc.frequency.exponentialRampToValueAtTime(v.freq[1], t + v.ms / 1000);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(v.gain, t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, t + v.ms / 1000);
    osc.connect(env).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + v.ms / 1000);
    sprite[name] = [Math.round(t * 1000), v.ms];
    t += v.ms / 1000 + gap;
  }
  const buffer = await ctx.startRendering();
  const data = buffer.getChannelData(0);
  const wav = new DataView(new ArrayBuffer(44 + data.length * 2));
  const str = (o: number, s: string) => [...s].forEach((c, i) => wav.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  wav.setUint32(4, 36 + data.length * 2, true);
  str(8, "WAVEfmt ");
  wav.setUint32(16, 16, true);
  wav.setUint16(20, 1, true);
  wav.setUint16(22, 1, true);
  wav.setUint32(24, rate, true);
  wav.setUint32(28, rate * 2, true);
  wav.setUint16(32, 2, true);
  wav.setUint16(34, 16, true);
  str(36, "data");
  wav.setUint32(40, data.length * 2, true);
  data.forEach((s, i) => wav.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 0x7fff, true));
  return { url: URL.createObjectURL(new Blob([wav.buffer], { type: "audio/wav" })), sprite };
}

let howl: Promise<Howl> | null = null;
/** Plays a sound (only after a tap; the caller passes the learner's sound setting). */
export function play(name: SpriteName, enabled: boolean) {
  if (!enabled || typeof window === "undefined") return;
  howl ??= renderSprite().then(({ url, sprite }) => new Howl({ src: [url], format: ["wav"], sprite }));
  void howl.then((h) => h.play(name));
}

/** A tiny vibration on correct answers (Android; iOS ignores it). Off with reduced motion. */
export function buzz(reduceMotion: boolean | null) {
  if (!reduceMotion && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(12);
}

/** A theme token resolved to a colour string (light-dark() resolved for the current theme). */
export function tokenColor(name: string): string {
  if (typeof document === "undefined") return "#00c2ff";
  const probe = document.createElement("span");
  probe.style.color = `var(--color-${name})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

/** True on devices that should get the simple 2D version straight away. */
export function looksSlow(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { deviceMemory?: number };
  return (nav.hardwareConcurrency ?? 8) <= 2 || (nav.deviceMemory ?? 8) <= 2;
}

/** The reader's reduced-motion setting, read once (the heroes only render in the browser). */
export const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Measures the frame rate over `ms`; resolves with frames per second. */
export function measureFps(ms = 1000): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0;
    const start = performance.now();
    const tick = (now: number) => {
      frames++;
      if (now - start < ms) requestAnimationFrame(tick);
      else resolve((frames * 1000) / (now - start));
    };
    requestAnimationFrame(tick);
  });
}

declare global {
  interface Window {
    __hero?: { ready?: number; fallback?: string };
  }
}
/** Marks the hero as touchable (read by scripts/e2e/hero-perf.mjs). */
export function markReady(fallback?: string) {
  if (typeof window !== "undefined") window.__hero = { ready: performance.now(), ...(fallback ? { fallback } : {}) };
}
