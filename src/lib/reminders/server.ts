import "server-only";
/**
 * Reminder emails on the server, with the secret key. Called only by the hourly job (authenticated
 * by CRON_SECRET) and by the email links (each checked against a random key or token from the email
 * itself). Nothing here takes a user id from a browser.
 *
 * Safety: only learners who opted in (profiles.reminder_emails) are ever considered; outside the
 * production deployment, emails are only delivered to FEEDBACK_INBOX (the owner's test inbox) and
 * everyone else is a dry run; one a day is enforced by a unique index.
 */
import { track } from "@vercel/analytics/server";
import { leaguesOpenedAt } from "@/lib/leagues/server";
import { rankEntries } from "@/lib/leagues/settle";
import { leagueWeek, weekWindow } from "@/lib/leagues/week";
import { goalDayFromRow } from "@/lib/progress/rows";
import { computeStreak } from "@/lib/progress/streak";
import { FEEDBACK_INBOX, siteUrl } from "@/lib/site";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { reminderEmail, SENDER } from "./email";
import { clockIn, isLeagueReminderHour, leagueReminder, pickReminder, type Reminder, STREAK_REMINDER_HOUR, streakReminder } from "./rules";

type Admin = ReturnType<typeof createSupabaseAdminClient>;
const DEFAULT_TZ = "Australia/Sydney";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(message: string, error: { message: string } | null | undefined): asserts error is null | undefined {
  if (error) throw new Error(`${message}: ${error.message}`);
}

async function event(name: "reminder_sent" | "reminder_opened" | "reminder_returned", kind: string): Promise<void> {
  try {
    await track(name, { source: kind });
  } catch {
    // Analytics is a nicety; the database row is the record.
  }
}

/** The learner's place in their league this week, or null (not in one, hidden, or no XP). */
async function leaguePlace(admin: Admin, userId: string, now: Date): Promise<{ rank: number; weeklyXp: number } | null> {
  const week = leagueWeek(now);
  const mine = await admin.from("league_members").select("league_id").match({ week, user_id: userId }).maybeSingle();
  fail("Couldn't read league membership", mine.error);
  if (!mine.data) return null;
  const members = await admin.from("league_members").select("user_id").match({ week, league_id: mine.data.league_id });
  fail("Couldn't read the league", members.error);
  const ids = (members.data ?? []).map((m) => m.user_id);
  const [players, names, events] = await Promise.all([
    admin.from("league_players").select("user_id, show_on_leaderboards").in("user_id", ids),
    admin.from("profiles").select("id, username").in("id", ids),
    admin
      .from("xp_events")
      .select("user_id, xp, at")
      .in("user_id", ids)
      .neq("kind", "practice") // the same rule as league_standings()
      .gte("at", new Date(weekWindow(week).starts).toISOString())
      .lt("at", new Date(weekWindow(week).ends).toISOString()),
  ]);
  fail("Couldn't read the standings", players.error ?? names.error ?? events.error);
  const visible = new Set((players.data ?? []).filter((p) => p.show_on_leaderboards).map((p) => p.user_id));
  const handle = new Map((names.data ?? []).map((p) => [p.id, p.username ?? ""]));
  const totals = new Map(ids.map((id) => [id, { xp: 0, lastAt: null as number | null }]));
  for (const row of events.data ?? []) {
    const t = totals.get(row.user_id);
    if (!t) continue;
    t.xp += row.xp;
    t.lastAt = Math.max(t.lastAt ?? 0, Date.parse(row.at));
  }
  const ranked = rankEntries(ids.filter((id) => visible.has(id)).map((id) => ({ userId: id, handle: handle.get(id) ?? "", weeklyXp: totals.get(id)!.xp, lastAt: totals.get(id)!.lastAt })));
  const at = ranked.findIndex((e) => e.userId === userId);
  return at === -1 ? null : { rank: at + 1, weeklyXp: ranked[at]!.weeklyXp };
}

/** The streak reminder's inputs: the streak (from met days) and whether they've earned XP today. */
async function streakState(admin: Admin, userId: string, day: string, tz: string): Promise<{ streak: number; freezes: number; xpToday: number }> {
  const [goalDays, today] = await Promise.all([
    admin.from("goal_days").select("day, time_zone, goal, met_at").eq("user_id", userId),
    admin.from("xp_events").select("xp").match({ user_id: userId, day }),
  ]);
  fail("Couldn't read the streak", goalDays.error ?? today.error);
  const days = Object.fromEntries((goalDays.data ?? []).map(goalDayFromRow).filter((g) => g !== null));
  const streak = computeStreak(days, { day, tz });
  return { streak: streak.current, freezes: streak.freezes, xpToday: (today.data ?? []).reduce((s, r) => s + r.xp, 0) };
}

export interface ReminderRun {
  considered: number;
  sent: number;
  dryRun: number;
}

/** The hourly job: every opted-in learner due a reminder this hour gets at most one. */
export async function sendDueReminders(now = new Date()): Promise<ReminderRun> {
  const admin = createSupabaseAdminClient();
  const run: ReminderRun = { considered: 0, sent: 0, dryRun: 0 };
  const optedIn = await admin.from("profiles").select("id, username, time_zone, email_token").eq("reminder_emails", true);
  fail("Couldn't read who wants reminders", optedIn.error);
  if (!optedIn.data?.length) return run;

  const open = (await leaguesOpenedAt(admin)) !== null;
  const leagueHour = open && isLeagueReminderHour(now);
  const hoursLeft = Math.round((weekWindow(leagueWeek(now)).ends - now.getTime()) / 3_600_000);

  for (const learner of optedIn.data) {
    run.considered++;
    try {
      const tz = learner.time_zone ?? DEFAULT_TZ;
      const clock = clockIn(now, tz);
      const place = leagueHour ? await leaguePlace(admin, learner.id, now) : null;
      const league = leagueReminder({ open, leagueHour, localHour: clock.hour, rank: place?.rank ?? null, weeklyXp: place?.weeklyXp ?? 0, hoursLeft });
      const streak = league ? null : clock.hour === STREAK_REMINDER_HOUR ? streakReminder({ localHour: clock.hour, ...(await streakState(admin, learner.id, clock.day, tz)) }) : null;
      const reminder = pickReminder(league, streak);
      if (!reminder) continue;
      const outcome = await deliver(admin, learner, reminder, clock.day);
      if (outcome === "sent") run.sent++;
      else if (outcome === "dry-run") run.dryRun++;
    } catch (error) {
      console.error("Reminders: couldn't handle a learner", error);
    }
  }
  return run;
}

async function deliver(
  admin: Admin,
  learner: { id: string; username: string | null; email_token: string },
  reminder: Reminder,
  day: string,
): Promise<"sent" | "dry-run" | "already"> {
  // Claim today's one email first: a second run in the same day (or hour) finds it taken.
  const claim = await admin.from("reminder_emails").insert({ user_id: learner.id, kind: reminder.kind, day }).select("id, key").single();
  if (claim.error?.code === "23505") return "already";
  fail("Couldn't record the reminder", claim.error);
  const { id, key } = claim.data;

  const user = await admin.auth.admin.getUserById(learner.id);
  const email = user.data.user?.email ?? null;
  const production = process.env.VERCEL_ENV === "production";
  const apiKey = process.env.RESEND_API_KEY;
  if (!email || !apiKey || (!production && email.toLowerCase() !== FEEDBACK_INBOX)) {
    await admin.from("reminder_emails").update({ dry_run: true }).eq("id", id);
    return "dry-run";
  }

  const site = siteUrl();
  const link = (path: string) => new URL(path, site).toString();
  const unsubscribe = link(`/api/email/unsubscribe?t=${learner.email_token}`);
  const target = reminder.kind === "league" ? "/leagues" : "/";
  const message = reminderEmail(reminder, learner.username, {
    go: link(`/api/email/go?r=${id}&k=${key}&to=${encodeURIComponent(target)}`),
    open: link(`/api/email/open?r=${id}&k=${key}`),
    unsubscribe,
    site: site.host,
  });
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `reminder/${id}` },
    body: JSON.stringify({
      from: SENDER,
      to: [email],
      reply_to: "hello@cybernettraining.com",
      subject: message.subject,
      text: message.text,
      html: message.html,
      headers: { "List-Unsubscribe": `<${unsubscribe}>, <mailto:hello@cybernettraining.com?subject=unsubscribe>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    }),
  });
  if (!response.ok) {
    // Free today's slot so a later run can try again (the streak hour won't come round today, but a
    // failure is logged either way).
    await admin.from("reminder_emails").delete().eq("id", id);
    throw new Error(`Resend refused a reminder (${response.status})`);
  }
  const sent = (await response.json().catch(() => ({}))) as { id?: string };
  await admin.from("reminder_emails").update({ resend_id: sent.id?.slice(0, 100) ?? null }).eq("id", id);
  await event("reminder_sent", reminder.kind);
  return "sent";
}

/** The open image: notes the first open (Apple Mail opens every image itself, so it's a rough count). */
export async function markOpened(id: string | null, key: string | null): Promise<void> {
  if (!id || !/^\d{1,18}$/.test(id) || !key || !UUID.test(key)) return;
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("reminder_emails").update({ opened_at: new Date().toISOString() }).match({ id: Number(id), key }).is("opened_at", null).select("kind");
  if (data?.[0]) await event("reminder_opened", data[0].kind);
}

/** The email's button: notes the return (the number to trust). */
export async function markReturned(id: string | null, key: string | null): Promise<void> {
  if (!id || !/^\d{1,18}$/.test(id) || !key || !UUID.test(key)) return;
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("reminder_emails").update({ returned_at: new Date().toISOString() }).match({ id: Number(id), key }).is("returned_at", null).select("kind");
  if (data?.[0]) await event("reminder_returned", data[0].kind);
}

/** One-tap unsubscribe, by the token in the email. True when the token was valid. */
export async function unsubscribe(token: string | null): Promise<boolean> {
  if (!token || !UUID.test(token)) return false;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("profiles").update({ reminder_emails: false }).eq("email_token", token).select("id");
  fail("Couldn't unsubscribe", error);
  return (data ?? []).length > 0;
}

/** The signed-in learner's own switch (from the Server Action, with a verified user id). */
export async function setReminderEmails(userId: string, on: boolean): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update(on ? { reminder_emails: true, reminder_consent_at: new Date().toISOString() } : { reminder_emails: false })
    .eq("id", userId);
  fail("Couldn't save the reminder setting", error);
}
