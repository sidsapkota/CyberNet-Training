"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { startFounderCheckoutAction } from "@/app/actions/pro";
import { LogoMark } from "@/components/brand/Logo";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ChevronDownIcon, XIcon } from "@/components/ui/icons";
import { trackEvent, trackWith } from "@/lib/analytics";
import { useAuth } from "@/lib/auth/AuthProvider";
import { type FounderOffer, type FounderScreen, founderEventData, seatsLeftText, showFounderOffer } from "@/lib/pro/founder";
import { usePro } from "@/lib/pro/ProProvider";

/**
 * Founding Member: one payment, lifetime Pro (for as long as CyberNet Training runs), for the first
 * 50 buyers. The words and the counter come from `/api/pro/founder` (Stripe's live prices and the
 * database's real count); it answers null while the offer is off or sold out, and every piece here
 * then renders nothing.
 */

let offerRequest: Promise<FounderOffer | null> | null = null;

/** The offer, fetched once per page load and shared (undefined while loading). */
export function useFounderOffer(): FounderOffer | null | undefined {
  const [offer, setOffer] = useState<FounderOffer | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    offerRequest ??= fetch("/api/pro/founder", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<FounderOffer | null>) : null))
      .catch(() => null);
    void offerRequest.then((o) => live && setOffer(o));
    return () => {
      live = false;
    };
  }, []);
  return offer;
}

/** The offer, only for those who should see it: guests, free learners and early-user grant holders. */
export function useVisibleFounderOffer(): FounderOffer | null {
  const offer = useFounderOffer();
  const { auth, available } = useAuth();
  const { pro } = usePro();
  const who =
    !available || auth.status === "guest"
      ? null
      : auth.status === "loading" || pro.loading
        ? { loading: true }
        : { loading: false, kind: pro.status.kind };
  return showFounderOffer(offer, who) ? offer : null;
}

/** founder_viewed, once per mount, when the offer is on screen. */
function useViewed(offer: FounderOffer | null, screen: FounderScreen) {
  const sent = useRef(false);
  useEffect(() => {
    if (!offer || sent.current) return;
    sent.current = true;
    trackWith("founder_viewed", founderEventData(screen));
  }, [offer, screen]);
}

/**
 * The learner's Founding Member badge: the logo's shield and the words, never colour alone. Neutral
 * like ProBadge; `lit` is the member's own (the Pro identity exception).
 */
export function FounderBadge({ className = "", lit = false }: { className?: string; lit?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm border bg-surface px-1.5 py-0.5 font-mono text-caption font-semibold tracking-wide text-ink uppercase ${
        lit ? "border-accent-ink drop-shadow-pro" : "border-line-strong"
      } ${className}`}
    >
      <LogoMark variant="mono" className="size-3.5" />
      Founding Member
    </span>
  );
}

/** "37 of 50 left" (or that the last spots are in someone's checkout). */
export function SeatsLeft({ offer, className = "" }: { offer: FounderOffer; className?: string }) {
  return (
    <span className={`font-mono text-caption font-semibold whitespace-nowrap text-ink-muted tabular-nums ${className}`}>
      {offer.counter.allHeld ? "The last spots are in checkout right now" : seatsLeftText(offer.counter)}
    </span>
  );
}

/** The one button. Guests sign in first (Pro belongs to an account); then Stripe's hosted Checkout. */
export function FounderButton({ offer, screen, big = false }: { offer: FounderOffer; screen: FounderScreen; big?: boolean }) {
  const { auth, available } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const size = big ? "w-full min-h-14 text-lead active:scale-[0.98]" : "w-full";
  const label = `Get lifetime Pro for ${offer.price}`;
  const clicked = () => trackWith("founder_clicked", founderEventData(screen));

  return (
    <div>
      {!available || auth.status === "guest" ? (
        <ButtonLink href="/login?next=/pro" className={size} onClick={clicked}>
          {label}
        </ButtonLink>
      ) : (
        <Button
          className={size}
          disabled={busy || auth.status === "loading" || offer.counter.allHeld}
          onClick={async () => {
            clicked();
            setBusy(true);
            setError(null);
            const result = await startFounderCheckoutAction().catch(() => ({ error: "Something went wrong. Please try again." }));
            if ("url" in result) window.location.assign(result.url);
            else {
              setError(result.error);
              setBusy(false);
            }
          }}
        >
          {busy ? "Opening checkout…" : label}
        </Button>
      )}
      <p className="mt-1 text-caption text-ink-muted">Under 18? Ask a parent before buying.</p>
      {error && (
        <p role="alert" className="mt-1 text-small text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** "Buying for your kid?": how a parent buys on their kid's account. Collapsed until asked for. */
export function BuyingForYourKid({ className = "" }: { className?: string }) {
  return (
    <details className={`group ${className}`}>
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 text-small font-semibold text-accent-ink [&::-webkit-details-marker]:hidden">
        Buying for your kid?
        <ChevronDownIcon className="size-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-1 space-y-2 text-small text-ink-muted">
        <p>
          Accounts belong to learners aged 13 and up, so Pro goes on your kid&apos;s account: sign in together (or have them sign in), then buy
          from their account. Their progress, XP and streak stay theirs.
        </p>
        <p>Payment happens on Stripe&apos;s secure page, and the receipt goes to the email you enter there. We never see card details.</p>
      </div>
    </details>
  );
}

/** The offer as /pro's first, biggest card. Renders nothing while there's no offer for this visitor. */
export function FounderCard() {
  const offer = useVisibleFounderOffer();
  useViewed(offer, "pro_page");
  if (!offer) return null;
  return (
    <section aria-labelledby="founder-title" className="rounded-card border-2 border-accent-ink bg-surface p-4 shadow-pro-card sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FounderBadge />
        <SeatsLeft offer={offer} />
      </div>
      <h2 id="founder-title" className="mt-3 text-lead font-semibold text-balance sm:text-title">
        {offer.headline}
      </h2>
      <p className="mt-1 text-small text-ink-muted sm:text-body">{offer.comparison}</p>
      <p className="mt-2 text-small sm:text-body">Every Pro feature, for as long as CyberNet Training runs. The first {offer.counter.total} people only.</p>
      <div className="mt-3 sm:mt-4">
        <FounderButton offer={offer} screen="pro_page" big />
      </div>
      <BuyingForYourKid className="mt-2" />
    </section>
  );
}

const DISMISS_KEY = "cybernet.founderLine.dismissed";

function wasDismissed(): boolean {
  try {
    return typeof window !== "undefined" && localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/** One small line on the dashboard for signed-in free learners, with ✕ (remembered on this device). */
export function FounderLine() {
  const offer = useVisibleFounderOffer();
  const { auth } = useAuth();
  // The dashboard renders only after progress loads (in the browser), so this can read storage.
  const [dismissed, setDismissed] = useState(wasDismissed);
  const shown = offer && auth.status === "signed-in" && !dismissed ? offer : null;
  useViewed(shown, "dashboard");
  if (!shown) return null;
  return (
    <div className="flex items-center gap-2 rounded-card border border-line bg-surface py-1 pr-1 pl-4 text-small">
      <p className="min-w-0 flex-1 truncate">
        <span className="font-semibold">Founding Member:</span> lifetime Pro for {shown.price} ·{" "}
        <span className="font-mono tabular-nums">{shown.counter.left} left</span>
      </p>
      <Link
        href="/pro?from=dashboard"
        onClick={() => trackWith("founder_clicked", founderEventData("dashboard"))}
        className="inline-flex min-h-11 items-center px-2 font-semibold text-accent-ink underline-offset-2 hover:underline"
      >
        See it
      </Link>
      <button
        type="button"
        aria-label="Hide the Founding Member offer"
        onClick={() => {
          setDismissed(true);
          try {
            localStorage.setItem(DISMISS_KEY, "1");
          } catch {
            // storage blocked: hidden for this visit
          }
        }}
        className="grid size-11 shrink-0 place-items-center rounded-control text-ink-muted hover:text-ink"
      >
        <XIcon className="size-4" />
      </button>
    </div>
  );
}

/**
 * The parent pitch (on /pro and the landing page). Only what Stay Safe Online really teaches; no
 * parent dashboard or reports, because there aren't any.
 */
export function ParentPitch({ headingLevel = 2 }: { headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <section aria-labelledby="parent-pitch" className="rounded-card border border-line bg-surface p-5 sm:p-6">
      <Heading id="parent-pitch" className="text-title font-semibold text-balance">
        Teach your kid to spot scams before they meet one.
      </Heading>
      <p className="mt-2 text-ink-muted">Our Stay Safe Online course, in short hands-on lessons:</p>
      <ul className="mt-3 list-disc space-y-1 pl-5">
        <li>Spotting fake messages, texts and websites</li>
        <li>Strong passwords and two-step sign-in</li>
        <li>Deepfake voice and video scams, and where to get help</li>
      </ul>
      <p className="mt-3 text-small text-ink-muted">Start free, no card needed: free accounts get 3 new lessons a day, and help lessons are always free.</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4">
        <Link href="/course/stay-safe-online" className="inline-flex min-h-11 items-center font-semibold text-accent-ink underline-offset-2 hover:underline">
          See Stay Safe Online
        </Link>
        <BuyingForYourKid />
      </div>
    </section>
  );
}

/** For /pro/welcome: the purchase, once per checkout (this tab). */
export function trackFounderPurchased(): void {
  try {
    if (sessionStorage.getItem("cybernet.founderTracked")) return;
    sessionStorage.setItem("cybernet.founderTracked", "1");
  } catch {
    // storage blocked: track it anyway
  }
  trackEvent("founder_purchased");
}
