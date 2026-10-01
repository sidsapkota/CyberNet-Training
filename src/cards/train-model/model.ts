/**
 * The two tiny models behind `train_model` cards. Pure and deterministic: no libraries, no
 * randomness, no network. Content only supplies examples; nothing in a card is ever run.
 *
 * - `nearest`: examples are points on a 0–10 chart. A new point gets the label of its nearest
 *   training point (k = 1), or the most common label of its 3 nearest (k = 3; if all three differ,
 *   the nearest wins). Ties in distance go to the example listed first.
 * - `word-vote`: examples are short messages. Each word (3+ letters, lower case) in the new
 *   message votes once for every training message of each label that contains it. The label with
 *   the most votes wins; a tie (or no votes) means "not sure".
 */

export interface PointExample {
  x: number;
  y: number;
  label: string;
}

export interface TextExample {
  text: string;
  label: string;
}

/** The label the model guesses, or null for "not sure". */
export type Guess = string | null;

export function predictNearest(training: readonly PointExample[], point: { x: number; y: number }, k: 1 | 3): Guess {
  if (training.length === 0) return null;
  const ranked = training
    .map((example, index) => ({ example, index, d: (example.x - point.x) ** 2 + (example.y - point.y) ** 2 }))
    .sort((a, b) => a.d - b.d || a.index - b.index)
    .slice(0, k);
  const counts = new Map<string, number>();
  for (const { example } of ranked) counts.set(example.label, (counts.get(example.label) ?? 0) + 1);
  const best = Math.max(...counts.values());
  // A clear majority wins; otherwise the nearest example decides.
  const leaders = [...counts].filter(([, n]) => n === best);
  return leaders.length === 1 ? leaders[0]![0] : ranked[0]!.example.label;
}

/** Lower-case words of 3+ letters, each once (so repeating a word doesn't add votes). */
export function wordsOf(text: string): string[] {
  return [...new Set(text.toLowerCase().match(/[a-z]{3,}/g) ?? [])];
}

export function predictWordVote(training: readonly TextExample[], text: string): Guess {
  const votes = new Map<string, number>();
  const words = wordsOf(text);
  for (const example of training) {
    const seen = new Set(wordsOf(example.text));
    for (const word of words) if (seen.has(word)) votes.set(example.label, (votes.get(example.label) ?? 0) + 1);
  }
  if (votes.size === 0) return null;
  const best = Math.max(...votes.values());
  const leaders = [...votes].filter(([, n]) => n === best);
  return leaders.length === 1 ? leaders[0]![0] : null;
}

/** What a card's model needs to know, in plain shapes (so the schema can use it too). */
export type ModelSettings = { kind: "nearest"; k: 1 | 3 } | { kind: "word-vote" };
export interface Item {
  id: string;
  text: string;
  x?: number | undefined;
  y?: number | undefined;
}

/** Trains on `training` (items with the labels to learn) and guesses a label for each test item. */
export function guessTests(model: ModelSettings, training: readonly (Item & { label: string })[], tests: readonly Item[]): Record<string, Guess> {
  const out: Record<string, Guess> = {};
  for (const test of tests) {
    out[test.id] =
      model.kind === "nearest"
        ? predictNearest(
            training.map((e) => ({ x: e.x ?? 0, y: e.y ?? 0, label: e.label })),
            { x: test.x ?? 0, y: test.y ?? 0 },
            model.k,
          )
        : predictWordVote(training, test.text);
  }
  return out;
}

/** Every non-empty subset of `ids`, smallest first (then in listed order). For ≤ 12 ids. */
export function subsetsOf(ids: readonly string[]): string[][] {
  const out: string[][] = [];
  for (let mask = 1; mask < 1 << ids.length; mask++) out.push(ids.filter((_, i) => mask & (1 << i)));
  return out.sort((a, b) => a.length - b.length);
}
