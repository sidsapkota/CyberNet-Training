import type { Metadata } from "next";
import { AdminShell, Table } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/auth";
import Link from "next/link";
import { funnel, logAdmin } from "@/lib/admin/server";

// Private: checked on the server for every request (requireAdmin, then each data call again).
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminFunnel({ searchParams }: PageProps<"/admin/funnel">) {
  await requireAdmin();
  const days = (await searchParams).days === "30" ? 30 : 7;
  await logAdmin("view:funnel", String(days));
  const steps = await funnel(days);
  const top = steps[0]?.learners || 1;
  return (
    <AdminShell current="/admin/funnel" title={`Funnel, last ${days} days`}>
      <div className="flex gap-2">
        {[7, 30].map((d) => (
          <Link key={d} href={`/admin/funnel?days=${d}`} prefetch={false} aria-current={d === days ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-control border px-3 text-small font-semibold ${d === days ? "border-accent-ink text-ink" : "border-line text-ink-muted"}`}>
            {d} days
          </Link>
        ))}
      </div>
      <p className="mt-3 max-w-2xl text-small text-ink-muted">Learners who signed up in this window, from our own data. Visitors, lesson starts, plans viewed and founder clicks are Vercel Analytics events: see Vercel → Analytics → Events.</p>
      <div className="mt-4">
        <Table head={["Step", "Learners", "Of sign-ups"]} rows={steps.map((s) => [s.step, s.learners, `${Math.round((100 * s.learners) / top)}%`])} />
      </div>
    </AdminShell>
  );
}
