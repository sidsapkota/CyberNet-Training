"use client";

import { Mascot } from "@/components/mascot/Mascot";
import { ButtonLink } from "@/components/ui/Button";
import { SignInIcon } from "@/components/ui/icons";
import type { LockedReason } from "@/lib/pro/access";
import { ProBadge } from "./ProBadge";

/**
 * What a Pro lesson shows to someone without Pro (in the player, or in the course path's upgrade
 * sheet): gentle, no pressure. Guests are asked to sign in first (Pro belongs to an account).
 */
export function ProLockedMessage({
  title,
  reason,
  headingLevel = 1,
  compact = false,
}: {
  title: string;
  reason: LockedReason;
  headingLevel?: 1 | 2;
  compact?: boolean;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <div className="flex flex-col items-center text-center">
      <Mascot expression="presenting" size={compact ? 96 : 150} idle={!compact} />
      <ProBadge className="mt-5" />
      <Heading className={`mt-3 font-semibold text-balance ${compact ? "text-lead" : "text-title"}`}>{title}</Heading>
      <p className="mt-2 max-w-sm text-ink-muted">
        {reason === "sign-in"
          ? "This lesson is part of CyberNet Pro. Sign in to see your options. The first module of every course is free."
          : "This lesson is part of CyberNet Pro. The first module of every course stays free, and your progress is always kept."}
      </p>
      <div className="mt-6 flex w-full max-w-sm flex-col gap-2">
        {reason === "sign-in" ? (
          <>
            <ButtonLink href="/login">
              <SignInIcon className="size-5" /> Sign in
            </ButtonLink>
            <ButtonLink href="/pro" variant="ghost">
              What&apos;s in Pro?
            </ButtonLink>
          </>
        ) : (
          <ButtonLink href="/pro">See CyberNet Pro</ButtonLink>
        )}
      </div>
    </div>
  );
}
