"use client";

import { useState } from "react";
import { createChallengeAction } from "@/app/actions/challenges";
import type { InteractiveCard } from "@/cards/schema";
import { Mascot } from "@/components/mascot/Mascot";
import { PlayerShell, uniformNodes } from "@/components/player/PlayerShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { DuelIcon } from "@/components/ui/icons";
import { trackEvent } from "@/lib/analytics";
import { ChallengeRun } from "./ChallengeRun";
import type { Duelist } from "./HealthBars";
import { ShareLink } from "./ShareLink";

const ERRORS: Record<string, string> = {
  "not-finished": "Finish this lesson first, then challenge a friend on it.",
  "too-many": "You've made a lot of challenges today. Try again tomorrow.",
  "not-found": "This lesson can't be used for a challenge.",
};

/**
 * Making a challenge: a short intro, then the questions (one try each), then the link to send.
 * The score is the server's (it re-grades the answers).
 */
export function ChallengeCreate({ lessonId, lessonTitle, courseId, cards, me }: { lessonId: string; lessonTitle: string; courseId: string; cards: InteractiveCard[]; me: Duelist }) {
  const [phase, setPhase] = useState<"intro" | "playing" | "saving" | "done">("intro");
  const [made, setMade] = useState<{ id: string; score: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const courseHref = `/course/${courseId}`;

  async function finish(answers: unknown[]) {
    setPhase("saving");
    try {
      const result = await createChallengeAction(lessonId, answers);
      if (!result.ok) {
        setError(ERRORS[result.code] ?? "Something went wrong. Please try again.");
        setPhase("intro");
        return;
      }
      setMade(result);
      trackEvent("challenge_created", lessonId);
      setPhase("done");
    } catch {
      setError("Couldn't save your challenge. Check your connection and try again.");
      setPhase("intro");
    }
  }

  if (phase === "playing") return <ChallengeRun cards={cards} courseId={courseId} exitHref={courseHref} me={me} rival={null} onFinish={(answers) => void finish(answers)} />;

  return (
    <PlayerShell nodes={uniformNodes(cards.length, phase === "done" ? "done" : "upcoming")} progressLabel="Challenge a friend" exitHref={courseHref}>
      <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
        {phase === "done" && made ? (
          <>
            <Mascot expression="celebrating" size={120} idle />
            <p className="mt-6 font-mono text-caption font-semibold tracking-widest text-ink-faint uppercase">Your score</p>
            <p className="mt-1 font-mono text-display font-semibold tabular-nums">
              {made.score}/{made.total}
            </p>
            <h1 className="mt-3 text-title font-semibold text-balance">Now send it to a friend</h1>
            <p className="mt-2 max-w-sm text-small text-ink-muted">They play the same questions on {lessonTitle}. No account needed.</p>
            <ShareLink id={made.id} lessonTitle={lessonTitle} score={made.score} total={made.total} className="mt-6 w-full max-w-sm" />
            <ButtonLink href={courseHref} variant="ghost" className="mt-2 w-full max-w-sm">
              Back to course
            </ButtonLink>
          </>
        ) : (
          <>
            <DuelIcon className="size-14 text-ink-muted" />
            <h1 className="mt-4 text-headline font-semibold text-balance">Challenge a friend</h1>
            <p className="mt-2 max-w-sm text-body text-ink-muted">
              Answer {cards.length} questions from {lessonTitle}, one try each. Then send your score to a friend to beat.
            </p>
            {error && (
              <p role="alert" className="mt-4 max-w-sm text-small text-danger">
                {error}
              </p>
            )}
            <Button onClick={() => setPhase("playing")} disabled={phase === "saving"} className="mt-8 w-full max-w-sm">
              {phase === "saving" ? "Saving…" : "Start"}
            </Button>
            <ButtonLink href={courseHref} variant="ghost" className="mt-2 w-full max-w-sm">
              Not now
            </ButtonLink>
          </>
        )}
      </div>
    </PlayerShell>
  );
}
