"use server";

/**
 * Challenge actions for signed-in learners. The user id always comes from the server-verified
 * session (`requireUserId()`). Guests play a challenge through /api/challenges/[id]/attempts.
 */
import { z } from "zod";
import { requireUserId } from "@/lib/auth/server";
import { ChallengeProblem, claimAttempt, createChallenge, type MyChallenge, myChallenges } from "@/lib/challenges/server";

export type CreateChallengeResult = { ok: true; id: string; score: number; total: number } | { ok: false; code: string };

export async function createChallengeAction(lessonId: string, answers: unknown[]): Promise<CreateChallengeResult> {
  const userId = await requireUserId();
  try {
    const made = await createChallenge(userId, z.string().max(120).parse(lessonId), z.array(z.unknown()).max(5).parse(answers));
    return { ok: true, id: made.id, score: made.score, total: made.results.length };
  } catch (error) {
    if (error instanceof ChallengeProblem) return { ok: false, code: error.code };
    throw error;
  }
}

/** After signing up from a challenge: the guest attempt made on this device becomes theirs. */
export async function claimChallengeAttemptAction(id: string, attemptId: number, key: string): Promise<boolean> {
  const userId = await requireUserId();
  return claimAttempt(z.string().max(20).parse(id), z.number().int().positive().parse(attemptId), z.string().max(40).parse(key), userId);
}

export async function getMyChallengesAction(): Promise<MyChallenge[]> {
  const userId = await requireUserId();
  return myChallenges(userId);
}
