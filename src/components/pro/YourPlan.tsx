"use client";

import Link from "next/link";
import { useState } from "react";
import { openPortalAction } from "@/app/actions/pro";
import { NetworkMark } from "@/components/network/NetworkMark";
import { Button } from "@/components/ui/Button";
import { BackIcon, CheckIcon } from "@/components/ui/icons";
import { proLine } from "@/lib/pro/describe";
import { PRO_BENEFITS } from "@/lib/pro/plans";
import { usePro } from "@/lib/pro/ProProvider";
import { PlansCards } from "./PlansCards";
import { FounderBadge } from "./Founder";
import { ProBadge } from "./ProBadge";
import { usePitchPrices } from "./ProPitch";

/**
 * "Your plan": for Pro members, the plan, when it renews or the trial ends, what's included and
 * "Manage subscription" (Stripe's portal). Free learners see the plans section instead.
 */
export function YourPlan() {
  const { pro, hasPro } = usePro();
  const prices = usePitchPrices(hasPro ? null : undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-page">
      <Link href="/account" className="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-small font-semibold text-ink-muted hover:text-ink">
        <BackIcon className="size-4" /> Account
      </Link>
      <h1 className="mt-2 text-headline font-semibold">Your plan</h1>

      {pro.loading ? (
        <div className="grid min-h-60 place-items-center">
          <NetworkMark mode="loading" className="size-16" label="Loading your plan" />
        </div>
      ) : hasPro ? (
        <section aria-labelledby="your-plan-name" className="mt-5 rounded-card border-2 border-accent-ink bg-surface p-5 shadow-pro-card">
          <div className="flex items-center gap-2">
            <h2 id="your-plan-name" className="text-title font-semibold">
              Pro
            </h2>
            {pro.status.kind === "founder" ? <FounderBadge lit /> : <ProBadge lit />}
          </div>
          <p className="mt-1 text-ink-muted">{proLine(pro.status)}</p>
          <h3 className="mt-5 font-semibold">Included</h3>
          <ul className="mt-2 grid gap-2">
            {PRO_BENEFITS.map((b) => (
              <li key={b} className="flex items-center gap-2.5">
                <CheckIcon className="size-4 shrink-0 text-ink-muted" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          {pro.status.kind === "subscription" && (
            <div className="mt-5">
              <Button
                variant={pro.status.status === "past_due" ? "primary" : "secondary"}
                className="w-full sm:w-auto"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  const result = await openPortalAction();
                  if ("url" in result) window.location.assign(result.url);
                  else {
                    setError(result.error);
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Opening…" : "Manage subscription"}
              </Button>
              <p className="mt-2 text-caption text-ink-muted">Change plan, update your card or cancel, on Stripe&apos;s secure page.</p>
              {error && (
                <p role="alert" className="mt-2 text-small text-danger">
                  {error}
                </p>
              )}
            </div>
          )}
        </section>
      ) : (
        <div className="mt-2">
          <p className="text-ink-muted">You&apos;re on the free plan.</p>
          <div className="mt-6">
            <PlansCards prices={prices} source="account" />
          </div>
        </div>
      )}
    </div>
  );
}
