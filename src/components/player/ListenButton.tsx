"use client";

import { useEffect } from "react";
import { SoundOffIcon, SoundOnIcon } from "@/components/ui/icons";
import { useSpeech } from "@/lib/speech";

/**
 * "Listen" on a card: reads `text` aloud with the browser's own speech, from a tap only. Hidden when
 * the browser can't speak. Stops when the text changes (Check adds the explanation), and when the
 * card changes or the page closes (it unmounts). The speed is saved on this device.
 */
export function ListenButton({ text }: { text: string }) {
  const { supported, speaking, speak, stop, rate, setRate } = useSpeech();

  useEffect(() => stop, [text, stop]);

  if (!supported) return null;
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        data-keyboard-passthrough
        aria-pressed={speaking}
        onClick={() => (speaking ? stop() : speak(text))}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-control px-2.5 text-small font-semibold text-accent-ink hover:bg-surface-raised"
      >
        {speaking ? <SoundOffIcon className="size-4" /> : <SoundOnIcon className="size-4" />}
        {speaking ? "Stop" : "Listen"}
      </button>
      <button
        type="button"
        data-keyboard-passthrough
        onClick={() => {
          stop();
          setRate(rate === "normal" ? "slower" : "normal");
        }}
        aria-label={`Reading speed: ${rate}. Change it`}
        className="min-h-11 rounded-control px-2 text-caption text-ink-muted hover:bg-surface-raised hover:text-ink"
      >
        {rate === "normal" ? "Normal speed" : "Slower"}
      </button>
    </div>
  );
}
