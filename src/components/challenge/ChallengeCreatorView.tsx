"use client";

import { PlayerShell, uniformNodes } from "@/components/player/PlayerShell";
import { ButtonLink } from "@/components/ui/Button";
import { DuelIcon } from "@/components/ui/icons";
import type { ChallengeAttemptView } from "@/lib/challenges/server";
import { EmoteChip } from "./Emotes";
import { ShareLink } from "./ShareLink";

/** The challenger opening their own link: who played, their scores and reactions, and the link again. */
export function ChallengeCreatorView({
  id,
  lessonTitle,
  courseId,
  score,
  total,
  attempts,
  expired,
}: {
  id: string;
  lessonTitle: string;
  courseId: string;
  score: number;
  total: number;
  attempts: ChallengeAttemptView[];
  expired: boolean;
}) {
  return (
    <PlayerShell nodes={uniformNodes(total, "done")} progressLabel="Your challenge" exitHref={`/course/${courseId}`}>
      <div className="mx-auto max-w-sm py-6 text-center">
        <DuelIcon className="mx-auto size-12 text-ink-muted" />
        <h1 className="mt-3 text-title font-semibold text-balance">Your challenge: {lessonTitle}</h1>
        <p className="mt-1 font-mono text-lead tabular-nums">
          You scored {score}/{total}
        </p>
        <h2 className="mt-8 text-left text-small font-semibold">{attempts.length ? "Who played" : "Nobody has played yet"}</h2>
        {attempts.length > 0 && (
          <ul className="mt-2 divide-y divide-line rounded-card border border-line bg-surface text-left">
            {attempts.map((a, i) => (
              <li key={i} className="flex min-h-11 items-center gap-3 px-3 py-2">
                <span className="min-w-0 flex-1 text-small [overflow-wrap:anywhere]">{a.player}</span>
                {a.emote && <EmoteChip id={a.emote} />}
                <span className="font-mono text-small tabular-nums">
                  {a.score}/{a.total}
                </span>
              </li>
            ))}
          </ul>
        )}
        {expired ? (
          <p className="mt-6 text-small text-ink-muted">This challenge has ended. Make a new one from any lesson you&apos;ve finished.</p>
        ) : (
          <ShareLink id={id} lessonTitle={lessonTitle} score={score} total={total} className="mt-6" />
        )}
        <ButtonLink href={`/course/${courseId}`} variant="ghost" className="mt-2 w-full">
          Back to course
        </ButtonLink>
      </div>
    </PlayerShell>
  );
}
