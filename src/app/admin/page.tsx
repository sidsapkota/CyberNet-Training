import type { Metadata } from "next";
import { AdminShell, Stat, DayBars } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/auth";
import { logAdmin, overview } from "@/lib/admin/server";

// Private: checked on the server for every request (requireAdmin, then each data call again).
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  await requireAdmin();
  await logAdmin("view:overview");
  const o = await overview();
  const money = o.founderRevenue.map((r) => `${r.currency.toUpperCase()} ${(r.amount / 100).toFixed(2)}`).join(", ") || "0";
  return (
    <AdminShell current="/admin" title="Overview">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Learners" value={o.learners} />
        <Stat label="Active today" value={o.activeToday} note="Earned XP today (Sydney)" />
        <Stat label="Active, 7 days" value={o.active7} />
        <Stat label="Returning" value={o.returning} note="XP on 2 or more days" />
        <Stat label="Lessons completed" value={o.lessonsCompleted} />
        <Stat label="Pro subscribers" value={o.subscribers.monthly + o.subscribers.yearly} note={`${o.subscribers.monthly} monthly, ${o.subscribers.yearly} yearly, ${o.subscribers.trialing} on trial`} />
        <Stat label="Founding Members" value={o.founders} note={`Revenue ${money}`} />
        <Stat label="Early-user grants" value={o.grants} note="Active now" />
      </div>
      <div className="mt-8 max-w-3xl">
        <DayBars data={o.signups} label="Sign-ups per day, last 30 days (Sydney)" />
      </div>
    </AdminShell>
  );
}
