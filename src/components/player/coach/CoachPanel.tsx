"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { XIcon } from "@/components/ui/icons";
import type { CoachKey } from "@/lib/coach";
import { DEMOS } from "./demos";

/** What each panel says: a short title and at most two short lines. */
export const COACH_COPY: Record<CoachKey, { title: string; lines: string[] }> = {
  numeric_input: { title: "Type a number", lines: ["Type your answer in the box, then press Check (or Enter)."] },
  binary_toggle: { title: "Flip the bits", lines: ["Tap a switch to turn it on or off.", "The number above them adds up the switches that are on."] },
  drag_to_order: {
    title: "Put them in order",
    lines: ["Drag each item up or down until the list is in order. On a phone, press and hold an item first.", "Keyboard: Space to pick up, arrows to move, Space to drop."],
  },
  match_pairs: { title: "Match the pairs", lines: ["Tap an item on the left, then its partner on the right.", "Tap a pair again to undo it."] },
  packet_path: {
    title: "Plan the route",
    lines: ["Start at the device marked From. Tap the next stop along a line, again and again, until you reach To.", "Tap the last stop again to undo."],
  },
  terminal: {
    title: "Use the terminal",
    lines: [
      "Type a command and press Enter. Type help to list the commands this one knows. Nothing really runs: it's a safe practice terminal.",
      "If there's a question, type your answer in the box under the terminal.",
    ],
  },
  "hotspot-explore": { title: "Explore the parts", lines: ["Tap each part to see what it is and what it does.", "Continue unlocks when you've tapped them all."] },
  "hotspot-tap": { title: "Find the part", lines: ["Tap the right part on the picture, then press Check.", "Tap it again to change your mind."] },
  "hotspot-label": { title: "Label the parts", lines: ["Tap a label, then tap the numbered spot it belongs on."] },
  teardown: {
    title: "Take it apart",
    lines: [
      "Tap a part to do the next step to it: unscrew, lift off, unplug… The order matters: too early, and you'll get a tip.",
      "Parts you take out wait in the Parts out tray. Tap one there to fit it back.",
    ],
  },
  simulator: {
    title: "Try it out",
    lines: ["Change the switches and sliders, and watch the readouts change.", "Press Check when the goal in the question is met."],
  },
  scenario: { title: "Choose what to do", lines: ["Read what's happening and tap what you'd do.", "Each choice shows what happens next."] },
  sort_bins: { title: "Sort them", lines: ["Tap an item, then tap the box it belongs in. Or drag it there."] },
  train_model: {
    title: "Teach the model",
    lines: ["Give each example its label, or tick the examples to train on.", "Then see what the model guesses about new ones."],
  },
  next_word: {
    title: "Guess the next word",
    lines: ["Pick the word you think comes next, or move the slider and watch the chances change."],
  },
};

/**
 * First-time "how to play" panel, shown above a card the first time the learner meets its
 * interaction style. Not a blocking overlay: the card stays usable underneath. "Got it" or ✕
 * dismisses it for good (the parent saves that in preferences).
 */
export function CoachPanel({ coachKey, onDone }: { coachKey: CoachKey; onDone: () => void }) {
  const titleId = useId();
  const [run, setRun] = useState(0);
  const copy = COACH_COPY[coachKey];
  const Demo = DEMOS[coachKey];
  return (
    <section aria-labelledby={titleId} className="mb-6 rounded-card border-2 border-accent-ink bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-caption tracking-widest text-ink-muted uppercase">How to play</p>
          <h2 id={titleId} className="mt-1 text-lead font-semibold text-ink">
            {copy.title}
          </h2>
        </div>
        <button
          type="button"
          data-keyboard-passthrough
          onClick={onDone}
          aria-label="Skip how to play"
          className="-m-2 grid size-11 shrink-0 place-items-center rounded-control text-ink-muted hover:bg-surface-raised hover:text-ink"
        >
          <XIcon className="size-5" />
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
        <svg key={run} viewBox="0 0 240 96" aria-hidden="true" className="h-24 w-full max-w-60 shrink-0 self-center">
          <Demo />
        </svg>
        <div className="min-w-0 flex-1 space-y-1 text-body text-ink">
          {copy.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          data-keyboard-passthrough
          onClick={() => setRun((r) => r + 1)}
          className="min-h-11 text-small font-semibold text-ink-muted underline-offset-2 hover:text-ink hover:underline"
        >
          Show again
        </button>
        <Button data-keyboard-passthrough onClick={onDone} className="min-w-32">
          Got it
        </Button>
      </div>
    </section>
  );
}
