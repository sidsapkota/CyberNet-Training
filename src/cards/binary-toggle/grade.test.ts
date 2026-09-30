import { describe, expect, it } from "vitest";
import { binaryToggle } from "@/test/fixtures";
import { bitsToDecimal, decimalToBits, formatBits, PLACE_VALUES } from "./binary";
import { describeBinaryToggleAnswer, describeBinaryToggleCorrect, gradeBinaryToggle } from "./grade";

const bits = (pattern: string) => [...pattern].map((c) => c === "1");

describe("binary helpers", () => {
  it("has place values 128 down to 1", () => {
    expect(PLACE_VALUES).toEqual([128, 64, 32, 16, 8, 4, 2, 1]);
  });

  it.each([
    ["00000000", 0],
    ["00000101", 5],
    ["00101010", 42],
    ["11001000", 200],
    ["11111111", 255],
  ])("reads %s as %i", (pattern, value) => {
    expect(bitsToDecimal(bits(pattern))).toBe(value);
    expect(formatBits(decimalToBits(value))).toBe(pattern);
  });

  it("round-trips every byte value", () => {
    for (let n = 0; n <= 255; n++) expect(bitsToDecimal(decimalToBits(n))).toBe(n);
  });

  it.each([-1, 256, 1.5])("rejects %s in decimalToBits", (value) => {
    expect(() => decimalToBits(value)).toThrow(RangeError);
  });
});

describe("gradeBinaryToggle", () => {
  it("is correct when the bits add up to the target", () => {
    expect(gradeBinaryToggle(binaryToggle({ target: 42 }), bits("00101010"))).toEqual({ correct: true });
    expect(gradeBinaryToggle(binaryToggle({ target: 255 }), bits("11111111"))).toEqual({ correct: true });
    expect(gradeBinaryToggle(binaryToggle({ target: 0 }), bits("00000000"))).toEqual({ correct: true });
  });

  it("is incorrect when they don't", () => {
    expect(gradeBinaryToggle(binaryToggle({ target: 42 }), bits("00101011"))).toEqual({ correct: false });
    expect(gradeBinaryToggle(binaryToggle({ target: 42 }), bits("00000000"))).toEqual({ correct: false });
  });

  it("is incorrect for anything other than 8 bits", () => {
    expect(gradeBinaryToggle(binaryToggle({ target: 5 }), bits("101"))).toEqual({ correct: false });
    expect(gradeBinaryToggle(binaryToggle({ target: 5 }), bits("000000101"))).toEqual({ correct: false });
  });
});

describe("describeBinaryToggle*", () => {
  it("shows bits and decimal value", () => {
    const card = binaryToggle({ target: 42 });
    expect(describeBinaryToggleAnswer(card, bits("00101000"))).toBe("00101000 (40)");
    expect(describeBinaryToggleCorrect(card)).toBe("00101010 (42)");
  });
});
