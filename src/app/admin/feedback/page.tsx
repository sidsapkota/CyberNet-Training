import type { Metadata } from "next";
import { AdminShell, Table } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/auth";
import { latestFeedback, logAdmin } from "@/lib/admin/server";

// Private: checked on the server for every request (requireAdmin, then each data call again).
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const date = (iso: string | null) => (iso ? new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "2-digit", timeZone: "Australia/Sydney" }).format(new Date(iso)) : "never");

export default async function AdminFeedback() {
  await requireAdmin();
  await logAdmin("view:feedback");
  const items = await latestFeedback();
  return (
    <AdminShell current="/admin/feedback" title="Feedback (latest 50)">
      <Table head={["When", "Lesson", "Rating", "Message"]} rows={items.map((f) => [date(f.at), f.lesson ?? "–", f.rating ?? "–", <span key="m" className="whitespace-pre-wrap [overflow-wrap:anywhere]">{f.message}</span>])} />
    </AdminShell>
  );
}
