/**
 * Challenge a friend (an async duel), as pure rules (tested). A signed-in learner plays up to 5 of a
 * finished lesson's questions, one try each, and shares a link; a friend (no account needed) plays the
 * same questions against that score. No free text anywhere: emotes are a fixed list.
 */
import { type Card, type InteractiveCard, isInteractiveCard } from "@/cards/schema";

export const CHALLENGE_SIZE = 5;
/** A lesson needs at least this many questions to be worth a duel. */
export const CHALLENGE_MIN = 3;
/** Links stop working after this many days. */
export const CHALLENGE_DAYS = 30;
/** At most this many people can play one challenge (so a link can't be flooded). */
export const ATTEMPTS_PER_CHALLENGE = 100;
/** At most this many challenges a learner can create a day. */
export const CHALLENGES_PER_DAY = 20;
/** Challenge ids: 12 lowercase letters and digits (about 60 random bits, unguessable). */
export const CHALLENGE_ID = /^[a-z0-9]{12}$/;

/** The fixed emotes. Pro learners also get the animated ones. */
export const EMOTES = [
  { id: "gg", label: "GG", pro: false },
  { id: "nice-one", label: "Nice one", pro: false },
  { id: "rematch", label: "Rematch?", pro: false },
  { id: "on-fire", label: "On fire", pro: true },
  { id: "wow", label: "Wow", pro: true },
  { id: "bring-it", label: "Bring it", pro: true },
] as const;
export type EmoteId = (typeof EMOTES)[number]["id"];

export function emote(id: string | null | undefined): (typeof EMOTES)[number] | null {
  return EMOTES.find((e) => e.id === id) ?? null;
}

/** Whether a learner may send this emote (animated ones are Pro). */
export function canSendEmote(id: string, hasPro: boolean): boolean {
  const e = emote(id);
  return e !== null && (!e.pro || hasPro);
}

/**
 * The questions in a lesson's challenge: its interactive core cards (never explainers, reveals,
 * photos or explore cards), the last few in lesson order (the easy win and the twist, which make
 * sense on their own better than the opening "watch it" card).
 */
export function challengeCards(cards: readonly Card[]): InteractiveCard[] {
  return cards.filter((c): c is InteractiveCard => c.difficulty === "core" && isInteractiveCard(c)).slice(-CHALLENGE_SIZE);
}

export function canChallenge(cards: readonly Card[]): boolean {
  return challengeCards(cards).length >= CHALLENGE_MIN;
}

export const score = (results: readonly boolean[]): number => results.filter(Boolean).length;

export type Outcome = "win" | "draw" | "lose";
/** From the player's side. */
export function outcome(mine: readonly boolean[], theirs: readonly boolean[]): Outcome {
  const a = score(mine);
  const b = score(theirs);
  return a > b ? "win" : a === b ? "draw" : "lose";
}

/** Health left after the first `answered` questions (one point per question, lost on a wrong one). */
export function health(results: readonly boolean[], answered: number): number {
  const total = results.length;
  return total - results.slice(0, answered).filter((r) => !r).length;
}

export function outcomeLine(result: Outcome, rival: string): string {
  if (result === "win") return `You beat ${rival}!`;
  if (result === "draw") return `It's a draw with ${rival}.`;
  return `So close! ${rival} wins this one.`;
}
