import type { Metadata } from "next";
import { AdminShell, Stat } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/auth";
import { featureStats, logAdmin } from "@/lib/admin/server";

// Private: checked on the server for every request (requireAdmin, then each data call again).
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminFeatures() {
  await requireAdmin();
  await logAdmin("view:features");
  const features = await featureStats();
  return (
    <AdminShell current="/admin/features" title="Features">
      <div className="space-y-6">
        {features.map((f) => (
          <section key={f.feature}>
            <h2 className="text-lead font-semibold">{f.feature}</h2>
            {f.live ? (
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                {f.numbers.map((n) => (
                  <Stat key={n.label} label={n.label} value={n.value} />
                ))}
              </div>
            ) : (
              <p className="mt-2 text-small text-ink-muted">Not live yet.</p>
            )}
          </section>
        ))}
      </div>
    </AdminShell>
  );
}
