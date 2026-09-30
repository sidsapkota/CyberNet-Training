"use client";

import { useState } from "react";
import { openPortalAction } from "@/app/actions/pro";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { proLine } from "@/lib/pro/describe";
import { usePro } from "@/lib/pro/ProProvider";
import { ProBadge } from "./ProBadge";

/**
 * CyberNet Pro on /account: the learner's plan in one line, and Stripe's Customer Portal to switch
 * plans, update the card or cancel (Stripe returns here afterwards). Learners without a
 * subscription get a link to /pro.
 */
export function ManageProPanel({ className }: { className: string }) {
  const { available } = useAuth();
  const { pro } = usePro();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!available || pro.loading || !pro.available) return null;

  const subscribed = pro.status.kind === "subscription";
  return (
    <section aria-labelledby="pro-heading" className={className}>
      <div className="flex items-center gap-2">
        <h2 id="pro-heading" className="font-semibold">
          CyberNet Pro
        </h2>
        {pro.hasPro && <ProBadge size="sm" />}
      </div>
      <p className="mt-1 text-small text-ink-muted">{proLine(pro.status)}</p>
      <div className="mt-4">
        {subscribed ? (
          <Button
            variant={pro.status.kind === "subscription" && pro.status.status === "past_due" ? "primary" : "secondary"}
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
        ) : (
          <ButtonLink href="/pro" variant={pro.hasPro ? "secondary" : "primary"}>
            {pro.status.kind === "none" && pro.status.hadSubscription ? "Come back to Pro" : "See Pro"}
          </ButtonLink>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-small text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
