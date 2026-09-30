"use client";

import { ButtonLink } from "@/components/ui/Button";
import { ArrowRightIcon } from "@/components/ui/icons";
import { trackEvent } from "@/lib/analytics";

/** The landing page's one primary action: straight into a lesson, no sign-up. */
export function LandingCta({ lessonId }: { lessonId: string }) {
  return (
    <ButtonLink
      href={`/lesson/${lessonId}`}
      onClick={() => trackEvent("landing_cta", lessonId)}
      className="w-full min-h-14 text-lead sm:w-auto sm:px-8"
    >
      Try a lesson free <ArrowRightIcon className="size-5" />
    </ButtonLink>
  );
}
