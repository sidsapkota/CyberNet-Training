import Link from "next/link";
import type { ReactNode } from "react";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/funnel", label: "Funnel" },
  { href: "/admin/learners", label: "Learners" },
  { href: "/admin/lessons", label: "Lessons" },
  { href: "/admin/leagues", label: "Leagues" },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/features", label: "Features" },
] as const;

/** The admin pages' frame: a plain heading and the tabs. Read-only: nothing here changes data. */
export function AdminShell({ current, title, children }: { current: (typeof TABS)[number]["href"]; title: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-line bg-canvas">
        <div className="mx-auto max-w-wide px-gutter pt-4">
          <p className="font-mono text-caption font-semibold tracking-widest text-ink-faint uppercase">Admin · read only</p>
          <nav aria-label="Admin" className="mt-2 flex flex-wrap gap-1">
            {TABS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                prefetch={false}
                aria-current={t.href === current ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-t-control px-3 text-small font-semibold ${t.href === current ? "border-b-2 border-accent text-ink" : "text-ink-muted hover:text-ink"}`}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-wide px-gutter py-6">
        <h1 className="text-title font-semibold">{title}</h1>
        <div className="mt-5">{children}</div>
      </main>
    </div>
  );
}

export function Stat({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <p className="text-small text-ink-muted">{label}</p>
      <p className="mt-1 font-mono text-headline font-semibold tabular-nums">{value}</p>
      {note && <p className="mt-1 text-caption text-ink-faint">{note}</p>}
    </div>
  );
}

export function Table({ head, rows, empty = "Nothing yet." }: { head: string[]; rows: ReactNode[][]; empty?: string }) {
  if (rows.length === 0) return <p className="text-small text-ink-muted">{empty}</p>;
  return (
    <div className="overflow-x-auto rounded-card border border-line">
      <table className="w-full text-left text-small">
        <thead className="bg-surface-raised">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i} className="border-t border-line">
              {cells.map((c, j) => (
                <td key={j} className="px-3 py-2 align-top">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Sign-ups per day: one series, thin bars on a baseline, a hover title per bar, and the numbers as a table too. */
export function DayBars({ data, label }: { data: { day: string; n: number }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.n));
  return (
    <figure>
      <figcaption className="text-small font-semibold">{label}</figcaption>
      <div className="mt-3 flex h-32 items-end gap-0.5 border-b border-line" role="img" aria-label={`${label}: ${data.reduce((s, d) => s + d.n, 0)} in ${data.length} days`}>
        {data.map((d) => (
          <div key={d.day} className="group relative flex h-full flex-1 items-end" title={`${d.day}: ${d.n}`}>
            <div className="w-full rounded-t-sm bg-accent group-hover:bg-accent-strong" style={{ height: `${(d.n / max) * 100}%`, minHeight: d.n ? 2 : 0 }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-caption text-ink-faint">
        <span>{data[0]?.day}</span>
        <span>{data.at(-1)?.day}</span>
      </div>
      <details className="mt-2 text-small">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-ink-muted">Show as a table</summary>
        <Table head={["Day", "Sign-ups"]} rows={data.map((d) => [d.day, d.n])} />
      </details>
    </figure>
  );
}
