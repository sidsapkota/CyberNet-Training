"use client";

import { trackEvent } from "@/lib/analytics";
import { FEEDBACK_INBOX } from "@/lib/site";

/**
 * One quiet line in /pro's parent section: a way to ask about Pro for a whole family or household.
 * Just a mailto (subject prefilled) and a `family_interest` event on click — no card or form, so it
 * never competes with the Founding Member offer above.
 */
export function FamilyInterest({ className = "" }: { className?: string }) {
  return (
    <p className={`text-small text-ink-muted ${className}`}>
      Want Pro for your family or household?{" "}
      <a
        href={`mailto:${FEEDBACK_INBOX}?subject=${encodeURIComponent("Family plan")}`}
        onClick={() => trackEvent("family_interest")}
        className="font-semibold text-accent-ink underline-offset-2 hover:underline"
      >
        Email us
      </a>{" "}
      and we&apos;ll sort out a deal.
    </p>
  );
}
