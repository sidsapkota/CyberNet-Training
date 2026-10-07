import type { Metadata } from "next";
import { AdminShell, Table } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/auth";
import { leagueStats, logAdmin } from "@/lib/admin/server";

// Private: checked on the server for every request (requireAdmin, then each data call again).
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLeagues() {
  await requireAdmin();
  await logAdmin("view:leagues");
  const s = await leagueStats();
  return (
    <AdminShell current="/admin/leagues" title={`Leagues: week of ${s.week}`}>
      {s.leagues.length === 0 && <p className="text-small text-ink-muted">No leagues this week yet.</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {s.leagues.map((l, i) => (
          <section key={i}>
            <h2 className="text-lead font-semibold capitalize">{l.tier}</h2>
            <div className="mt-2">
              <Table head={["#", "Username", "Weekly XP"]} rows={l.rows.map((r, j) => [j + 1, <span key="u" className="[overflow-wrap:anywhere]">{r.username}</span>, r.weeklyXp])} />
            </div>
          </section>
        ))}
      </div>
      <h2 className="mt-8 text-lead font-semibold">Last week&apos;s results</h2>
      <div className="mt-3">
        <Table head={["Rank", "Username", "Weekly XP", "From", "To"]} rows={s.lastWeek.map((r) => [r.rank, <span key="u" className="[overflow-wrap:anywhere]">{r.username}</span>, r.weeklyXp, r.fromTier, r.toTier])} empty="No results for last week." />
      </div>
    </AdminShell>
  );
}
