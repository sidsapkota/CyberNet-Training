import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { leagueCardState, myStanding } from "./card";

describe("the dashboard's leagues card", () => {
  it("shows \"open soon\" to everyone while leagues are closed, with sign-up for guests", () => {
    expect(leagueCardState(true, true, "closed")).toBe("soon");
    expect(leagueCardState(true, false, "closed")).toBe("soon-guest");
  });

  it("becomes the real league card once leagues open, by itself", () => {
    expect(leagueCardState(true, true, "open")).toBe("open");
    expect(leagueCardState(true, false, "open")).toBe("open-guest");
  });

  it("waits while it's still finding out, so it never flips from \"soon\" to open", () => {
    expect(leagueCardState(true, true, "loading")).toBe("loading");
  });

  it("is hidden on a copy without accounts (no leagues there)", () => {
    expect(leagueCardState(false, false, "closed")).toBe("hidden");
  });

  it("finds the learner's own row", () => {
    expect(myStanding([{ isMe: false, rank: 1 }, { isMe: true, rank: 2 }])).toEqual({ isMe: true, rank: 2 });
    expect(myStanding([{ isMe: false, rank: 1 }])).toBeNull();
  });
});

describe("the \"open soon\" card", () => {
  it("loads no league data (no counts, other learners or empty leaderboard while closed)", () => {
    const source = fs.readFileSync("src/components/leagues/LeaguesCard.tsx", "utf8");
    const soon = source.slice(source.indexOf("function LeaguesSoon"), source.indexOf("function LeagueNow"));
    expect(soon.length).toBeGreaterThan(100);
    expect(soon).not.toMatch(/getMyLeagueAction|league_standings|rpc\(|standings/);
    expect(soon).toContain("Leagues open soon. Earn XP now to be ready.");
  });
});

