"use client";

import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import { UPGRADE_COURSE_KEY } from "./WhatsNext";
import { Mascot } from "@/components/mascot/Mascot";
import { Button, ButtonLink } from "@/components/ui/Button";
import { celebrate } from "@/lib/celebrate";
import { useFeedback } from "@/lib/feedback";
import { usePro } from "@/lib/pro/ProProvider";
import { ProBadge } from "./ProBadge";
import { markProCelebrated } from "./ProCelebration";
import { useAuth } from "@/lib/auth/AuthProvider";
import { currentProStart } from "@/lib/pro/plans";

const dateFormat = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric" });

/** After Checkout: the celebrating mascot, what's unlocked, and the trial's end date if there is one. */
export function WelcomeToPro({ confirmed }: { confirmed: boolean }) {
  const { pro, refresh } = usePro();
  const reduceMotion = useReducedMotion();
  const { play } = useFeedback();

  useEffect(() => {
    void refresh();
    if (!confirmed) return;
    play("lessonComplete");
    const timer = window.setTimeout(() => void celebrate(), 500);
    return () => window.clearTimeout(timer);
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // This device has now celebrated this Pro start: the first-open welcome won't show again.
  const { auth } = useAuth();
  const userId = auth.status === "signed-in" ? auth.userId : null;
  useEffect(() => {
    if (confirmed && userId && !pro.loading && pro.status.kind === "subscription") markProCelebrated(userId, currentProStart(pro.intervals, Date.now()));
  }, [confirmed, userId, pro]);

  const trialEnd = !pro.loading && pro.status.kind === "subscription" && pro.status.trialEnd ? pro.status.trialEnd : null;
  const subscription = !pro.loading && pro.status.kind === "subscription" ? pro.status.status : null;

  // The funnel: a trial or a paid start, once per checkout (this tab).
  useEffect(() => {
    if (!confirmed || !subscription) return;
    try {
      if (sessionStorage.getItem("cybernet.checkoutTracked")) return;
      sessionStorage.setItem("cybernet.checkoutTracked", "1");
    } catch {
      // storage blocked: track it anyway
    }
    trackEvent(subscription === "trialing" ? "trial_started" : "subscribed");
  }, [confirmed, subscription]);

  // Back to the course the learner came from, where the Pro nodes light up (read on click, so the
  // server and browser render the same button).
  const router = useRouter();
  const keepLearning = () => {
    let courseId: string | null = null;
    try {
      courseId = sessionStorage.getItem(UPGRADE_COURSE_KEY);
    } catch {
      // storage blocked
    }
    router.push(courseId && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(courseId) ? `/course/${courseId}?unlocked=1` : "/courses");
  };

  if (!confirmed) {
    return (
      <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-gutter text-center">
        <Mascot expression="thinking" size={150} idle />
        <h1 className="mt-6 text-title font-semibold">We couldn&apos;t confirm that checkout</h1>
        <p className="mt-2 text-ink-muted">
          If you completed it, your Pro will appear on your account page in a minute or two. Nothing is charged twice.
        </p>
        <ButtonLink href="/account" className="mt-6 w-full">
          Go to my account
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-gutter text-center">
      <Mascot expression="celebrating" size={170} idle label="The mascot, celebrating your Pro" />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduceMotion ? 0 : 0.4, duration: reduceMotion ? 0 : 0.3 }}
        className="mt-8 w-full"
      >
        <ProBadge />
        <h1 className="mt-3 text-headline font-semibold text-balance">Welcome to Pro</h1>
        <p className="mt-2 text-ink-muted">Lessons are unlimited every day, your mistakes are ready to review, certificates are yours to earn, and you can hold an extra streak freeze.</p>
        {trialEnd && (
          <p className="mt-3 text-small text-ink-muted">
            Your free trial ends on {dateFormat.format(new Date(trialEnd))}. You can cancel any time before then from your account page.
          </p>
        )}
        <div className="mt-8 flex flex-col gap-2">
          <Button onClick={keepLearning}>Keep learning</Button>
          <ButtonLink href="/account" variant="ghost">
            Manage subscription
          </ButtonLink>
        </div>
      </motion.div>
    </div>
  );
}
