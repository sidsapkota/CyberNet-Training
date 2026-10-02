import { Avatar } from "@/components/rewards/Avatar";

/**
 * The learner as a node: their avatar (an item from the fixed list; never a photo). Pro members'
 * node wears the Pro frame (an outer ring and a soft glow: the Pro identity exception).
 */
export function UserNode({ avatar, pro = false, className = "" }: { avatar: string | null | undefined; pro?: boolean; className?: string }) {
  return <Avatar avatar={avatar} pro={pro} className={className} />;
}
