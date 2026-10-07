import type { Metadata } from "next";
import { AdminShell, Table } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/auth";
import Link from "next/link";
import { RevealEmail } from "@/components/admin/RevealEmail";
import { learners, LEARNERS_PAGE, logAdmin } from "@/lib/admin/server";

// Private: checked on the server for every request (requireAdmin, then each data call again).
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const date = (iso: string | null) => (iso ? new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "2-digit", timeZone: "Australia/Sydney" }).format(new Date(iso)) : "never");

export default async function AdminLearners({ searchParams }: PageProps<"/admin/learners">) {
  await requireAdmin();
  const page = Math.max(0, Number((await searchParams).page ?? 0) || 0);
  await logAdmin("view:learners", String(page));
  const { rows, total } = await learners(page);
  const pages = Math.max(1, Math.ceil(total / LEARNERS_PAGE));
  return (
    <AdminShell current="/admin/learners" title={`Learners (${total})`}>
      <Table
        head={["Username", "Joined", "Last active", "XP", "Streak", "Lessons", "Plan", "Email"]}
        rows={rows.map((r) => [
          <span key="u" className="[overflow-wrap:anywhere]">{r.username}</span>,
          date(r.joined),
          date(r.lastActive),
          r.xp,
          r.streak,
          r.lessonsDone,
          r.pro,
          <RevealEmail key="e" userId={r.id} hint={r.emailHint} username={r.username} />,
        ])}
      />
      <div className="mt-4 flex items-center gap-3 text-small">
        {page > 0 && <Link className="inline-flex min-h-11 items-center underline" prefetch={false} href={`/admin/learners?page=${page - 1}`}>Newer</Link>}
        <span className="text-ink-muted">Page {page + 1} of {pages}</span>
        {page + 1 < pages && <Link className="inline-flex min-h-11 items-center underline" prefetch={false} href={`/admin/learners?page=${page + 1}`}>Older</Link>}
      </div>
    </AdminShell>
  );
}
