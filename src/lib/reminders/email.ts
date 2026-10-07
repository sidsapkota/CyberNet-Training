/**
 * The reminder emails' words, as pure functions (tested). Every email, by the Australian Spam Act:
 * - says who it's from (CyberNet Training, with a contact address) and why they're getting it;
 * - has a one-tap unsubscribe link (also sent as List-Unsubscribe headers, see server.ts);
 * - is a reminder only: no offers, no Pro pitch.
 * Short and calm: one line of news, one button, the footer.
 */
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";
import type { Reminder } from "./rules";

export interface ReminderLinks {
  /** Where the button goes (through /api/email/go, which notes the return). */
  go: string;
  /** One-tap unsubscribe. */
  unsubscribe: string;
  /** The 1×1 open image. */
  open: string;
  /** The site, for the footer ("cybernettraining.com"). */
  site: string;
}

export interface ReminderEmail {
  subject: string;
  text: string;
  html: string;
}

export const SENDER = `${SITE_NAME} <noreply@cybernettraining.com>`;

function words(reminder: Reminder): { subject: string; line: string; button: string } {
  if (reminder.kind === "league") {
    const hours = `${reminder.hoursLeft} hour${reminder.hoursLeft === 1 ? "" : "s"}`;
    return {
      subject: `Your league ends in ${hours}. You're #${reminder.rank}`,
      line: `You're #${reminder.rank} in your league this week, and it resets in ${hours}. One more lesson could move you up.`,
      button: "See your league",
    };
  }
  const streak = `${reminder.days}-day streak`;
  return reminder.endsTonight
    ? { subject: `Your ${streak} ends tonight`, line: `Your ${streak} ends at midnight unless you learn something today. One short lesson is enough.`, button: "Keep my streak" }
    : { subject: `Keep your ${streak} going`, line: `You haven't learned anything today yet. One short lesson keeps your ${streak} going.`, button: "Keep my streak" };
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function reminderEmail(reminder: Reminder, username: string | null, links: ReminderLinks): ReminderEmail {
  const { subject, line, button } = words(reminder);
  const hello = username ? `Hi ${username},` : "Hi,";
  const why = `You're getting this because you turned on reminder emails in ${SITE_NAME}. We send at most one a day.`;
  const text = [
    hello,
    "",
    line,
    "",
    `${button}: ${links.go}`,
    "",
    "--",
    why,
    `Unsubscribe in one tap: ${links.unsubscribe}`,
    `${SITE_NAME} · ${links.site} · ${CONTACT_EMAIL}`,
  ].join("\n");
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f6fa;font-family:Arial,Helvetica,sans-serif;color:#0b1f3a">
<table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px">
<tr><td style="font-size:16px;line-height:1.5">
<p style="margin:0 0 12px">${escape(hello)}</p>
<p style="margin:0 0 20px">${escape(line)}</p>
<p style="margin:0 0 24px"><a href="${escape(links.go)}" style="display:inline-block;background:#00c2ff;color:#041937;font-weight:bold;text-decoration:none;padding:12px 20px;border-radius:8px">${escape(button)}</a></p>
<p style="margin:0;font-size:13px;line-height:1.5;color:#4a5b75">${escape(why)}<br><a href="${escape(links.unsubscribe)}" style="color:#4a5b75">Unsubscribe in one tap</a><br>${escape(SITE_NAME)} · ${escape(links.site)} · <a href="mailto:${CONTACT_EMAIL}" style="color:#4a5b75">${CONTACT_EMAIL}</a></p>
</td></tr></table>
<img src="${escape(links.open)}" width="1" height="1" alt="" style="display:block;border:0">
</body></html>`;
  return { subject, text, html };
}
