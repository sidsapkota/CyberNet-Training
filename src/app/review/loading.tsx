import { NetworkMark } from "@/components/network/NetworkMark";

/** Mistake review (its own player shell, outside the main layout): the loading network mark. */
export default function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center" data-loading="review" aria-busy="true">
      <NetworkMark mode="loading" className="size-20" label="Loading your mistakes" />
    </div>
  );
}
