"use client";

import { ButtonLink } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { DAILY_LESSON_LIMIT } from "@/lib/pro/dailyLimit";
import { proLine } from "@/lib/pro/describe";
import { usePro } from "@/lib/pro/ProProvider";
import { ProBadge } from "./ProBadge";

/**
 * "Your plan" on /account: the plan in one line, and the way to Your plan (/account/plan), where
 * members manage their subscription. Free learners go to the plans on /pro.
 */
export function ManageProPanel({ className }: { className: string }) {
  const { available } = useAuth();
  const { pro, hasPro } = usePro();
  if (!available || pro.loading || !pro.available) return null;

  const pastDue = pro.status.kind === "subscription" && pro.status.status === "past_due";
  return (
    <section aria-labelledby="pro-heading" className={className}>
      <div className="flex items-center gap-2">
        <h2 id="pro-heading" className="font-semibold">
          Your plan
        </h2>
        {hasPro ? <ProBadge size="sm" lit /> : <span className="text-small text-ink-muted">Free</span>}
      </div>
      <p className="mt-1 text-small text-ink-muted">
        {hasPro || (pro.status.kind === "none" && pro.status.hadSubscription) ? proLine(pro.status) : `${DAILY_LESSON_LIMIT} new lessons a day, every course.`}
      </p>
      <div className="mt-4">
        {hasPro ? (
          <ButtonLink href="/account/plan" variant={pastDue ? "primary" : "secondary"}>
            {pastDue ? "Update your card" : "See your plan"}
          </ButtonLink>
        ) : (
          <ButtonLink href="/pro?from=account" variant="secondary">
            {pro.status.kind === "none" && pro.status.hadSubscription ? "Come back to Pro" : "See plans"}
          </ButtonLink>
        )}
      </div>
    </section>
  );
}
