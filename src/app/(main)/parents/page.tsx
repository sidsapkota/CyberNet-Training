import type { Metadata } from "next";
import Link from "next/link";
import { CheckIcon } from "@/components/ui/icons";
import { founderOfferEnded, FOUNDER_SEATS } from "@/lib/pro/founder";
import {
  ABOUT_CYBERNET,
  lifetimeTerms,
  PRIVACY_FACTS,
  REFUND_TERMS,
  SAFETY_FACTS,
  SUBSCRIPTION_TERMS,
  WITHOUT_PRO,
} from "@/lib/pro/parentCopy";
import { PRO_BENEFITS } from "@/lib/pro/plans";
import { formatPrice, shortPrice } from "@/lib/pro/pricing";
import { getFounderPrice, getPlanPrices } from "@/lib/pro/stripe";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "For parents and guardians",
  description: "What CyberNet Training is, what Pro includes and costs, how cancelling and refunds work, and how we keep learners' data private and safe.",
  alternates: { canonical: "/parents" },
};
// Prices come from Stripe: read at most every 10 minutes.
export const revalidate = 600;

/**
 * For parents and guardians (owner, 19 Oct 2026): the same plain facts as the parent payment page
 * (/pay), plus privacy and safety. Linked from that page. Every sentence lives in parentCopy.ts.
 */
export default async function ParentsPage() {
  const [plans, founder] = await Promise.all([getPlanPrices().catch(() => null), getFounderPrice().catch(() => null)]);
  const lifetime = founder && !founderOfferEnded() ? shortPrice(founder.unitAmount, founder.currency) : null;
  return (
    <main className="mx-auto max-w-lesson px-gutter py-8 sm:py-12">
      <h1 className="text-headline font-semibold">For parents and guardians</h1>
      <p className="mt-3 text-ink-muted">{ABOUT_CYBERNET}</p>

      <Section title="What's free">
        <p>{WITHOUT_PRO}</p>
      </Section>

      <Section title="What Pro includes">
        <Ticks lines={PRO_BENEFITS} />
      </Section>

      <Section title="Prices">
        {plans ? (
          <ul className="grid gap-1.5">
            <li>Monthly: {formatPrice(plans.monthly.unitAmount, plans.monthly.currency)} a month.</li>
            <li>Yearly: {formatPrice(plans.annual.unitAmount, plans.annual.currency)} a year.</li>
            {lifetime && (
              <li>
                Lifetime (Founding Member, for the first {FOUNDER_SEATS} buyers, until 30 November 2026): {lifetimeTerms(lifetime)}
              </li>
            )}
          </ul>
        ) : (
          <p>Prices are shown on the Pro page.</p>
        )}
      </Section>

      <Section title="Cancelling and refunds">
        <ul className="grid gap-1.5">
          {SUBSCRIPTION_TERMS.map((line) => (
            <li key={line}>{line}</li>
          ))}
          <li>{REFUND_TERMS}</li>
        </ul>
      </Section>

      <Section title="Privacy">
        <Ticks lines={PRIVACY_FACTS} />
      </Section>

      <Section title="Safety">
        <Ticks lines={SAFETY_FACTS} />
      </Section>

      <p className="mt-10 text-small text-ink-muted">
        Questions? Email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-accent-ink underline-offset-2 hover:underline">
          {CONTACT_EMAIL}
        </a>
        . The full{" "}
        <Link href="/privacy" className="font-semibold text-accent-ink underline-offset-2 hover:underline">
          Privacy policy
        </Link>{" "}
        and{" "}
        <Link href="/terms" className="font-semibold text-accent-ink underline-offset-2 hover:underline">
          Terms
        </Link>{" "}
        have the details.
      </p>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lead font-semibold">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Ticks({ lines }: { lines: readonly string[] }) {
  return (
    <ul className="grid gap-2">
      {lines.map((line) => (
        <li key={line} className="flex gap-2.5">
          <CheckIcon className="mt-1 size-4 shrink-0 text-ink-muted" />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}
