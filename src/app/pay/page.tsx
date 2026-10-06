import type { Metadata } from "next";
import Link from "next/link";
import { LogoLockup } from "@/components/brand/Logo";
import { ParentPayButton } from "@/components/pro/ParentPay";
import { CheckIcon } from "@/components/ui/icons";
import { FOUNDER_ERROR_TEXT, type FounderError, founderCopy, PARENT_LINK_TEXT, type ParentLinkState } from "@/lib/pro/founder";
import { findParentLink } from "@/lib/pro/parentLink";
import { PRO_BENEFITS } from "@/lib/pro/plans";
import { getFounderPrice, getPlanPrices } from "@/lib/pro/stripe";

export const metadata: Metadata = { title: "Lifetime Pro for your learner", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * "Send to a parent": the page a parent opens from the learner's link, on their own device, with no
 * account. It names the learner (their public username), the one-off price and what's included, and
 * one button to Stripe's secure page. The link's secret (?t=) is the only authority; query strings
 * never reach analytics (redactUrl).
 */
export default async function ParentPayPage({ searchParams }: PageProps<"/pay">) {
  const { t, problem } = await searchParams;
  const token = typeof t === "string" ? t : null;
  const link = await findParentLink(token);
  const [founder, plans] = await Promise.all([getFounderPrice().catch(() => null), getPlanPrices().catch(() => null)]);
  const copy = founder ? founderCopy(founder, plans?.monthly ?? null) : null;
  const who = link.username ?? "your learner";
  const problemText =
    typeof problem === "string" && problem in FOUNDER_ERROR_TEXT
      ? FOUNDER_ERROR_TEXT[problem as FounderError]
      : typeof problem === "string" && problem in PARENT_LINK_TEXT
        ? PARENT_LINK_TEXT[problem as Exclude<ParentLinkState, "ok">]
        : null;

  return (
    <main className="mx-auto min-h-dvh max-w-lesson px-gutter py-8">
      <LogoLockup />
      {link.state === "ok" && copy ? (
        <section aria-labelledby="pay-title" className="mt-8 rounded-card border-2 border-accent-ink bg-surface p-5 shadow-pro-card">
          <h1 id="pay-title" className="text-title font-semibold text-balance">
            Lifetime Pro for {who}
          </h1>
          <p className="mt-2 text-ink-muted">
            {who} asked you to get them CyberNet Training Pro. It&apos;s one payment of {copy.price}: no subscription, nothing to renew.
          </p>
          <ul className="mt-4 grid gap-2">
            {PRO_BENEFITS.map((b) => (
              <li key={b} className="flex items-center gap-2.5">
                <CheckIcon className="size-4 shrink-0 text-ink-muted" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          {problemText && (
            <p role="alert" className="mt-4 text-small text-danger">
              {problemText}
            </p>
          )}
          <form action="/api/pay" method="post" className="mt-5">
            <input type="hidden" name="t" value={token ?? ""} />
            <ParentPayButton label={`Pay ${copy.price} securely with Stripe`} />
          </form>
          <p className="mt-3 text-caption text-ink-muted">
            You don&apos;t need an account. Stripe sends the receipt to your email, and we never see card details. Lifetime means for as long
            as CyberNet Training runs. See our{" "}
            <Link href="/terms" className="font-semibold text-accent-ink underline-offset-2 hover:underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-semibold text-accent-ink underline-offset-2 hover:underline">
              Privacy policy
            </Link>
            .
          </p>
        </section>
      ) : (
        <section className="mt-8 rounded-card border border-line bg-surface p-5">
          <h1 className="text-title font-semibold">Lifetime Pro</h1>
          <p className="mt-2 text-ink-muted">
            {link.state === "ok" ? "We couldn't load the price just now. Please refresh the page in a moment." : PARENT_LINK_TEXT[link.state]}
          </p>
        </section>
      )}
    </main>
  );
}
