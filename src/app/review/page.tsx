import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MistakeReview } from "@/components/mistakes/MistakeReview";
import { signedInUserId } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Review your mistakes", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Mistake review: needs an account (guests sign in first); Pro plays it, others see the pitch. */
export default async function ReviewPage() {
  if (!(await signedInUserId())) redirect("/login?next=/review");
  return <MistakeReview />;
}
