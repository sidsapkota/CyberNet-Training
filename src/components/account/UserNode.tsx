import { Avatar } from "@/components/rewards/Avatar";

/**
 * The learner as a node: their avatar (the mascot in their outfit; never a photo). Pro members'
 * node wears the Pro frame (an outer ring and a soft glow: the Pro identity exception).
 */
export function UserNode({ outfit, pro = false, size, className = "" }: { outfit: readonly string[] | null | undefined; pro?: boolean; size: number; className?: string }) {
  return <Avatar outfit={outfit} pro={pro} size={size} className={className} />;
}
