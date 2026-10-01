import { describe, expect, it } from "vitest";
import { LEAGUE_CAP, LEAGUES_MIN_ACTIVE, PROMOTE_MIN_XP } from "./config";
import { bandFor, bandPreference, placeLearner, type Band } from "./grouping";
import { outcomeOf, shouldOpenLeagues, shouldReplaceHandle } from "./rules";
import { type LeagueEntry, rankEntries, settleLeague, zoneOf, zoneSizes } from "./settle";
import { moveTier, TIERS } from "./tiers";
import { leagueWeek, nextWeek, previousWeek, resetInZone, timeLeft, weekWindow } from "./week";

const at = (iso: string) => new Date(iso).getTime();

describe("the league week (Monday 00:00 Australia/Sydney)", () => {
  it("starts on the Sydney Monday, whatever the UTC date", () => {
    // Monday 5 October 2026, 00:30 in Sydney (AEDT, UTC+11) is still Sunday in UTC.
    expect(leagueWeek(at("2026-10-04T13:30:00Z"))).toBe("2026-10-05");
    // One minute before Sydney midnight is still the previous week.
    expect(leagueWeek(at("2026-10-04T12:59:00Z"))).toBe("2026-09-28");
    expect(leagueWeek(at("2026-10-07T03:00:00Z"))).toBe("2026-10-05");
  });

  it("handles daylight saving starting (4 Oct 2026) and ending (5 Apr 2026)", () => {
    // The week of 28 Sep: starts at AEST (UTC+10), ends at AEDT (UTC+11) after the clocks go forward.
    expect(weekWindow("2026-09-28")).toEqual({ starts: at("2026-09-27T14:00:00Z"), ends: at("2026-10-04T13:00:00Z") });
    // The week of 30 Mar: starts at AEDT, ends at AEST after the clocks go back.
    expect(weekWindow("2026-03-30")).toEqual({ starts: at("2026-03-29T13:00:00Z"), ends: at("2026-04-05T14:00:00Z") });
    expect(weekWindow("2026-09-28").ends - weekWindow("2026-09-28").starts).toBe(7 * 86_400_000 - 3_600_000);
  });

  it("chains weeks and counts down to the reset", () => {
    expect(nextWeek("2026-09-28")).toBe("2026-10-05");
    expect(previousWeek("2026-10-05")).toBe("2026-09-28");
    const week = "2026-10-05";
    expect(timeLeft(weekWindow(week).ends - (2 * 86_400_000 + 5 * 3_600_000), week)).toBe("2d 5h");
    expect(timeLeft(weekWindow(week).ends - 12 * 60_000, week)).toBe("12m");
    expect(timeLeft(weekWindow(week).ends + 1, week)).toBe("0m");
  });

  it("shows the reset in the learner's own time zone", () => {
    expect(resetInZone("2026-10-05", "Australia/Sydney")).toBe("Monday 12:00 am");
    expect(resetInZone("2026-10-05", "Australia/Perth")).toBe("Sunday 9:00 pm");
    expect(resetInZone("2026-10-05", "Europe/London")).toBe("Sunday 2:00 pm");
  });
});

describe("grouping learners with similar activity", () => {
  it("bands by the last three finished weeks (new learners are light)", () => {
    expect(bandFor([])).toBe("light");
    expect(bandFor([90, 0, 0])).toBe("light");
    expect(bandFor([300, 0, 0])).toBe("regular"); // average 100
    expect(bandFor([500, 400, 300])).toBe("keen");
    expect(bandFor([1200])).toBe("keen"); // a single keen week: 400 a week over three
    expect(bandFor([0, 0, 0, 5000])).toBe("light"); // only the last three count
  });

  it("tries the learner's own band first, then the nearest", () => {
    expect(bandPreference("light")).toEqual(["light", "regular", "keen"]);
    expect(bandPreference("regular")).toEqual(["regular", "light", "keen"]);
    expect(bandPreference("keen")).toEqual(["keen", "regular", "light"]);
  });

  it("fills existing leagues before creating new ones, up to the cap", () => {
    const leagues = [
      { id: "a", band: "light" as Band, size: LEAGUE_CAP, createdAt: 1 },
      { id: "b", band: "keen" as Band, size: 4, createdAt: 2 },
      { id: "c", band: "regular" as Band, size: 12, createdAt: 3 },
    ];
    expect(placeLearner(leagues, "light", LEAGUE_CAP)).toEqual({ join: "c" }); // own band full: nearest
    expect(placeLearner(leagues, "keen", LEAGUE_CAP)).toEqual({ join: "b" });
    expect(placeLearner([{ id: "a", band: "light", size: LEAGUE_CAP, createdAt: 1 }], "regular", LEAGUE_CAP)).toEqual({ create: "regular" });
    expect(placeLearner([], "keen", LEAGUE_CAP)).toEqual({ create: "keen" });
  });

  it("puts 31 newcomers in one full league and starts a second", () => {
    const leagues: { id: string; band: Band; size: number; createdAt: number }[] = [];
    for (let i = 0; i < 31; i++) {
      const place = placeLearner(leagues, "light", LEAGUE_CAP);
      if ("join" in place) leagues.find((l) => l.id === place.join)!.size++;
      else leagues.push({ id: `l${leagues.length}`, band: place.create, size: 1, createdAt: i });
    }
    expect(leagues.map((l) => l.size)).toEqual([30, 1]);
  });
});

const entry = (n: number, weeklyXp: number, over: Partial<LeagueEntry> = {}): LeagueEntry => ({
  userId: `u${n}`,
  handle: `Learner${n}`,
  weeklyXp,
  lastAt: n,
  visible: true,
  ...over,
});

describe("promotion and demotion", () => {
  it("moves the top 20% up and the bottom 15% down", () => {
    expect(zoneSizes(30, "router")).toEqual({ up: 6, down: 4 });
    expect(zoneSizes(10, "router")).toEqual({ up: 2, down: 1 });
    expect(zoneSizes(6, "router")).toEqual({ up: 1, down: 1 });
    expect(zoneSizes(5, "router")).toEqual({ up: 1, down: 0 });
    expect(zoneSizes(2, "router")).toEqual({ up: 0, down: 0 });
  });

  it("never promotes from Quantum or demotes from Packet", () => {
    expect(zoneSizes(30, "quantum").up).toBe(0);
    expect(zoneSizes(30, "packet").down).toBe(0);
    expect(moveTier("quantum", 1)).toBe("quantum");
    expect(moveTier("packet", -1)).toBe("packet");
  });

  it("settles a full league", () => {
    const entries = Array.from({ length: 30 }, (_, i) => entry(i, 1000 - i * 30));
    const result = settleLeague(entries, "router");
    expect(result.filter((r) => r.toTier === "firewall").map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(result.filter((r) => r.toTier === "switch").map((r) => r.rank)).toEqual([27, 28, 29, 30]);
    expect(result.filter((r) => r.toTier === "router")).toHaveLength(20);
  });

  it("needs 50 XP to move up", () => {
    const result = settleLeague([entry(1, PROMOTE_MIN_XP - 1), entry(2, 10), entry(3, 5)], "packet");
    expect(result.every((r) => r.toTier === "packet")).toBe(true);
    expect(zoneOf(1, 3, "packet", PROMOTE_MIN_XP)).toBe("up");
  });

  it("never drops a 0 XP learner below Packet", () => {
    const entries = Array.from({ length: 8 }, (_, i) => entry(i, i === 7 ? 0 : 100));
    expect(settleLeague(entries, "packet").find((r) => r.userId === "u7")!.toTier).toBe("packet");
    expect(settleLeague(entries, "switch").find((r) => r.userId === "u7")!.toTier).toBe("packet");
  });

  it("breaks ties by who got there first, then by handle", () => {
    const ranked = rankEntries([
      entry(1, 200, { lastAt: 500, handle: "Zed" }),
      entry(2, 200, { lastAt: 100, handle: "Yan" }),
      entry(3, 200, { lastAt: 100, handle: "Abe" }),
      entry(4, 300, { lastAt: 900 }),
    ]);
    expect(ranked.map((e) => e.userId)).toEqual(["u4", "u3", "u2", "u1"]);
  });

  it("leaves hidden learners out of the ranking (their tier doesn't move)", () => {
    const result = settleLeague([entry(1, 900, { visible: false }), entry(2, 100), entry(3, 60), entry(4, 10)], "switch");
    expect(result.map((r) => r.userId)).toEqual(["u2", "u3", "u4"]);
    expect(result[0]!.rank).toBe(1);
  });

  it("describes the week's outcome", () => {
    expect(outcomeOf("router", "firewall")).toBe("promoted");
    expect(outcomeOf("router", "router")).toBe("stayed");
    expect(outcomeOf("router", "switch")).toBe("demoted");
    expect(TIERS).toHaveLength(7);
  });
});

describe("opening leagues", () => {
  it(`opens the first week ${LEAGUES_MIN_ACTIVE} learners earn XP, then stays open`, () => {
    expect(shouldOpenLeagues(LEAGUES_MIN_ACTIVE - 1, null)).toBe(false);
    expect(shouldOpenLeagues(LEAGUES_MIN_ACTIVE, null)).toBe(true);
    // Already open: never "re-opened" or closed by a quiet Monday.
    expect(shouldOpenLeagues(0, "2026-10-01T00:00:00Z")).toBe(false);
    expect(shouldOpenLeagues(100, "2026-10-01T00:00:00Z")).toBe(false);
  });
});

describe("reports", () => {
  it("replaces a username after three different learners report it", () => {
    expect(shouldReplaceHandle(2)).toBe(false);
    expect(shouldReplaceHandle(3)).toBe(true);
  });
});
