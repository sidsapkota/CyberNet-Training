import "server-only";
/**
 * Challenges on the server, with the secret key. Callers pass a user id only from the verified
 * session (requireUserId(), or null for a guest); everything is re-graded here from raw answers with
 * the same pure graders as quizzes (src/cards/grading.ts). The public view of a challenge carries only
 * the challenger's username and avatar outfit: never an email or anything else about them.
 */
import { randomInt } from "node:crypto";
import { gradeUntrusted } from "@/cards/grading";
import { type InteractiveCard, isInteractiveCard } from "@/cards/schema";
import { getLesson } from "@/lib/content/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ATTEMPTS_PER_CHALLENGE, CHALLENGE_ID, CHALLENGES_PER_DAY, canSendEmote, challengeCards, score } from "./rules";

type Admin = ReturnType<typeof createSupabaseAdminClient>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function fail(message: string, error: { message: string } | null | undefined): asserts error is null | undefined {
  if (error) throw new Error(`${message}: ${error.message}`);
}

export type ChallengeError = "not-found" | "expired" | "not-finished" | "too-many" | "full" | "bad-answers" | "already-played";

export class ChallengeProblem extends Error {
  constructor(readonly code: ChallengeError) {
    super(code);
  }
}

function newId(): string {
  return Array.from({ length: 12 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

function grade(cards: readonly InteractiveCard[], answers: unknown): boolean[] {
  if (!Array.isArray(answers) || answers.length !== cards.length) throw new ChallengeProblem("bad-answers");
  return cards.map((card, i) => gradeUntrusted(card, answers[i]));
}

/** The lesson's challenge questions (null if it isn't a lesson that can be challenged). */
export function questionsFor(lessonId: string): InteractiveCard[] | null {
  const lesson = getLesson(lessonId);
  if (!lesson || lesson.kind !== "lesson") return null;
  const cards = challengeCards(lesson.cards);
  return cards.length >= 3 ? cards : null;
}

/** May this learner start a challenge on this lesson? (They finished it, or played a challenge on it.) */
export async function mayChallenge(userId: string, lessonId: string): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const [done, played] = await Promise.all([
    admin.from("lesson_completions").select("lesson_id").match({ user_id: userId, lesson_id: lessonId }).maybeSingle(),
    admin.from("challenge_attempts").select("id, challenges!inner(lesson_id)").eq("player_id", userId).eq("challenges.lesson_id", lessonId).limit(1),
  ]);
  fail("Couldn't check the lesson", done.error ?? played.error);
  return Boolean(done.data) || (played.data ?? []).length > 0;
}

export async function createChallenge(userId: string, lessonId: string, answers: unknown): Promise<{ id: string; score: number; results: boolean[] }> {
  const cards = questionsFor(lessonId);
  if (!cards) throw new ChallengeProblem("not-found");
  if (!(await mayChallenge(userId, lessonId))) throw new ChallengeProblem("not-finished");
  const admin = createSupabaseAdminClient();
  const today = await admin.from("challenges").select("id", { count: "exact", head: true }).eq("creator_id", userId).gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
  fail("Couldn't count challenges", today.error);
  if ((today.count ?? 0) >= CHALLENGES_PER_DAY) throw new ChallengeProblem("too-many");
  const results = grade(cards, answers);
  for (let tries = 0; tries < 3; tries++) {
    const id = newId();
    const { error } = await admin.from("challenges").insert({ id, creator_id: userId, lesson_id: lessonId, card_ids: cards.map((c) => c.id), results, score: score(results) });
    if (!error) return { id, score: score(results), results };
    if (error.code !== "23505") fail("Couldn't save the challenge", error);
  }
  throw new Error("Couldn't find a free challenge id");
}

export interface PublicChallenge {
  id: string;
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  cards: InteractiveCard[];
  /** The challenger's right/wrong for each card above. */
  results: boolean[];
  creator: { username: string; outfit: string[] };
  creatorId: string;
  expired: boolean;
}

async function readChallenge(admin: Admin, id: string) {
  if (!CHALLENGE_ID.test(id)) return null;
  const row = await admin.from("challenges").select("id, creator_id, lesson_id, card_ids, results, expires_at").eq("id", id).maybeSingle();
  fail("Couldn't read the challenge", row.error);
  return row.data;
}

/** The challenge as anyone with the link sees it, or null if there's no such challenge. */
export async function getChallenge(id: string, now = new Date()): Promise<PublicChallenge | null> {
  const admin = createSupabaseAdminClient();
  const row = await readChallenge(admin, id);
  if (!row) return null;
  const lesson = getLesson(row.lesson_id);
  if (!lesson) return null;
  // Cards still in the lesson, with their results (a card removed from the content drops out).
  const byId = new Map(lesson.cards.map((c) => [c.id, c]));
  const kept = row.card_ids.map((cardId, i) => ({ card: byId.get(cardId), result: row.results[i] ?? false })).filter((k): k is { card: InteractiveCard; result: boolean } => Boolean(k.card && isInteractiveCard(k.card)));
  const profile = await admin.from("profiles").select("username, outfit").eq("id", row.creator_id).maybeSingle();
  fail("Couldn't read the challenger", profile.error);
  return {
    id: row.id,
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    courseId: lesson.courseId,
    cards: kept.map((k) => k.card),
    results: kept.map((k) => k.result),
    creator: { username: profile.data?.username ?? "A learner", outfit: profile.data?.outfit ?? [] },
    creatorId: row.creator_id,
    expired: Date.parse(row.expires_at) <= now.getTime(),
  };
}

/** A friend's go. `playerId` comes from the verified session (null for a guest). */
export async function recordAttempt(id: string, answers: unknown, playerId: string | null, now = new Date()): Promise<{ attemptId: number; key: string; score: number; results: boolean[] }> {
  const challenge = await getChallenge(id, now);
  if (!challenge) throw new ChallengeProblem("not-found");
  if (challenge.expired) throw new ChallengeProblem("expired");
  if (playerId && playerId === challenge.creatorId) throw new ChallengeProblem("already-played");
  const admin = createSupabaseAdminClient();
  const count = await admin.from("challenge_attempts").select("id", { count: "exact", head: true }).eq("challenge_id", id);
  fail("Couldn't count attempts", count.error);
  if ((count.count ?? 0) >= ATTEMPTS_PER_CHALLENGE) throw new ChallengeProblem("full");
  const results = grade(challenge.cards, answers);
  const inserted = await admin
    .from("challenge_attempts")
    .insert({ challenge_id: id, player_id: playerId, results, score: score(results) })
    .select("id, key")
    .single();
  if (inserted.error?.code === "23505") throw new ChallengeProblem("already-played");
  fail("Couldn't save the attempt", inserted.error);
  return { attemptId: inserted.data.id, key: inserted.data.key, score: score(results), results };
}

/** Adds the player's emote (checked against the attempt's key; animated ones need Pro). */
export async function setEmote(id: string, attemptId: number, key: string, emoteId: string, hasPro: boolean): Promise<boolean> {
  if (!CHALLENGE_ID.test(id) || !UUID.test(key) || !canSendEmote(emoteId, hasPro)) return false;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("challenge_attempts").update({ emote: emoteId }).match({ id: attemptId, key, challenge_id: id }).select("id");
  fail("Couldn't save the emote", error);
  return (data ?? []).length > 0;
}

/** After signing up: the guest's attempt (by its key, from their device) becomes theirs. */
export async function claimAttempt(id: string, attemptId: number, key: string, userId: string): Promise<boolean> {
  if (!CHALLENGE_ID.test(id) || !UUID.test(key)) return false;
  const admin = createSupabaseAdminClient();
  const challenge = await readChallenge(admin, id);
  if (!challenge || challenge.creator_id === userId) return false;
  const { data, error } = await admin.from("challenge_attempts").update({ player_id: userId }).match({ id: attemptId, key, challenge_id: id }).is("player_id", null).select("id");
  if (error?.code === "23505") return false; // they'd already played it signed in
  fail("Couldn't claim the attempt", error);
  return (data ?? []).length > 0;
}

export interface ChallengeAttemptView {
  player: string;
  score: number;
  total: number;
  emote: string | null;
  at: string;
}

/** Who played the creator's challenge (the creator only: callers check). Guests show as "A guest". */
export async function attemptsFor(id: string): Promise<ChallengeAttemptView[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("challenge_attempts").select("player_id, score, results, emote, created_at").eq("challenge_id", id).order("created_at", { ascending: false }).limit(50);
  fail("Couldn't read attempts", error);
  const ids = [...new Set((data ?? []).map((a) => a.player_id).filter((p): p is string => p !== null))];
  const names = ids.length ? (await admin.from("profiles").select("id, username").in("id", ids)).data ?? [] : [];
  const name = new Map(names.map((n) => [n.id, n.username]));
  return (data ?? []).map((a) => ({ player: (a.player_id && name.get(a.player_id)) || "A guest", score: a.score, total: a.results.length, emote: a.emote, at: a.created_at }));
}

export interface MyChallenge {
  id: string;
  lessonTitle: string;
  score: number;
  total: number;
  players: number;
}

/** The learner's latest challenges, for /account. */
export async function myChallenges(userId: string): Promise<MyChallenge[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("challenges").select("id, lesson_id, score, card_ids, challenge_attempts(count)").eq("creator_id", userId).order("created_at", { ascending: false }).limit(5);
  fail("Couldn't read your challenges", error);
  return (data ?? []).map((c) => ({
    id: c.id,
    lessonTitle: getLesson(c.lesson_id)?.title ?? "A lesson",
    score: c.score,
    total: c.card_ids.length,
    players: (c.challenge_attempts as unknown as { count: number }[])[0]?.count ?? 0,
  }));
}
