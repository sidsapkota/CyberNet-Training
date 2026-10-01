import { NetworkMark } from "@/components/network/NetworkMark";

/**
 * The shape of a page while it loads (a route's loading.tsx): its real heading, its panels as
 * outlines, and the network mark lighting up in the first one. Never grey skeleton blocks (see
 * CLAUDE.md → Brand). Shown at once on a tap, because Next prefetches it with the link. Under reduced
 * motion the network mark is still (CSS animations are neutralised in globals.css).
 */
export function PageLoading({
  name,
  heading,
  sub,
  panels = 3,
  node = false,
  width = "max-w-lesson",
}: {
  /** `data-loading` value, for tests. */
  name: string;
  heading: string;
  sub?: string;
  /** How many panel outlines follow the heading. */
  panels?: number;
  /** A node beside the heading (the account page's initial). */
  node?: boolean;
  width?: string;
}) {
  return (
    <main className="px-gutter py-8 sm:py-12" data-loading={name} aria-busy="true">
      <div className={`mx-auto space-y-5 ${width}`}>
        <div className="flex items-center gap-4">
          {node && <span aria-hidden="true" className="size-14 shrink-0 rounded-node border-2 border-line-strong" />}
          <div className="min-w-0">
            <p className="truncate text-headline font-semibold text-ink-muted">{heading}</p>
            {sub && <p className="truncate text-small text-ink-faint">{sub}</p>}
          </div>
        </div>
        {Array.from({ length: panels }, (_, i) => (
          <div key={i} className={`rounded-card border border-line ${i === 0 ? "grid h-36 place-items-center" : "h-24"}`}>
            {i === 0 && <NetworkMark mode="loading" className="size-12" label={`Loading ${heading.toLowerCase()}`} />}
          </div>
        ))}
      </div>
    </main>
  );
}
