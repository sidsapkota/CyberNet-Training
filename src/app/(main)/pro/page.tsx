import type { Metadata } from "next";
import Link from "next/link";
import { ProBadge } from "@/components/pro/ProBadge";
import { PlanButton } from "@/components/pro/PlanButton";
import { ChevronDownIcon, CheckIcon, WarningIcon } from "@/components/ui/icons";
import { getCourses } from "@/lib/content/server";
import { annualSaving, formatPrice } from "@/lib/pro/pricing";
import { getPlanPrices } from "@/lib/pro/stripe";

export const metadata: Metadata = {
  title: "CyberNet Pro",
  description: "Every module of every course, plus an extra streak freeze. Start free; upgrade when you're ready.",
  alternates: { canonical: "/pro" },
};

// Prices are read from Stripe and refreshed hourly (amounts are never written in the code).
export const revalidate = 3600;

const FAQ: { q: string; a: string }[] = [
  {
    q: "Can I cancel any time?",
    a: "Yes. Open your account page and choose Manage subscription. You keep Pro until the end of the time you've paid for, and you're never charged again.",
  },
  {
    q: "What happens to my progress if I cancel?",
    a: "Nothing is deleted. Your XP, streak and every lesson you finished stay. The first module of every course stays open, and Pro lessons open again if you come back.",
  },
  {
    q: "How does the free trial work?",
    a: "If you've never subscribed before, you get 7 days free. You won't be charged until the trial ends, and you can cancel before then. We'll email you before it ends.",
  },
  {
    q: "Do you see my card details?",
    a: "No. Payment happens on Stripe's secure checkout page. Stripe handles your card; we only learn whether your subscription is active.",
  },
  {
    q: "Can I get a refund?",
    a: "See the refunds section of our Terms. Your rights under Australian Consumer Law always apply.",
  },
];

/** The /pro page: what Pro includes, both prices (with the real annual saving), trial terms, FAQ. */
export default async function ProPage() {
  const prices = await getPlanPrices().catch((error: unknown) => {
    console.error(error);
    return null;
  });
  const saving = prices ? annualSaving(prices.monthly, prices.annual) : null;
  const proModules = getCourses().map((c) => ({ title: c.title, count: c.modules.filter((m) => m.access === "pro").length }));

  return (
    <div className="mx-auto max-w-page px-gutter py-8">
      <section className="text-center">
        <ProBadge />
        <h1 className="mt-3 text-headline font-semibold text-balance sm:text-display">CyberNet Pro</h1>
        <p className="mx-auto mt-3 max-w-md text-lead text-ink-muted">Every module of every course.</p>
      </section>

      <div className="mx-auto mt-6 flex max-w-xl items-start gap-3 rounded-card border border-warning bg-warning-soft p-4">
        <WarningIcon className="mt-0.5 size-5 shrink-0 text-warning" />
        <p className="text-body">
          <strong className="font-semibold">Under 18?</strong> Ask a parent or guardian before subscribing.
        </p>
      </div>

      <section aria-labelledby="includes-title" className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
        <div className="rounded-card border border-line bg-surface p-5">
          <h2 id="includes-title" className="font-semibold">
            With Pro
          </h2>
          <ul className="mt-3 space-y-2 text-body">
            {proModules
              .filter((c) => c.count > 0)
              .map((c) => (
                <li key={c.title} className="flex gap-2">
                  <CheckIcon className="mt-1 size-4 shrink-0 text-ink-muted" />
                  <span>
                    {c.title}: {c.count} more {c.count === 1 ? "module" : "modules"} and {c.count === 1 ? "its quiz" : "their quizzes"}
                  </span>
                </li>
              ))}
            <li className="flex gap-2">
              <CheckIcon className="mt-1 size-4 shrink-0 text-ink-muted" />
              <span>An extra streak freeze: hold 3 instead of 2</span>
            </li>
          </ul>
        </div>
        <div className="rounded-card border border-line bg-surface p-5">
          <h2 className="font-semibold">Always free</h2>
          <ul className="mt-3 space-y-2 text-body text-ink-muted">
            {["The first module of every course, with its quiz", "Daily goals and streaks", "Your dashboard and the glossary"].map((t) => (
              <li key={t} className="flex gap-2">
                <CheckIcon className="mt-1 size-4 shrink-0" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="plans-title" className="mx-auto mt-10 max-w-3xl">
        <h2 id="plans-title" className="text-title font-semibold">
          Plans
        </h2>
        {prices ? (
          <>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col rounded-card border border-line bg-surface p-5">
                <h3 className="font-semibold">Monthly</h3>
                <p className="mt-2 font-mono text-headline font-semibold tabular-nums">
                  {formatPrice(prices.monthly.unitAmount, prices.monthly.currency)}
                  <span className="font-sans text-small font-normal text-ink-muted"> a month</span>
                </p>
                <p className="mt-1 text-small text-ink-muted">Renews every month until you cancel.</p>
                <div className="mt-auto pt-5">
                  <PlanButton plan="monthly" label="Choose monthly" primary={false} />
                </div>
              </div>
              <div className="flex flex-col rounded-card border border-line-strong bg-surface p-5">
                <h3 className="font-semibold">Annual</h3>
                <p className="mt-2 font-mono text-headline font-semibold tabular-nums">
                  {formatPrice(prices.annual.unitAmount, prices.annual.currency)}
                  <span className="font-sans text-small font-normal text-ink-muted"> a year</span>
                </p>
                <p className="mt-1 text-small text-ink-muted">
                  {saving
                    ? `About ${saving.perMonth} a month: ${saving.saving} less than 12 months of monthly (${saving.percent}% less).`
                    : "Renews every year until you cancel."}
                </p>
                <div className="mt-auto pt-5">
                  <PlanButton plan="annual" label="Choose annual" primary />
                </div>
              </div>
            </div>
            <p className="mt-4 text-small text-ink-muted">
              First-time subscribers get a 7-day free trial: you aren&apos;t charged until it ends, and you can cancel before
              then. Payment is handled by Stripe. See our{" "}
              <Link href="/terms" className="font-semibold text-accent-ink underline-offset-2 hover:underline">
                Terms
              </Link>
              .
            </p>
          </>
        ) : (
          <p className="mt-4 rounded-card border border-line bg-surface p-5 text-ink-muted">
            Pro isn&apos;t available to buy just yet. Everything free stays free.
          </p>
        )}
      </section>

      <section aria-labelledby="pro-faq" className="mx-auto mt-10 max-w-3xl">
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
