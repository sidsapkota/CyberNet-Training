import type { GradeResult } from "../types";
import { PREP_VERBS, REMOVE_VERBS, type TeardownAction, type TeardownAnswer, type TeardownCard } from "./schema";

export type PartState = "in" | "out" | "unplugged" | "heated";

const safe = (answer: TeardownAnswer | null | undefined): TeardownAnswer => ({
  done: Array.isArray(answer?.done) ? answer.done : [],
  nudges: typeof answer?.nudges === "number" ? answer.nudges : 0,
});

/** True if the action isn't done yet and everything it needs is. */
export function canDo(card: TeardownCard, answer: TeardownAnswer, action: TeardownAction): boolean {
  const done = new Set(safe(answer).done);
  return !done.has(action.id) && (action.after ?? []).every((dep) => done.has(dep));
}

/** The next unfinished action for a part, in the order the card lists them. */
export function nextActionFor(card: TeardownCard, answer: TeardownAnswer, part: string): TeardownAction | undefined {
  const done = new Set(safe(answer).done);
  return card.actions.find((a) => a.part === part && !done.has(a.id));
}

export type TryResult =
  | { kind: "done"; action: TeardownAction; answer: TeardownAnswer }
  | { kind: "nudge"; action: TeardownAction; answer: TeardownAnswer }
  | { kind: "nothing" };

/** What happens when the learner taps (or drags) a part. Pure. */
export function tryPart(card: TeardownCard, answer: TeardownAnswer, part: string): TryResult {
  const a = safe(answer);
  const action = nextActionFor(card, a, part);
  if (!action) return { kind: "nothing" };
  if (canDo(card, a, action)) return { kind: "done", action, answer: { ...a, done: [...a.done, action.id] } };
  return { kind: "nudge", action, answer: { ...a, nudges: a.nudges + 1 } };
}

/** Each part's state after the actions done so far (the last action on a part wins). */
export function partStates(card: TeardownCard, answer: TeardownAnswer): Map<string, PartState> {
  const byId = new Map(card.actions.map((a) => [a.id, a]));
  const states = new Map<string, PartState>();
  for (const id of safe(answer).done) {
    const action = byId.get(id);
    if (!action) continue;
    if ((PREP_VERBS as readonly string[]).includes(action.verb)) {
      states.set(action.part, "heated");
      continue;
    }
    const removing = (REMOVE_VERBS as readonly string[]).includes(action.verb);
    states.set(action.part, removing ? (action.verb === "unplug" ? "unplugged" : "out") : "in");
  }
  return states;
}

/** Every action done exactly once, each after the actions it needs. */
export function isValidOrder(card: TeardownCard, done: readonly string[]): boolean {
  const byId = new Map(card.actions.map((a) => [a.id, a]));
  const seen = new Set<string>();
  for (const id of done) {
    const action = byId.get(id);
    if (!action || seen.has(id) || !(action.after ?? []).every((dep) => seen.has(dep))) return false;
    seen.add(id);
  }
  return seen.size === card.actions.length;
}

export function isTeardownReady(answer: TeardownAnswer, card: TeardownCard): boolean {
  return safe(answer).done.length === card.actions.length;
}

export function gradeTeardown(card: TeardownCard, answer: TeardownAnswer): GradeResult {
  const a = safe(answer);
  const withinNudges = card.maxNudges === undefined || a.nudges <= card.maxNudges;
  return { correct: isValidOrder(card, a.done) && withinNudges };
}

const VERB_LABEL: Record<TeardownAction["verb"], string> = {
  unscrew: "Unscrew",
  lift: "Lift off",
  "slide-out": "Slide out",
  unplug: "Unplug",
  insert: "Put back",
  fasten: "Screw in",
  "plug-in": "Plug in",
  heat: "Soften the glue on",
};

export function describeAction(action: TeardownAction, partName: string): string {
  // "Bottom panel" → "bottom panel", but acronyms stay: "RAM (memory)", "CPU (processor)".
  const acronym = /^[A-Z]{2}/.test(partName);
  const name = acronym ? partName : `${partName.charAt(0).toLowerCase()}${partName.slice(1)}`;
  return `${VERB_LABEL[action.verb]} the ${name}`;
}

export function describeTeardownAnswer(card: TeardownCard, answer: TeardownAnswer): string {
  const a = safe(answer);
  const nudges = a.nudges ? ` (${a.nudges} ${a.nudges === 1 ? "nudge" : "nudges"})` : "";
  return `${a.done.length} of ${card.actions.length} steps done${nudges}`;
}

export function describeTeardownCorrect(card: TeardownCard): string {
  return `All ${card.actions.length} steps, each after the ones it needs`;
}
