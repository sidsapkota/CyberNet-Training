/**
 * Every league number in one place. Changing one here changes the rules everywhere (the server,
 * the UI and the tests all read these).
 */

/** Leagues reset every Monday at 00:00 in this time zone (the database uses the same one). */
export const LEAGUE_TIME_ZONE = "Australia/Sydney";

/** Leagues (and their nav entry) stay hidden until this many learners earn XP in one week. */
export const LEAGUES_MIN_ACTIVE = 20;

/** The most learners in one league. */
export const LEAGUE_CAP = 30;

/** Share of a league that moves up, and down, each week. */
export const PROMOTE_SHARE = 0.2;
export const DEMOTE_SHARE = 0.15;
/** Leagues need at least this many learners before anyone moves up, or down. */
export const PROMOTE_MIN_LEAGUE = 3;
export const DEMOTE_MIN_LEAGUE = 6;
/** Moving up also needs at least this much XP that week (no free promotions in tiny leagues). */
export const PROMOTE_MIN_XP = 50;

/** Activity bands, from the average weekly XP of the last few finished weeks. */
export const BAND_WEEKS = 3;
export const BAND_REGULAR_XP = 100;
export const BAND_KEEN_XP = 400;

/** Reports: when they replace a username automatically, and how many one learner may send a day. */
export const REPORTS_TO_REPLACE = 3;
export const REPORTS_PER_DAY = 10;
