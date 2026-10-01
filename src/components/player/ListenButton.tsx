"use client";

import { useEffect } from "react";
import { SoundOffIcon, SoundOnIcon } from "@/components/ui/icons";
import { useSpeech } from "@/lib/speech";

/**
 * "Listen" in the player header: an icon button that reads `text` aloud with the browser's own
 * speech, from a tap only. Hidden when the browser can't speak. Stops when the text changes (Check
 * adds the explanation), and when the card changes or the page closes (it unmounts). The reading
 * speed is set in the lesson menu (`ReadingSpeed`) and saved on this device.
 */
export function ListenButton({ text }: { text: string }) {
  const { supported, speaking, speak, stop } = useSpeech();

  useEffect(() => stop, [text, stop]);

  if (!supported) return null;
  return (
    <button
      type="button"
      data-keyboard-passthrough
      aria-pressed={speaking}
      aria-label={speaking ? "Stop reading" : "Listen"}
      title={speaking ? "Stop reading" : "Listen to this card"}
      onClick={() => (speaking ? stop() : speak(text))}
      className={`grid size-11 shrink-0 place-items-center rounded-control transition-colors hover:bg-surface-raised ${
        speaking ? "text-accent-ink" : "text-ink-muted hover:text-ink"
      }`}
    >
      {speaking ? <SoundOffIcon className="size-5" /> : <SoundOnIcon className="size-5" />}
    </button>
  );
}

/** "Listen speed: Normal / Slower", in the lesson menu. Hidden without speech. */
export function ReadingSpeed() {
  const { supported, stop, rate, setRate } = useSpeech();
  if (!supported) return null;
  return (
    <button
      type="button"
      onClick={() => {
        stop();
        setRate(rate === "normal" ? "slower" : "normal");
      }}
      aria-label={`Listen speed: ${rate}. Change it`}
      className="mt-3 flex min-h-11 w-full items-center justify-between gap-3 rounded-control px-2 text-small text-ink-muted hover:bg-surface-raised hover:text-ink"
    >
      <span className="inline-flex items-center gap-2">
        <SoundOnIcon className="size-4" />
        Listen speed
      </span>
      <span className="font-semibold text-ink">{rate === "normal" ? "Normal" : "Slower"}</span>
    </button>
  );
}
