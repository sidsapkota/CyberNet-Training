import type { Metadata } from "next";
import { LogoLockup } from "@/components/brand/Logo";
import { Mascot } from "@/components/mascot/Mascot";
import { ParentLinkPaid } from "@/components/pro/ParentPay";
import { completeParentPurchase } from "@/lib/pro/parentLink";

export const metadata: Metadata = { title: "Thank you", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Stripe sends the parent here after paying. The server checks the session with Stripe (paid, our
 * founding offer, bought through a parent link) and claims the seat for the learner straight away
 * (the webhook does the same), so their Pro is there when they next open the app.
 */
export default async function ParentThanksPage({ searchParams }: PageProps<"/pay/thanks">) {
  const { session_id: sessionId } = await searchParams;
  const done = typeof sessionId === "string" ? await completeParentPurchase(sessionId).catch(() => null) : null;
  return (
    <main className="mx-auto min-h-dvh max-w-lesson px-gutter py-8 text-center">
      <div className="text-left">
        <LogoLockup />
      </div>
      <div className="mt-10 flex justify-center">
        <Mascot expression={done ? "celebrating" : "thinking"} size={140} />
      </div>
      {done ? (
        <>
          <ParentLinkPaid />
          <h1 className="mt-6 text-headline font-semibold text-balance">Thank you!</h1>
          <p className="mt-2 text-ink-muted">{done.username ?? "Your learner"} now has lifetime Pro. It&apos;s there the next time they open CyberNet Training.</p>
        </>
      ) : (
        <>
          <h1 className="mt-6 text-title font-semibold">We couldn&apos;t confirm that payment yet</h1>
          <p className="mt-2 text-ink-muted">If you completed it, lifetime Pro will appear on their account in a minute or two. Nothing is charged twice.</p>
        </>
      )}
    </main>
  );
}
