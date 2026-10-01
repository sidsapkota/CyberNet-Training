import { initialOf } from "@/lib/auth/profile";

/**
 * The learner as a node: their initial, in the network style. Pro members' node wears the Pro frame
 * (an outer ring and a soft glow: the Pro identity exception), so they can see they have Pro.
 */
export function UserNode({ name, pro = false, className = "" }: { name: string | null; pro?: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-pro={pro || undefined}
      className={`grid shrink-0 place-items-center rounded-node border-2 border-accent-ink bg-accent-soft font-mono font-semibold text-accent-ink ${
        pro ? "ring-2 ring-accent ring-offset-2 ring-offset-canvas drop-shadow-pro" : ""
      } ${className}`}
    >
      {initialOf(name)}
    </span>
  );
}
