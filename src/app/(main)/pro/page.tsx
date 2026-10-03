import type { Metadata } from "next";
import Link from "next/link";
import { FamilyInterest } from "@/components/pro/FamilyInterest";
import { FounderCard, ParentPitch } from "@/components/pro/Founder";
import { PlansCards, PlansHeading } from "@/components/pro/PlansCards";
import { ChevronDownIcon } from "@/components/ui/icons";
import { annualSaving, formatPrice, pitchPrices } from "@/lib/pro/pricing";
import { getPlanPrices } from "@/lib/pro/stripe";

export const metadata: Metadata = {
  title: "CyberNet Pro",
  description: "Unlimited lessons every day, in every course. Free accounts get 3 new lessons a day; start free and upgrade when you're ready.",
  alternates: { canonical: "/pro" },
};

// Prices are read from Stripe and refreshed hourly (amounts are never written in the code).
export const revalidate = 3600;

const FAQ: { q: string; a: string }[] = [
  {
    q: "Can I cancel any time?",
    a: "Yes. Open Your plan on your account page and choose Manage subscription. You keep Pro until the end of the time you've paid for, you're never charged again, and your progress stays.",
  },
  {
    q: "What happens after the trial?",
    a: "First-time subscribers get 7 days free. We email you 3 days before the trial ends. If you don't cancel, your plan starts and you're charged then; cancel before and you pay nothing.",
  },
  {
    q: "Should I ask a parent first?",
    a: "Yes, please ask a parent or guardian before subscribing. Payment happens on Stripe's secure page: we never see card details.",
  },
];

/** /pro: the plans (Free and Pro, prices from Stripe), the trial terms and a short FAQ. */
export default async function ProPage() {
  const prices = await getPlanPrices().catch((error: unknown) => {
    console.error(error);
    return null;
  });
  const saving = prices ? annualSaving(prices.monthly, prices.annual) : null;

  return (
    <div className="mx-auto max-w-page px-gutter pt-3 pb-8 sm:pt-8">
      {/* On a 360×640 phone the Pro card's button is in view without scrolling. */}
      <section aria-labelledby="plans-title" className="mx-auto max-w-3xl">
        <PlansHeading />
        {/* The Founding Member offer comes first while it's on (it renders nothing otherwise). */}
        <div className="mt-4 empty:hidden">
          <FounderCard />
        </div>
        <div className="mt-4">
          <PlansCards prices={prices ? pitchPrices(prices.monthly, prices.annual) : null} source="auto" />
        </div>
      </section>

      <div className="mx-auto mt-8 max-w-3xl">
        <ParentPitch />
        <FamilyInterest className="mt-4" />
      </div>

      {prices && (
        <p className="mx-auto mt-8 max-w-3xl text-small text-ink-muted">
          {saving
            ? `Annual: ${formatPrice(prices.annual.unitAmount, prices.annual.currency)} a year, about ${saving.perMonth} a month (${saving.percent}% less than 12 months of monthly). `
            : ""}
          Monthly: {formatPrice(prices.monthly.unitAmount, prices.monthly.currency)} a month. First-time subscribers get a 7-day free trial:
          you aren&apos;t charged until it ends, we email you 3 days before it does, and you can cancel before then. Payment is handled by
          Stripe. Refunds and your rights under Australian Consumer Law are in our{" "}
          <Link href="/terms" className="font-semibold text-accent-ink underline-offset-2 hover:underline">
            Terms
          </Link>
          .
        </p>
      )}

      <section aria-labelledby="pro-faq" className="mx-auto mt-8 max-w-3xl">
        <h2 id="pro-faq" className="text-title font-semibold">
          Questions
        </h2>
        <div className="mt-4 divide-y divide-line rounded-card border border-line bg-surface">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 font-semibold [&::-webkit-details-marker]:hidden">
                {q}
                <ChevronDownIcon className="size-5 shrink-0 text-ink-muted transition-transform group-open:rotate-180" />
              </summary>
              <p className="px-5 pb-4 text-ink-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
