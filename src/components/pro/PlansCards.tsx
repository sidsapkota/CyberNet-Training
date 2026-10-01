"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CheckIcon } from "@/components/ui/icons";
import { trackWith } from "@/lib/analytics";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { Plan } from "@/lib/pro/env";
import { FREE_BENEFITS, planSelectedData, plansSourceFrom, plansViewedData, PRO_BENEFITS, type PlansSource } from "@/lib/pro/plans";
import type { PitchPrices } from "@/lib/pro/pricing";
import { usePro } from "@/lib/pro/ProProvider";
import { PlanButton } from "./PlanButton";
import { ProBadge } from "./ProBadge";

/**
 * The plans section: Free and Pro side by side (stacked on phones, Pro first so its button is in
 * view on a 360×640 screen). The Pro card stands out (raised, cyan border, a soft glow: the Pro
 * identity exception), with annual preselected and a monthly switch. Prices come from Stripe.
 * Pro members see their plan instead of any upgrade button. Sends `plans_viewed` once.
 */
export function PlansCards({
  prices,
  source,
  headingLevel = 2,
}: {
  prices: PitchPrices | null | undefined;
  /** Where it's shown; "auto" reads `?from=` on /pro. */
  source: PlansSource | "auto";
  headingLevel?: 2 | 3;
}) {
  const { auth, available } = useAuth();
  const { pro, hasPro } = usePro();
  const reduceMotion = useReducedMotion();
  const [plan, setPlan] = useState<Plan>("annual");
  const viewed = useRef(false);
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const guest = !available || auth.status === "guest";
  const member = !guest && !pro.loading && hasPro;
  // Until a signed-in learner's Pro status is known, show no upgrade button (a member must never see one).
  const unknown = !guest && (auth.status === "loading" || pro.loading);

  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    trackWith("plans_viewed", plansViewedData(source === "auto" ? plansSourceFrom(window.location.search) : source));
  }, [source]);

  const rise = (i: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: reduceMotion ? { duration: 0 } : { duration: 0.34, delay: 0.05 + i * 0.08, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <div className="grid gap-5 pt-3 sm:grid-cols-2 sm:items-start">
      {/* Pro first in the page (and on phones); on the right from `sm`. */}
      <motion.section
        {...rise(0)}
        aria-labelledby="plan-pro"
        className="relative -translate-y-0.5 rounded-card border-2 border-accent-ink bg-surface p-5 shadow-pro-card sm:order-2"
      >
        {prices?.annual.percent ? (
          <span className="absolute -top-3 right-4 rounded-sm bg-accent px-2 py-0.5 font-mono text-caption font-semibold tracking-wider text-on-accent uppercase">
            Best value
          </span>
        ) : null}
        <div className="flex items-center gap-2">
          <Heading id="plan-pro" className="text-title font-semibold">
            Pro
          </Heading>
          <ProBadge lit />
          {member && <span className="ml-auto text-small font-semibold text-ink-muted">Your plan</span>}
        </div>

        <p className="mt-1 min-h-7 text-body" aria-live="polite">
          {prices === undefined ? (
            <span className="text-ink-faint">Loading prices…</span>
          ) : prices === null ? (
            <span className="text-ink-muted">Pro isn&apos;t available to buy just yet.</span>
          ) : plan === "annual" ? (
            <>
              <span className="font-mono font-semibold tabular-nums">{prices.annual.price}</span> a year
              {prices.annual.perMonth && (
                <>
                  , just <span className="font-mono font-semibold tabular-nums">{prices.annual.perMonth}</span> a month
                </>
              )}
            </>
          ) : (
            <>
              <span className="font-mono font-semibold tabular-nums">{prices.monthly.price}</span> a month
            </>
          )}
        </p>

        {prices && !member && !unknown && (
          <div role="radiogroup" aria-label="Billing" className="mt-2 grid grid-cols-2 gap-1 rounded-control border border-line-strong p-1">
            {(["annual", "monthly"] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={plan === p}
                onClick={() => setPlan(p)}
                className={`min-h-11 rounded-sm px-1 text-small font-semibold whitespace-nowrap transition-colors ${
                  plan === p ? "bg-surface-raised text-ink" : "text-ink-muted hover:text-ink"
                }`}
              >
                {p === "annual" ? `Yearly${prices.annual.percent ? ` · save ${prices.annual.percent}%` : ""}` : "Monthly"}
              </button>
            ))}
          </div>
        )}

        <ul className="mt-3 grid gap-2" aria-label="Pro includes">
          {PRO_BENEFITS.map((b) => (
            <li key={b} className="flex items-center gap-2.5">
              <CheckIcon className="size-4 shrink-0 text-ink-muted" />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4">
          {unknown ? (
            <Button variant="secondary" className="min-h-14 w-full" disabled>
              Loading…
            </Button>
          ) : member ? (
            <ButtonLink href="/account/plan" variant="secondary" className="w-full">
              See your plan
            </ButtonLink>
          ) : prices ? (
            <PlanButton
              key={plan}
              plan={plan}
              label="Go unlimited with Pro"
              primary
              big
              onSelect={() => trackWith("plan_selected", planSelectedData("pro", plan))}
            />
          ) : null}
          {!member && !unknown && <p className="mt-2 text-center text-caption text-ink-muted">Ask a parent or guardian before subscribing.</p>}
        </div>
      </motion.section>

      <motion.section {...rise(1)} aria-labelledby="plan-free" className="rounded-card border border-line bg-surface p-5 sm:order-1">
        <Heading id="plan-free" className="text-title font-semibold">
          Free
        </Heading>
        <p className="mt-1 text-body">
          <span className="font-mono font-semibold tabular-nums">A$0</span>
        </p>
        <ul className="mt-3 grid gap-2" aria-label="Free includes">
          {FREE_BENEFITS.map((b) => (
            <li key={b} className="flex items-center gap-2.5">
              <CheckIcon className="size-4 shrink-0 text-ink-muted" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        {!member && !unknown && (
          <div className="mt-4">
            {guest ? (
              <ButtonLink
                href="/login?next=/"
                variant="secondary"
                className="w-full"
                onClick={() => trackWith("plan_selected", planSelectedData("free"))}
              >
                Start free
              </ButtonLink>
            ) : (
              <Button variant="secondary" className="w-full" disabled>
                Your plan
              </Button>
            )}
          </div>
        )}
      </motion.section>
    </div>
  );
}

/**
 * /pro's heading: "Choose your plan" with a one-line nudge for everyone else, but a member's own
 * heading for Pro members (no upgrade wording). Neutral while a signed-in learner's status loads.
 */
export function PlansHeading() {
  const { auth, available } = useAuth();
  const { pro, hasPro } = usePro();
  const guest = !available || auth.status === "guest";
  const unknown = !guest && (auth.status === "loading" || pro.loading);
  const member = !guest && !unknown && hasPro;
  return (
    <>
      <h1 id="plans-title" className="text-center text-title font-semibold sm:text-headline">
        {unknown ? "Plans" : member ? "You're on Pro" : "Choose your plan"}
      </h1>
      <p className="min-h-5 text-center text-small text-ink-muted">
        {unknown ? "" : member ? "Thanks for supporting CyberNet." : "Start free. Go unlimited any time."}
      </p>
    </>
  );
}
