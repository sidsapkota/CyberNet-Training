"use client";

import { useEffect } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { StreakIcon } from "@/components/streak/StreakIcon";
import { Button, ButtonLink } from "@/components/ui/Button";
import { AnyDeviceIcon, LeaguesIcon, ModulesIcon } from "@/components/ui/icons";
import { trackEvent } from "@/lib/analytics";
import { rememberSignupLesson } from "@/lib/auth/afterSignIn";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLeaguesStatus } from "@/lib/leagues/useLeaguesOpen";
import { SignInOptions } from "./SignInOptions";

/** The heading's second line: the XP from the lesson just finished, when there is some. Pure. */
export function xpLine(xp: number | undefined): string {
  return xp && xp > 0 ? `Your ${xp} XP comes with you.` : "Your XP comes with you.";
}

/**
 * The sign-up gate. Guests play each course's first lesson (and the help modules); the rest of the
 * free lessons need a free account. Shown on a lesson that needs one, in the course path's sheet,
 * and on the lesson-complete screen when the next lesson needs one. Calm on purpose: no timers, no
 * counts of what you're missing, and "Not now" is always there.
 */
export function SignUpGate({
  lessonId,
  next,
  xp,
  variant,
  notNowHref,
  onNotNow,
}: {
  /** The lesson that asked (for the events). */
  lessonId: string;
  /** Where to land after signing up: the lesson to carry on with. */
  next: string;
  /** XP from the lesson just finished (lesson-complete screen). */
  xp?: number;
  /** "page": its own screen (with the mascot); "inline" and "sheet": inside another screen. */
  variant: "page" | "inline" | "sheet";
  notNowHref?: string;
  onNotNow?: () => void;
}) {
  const { available } = useAuth();
  const leagues = useLeaguesStatus();

  useEffect(() => {
    if (available) trackEvent("signup_prompt_viewed", lessonId);
  }, [available, lessonId]);

  if (!available) return null;
  const Heading = variant === "page" ? "h1" : "h2";
  const perks = [
    { icon: <StreakIcon lit={false} className="size-5" />, text: "Your XP and streak, saved" },
    { icon: <AnyDeviceIcon className="size-5" />, text: "Your progress on any device" },
    { icon: <ModulesIcon className="size-5" />, text: "The full first module of every course" },
    { icon: <LeaguesIcon className="size-5" />, text: leagues === "open" ? "Weekly leagues" : "Weekly leagues (opening soon)" },
  ];

  return (
    <section
      aria-labelledby={`signup-gate-${lessonId}`}
      className={`mx-auto flex w-full max-w-sm flex-col items-center text-center ${variant === "inline" ? "mt-8 rounded-card border border-line bg-surface p-5" : ""}`}
    >
      {variant === "page" && <Mascot expression="presenting" size={130} idle />}
      <Heading id={`signup-gate-${lessonId}`} className={`font-semibold text-balance ${variant === "page" ? "mt-5 text-title" : "text-lead"}`}>
        Create a free account to keep going.
      </Heading>
      <p className="mt-1 text-ink-muted">{xpLine(xp)}</p>
      <ul className="mt-5 w-full space-y-2 text-left">
        {perks.map((perk) => (
          <li key={perk.text} className="flex min-h-10 items-center gap-3 text-body">
            <span className="grid size-9 shrink-0 place-items-center rounded-control bg-surface-raised text-ink-muted">{perk.icon}</span>
            {perk.text}
          </li>
        ))}
      </ul>
      <div className="mt-6 w-full">
        <SignInOptions next={next} onStart={() => rememberSignupLesson(lessonId)} />
      </div>
      <div className="mt-3 w-full">
        {onNotNow ? (
          <Button variant="ghost" className="w-full" onClick={onNotNow}>
            Not now
          </Button>
        ) : (
          <ButtonLink href={notNowHref ?? "/courses"} variant="ghost" className="w-full">
            Not now
          </ButtonLink>
        )}
      </div>
    </section>
  );
}
