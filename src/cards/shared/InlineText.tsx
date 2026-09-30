import { Fragment } from "react";

/**
 * Renders short card labels. Text wrapped in `backticks` is shown in Plex Mono, for technical
 * values like `192.168.1.1` or `443`. Lighter than full markdown for small labels.
 */
export function InlineText({ children }: { children: string }) {
  const parts = children.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("`") && part.endsWith("`") && part.length > 2 ? (
          <code key={i} className="font-mono text-[0.95em] tracking-tight">
            {part.slice(1, -1)}
          </code>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
