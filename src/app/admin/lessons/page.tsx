import type { Metadata } from "next";
import { AdminShell, Table } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/auth";
import { lessonStats, logAdmin } from "@/lib/admin/server";

// Private: checked on the server for every request (requireAdmin, then each data call again).
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLessons() {
  await requireAdmin();
  await logAdmin("view:lessons");
  const s = await lessonStats();
  return (
    <AdminShell current="/admin/lessons" title="Lessons">
      <h2 className="text-lead font-semibold">Started vs finished</h2>
      <div className="mt-3">
        <Table head={["Course", "Lesson", "Started", "Finished", "Finish rate"]} rows={s.lessons.map((l) => [l.course, l.title, l.started, l.finished, l.started ? `${Math.round((100 * l.finished) / l.started)}%` : "–"])} />
      </div>
      <h2 className="mt-8 text-lead font-semibold">Most mistakes</h2>
      <div className="mt-3">
        <Table head={["Lesson", "Card", "Misses"]} rows={s.mistakes.map((m) => [m.lessonTitle, m.cardId, m.value])} empty="No mistakes recorded yet." />
      </div>
      <h2 className="mt-8 text-lead font-semibold">Last 7 days: slowest and most missed first answers</h2>
      {s.mostMissed === null ? (
        <p className="mt-3 text-small text-ink-muted">Card measurements aren&apos;t live yet.</p>
      ) : (
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <Table head={["Lesson", "Card", "Median seconds"]} rows={s.slowest.map((m) => [m.lessonTitle, m.cardId, m.value])} empty="Not enough plays yet (5 per card)." />
          <Table head={["Lesson", "Card", "% wrong first try"]} rows={s.mostMissed.map((m) => [m.lessonTitle, m.cardId, `${m.value}%`])} empty="Not enough plays yet (5 per card)." />
        </div>
      )}
      <p className="mt-6 text-small text-ink-muted">Where learners quit is the lesson_quit event in Vercel Analytics.</p>
    </AdminShell>
  );
}
