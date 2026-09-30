import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WelcomeToPro } from "@/components/pro/WelcomeToPro";
import { requireUser } from "@/lib/auth/server";
import { syncCheckoutSession } from "@/lib/pro/server";

export const metadata: Metadata = { title: "Welcome to Pro", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Stripe Checkout returns here. The server checks the session belongs to this learner and saves
 * the subscription straight away (the webhook does the same), so the page is right even if the
 * webhook hasn't arrived yet.
 */
export default async function ProWelcomePage({ searchParams }: PageProps<"/pro/welcome">) {
  const { session_id: sessionId } = await searchParams;
  let user;
  try {
    user = await requireUser();
  } catch {
    redirect("/login");
  }
  const ok = typeof sessionId === "string" ? await syncCheckoutSession(user.id, sessionId).catch(() => false) : false;
  return <WelcomeToPro confirmed={ok} />;
}
