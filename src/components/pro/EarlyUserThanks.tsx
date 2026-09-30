"use client";

import { useState } from "react";
import { markGrantThankedAction } from "@/app/actions/pro";
import { Button } from "@/components/ui/Button";
import { usePro } from "@/lib/pro/ProProvider";
import { ProBadge } from "./ProBadge";

const dateFormat = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long" });

/**
 * The early-user thank-you on the dashboard: shown once, the first time an early account has its
 * 30 days of Pro. "Got it" records that it was seen (on the account, so it doesn't come back on
 * another device).
 */
export function EarlyUserThanks() {
  const { pro, refresh } = usePro();
  const [hidden, setHidden] = useState(false);
  if (hidden || pro.loading || pro.status.kind !== "grant" || pro.status.thanked) return null;
  const until = dateFormat.format(new Date(pro.status.expiresAt));

  return (
    <section aria-labelledby="thanks-title" className="mb-4 rounded-card border border-line-strong bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <ProBadge />
        <h2 id="thanks-title" className="text-lead font-semibold">
          Thank you for being early
        </h2>
      </div>
      <p className="mt-2 text-ink-muted">
        You were one of our first learners, so you have CyberNet Pro free until {until}: every module in every course. Nothing to
        set up, and nothing is charged.
      </p>
      <Button
        variant="secondary"
        className="mt-4"
        onClick={() => {
          setHidden(true);
          void markGrantThankedAction().then(refresh, console.error);
        }}
      >
        Got it
      </Button>
    </section>
  );
}
