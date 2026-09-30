import { ProIcon } from "@/components/ui/icons";

/**
 * The small "Pro" label on Pro content (course path nodes, the upgrade sheet, /pro). Neutral, not
 * cyan: cyan means interactive or progress, and a badge is neither. An icon plus the word, never
 * colour alone.
 */
export function ProBadge({ className = "", size = "md" }: { className?: string; size?: "sm" | "md" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm border border-line-strong bg-surface font-mono font-semibold tracking-wide text-ink uppercase ${
        size === "sm" ? "px-1 py-0.5 text-caption leading-none" : "px-1.5 py-0.5 text-caption"
      } ${className}`}
    >
      <ProIcon className={size === "sm" ? "size-2.5" : "size-3.5"} />
      Pro
    </span>
  );
}
