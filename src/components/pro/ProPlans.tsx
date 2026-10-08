"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { MascotAvatar } from "@/components/mascot/outfit/MascotAvatar";
import { ButtonLink, Button } from "@/components/ui/Button";
import { CheckIcon, NotIncludedIcon } from "@/components/ui/icons";
import { trackWith } from "@/lib/analytics";
import { useAuth } from "@/lib/auth/AuthProvider";
import { founderEventData, type FounderOffer, type FounderScreen, showFounderOffer } from "@/lib/pro/founder";
import {
  bestValueChoice,
  choiceNote,
  defaultChoice,
  type PlanCell,
  PLAN_TABLE,
  planSelectedData,
  plansSourceFrom,
  plansViewedData,
  type ProChoice,
  proChoices,
} from "@/lib/pro/plans";
import type { PitchPrices } from "@/lib/pro/pricing";
import { usePro } from "@/lib/pro/ProProvider";
import { FounderButton, SeatsLeft, useFounderContinue, useFounderOffer } from "./Founder";
import { PlanButton } from "./PlanButton";

/**
 * /pro (owner's brief, 8 Oct 2026; the Duolingo Super / Brilliant pattern): the crowned mascot and
 * "Learn without limits", ONE Pro box with a Lifetime / Yearly / Monthly picker and ONE button whose
 * words match the choice, then the Free vs Pro table. On phones the box comes straight after the
 * hero, so its button is in view at 360×560; from `md` the table sits on the left and the box on the
 * right. Lifetime (Founding Member) is there, preselected, only while seats remain; without it,
 * Yearly is preselected and is "Best value" when it really saves. Prices come from Stripe; the seat
 * counter from the database. Pro members see their plan, never an upgrade button.
 */
export function ProPlans({ prices }: { prices: PitchPrices | null }) {
  const { auth, available } = useAuth();
  const { pro, hasPro } = usePro();
  const reduceMotion = useReducedMotion();
  const offer = useFounderOffer();
  const continuing = useFounderContinue() && auth.status === "signed-in";
  const guest = !available || auth.status === "guest";
  // Until a signed-in learner's Pro status is known, show no upgrade button (a member must never see one).
  const unknown = !guest && (auth.status === "loading" || pro.loading);
  const founder = showFounderOffer(offer, guest ? null : auth.status === "loading" || pro.loading ? { loading: true } : { loading: false, kind: pro.status.kind });
  // Early-user grant holders have Pro for now but may still buy lifetime Pro (and only that).
  const member = !guest && !unknown && hasPro && !founder;

  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    trackWith("plans_viewed", plansViewedData(plansSourceFrom(window.location.search)));
  }, []);

  const rise = (i: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: reduceMotion ? { duration: 0 } : { duration: 0.34, delay: 0.05 + i * 0.08, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <>
      <motion.header {...rise(0)} className="flex items-center gap-3 sm:flex-col sm:gap-2 sm:text-center">
        <MascotAvatar outfit={["crown"]} size={64} className="sm:hidden" />
        <MascotAvatar outfit={["crown"]} size={136} className="hidden sm:block" />
        <div className="min-w-0">
          <h1 id="plans-title" className="text-title font-semibold text-balance sm:text-display">
            {unknown ? "CyberNet Pro" : member ? "You're on Pro" : "Learn without limits"}
          </h1>
          <p className="min-h-5 text-small text-ink-muted sm:text-lead">
            {unknown ? "" : member ? "Thanks for supporting CyberNet." : "Every lesson, every course, every day."}
          </p>
        </div>
      </motion.header>

      <div className="mx-auto mt-4 grid max-w-4xl gap-5 sm:mt-8 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:items-start">
        <motion.div {...rise(1)} className="md:order-2">
          <ProBox prices={prices} offer={founder ? offer : null} member={member} unknown={unknown} guest={guest} continuing={continuing} />
        </motion.div>
        <motion.div {...rise(2)} className="md:order-1">
          <PlanTable guest={guest} onFree={!guest && !unknown && !hasPro} />
        </motion.div>
      </div>
    </>
  );
}

function ProBox({
  prices,
  offer,
  member,
  unknown,
  guest,
  continuing,
}: {
  prices: PitchPrices | null;
  /** The Founding Member offer, only while it's showing for this visitor. */
  offer: FounderOffer | null | undefined;
  member: boolean;
  unknown: boolean;
  guest: boolean;
  continuing: boolean;
}) {
  const { pro, hasPro } = usePro();
  const founder = Boolean(offer);
  const screen: FounderScreen = continuing ? "continue" : "pro_page";
  // A grant holder already has Pro for now: only lifetime is on offer to them.
  const choices = proChoices(founder).filter((c) => (c === "lifetime" ? founder : prices !== null && !hasPro));
  const [picked, setPicked] = useState<ProChoice | null>(null);
  const choice = picked && choices.includes(picked) ? picked : choices.includes(defaultChoice(founder)) ? defaultChoice(founder) : (choices[0] ?? null);
  const best = bestValueChoice(founder, Boolean(prices?.annual.percent));
  const trial = guest || (!pro.loading && pro.trialEligible);

  const viewed = useRef(false);
  useEffect(() => {
    if (!founder || viewed.current) return;
    viewed.current = true;
    trackWith("founder_viewed", founderEventData(screen));
  }, [founder, screen]);

  // The offer's answer (or that there's none) arrives just after the page: hold the picker until then,
  // so the preselected choice never flips under the learner's finger.
  const loading = unknown || offer === undefined;

  return (
    <section aria-labelledby="plan-pro" className="rounded-card border-2 border-accent-ink bg-surface p-4 shadow-pro-card sm:p-5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h2 id="plan-pro" className="text-title font-semibold">
          Pro
        </h2>
        {offer && <SeatsLeft offer={offer} className="ml-auto" />}
        {member && <span className="ml-auto text-small font-semibold text-ink-muted">Your plan</span>}
      </div>
      {continuing && offer && (
        <p role="status" className="mt-2 rounded-control bg-accent-soft px-3 py-1.5 text-caption font-semibold">
          You&apos;re signed in. One tap to pay on Stripe&apos;s secure page.
        </p>
      )}

      {member ? (
        <>
          <p className="mt-2 text-ink-muted">Unlimited lessons, mistake review, certificates and more are all yours.</p>
          <ButtonLink href="/account/plan" variant="secondary" className="mt-4 w-full">
            See your plan
          </ButtonLink>
        </>
      ) : loading ? (
        <div className="mt-3 grid gap-2" aria-busy="true">
          <p className="min-h-[10.5rem] text-ink-faint">Loading prices…</p>
          <Button className="min-h-14 w-full" disabled>
            Loading…
          </Button>
        </div>
      ) : choice === null ? (
        <p className="mt-2 text-ink-muted">Pro isn&apos;t available to buy just yet.</p>
      ) : (
        <>
          <div role="radiogroup" aria-label="How to pay" className="mt-3 grid gap-2">
            {choices.map((c) => (
              <ChoiceRow
                key={c}
                selected={choice === c}
                onSelect={() => setPicked(c)}
                best={best === c}
                {...(c === "lifetime" && offer
                  ? { title: "Lifetime", sub: "Founding Member", price: offer.price, per: "once" }
                  : c === "annual" && prices
                    ? {
                        title: "Yearly",
                        sub: [prices.annual.perMonth && `${prices.annual.perMonth} a month`, trial && "7-day free trial"].filter(Boolean).join(" · "),
                        price: prices.annual.price,
                        per: "a year",
                      }
                    : { title: "Monthly", sub: "", price: prices?.monthly.price ?? "", per: "a month" })}
              />
            ))}
          </div>
          <div className="mt-3">
            {choice === "lifetime" && offer ? (
              <FounderButton
                offer={offer}
                screen={screen}
                big
                note={choiceNote("lifetime")}
                onSelect={() => trackWith("plan_selected", planSelectedData("pro", "lifetime"))}
              />
            ) : choice !== "lifetime" ? (
              <>
                <PlanButton
                  key={choice}
                  plan={choice}
                  label={choice === "annual" ? "Get yearly Pro" : "Get monthly Pro"}
                  guestLabel="Start 7-day free trial"
                  primary
                  big
                  onSelect={() => trackWith("plan_selected", planSelectedData("pro", choice))}
                />
                <p className="mt-1 text-center text-caption text-ink-muted">{choiceNote(choice)}</p>
              </>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}

function ChoiceRow({
  selected,
  onSelect,
  best,
  title,
  sub,
  price,
  per,
}: {
  selected: boolean;
  onSelect: () => void;
  best: boolean;
  title: string;
  sub: string;
  price: string;
  per: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      // The price shares the title's line; the details line runs underneath at full width, so it
      // stays on one line at 360px.
      className={`grid min-h-13 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 rounded-control border-2 px-3 py-2 text-left transition-colors ${
        selected ? "border-accent-ink bg-accent-soft" : "border-line hover:border-line-strong"
      }`}
    >
      {/* A node: filled when chosen (the choice is also aria-checked, never shown by colour alone). */}
      <span
        aria-hidden="true"
        className={`row-span-2 grid size-5 place-items-center rounded-node border-2 ${selected ? "border-accent-ink" : "border-line-strong"}`}
      >
        {selected && <span className="size-2.5 rounded-node bg-accent-ink" />}
      </span>
      <span className="font-semibold">{title}</span>
      <span className="text-right whitespace-nowrap">
        <span className="font-mono font-semibold tabular-nums">{price}</span> <span className="text-caption text-ink-muted">{per}</span>
      </span>
      {(sub || best) && (
        <span className="col-span-2 col-start-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-caption text-ink-muted">
          {sub}
          {best && (
            <span className="rounded-sm bg-accent px-1.5 py-px font-mono font-semibold tracking-wider text-on-accent uppercase">Best value</span>
          )}
        </span>
      )}
    </button>
  );
}

function Cell({ value, pro }: { value: PlanCell; pro?: boolean }) {
  if (value === true)
    return (
      <>
        <CheckIcon className={`mx-auto size-5 ${pro ? "text-ink" : "text-ink-muted"}`} />
        <span className="sr-only">Included</span>
      </>
    );
  if (value === false)
    return (
      <>
        <NotIncludedIcon className="mx-auto size-5 text-ink-faint" />
        <span className="sr-only">Not included</span>
      </>
    );
  return <span className={`text-small ${pro ? "font-semibold" : "text-ink-muted"}`}>{value}</span>;
}

/** Free vs Pro, one row per benefit (all live). Guests can start free from here. */
function PlanTable({ guest, onFree }: { guest: boolean; onFree: boolean }) {
  return (
    <section aria-labelledby="compare-title" className="rounded-card border border-line bg-surface p-4 sm:p-5">
      <h2 id="compare-title" className="text-lead font-semibold">
        Free vs Pro
      </h2>
      <table className="mt-1 w-full border-collapse">
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="py-2 text-left">
              <span className="sr-only">What you get</span>
            </th>
            <th scope="col" className="w-16 py-2 text-center font-semibold sm:w-20">
              Free
              {onFree && <span className="block text-caption font-normal text-ink-muted">Your plan</span>}
            </th>
            <th scope="col" className="w-16 py-2 text-center font-semibold sm:w-20">
              Pro
            </th>
          </tr>
        </thead>
        <tbody>
          {PLAN_TABLE.map((row) => (
            <tr key={row.feature} className="border-b border-line last:border-0">
              <th scope="row" className="py-2.5 pr-2 text-left font-normal">
                {row.feature}
              </th>
              <td className="py-2.5 text-center">
                <Cell value={row.free} />
              </td>
              <td className="py-2.5 text-center">
                <Cell value={row.pro} pro />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {guest && (
        <ButtonLink href="/login?next=/" variant="secondary" className="mt-4 w-full" onClick={() => trackWith("plan_selected", planSelectedData("free"))}>
          Start free
        </ButtonLink>
      )}
    </section>
  );
}
