"use client";

import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { DAILY_LESSON_LIMIT } from "@/lib/pro/dailyLimit";
import { usePro } from "@/lib/pro/ProProvider";

const DISMISSED_KEY = "cybernet.dailyLimitNotice.dismissed";

function wasDismissed(): boolean {
  try {
    return typeof window !== "undefined" && localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Tells a free account, once, how lessons work now: any lesson, a few new ones a day. Short notice,
 * no pressure; "Got it" hides it for good on this device.
 */
export function DailyLimitNotice() {
  const { auth, available } = useAuth();
  const { pro, hasPro } = usePro();
  const [hidden, setHidden] = useState(wasDismissed);
  if (hidden || !available || auth.status !== "signed-in" || pro.loading || hasPro) return null;

  return (
    <section aria-labelledby="daily-limit-title" className="mb-4 rounded-card border border-line-strong bg-surface p-5 shadow-card">
      <h2 id="daily-limit-title" className="text-lead font-semibold">
        Any lesson, {DAILY_LESSON_LIMIT} a day
      </h2>
      <p className="mt-2 text-ink-muted">
        Your free account opens any lesson in any course, up to {DAILY_LESSON_LIMIT} new lessons a day. Replays and the help lessons
        never count. Pro is unlimited.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            setHidden(true);
            try {
              localStorage.setItem(DISMISSED_KEY, "1");
            } catch {
              // storage blocked: it just shows again next time
            }
          }}
        >
          Got it
        </Button>
        <ButtonLink href="/pro" variant="ghost">
          About Pro
        </ButtonLink>
      </div>
    </section>
  );
}
