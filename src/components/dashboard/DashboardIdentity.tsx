"use client";

import Link from "next/link";
import { UserNode } from "@/components/account/UserNode";
import { FounderBadge, FounderLine } from "@/components/pro/Founder";
import { ProBadge } from "@/components/pro/ProBadge";
import { useAuth } from "@/lib/auth/AuthProvider";
import { FALLBACK_NAME } from "@/lib/auth/profile";
import { usePro } from "@/lib/pro/ProProvider";

/**
 * The top of a signed-in learner's dashboard: their node and name, and their plan. Pro members get
 * the lit Pro badge (opens Your plan); free learners a quiet "Free plan" link to the plans.
 */
export function DashboardIdentity() {
  const { auth } = useAuth();
  const { pro, hasPro } = usePro();
  if (auth.status !== "signed-in" || pro.loading) return null;
  const name = auth.username ?? FALLBACK_NAME;
  const founder = pro.status.kind === "founder";
  return (
    <>
    <div className="mb-4 flex items-center gap-3">
      <UserNode outfit={auth.outfit} pro={hasPro} size={36} />
      <p className="min-w-0 flex-1 truncate font-semibold">{name}</p>
      {hasPro ? (
        <Link href="/account/plan" aria-label={founder ? "Your plan: Founding Member" : "Your plan: Pro"} className="inline-flex min-h-11 items-center rounded-control px-1">
          {founder ? <FounderBadge lit /> : <ProBadge lit />}
        </Link>
      ) : (
        <Link
          href="/pro?from=dashboard"
          className="inline-flex min-h-11 items-center rounded-control px-2 text-small font-semibold text-ink-muted hover:text-ink"
        >
          Free plan · See plans
        </Link>
      )}
    </div>
    <div className="mb-4 empty:hidden">
      <FounderLine />
    </div>
    </>
  );
}
