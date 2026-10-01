/**
 * A simulated league season, using the same pure rules as the server in the same order as
 * `onXpEarned` and `finalizeDueWeeks`: a learner's first XP of the week places them (tier, then
 * band, `placeLearner` mirrors `join_league`), leagues open once LEAGUES_MIN_ACTIVE learners are
 * playing that week, and finished weeks since opening are settled with `settleLeague`.
 * The database side of placement (the cap under concurrency) is proven by `check:rls`.
 */
import { describe, expect, it } from "vitest";
import { LEAGUE_CAP, LEAGUES_MIN_ACTIVE } from "./config";
import { bandFor, placeLearner, type Band } from "./grouping";
import { shouldOpenLeagues } from "./rules";
import { settleLeague } from "./settle";
import type { Tier } from "./tiers";
import { leagueWeek, nextWeek, weekWindow } from "./week";

interface League {
  id: string;
  tier: Tier;
  band: Band;
  members: string[];
  createdAt: number;
}

class World {
  openedAt: string | null = null;
  readonly tiers = new Map<string, Tier>();
  /** week → leagues */
  readonly leagues = new Map<string, League[]>();
  /** week → user → { xp, lastAt } */
  readonly xp = new Map<string, Map<string, { xp: number; lastAt: number }>>();
  private nextId = 0;

  earn(userId: string, amount: number, now: number): void {
    const week = leagueWeek(now);
    const weekXp = this.xp.get(week) ?? new Map();
    this.xp.set(week, weekXp);
    weekXp.set(userId, { xp: (weekXp.get(userId)?.xp ?? 0) + amount, lastAt: now });

    const leagues = this.leagues.get(week) ?? [];
    this.leagues.set(week, leagues);
    if (!leagues.some((l) => l.members.includes(userId))) {
      const tier = this.tiers.get(userId) ?? "packet";
      this.tiers.set(userId, tier);
      // Like the server: the total of the last three finished weeks, averaged by bandFor.
      let recent = 0;
      for (let w = 1; w <= 3; w++) recent += this.xp.get(weekBefore(week, w))?.get(userId)?.xp ?? 0;
      const own = leagues.filter((l) => l.tier === tier);
      const place = placeLearner(
        own.map((l) => ({ id: l.id, band: l.band, size: l.members.length, createdAt: l.createdAt })),
        bandFor([recent]),
        LEAGUE_CAP,
      );
      if ("join" in place) leagues.find((l) => l.id === place.join)!.members.push(userId);
      else leagues.push({ id: `league-${this.nextId++}`, tier, band: place.create, members: [userId], createdAt: now });
    }

    const active = leagues.reduce((n, l) => n + l.members.length, 0);
    if (shouldOpenLeagues(active, this.openedAt)) this.openedAt = new Date(now).toISOString();
  }

  /** The weekly job: settles a finished week, only once leagues have opened. */
  settle(week: string): void {
    if (!this.openedAt || week < leagueWeek(new Date(this.openedAt))) return;
    for (const league of this.leagues.get(week) ?? []) {
      const entries = league.members.map((userId) => {
        const x = this.xp.get(week)!.get(userId)!;
        return { userId, handle: userId, weeklyXp: x.xp, lastAt: x.lastAt, visible: true };
      });
      for (const outcome of settleLeague(entries, league.tier)) this.tiers.set(outcome.userId, outcome.toTier);
    }
  }
}

function weekBefore(week: string, weeks: number): string {
  let w = week;
  for (let i = 0; i < weeks; i++) w = leagueWeek(weekWindow(w).starts - 1);
  return w;
}

const WEEK_1 = leagueWeek(Date.parse("2026-10-06T02:00:00Z"));
const WEEK_2 = nextWeek(WEEK_1);
const during = (week: string, minutes: number) => weekWindow(week).starts + minutes * 60_000;
const learner = (i: number) => `learner-${String(i).padStart(2, "0")}`;

function expectLeaguesValid(world: World, week: string, active: number): void {
  const leagues = world.leagues.get(week) ?? [];
  const everyone = leagues.flatMap((l) => l.members);
  expect(everyone).toHaveLength(active);
  expect(new Set(everyone).size).toBe(active); // one league per learner per week
  for (const league of leagues) {
    expect(league.members.length).toBeGreaterThan(0);
    expect(league.members.length).toBeLessThanOrEqual(LEAGUE_CAP);
    for (const id of league.members) expect(world.tiers.get(id)).toBe(league.tier); // own tier only
  }
}

describe(`a simulated season with ${LEAGUES_MIN_ACTIVE} active learners`, () => {
  it("opens leagues, places everyone in leagues of up to 30, and stays open the next week", () => {
    const world = new World();

    // Week 1: learners arrive one by one, some earning XP more than once.
    for (let i = 0; i < LEAGUES_MIN_ACTIVE; i++) {
      expect(world.openedAt).toBeNull(); // hidden until the 20th learner plays
      world.earn(learner(i), 10, during(WEEK_1, i * 60));
      world.earn(learner(i), 10 * i, during(WEEK_1, i * 60 + 30));
    }
    expect(world.openedAt).not.toBeNull();
    expect(leagueWeek(new Date(world.openedAt!))).toBe(WEEK_1);
    expectLeaguesValid(world, WEEK_1, LEAGUES_MIN_ACTIVE);
    expect(world.leagues.get(WEEK_1)).toHaveLength(1); // 20 newcomers share one Packet league

    // Monday: week 1 settles. The top 20% (4 of 20) move up; Packet never drops anyone.
    world.settle(WEEK_1);
    const switchTier = [...world.tiers].filter(([, tier]) => tier === "switch").map(([id]) => id);
    expect(switchTier.sort()).toEqual([learner(16), learner(17), learner(18), learner(19)]);
    expect([...world.tiers.values()].filter((t) => t === "packet")).toHaveLength(16);

    // Week 2 is quiet: only 3 learners play. Leagues stay open, and tiers stay apart.
    const openedAt = world.openedAt;
    world.earn(learner(0), 20, during(WEEK_2, 5));
    world.earn(learner(1), 20, during(WEEK_2, 6));
    world.earn(learner(19), 20, during(WEEK_2, 7));
    expect(world.openedAt).toBe(openedAt);
    expectLeaguesValid(world, WEEK_2, 3);
    expect(world.leagues.get(WEEK_2)!.map((l) => [l.tier, l.members.length])).toEqual([
      ["packet", 2],
      ["switch", 1],
    ]);
  });

  it("starts a new league only when one is full (75 learners: 30, 30, 15)", () => {
    const world = new World();
    for (let i = 0; i < 75; i++) world.earn(learner(i), 25, during(WEEK_1, i));
    expectLeaguesValid(world, WEEK_1, 75);
    expect(world.leagues.get(WEEK_1)!.map((l) => l.members.length)).toEqual([30, 30, 15]);
  });

  it("never settles or promotes before leagues open", () => {
    const world = new World();
    for (let i = 0; i < LEAGUES_MIN_ACTIVE - 1; i++) world.earn(learner(i), 100 + i, during(WEEK_1, i));
    world.settle(WEEK_1);
    expect(world.openedAt).toBeNull();
    expect([...world.tiers.values()].every((t) => t === "packet")).toBe(true);
  });
});
