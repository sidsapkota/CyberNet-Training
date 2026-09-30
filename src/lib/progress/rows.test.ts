import { describe, expect, it } from "vitest";
import { rowsToSnapshot, snapshotToRows } from "./rows";
import { cardKey } from "./types";

describe("rows ↔ snapshot", () => {
  const rows = {
    cards: [{ lesson_id: "l1", card_id: "c1", completed_at: "2026-09-01T10:00:00+00:00", xp: 10 }],
    lessons: [{ lesson_id: "l1", completed_at: "2026-09-01T10:05:00+00:00", xp: 20 }],
    attempts: [
      { quiz_id: "q1", attempted_at: "2026-09-02T09:00:00+00:00", score: 0.4, passed: false, xp: 0, answers: [] },
      { quiz_id: "q1", attempted_at: "2026-09-02T10:00:00+00:00", score: 0.9, passed: true, xp: 50, answers: [] },
    ],
    learningMode: "explore",
  };

  it("builds the app's snapshot, deriving best score, first pass and total XP", () => {
    const s = rowsToSnapshot(rows);
    expect(s.cards[cardKey("l1", "c1")]).toEqual({ completedAt: "2026-09-01T10:00:00.000Z", xp: 10 });
    expect(s.lessons.l1?.completedAt).toBe("2026-09-01T10:05:00.000Z");
    expect(s.quizzes.q1).toMatchObject({ bestScore: 0.9, passedAt: "2026-09-02T10:00:00.000Z" });
    expect(s.preferences.mode).toBe("explore");
    expect(s.totalXp).toBe(80);
  });

  it("falls back to Path for unknown modes and survives bad stored answers", () => {
    const s = rowsToSnapshot({ ...rows, learningMode: null, attempts: [{ ...rows.attempts[0]!, answers: "junk" }] });
    expect(s.preferences.mode).toBe("path");
    expect(s.quizzes.q1?.attempts[0]?.answers).toEqual([]);
  });

  it("round-trips through rows for the merge upsert", () => {
    const s = rowsToSnapshot(rows);
    const out = snapshotToRows("user-1", s);
    expect(out.cards).toEqual([
      { user_id: "user-1", lesson_id: "l1", card_id: "c1", completed_at: "2026-09-01T10:00:00.000Z", xp: 10 },
    ]);
    expect(out.attempts).toHaveLength(2);
    expect(out.attempts.every((a) => a.user_id === "user-1")).toBe(true);
  });
});
