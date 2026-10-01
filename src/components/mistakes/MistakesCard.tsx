"use client";

import { useEffect, useState } from "react";
import { getMistakeCountAction } from "@/app/actions/mistakes";
import { ButtonLink } from "@/components/ui/Button";
import { MistakesIcon, ProIcon } from "@/components/ui/icons";
import { useAuth } from "@/lib/auth/AuthProvider";
import { usePro } from "@/lib/pro/ProProvider";

/**
 * The dashboard's Mistake review panel, for signed-in learners with mistakes waiting. Pro opens the
 * review; free learners see the count and a Pro button (the same /review page shows them the pitch).
 * Nothing shows for guests, or with no mistakes.
 */
export function MistakesCard({ className = "" }: { className?: string }) {
  const { auth } = useAuth();
  const { hasPro } = usePro();
  const signedIn = auth.status === "signed-in";
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    getMistakeCountAction().then(
      (r) => live && setCount(r.count),
      () => live && setCount(0),
    );
    return () => {
      live = false;
    };
  }, [signedIn]);

  if (!signedIn || !count) return null;
  return (
    <section aria-labelledby="mistakes-card-title" className={`${className} flex flex-wrap items-center gap-4 p-5`}>
      <span className="grid size-12 shrink-0 place-items-center rounded-node bg-accent-soft text-accent-ink">
        <MistakesIcon className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id="mistakes-card-title" className="text-lead font-semibold">
          Your mistakes
        </h2>
        <p className="truncate text-ink-muted">
          <span className="font-mono font-semibold text-ink tabular-nums">{count}</span> {count === 1 ? "card" : "cards"} to try
          again
        </p>
      </div>
      <ButtonLink href="/review" variant="secondary" className="w-full sm:w-auto">
        {hasPro ? (
          "Review now"
        ) : (
          <>
            <ProIcon className="size-5" /> Review with Pro
          </>
        )}
      </ButtonLink>
    </section>
  );
}
