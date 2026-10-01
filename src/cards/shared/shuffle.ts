/** 32-bit FNV-1a hash, used to seed the shuffle from a card id. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Mulberry32 PRNG: tiny, deterministic, good enough for shuffling UI items. */
export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic shuffle seeded by `seed` that never returns the input order
 * (for 2+ items), so a drag-to-order card never starts already solved.
 * Being deterministic keeps it pure: same card, same starting order.
 */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const result = [...items];
  if (result.length < 2) return result;

  const random = mulberry32(hashString(seed));
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }

  if (result.every((item, i) => item === items[i])) {
    // Landed on the original order: rotating by one always differs.
    result.push(result.shift() as T);
  }
  return result;
}
