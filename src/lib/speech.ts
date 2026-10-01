"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * "Listen": the browser's own speech (Web Speech API, `speechSynthesis`). No paid service, no audio
 * files, nothing sent anywhere by us. Never autoplays: speech starts only from a tap. The speed
 * (slower or normal) is saved on this device.
 */
export type SpeechRate = "slower" | "normal";
const RATE_KEY = "cybernet.listen.rate";
const RATES: Record<SpeechRate, number> = { slower: 0.8, normal: 1 };

function readRate(): SpeechRate {
  try {
    return localStorage.getItem(RATE_KEY) === "slower" ? "slower" : "normal";
  } catch {
    return "normal";
  }
}

/** An English voice for the learner's locale (en-AU, en-GB…), else any English one. */
function pickVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | null {
  const voices = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
  const want = (navigator.language || "en-AU").toLowerCase();
  return voices.find((v) => v.lang.toLowerCase() === want && v.localService) ?? voices.find((v) => v.lang.toLowerCase() === want) ?? voices.find((v) => v.localService) ?? voices[0] ?? null;
}

export function useSpeech() {
  // Known only after mount (the server has no speech), so the button never flashes in and out.
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [rate, setRateState] = useState<SpeechRate>("normal");
  const current = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSupported(typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined");
      setRateState(readRate());
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    current.current = null;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!("speechSynthesis" in window) || !text) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = pickVoice(synth);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else utterance.lang = "en-AU";
      utterance.rate = RATES[readRate()];
      utterance.onend = utterance.onerror = () => {
        if (current.current === utterance) {
          current.current = null;
          setSpeaking(false);
        }
      };
      current.current = utterance;
      setSpeaking(true);
      synth.speak(utterance);
    },
    [],
  );

  const setRate = useCallback((next: SpeechRate) => {
    setRateState(next);
    try {
      localStorage.setItem(RATE_KEY, next);
    } catch {
      // storage blocked: the speed just isn't remembered
    }
  }, []);

  // Leaving the page (or the card) always stops speech.
  useEffect(() => stop, [stop]);

  return { supported, speaking, speak, stop, rate, setRate };
}
