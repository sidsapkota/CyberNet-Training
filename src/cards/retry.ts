/**
 * "Try again" after a wrong answer, for every card type: what the answer becomes. Pure.
 *
 * The rule (CLAUDE.md → Lesson player): the wrong part is cleared and anything right stays, where
 * the card type allows it; otherwise the card starts again. And Check stays off until the answer
 * differs from the one just marked wrong (`canCheckAgain`), so a learner can never re-check the
 * same wrong answer and loop on "wrong". When adding a card type, add its rule here; `satisfies`
 * makes the compiler insist.
 */
import { decimalToBits } from "./binary-toggle/binary";
import { firstWrongHop } from "./packet-path/grade";
import type { InteractiveCard } from "./schema";
import { retryScenario } from "./scenario/grade";
import { keepCorrect } from "./sort-bins/grade";
import { keepCorrectLabels } from "./train-model/grade";

type Retries = {
  [K in InteractiveCard["type"]]: (card: Extract<InteractiveCard, { type: K }>, answer: never) => unknown;
};

const RETRIES = {
  // A wrong pick is cleared: choose again.
  multiple_choice: () => null,
  // Nothing in a list can be "cleared": the order stays, and Check waits for a change.
  drag_to_order: (_card, answer: string[]) => answer,
  // Bits that are on but shouldn't be are switched off; the right ones stay on.
  binary_toggle: (card, answer: boolean[]) => {
    const target = decimalToBits(card.target);
    return answer.map((on, i) => on && target[i] === true);
  },
  // A wrong number is cleared.
  numeric_input: () => "",
  // Right pairs stay connected; wrong ones come apart.
  match_pairs: (card, answer: Record<string, string>) =>
    Object.fromEntries(card.pairs.filter((p) => answer[p.id] === p.id).map((p) => [p.id, p.id])),
  // The route is kept up to the hop before the first wrong one.
  packet_path: (card, answer: string[]) => {
    const wrong = firstWrongHop(card, answer);
    return wrong === null ? answer : answer.slice(0, Math.max(1, wrong));
  },
  // The typed answer is cleared; what was run stays on the screen.
  terminal: (_card, answer: { history: string[]; response: string }) => ({ history: answer.history, response: "" }),
  // Tap: right parts stay selected. Label: right labels stay placed.
  hotspot: (card, answer: { selected: string[]; placed: Record<string, number> }) => {
    const targets = new Set(card.targets ?? []);
    const labels = card.labels ?? [];
    return {
      selected: (answer.selected ?? []).filter((p) => targets.has(p)),
      placed: Object.fromEntries(Object.entries(answer.placed ?? {}).filter(([part, i]) => labels[i]?.part === part)),
    };
  },
  // Too many early taps can't be undone, so the take-apart starts again.
  teardown: () => ({ done: [], nudges: 0 }),
  // The controls stay as the learner set them (their moves aren't undone), and Check waits for a change.
  simulator: (_card, answer: Record<string, unknown>) => answer,
  // The failed ending comes off: pick again at that step.
  scenario: (card, answer: string[]) => retryScenario(card, answer),
  // Wrong items go back to the tray.
  sort_bins: (card, answer: Record<string, string>) => keepCorrect(card, answer),
  // Label goal: wrong labels are cleared. Fix goal: the added example comes off: pick again.
  train_model: (card, answer: { labels: Record<string, string>; included: string[] }) =>
    card.task.goal === "label" ? keepCorrectLabels(card, answer) : { ...answer, included: [] },
  // Pick goal: the pick is cleared. Probability goal: the slider stays, and Check waits for a change.
  next_word: (card, answer: { temperature: number; pick: string | null }) =>
    card.goal.type === "pick" ? { ...answer, pick: null } : answer,
  // A wrong pick is cleared: choose again.
  true_false: () => null,
  fill_gap: () => null,
} satisfies Retries;

/** The answer after Try again (never throws: a malformed answer starts the card again). */
export function retryAnswer(card: InteractiveCard, answer: unknown, initial: unknown): unknown {
  const retry = RETRIES[card.type] as (card: InteractiveCard, answer: unknown) => unknown;
  try {
    return retry(card, answer);
  } catch {
    return initial;
  }
}

/** Stable JSON (object keys sorted), so two answers can be compared whatever their key order. */
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, stable((value as Record<string, unknown>)[k])]),
    );
  }
  return value;
}

export function sameAnswer(a: unknown, b: unknown): boolean {
  return JSON.stringify(stable(a)) === JSON.stringify(stable(b));
}

/** After a wrong answer, Check comes back only once the answer has changed. */
export function canCheckAgain(answer: unknown, lastWrong: unknown | undefined): boolean {
  return lastWrong === undefined || !sameAnswer(answer, lastWrong);
}
