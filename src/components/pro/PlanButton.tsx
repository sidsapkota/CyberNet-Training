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
export function PlanButton({
  plan,
  label,
  primary,
  big = false,
  onSelect,
}: {
  plan: Plan;
  label: string;
  primary: boolean;
  big?: boolean;
  /** Called when the learner picks this plan (before Checkout opens). */
  onSelect?: () => void;
}) {
  const { auth, available } = useAuth();
  const { pro } = usePro();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The Pro screens' one big button (with the usual press feedback).
  const size = big ? "w-full min-h-14 text-lead active:scale-[0.98]" : "w-full";

  if (!available || auth.status === "guest") {
    return (
      <ButtonLink href="/login?next=/pro" variant={primary ? "primary" : "secondary"} className={size} onClick={onSelect}>
        <SignInIcon className="size-5" /> Start your free trial
      </ButtonLink>
    );
  }
  if (auth.status === "loading" || pro.loading) {
    return (
      <Button variant={primary ? "primary" : "secondary"} className={size} disabled>
        {label}
      </Button>
    );
  }
  if (pro.status.kind === "subscription") {
    return (
      <Button
        variant="secondary"
        className={size}
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
        className={size}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          onSelect?.();
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
