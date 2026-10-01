"use client";

import { useState } from "react";
import { openPortalAction, startCheckoutAction } from "@/app/actions/pro";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SignInIcon } from "@/components/ui/icons";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { Plan } from "@/lib/pro/env";
import { usePro } from "@/lib/pro/ProProvider";

/**
 * A plan's button on /pro. Guests sign in first (Pro belongs to an account). Learners with a
 * subscription manage it instead. Otherwise it opens Stripe's hosted Checkout: card details go to
 * Stripe, never to this site.
 */
export function PlanButton({ plan, label, primary }: { plan: Plan; label: string; primary: boolean }) {
  const { auth, available } = useAuth();
  const { pro } = usePro();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!available || auth.status === "guest") {
    return (
      <ButtonLink href="/login" variant={primary ? "primary" : "secondary"} className="w-full">
        <SignInIcon className="size-5" /> Sign in to subscribe
      </ButtonLink>
    );
  }
  if (auth.status === "loading" || pro.loading) {
    return (
      <Button variant={primary ? "primary" : "secondary"} className="w-full" disabled>
        {label}
      </Button>
    );
  }
  if (pro.status.kind === "subscription") {
    return (
      <Button
        variant="secondary"
        className="w-full"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const result = await openPortalAction();
          if ("url" in result) window.location.assign(result.url);
          else {
            setError(result.error);
            setBusy(false);
          }
        }}
      >
        Manage subscription
      </Button>
    );
  }

  return (
    <div>
      <Button
        variant={primary ? "primary" : "secondary"}
        className="w-full"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const result = await startCheckoutAction(plan);
            if ("url" in result) {
              trackEvent("checkout_started");
              window.location.assign(result.url);
              return;
            }
            setError(result.error);
          } catch {
            setError("Something went wrong. Please try again.");
          }
          setBusy(false);
        }}
      >
        {busy ? "Opening checkout…" : pro.trialEligible ? "Start 7-day free trial" : label}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-small text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
