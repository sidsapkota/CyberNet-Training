import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDownIcon, CheckIcon } from "@/components/ui/icons";
import { getCourses } from "@/lib/content/server";
import { ProPitch } from "@/components/pro/ProPitch";
import { DAILY_LESSON_LIMIT } from "@/lib/pro/dailyLimit";
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
    q: "What do free accounts get?",
    a: `Any lesson in any course, up to ${DAILY_LESSON_LIMIT} new lessons a day (quizzes count). Replaying a lesson you've finished, and the help lessons about what to do when something goes wrong, never count. The day starts again at midnight where you are.`,
  },
  {
    q: "Can I cancel any time?",
    a: "Yes. Open your account page and choose Manage subscription. You keep Pro until the end of the time you've paid for, and you're never charged again.",
  },
  {
    q: "What happens to my progress if I cancel?",
    a: "Nothing is deleted. Your XP, streak and every lesson you finished stay. You go back to 3 new lessons a day, and you can replay anything you've finished.",
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
  const courseCount = getCourses().length;

  return (
    <div className="mx-auto max-w-page px-gutter pt-2 pb-8 sm:pt-8">
      {/* One screen on a 360×640 phone, the button in view; the details follow below. */}
      <section aria-label="CyberNet Pro" className="flex min-h-[calc(100dvh-9rem)] flex-col justify-center sm:min-h-0 sm:py-6">
        <ProPitch
          headline="Go unlimited with Pro"
          prices={prices ? pitchPrices(prices.monthly, prices.annual) : null}
          track="page"
          declineSource="pro_page"
          notNow={{ href: "/" }}
        />
      </section>

      <section aria-labelledby="includes-title" className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2">
        <div className="rounded-card border border-line bg-surface p-5">
          <h2 id="includes-title" className="font-semibold">
            With Pro
          </h2>
          <ul className="mt-3 space-y-2 text-body">
            {[
              "Unlimited lessons every day",
              "Certificates when you finish a course",
              `Every lesson in all ${courseCount} courses, in any order`,
              "An extra streak freeze: hold 3 instead of 2",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <CheckIcon className="mt-1 size-4 shrink-0 text-ink-muted" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-card border border-line bg-surface p-5">
          <h2 className="font-semibold">Always free</h2>
          <ul className="mt-3 space-y-2 text-body text-ink-muted">
            {[
              `${DAILY_LESSON_LIMIT} new lessons a day, in any course`,
              "Replays of lessons you've finished",
              "Help lessons, for when something goes wrong",
              "Daily goals, streaks and leagues",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <CheckIcon className="mt-1 size-4 shrink-0" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {prices && (
        <p className="mx-auto mt-6 max-w-3xl text-small text-ink-muted">
          {saving
            ? `Annual: ${formatPrice(prices.annual.unitAmount, prices.annual.currency)} a year, about ${saving.perMonth} a month (${saving.percent}% less than 12 months of monthly). `
            : ""}
          Monthly: {formatPrice(prices.monthly.unitAmount, prices.monthly.currency)} a month. First-time subscribers get a 7-day free trial:
          you aren&apos;t charged until it ends, we email you 3 days before it does, and you can cancel before then. Payment is handled by
          Stripe. See our{" "}
          <Link href="/terms" className="font-semibold text-accent-ink underline-offset-2 hover:underline">
            Terms
          </Link>
          .
        </p>
      )}

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
