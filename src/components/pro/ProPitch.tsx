"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CertificateIcon, FreezeIcon, UnlimitedIcon } from "@/components/ui/icons";
import { type EventTarget as AnalyticsTarget, trackEvent } from "@/lib/analytics";
import type { Plan } from "@/lib/pro/env";
import type { PitchPrices } from "@/lib/pro/pricing";
import { PlanButton } from "./PlanButton";

/** What Pro adds, one line each. Mistake review joins this list when it ships. */
const BENEFITS = [
  { Icon: UnlimitedIcon, text: "Unlimited lessons every day" },
  { Icon: CertificateIcon, text: "Certificates for every course" },
  { Icon: FreezeIcon, text: "An extra streak freeze" },
] as const;

/** Prices for the in-app screens (the /pro page passes its own, read on the server). */
function usePitchPrices(given: PitchPrices | null | undefined): PitchPrices | null | undefined {
  const [fetched, setFetched] = useState<PitchPrices | null | undefined>(undefined);
  useEffect(() => {
    if (given !== undefined) return;
    let live = true;
    fetch("/api/pro/prices")
      .then((r) => (r.ok ? (r.json() as Promise<PitchPrices | null>) : null))
      .then(
        (p) => live && setFetched(p),
        () => live && setFetched(null),
      );
    return () => {
      live = false;
    };
  }, [given]);
  return given !== undefined ? given : fetched;
}

/**
 * Every Pro screen (the daily-limit screen, the paywall, the Pro sheet, the top of /pro): one screen
 * that fits a 360×640 phone with the button in view. Mascot, one headline, three benefits, the price
 * (annual first, monthly a small switch), one big button, "Not now", and the parent line. No timers,
 * no pressure. A gentle entrance; the final state at once under reduced motion.
 */
export function ProPitch({
  headline,
  sub,
  prices: givenPrices,
  track,
  notNow,
  sample,
  headingLevel = 1,
}: {
  headline: string;
  /** One short line under the headline. */
  sub?: string;
  /** From the server (/pro); otherwise fetched. */
  prices?: PitchPrices | null;
  /** What paywall_viewed is about (a lesson id or a course). Omit to not send it. */
  track?: AnalyticsTarget | "page";
  notNow: { href: string } | { onClick: () => void };
  /** An optional "Try a sample" area, collapsed until asked for. */
  sample?: ReactNode;
  headingLevel?: 1 | 2;
}) {
  const reduceMotion = useReducedMotion();
  const prices = usePitchPrices(givenPrices);
  const [plan, setPlan] = useState<Plan>("annual");
  const [showSample, setShowSample] = useState(false);
  const viewed = useRef(false);
  const Heading = headingLevel === 1 ? "h1" : "h2";

  useEffect(() => {
    if (viewed.current || track === undefined) return;
    viewed.current = true;
    trackEvent("paywall_viewed", track === "page" ? undefined : track);
  }, [track]);

  // The same props on the server and in the browser (so hydration matches); under reduced motion
  // the entrance just takes no time.
  const rise = (i: number) => ({
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: reduceMotion ? { duration: 0 } : { duration: 0.32, delay: 0.05 + i * 0.06, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center text-center">
      <motion.div {...rise(0)}>
        <Mascot expression="happy" size={64} idle />
      </motion.div>
      <motion.div {...rise(1)} className="mt-2">
        <Heading className="text-title font-semibold text-balance">{headline}</Heading>
        {sub && <p className="mt-1 text-ink-muted">{sub}</p>}
      </motion.div>

      <motion.ul {...rise(2)} className="mt-3 grid w-full gap-2 text-left" aria-label="With Pro">
        {BENEFITS.map(({ Icon, text }) => (
          <li key={text} className="flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-node bg-accent-soft text-accent-ink">
              <Icon className="size-4" />
            </span>
            <span className="font-semibold">{text}</span>
          </li>
        ))}
      </motion.ul>

      <motion.div {...rise(3)} className="mt-3 w-full">
        <p className="min-h-6 text-body" aria-live="polite">
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
        {prices && (
          <button
            type="button"
            onClick={() => setPlan(plan === "annual" ? "monthly" : "annual")}
            className="min-h-11 px-2 text-small font-semibold text-accent-ink underline-offset-2 hover:underline"
          >
            {plan === "annual"
              ? `Prefer monthly? ${prices.monthly.price} a month`
              : `Switch to yearly${prices.annual.percent ? ` and save ${prices.annual.percent}%` : ""}`}
          </button>
        )}
      </motion.div>

      <motion.div {...rise(4)} className="mt-1 w-full">
        {prices && <PlanButton key={plan} plan={plan} label="Go unlimited with Pro" primary big />}
        {"href" in notNow ? (
          <ButtonLink href={notNow.href} variant="ghost" className="mt-1 w-full">
            Not now
          </ButtonLink>
        ) : (
          <Button variant="ghost" className="mt-1 w-full" onClick={notNow.onClick}>
            Not now
          </Button>
        )}
        <p className="mt-1 text-caption text-ink-muted">Ask a parent or guardian before subscribing.</p>
        {sample && !showSample && (
          <button
            type="button"
            onClick={() => setShowSample(true)}
            className="mt-1 min-h-11 px-2 text-small text-ink-muted underline underline-offset-2 hover:text-ink"
          >
            Try a sample
          </button>
        )}
      </motion.div>
      {sample && showSample && <div className="mt-4 w-full text-left">{sample}</div>}
    </div>
  );
}
