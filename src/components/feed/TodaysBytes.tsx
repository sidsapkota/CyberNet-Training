"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { CheckIcon, PlayIcon } from "@/components/ui/icons";
import { useAuth } from "@/lib/auth/AuthProvider";
import { DAILY_BYTES } from "@/lib/feed/rules";
import { bytesLeft, type FeedDay, feedBytesOn, readFeedDay } from "@/lib/feed/today";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { useDaily } from "@/lib/progress/useDaily";

/** The dashboard's Feed row, under Continue: today's 3 bytes, how many are left, and Play. */
export function TodaysBytes({ className = "" }: { className?: string }) {
  const { snapshot } = useProgress();
  const { auth } = useAuth();
  const daily = useDaily();
  const [saved, setSaved] = useState<FeedDay | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- this device's record is in localStorage, read after mount
  useEffect(() => setSaved(readFeedDay()), []);
  if (!snapshot || !daily) return null;

  const who = auth.status === "signed-in" ? auth.userId : "guest";
  const left = bytesLeft(saved, feedBytesOn(snapshot.xpEvents, daily.today.day), daily.today.day, who);
  return (
    <section aria-labelledby="bytes-title" className={`flex items-center gap-4 p-4 ${className}`}>
      <span className={`grid size-11 shrink-0 place-items-center rounded-control ${left ? "bg-accent-soft text-accent-ink" : "bg-success-soft text-success"}`}>
        {left ? <PlayIcon className="size-5" /> : <CheckIcon className="size-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <h2 id="bytes-title" className="font-semibold">
          Today&apos;s bytes
        </h2>
        <p className="text-small text-ink-muted">
          {left === DAILY_BYTES ? `${DAILY_BYTES} quick questions` : left ? `${left} left today` : "Done. Back tomorrow."}
        </p>
      </div>
      {left > 0 && (
        <ButtonLink href="/feed" variant="secondary" className="shrink-0">
          Play
        </ButtonLink>
      )}
    </section>
  );
}
