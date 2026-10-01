"use client";

import { useEffect, useRef } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { Button } from "@/components/ui/Button";
import { DECLINE_REASONS, type DeclineReason } from "@/lib/pro/declined";

/**
 * "What's stopping you?": one optional question after "Not now" on a Pro screen, in the same place.
 * One tap answers and carries on to wherever "Not now" was going; Skip does the same. No pressure,
 * no follow-up pitch.
 */
export function DeclinedQuestion({
  onAnswer,
  headingLevel = 1,
}: {
  onAnswer: (reason: DeclineReason) => void;
  headingLevel?: 1 | 2;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const Heading = headingLevel === 1 ? "h1" : "h2";

  // The pitch was just swapped for this question: move focus here so screen readers hear it.
  useEffect(() => heading.current?.focus(), []);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center text-center">
      <Mascot expression="thinking" size={64} />
      <Heading ref={heading} tabIndex={-1} className="mt-2 text-title font-semibold text-balance outline-none">
        What&apos;s stopping you?
      </Heading>
      <p className="mt-1 text-ink-muted">Optional. One tap helps us improve.</p>
      <div className="mt-4 grid w-full gap-2">
        {DECLINE_REASONS.map((r) => (
          <Button key={r.id} variant="secondary" className="w-full" onClick={() => onAnswer(r.id)}>
            {r.label}
          </Button>
        ))}
        <Button variant="ghost" className="w-full" onClick={() => onAnswer("skipped")}>
          Skip
        </Button>
      </div>
    </div>
  );
}
