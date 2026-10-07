"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { claimChallengeAttemptAction } from "@/app/actions/challenges";
import type { InteractiveCard } from "@/cards/schema";
import { Mascot } from "@/components/mascot/Mascot";
import { MascotAvatar } from "@/components/mascot/outfit/MascotAvatar";
import { PlayerShell, uniformNodes } from "@/components/player/PlayerShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/lib/auth/AuthProvider";
import { outcome, outcomeLine, score } from "@/lib/challenges/rules";
import { usePro } from "@/lib/pro/ProProvider";
import { ChallengeRun } from "./ChallengeRun";
import { Emotes } from "./Emotes";

export interface ChallengeForPlay {
  id: string;
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  cards: InteractiveCard[];
  results: boolean[];
  creator: { username: string; outfit: string[] };
  expired: boolean;
}

interface Played {
  attemptId: number;
  key: string;
  results: boolean[];
  claimed?: boolean;
}

const storageKey = (id: string) => `cybernet.challenge.${id}`;
const SIGNUP_KEY = "cybernet.challengeSignup";

function readPlayed(id: string): Played | null {
  try {
    const raw = localStorage.getItem(storageKey(id));
    return raw ? (JSON.parse(raw) as Played) : null;
  } catch {
    return null;
  }
}
function writePlayed(id: string, played: Played) {
  try {
    localStorage.setItem(storageKey(id), JSON.stringify(played));
  } catch {
    // Private mode: the result still shows, it just won't be remembered.
  }
}

const ERRORS: Record<string, string> = {
  expired: "This challenge has ended.",
  full: "This challenge has had lots of players already. Ask for a new one!",
  "already-played": "You've already played this challenge.",
  "not-found": "This challenge doesn't exist any more.",
};

/**
 * A friend's side of the duel (no account needed): the intro (two mascots and the score to beat),
 * the questions, then the result with one preset emote and "Sign up to save your score and
 * challenge back". A guest's go is kept on this device by its key, so signing up claims it.
 */
export function ChallengePlay({ challenge }: { challenge: ChallengeForPlay }) {
  const { auth, available } = useAuth();
  const { hasPro } = usePro();
  const [phase, setPhase] = useState<"intro" | "playing" | "saving" | "result">("intro");
  const [played, setPlayed] = useState<Played | null>(null);
  const [error, setError] = useState<string | null>(null);
  const opened = useRef(false);
  const rival = challenge.creator.username;
  const total = challenge.cards.length;
  const signedIn = auth.status === "signed-in";

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    trackEvent("challenge_opened", challenge.lessonId);
    // Back after playing on this device: straight to the result.
    const before = readPlayed(challenge.id);
    if (before) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading this device's saved result once, after mount
      setPlayed(before);
      setPhase("result");
    }
  }, [challenge.id, challenge.lessonId]);

  // Signed up (or in) after playing as a guest: the go becomes theirs.
  useEffect(() => {
    if (!signedIn || !played || played.claimed) return;
    void claimChallengeAttemptAction(challenge.id, played.attemptId, played.key).then((ok) => {
      const next = { ...played, claimed: true };
      writePlayed(challenge.id, next);
      setPlayed(next);
      try {
        if (ok && localStorage.getItem(SIGNUP_KEY) === challenge.id) {
          localStorage.removeItem(SIGNUP_KEY);
          trackEvent("challenge_signup", challenge.lessonId);
        }
      } catch {
        // storage blocked: the event is a nicety
      }
    });
  }, [signedIn, played, challenge.id, challenge.lessonId]);

  async function finish(answers: unknown[]) {
    setPhase("saving");
    const response = await fetch(`/api/challenges/${challenge.id}/attempts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers }) }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as { attemptId?: number; key?: string; results?: boolean[]; error?: string } | null;
    if (!response?.ok || !body?.results || !body.attemptId || !body.key) {
      setError(ERRORS[body?.error ?? ""] ?? "Couldn't save your score. Check your connection and try again.");
      setPhase("intro");
      return;
    }
    const result: Played = { attemptId: body.attemptId, key: body.key, results: body.results, claimed: signedIn };
    writePlayed(challenge.id, result);
    setPlayed(result);
    trackEvent("challenge_completed", challenge.lessonId);
    setPhase("result");
  }

  const me = { name: signedIn ? (auth.username ?? "You") : "You", outfit: signedIn ? auth.outfit : [], pro: hasPro };
  const exitHref = `/course/${challenge.courseId}`;

  if (phase === "playing") {
    return <ChallengeRun cards={challenge.cards} courseId={challenge.courseId} exitHref={exitHref} me={me} rival={{ name: rival, outfit: challenge.creator.outfit, results: challenge.results }} onFinish={(answers) => void finish(answers)} />;
  }

  const mine = played?.results ?? [];
  const result = played ? outcome(mine, challenge.results) : null;

  return (
    <PlayerShell nodes={uniformNodes(total, played ? "done" : "upcoming")} progressLabel="Challenge" exitHref={exitHref}>
      <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
        <div className="flex items-end justify-center gap-6" aria-hidden="true">
          {played ? (
            <Mascot expression={result === "lose" ? "thinking" : "celebrating"} size={104} idle />
          ) : (
            <MascotAvatar outfit={me.outfit ?? []} size={104} />
          )}
          <span className="pb-10 font-mono text-small font-semibold text-ink-faint">vs</span>
          <MascotAvatar outfit={challenge.creator.outfit} size={104} />
        </div>

        {played && result ? (
          <>
            <h1 className="mt-6 text-title font-semibold text-balance">{outcomeLine(result, rival)}</h1>
            <p className="mt-2 text-lead">
              You <span className="font-mono font-semibold tabular-nums">{score(mine)}</span> · {rival}{" "}
              <span className="font-mono font-semibold tabular-nums">{score(challenge.results)}</span>
            </p>
            <Emotes challengeId={challenge.id} attemptId={played.attemptId} attemptKey={played.key} pro={signedIn && hasPro} className="mt-6" />
            <div className="mt-6 flex w-full max-w-sm flex-col gap-2">
              {available && !signedIn ? (
                <ButtonLink
                  href={`/login?next=${encodeURIComponent(`/c/${challenge.id}`)}`}
                  onClick={() => {
                    try {
                      localStorage.setItem(SIGNUP_KEY, challenge.id);
                    } catch {
                      // storage blocked
                    }
                  }}
                >
                  Sign up to save your score and challenge back
                </ButtonLink>
              ) : (
                <ButtonLink href={`/challenge/new/${challenge.lessonId}?from=${challenge.id}`}>Challenge back</ButtonLink>
              )}
              <ButtonLink href={`/lesson/${challenge.lessonId}`} variant="ghost">
                Try the lesson
              </ButtonLink>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-title font-semibold text-balance">
              {rival} scored {score(challenge.results)}/{total} on {challenge.lessonTitle}
            </h1>
            <p className="mt-2 text-body text-ink-muted">Can you beat it? {total} questions, one try each. No account needed.</p>
            {(error || challenge.expired) && (
              <p role="alert" className="mt-4 text-small text-danger">
                {challenge.expired ? ERRORS.expired : error}
              </p>
            )}
            {challenge.expired ? (
              <ButtonLink href={`/lesson/${challenge.lessonId}`} className="mt-8 w-full max-w-sm">
                Try the lesson instead
              </ButtonLink>
            ) : (
              <Button onClick={() => setPhase("playing")} disabled={phase === "saving"} className="mt-8 w-full max-w-sm">
                {phase === "saving" ? "Saving…" : "Accept the challenge"}
              </Button>
            )}
            <Link href="/" className="mt-3 inline-flex min-h-11 items-center text-small text-ink-muted underline-offset-2 hover:underline">
              What&apos;s CyberNet Training?
            </Link>
          </>
        )}
      </div>
    </PlayerShell>
  );
}
