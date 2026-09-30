import { describe, expect, it } from "vitest";
import { returnOrigin } from "./urls";

const PROD = new URL("https://cybernettrainer.com");

describe("returnOrigin", () => {
  it("keeps our own origins", () => {
    expect(returnOrigin("https://cybernettrainer.com", PROD)).toBe("https://cybernettrainer.com");
    expect(returnOrigin("http://localhost:3000", PROD)).toBe("http://localhost:3000");
    expect(returnOrigin("https://cyber-net-training-git-pro-sidsapkotas-projects.vercel.app", PROD)).toBe(
      "https://cyber-net-training-git-pro-sidsapkotas-projects.vercel.app",
    );
  });

  it("sends anything else to production", () => {
    for (const bad of [
      "https://evil.example.com",
      "https://cyber-net-training-git-pro-sidsapkotas-projects.vercel.app.evil.example.com",
      "https://cyber-net-training-x-someoneelse.vercel.app",
      "http://cybernettrainer.com",
      "javascript:alert(1)",
      null,
      undefined,
    ]) {
      expect(returnOrigin(bad, PROD), String(bad)).toBe("https://cybernettrainer.com");
    }
  });
});
