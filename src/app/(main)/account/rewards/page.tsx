import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RewardsView } from "@/components/rewards/RewardsView";
import { signedInUserId } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Avatar", robots: { index: false } };

/** The avatar page: dress the mascot, every item and how each is earned, and any spins. */
export default async function RewardsPage() {
  if (!(await signedInUserId())) redirect("/login?next=/account/rewards");
  return (
    <main className="mx-auto max-w-wide px-gutter py-3 sm:py-10">
      <RewardsView />
    </main>
  );
}
