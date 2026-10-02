import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RewardsView } from "@/components/rewards/RewardsView";
import { signedInUserId } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Rewards", robots: { index: false } };

/** Every avatar item, which ones you own, how each is earned, and any spins waiting. */
export default async function RewardsPage() {
  if (!(await signedInUserId())) redirect("/login?next=/account/rewards");
  return (
    <main className="mx-auto max-w-lesson px-gutter py-8 sm:py-12">
      <RewardsView />
    </main>
  );
}
