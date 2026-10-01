import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { YourPlan } from "@/components/pro/YourPlan";
import { signedInUserId } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Your plan", robots: { index: false } };

/** Your plan: what you're on, when it renews or the trial ends, what's included, and managing it. */
export default async function YourPlanPage() {
  if (!(await signedInUserId())) redirect("/login?next=/account/plan");
  return (
    <main className="px-gutter py-8 sm:py-12">
      <YourPlan />
    </main>
  );
}
