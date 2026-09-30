export const BIT_COUNT = 8;

/** Place values, most significant first: [128, 64, 32, 16, 8, 4, 2, 1]. */
export const PLACE_VALUES: readonly number[] = Array.from(
  { length: BIT_COUNT },
  (_, i) => 2 ** (BIT_COUNT - 1 - i),
);

export function bitsToDecimal(bits: readonly boolean[]): number {
  return bits.reduce((sum, on, i) => (on ? sum + (PLACE_VALUES[i] ?? 0) : sum), 0);
}

export function decimalToBits(value: number): boolean[] {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new RangeError(`Expected an integer from 0 to 255, got ${value}`);
  }
  return PLACE_VALUES.map((place) => (value & place) !== 0);
}

export function formatBits(bits: readonly boolean[]): string {
  return bits.map((on) => (on ? "1" : "0")).join("");
}
