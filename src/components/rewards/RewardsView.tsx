"use client";

import { useEffect, useRef, useState } from "react";
import { getRewardsAction, setOutfitAction } from "@/app/actions/rewards";
import { NetworkMark } from "@/components/network/NetworkMark";
import { ButtonLink } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { effectiveOutfit, ownedItems, spinCounts, wearItem } from "@/lib/rewards/rules";
import { Avatar } from "./Avatar";
import { AvatarStudio } from "./AvatarStudio";
import { RewardSpin } from "./RewardSpin";

type State = Awaited<ReturnType<typeof getRewardsAction>>;

function useRewards() {
  const [state, setState] = useState<State | null>(null);
  const reload = () => void getRewardsAction().then(setState).catch(() => {});
  useEffect(reload, []);
  return { state, setState, reload };
}

/** /account/rewards, the avatar page: dress the mascot, see every item and how it's earned, spin. */
export function RewardsView() {
  const { state, setState, reload } = useRewards();
  const { refreshProfile } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pop, setPop] = useState<string | null>(null);
  const [wave, setWave] = useState(0);
  const saving = useRef(0);

  if (!state) {
    return (
      <div className="grid min-h-[50dvh] place-items-center">
        <NetworkMark mode="loading" className="size-16" />
      </div>
    );
  }
  const owned = ownedItems(state.won, state.hasPro, state.milestones);
  if (spinning) {
    return (
      <RewardSpin
        owned={owned}
        outfit={effectiveOutfit(state.outfit, state.hasPro)}
        onDone={() => {
          setSpinning(false);
          reload();
        }}
      />
    );
  }

  function wear(itemId: string) {
    if (!state) return;
    const before = state.outfit;
    const next = wearItem(effectiveOutfit(before, state.hasPro), itemId);
    const putOn = next.includes(itemId);
    setError(null);
    setPop(putOn ? itemId : null);
    if (putOn) setWave((w) => w + 1);
    setState({ ...state, outfit: next });
    const ticket = ++saving.current;
    void setOutfitAction(next)
      .then(async (result) => {
        if (!result.ok) throw new Error("refused");
        if (ticket === saving.current) await refreshProfile();
      })
      .catch(() => {
        if (ticket !== saving.current) return;
        setState((s) => (s ? { ...s, outfit: before } : s));
        setError("Couldn't save that. Please try again.");
      });
  }

  return (
    <AvatarStudio
      data={{ outfit: state.outfit, owned, waiting: state.waiting, hasPro: state.hasPro }}
      onWear={wear}
      onSpin={() => setSpinning(true)}
      error={error}
      pop={pop}
      wave={wave}
    />
  );
}

/** On /account: your avatar, and the way to the avatar page (with spins ready or saved). */
export function AvatarPanel({ className }: { className: string }) {
  const { state } = useRewards();
  if (!state) return null;
  const { ready, saved } = spinCounts(state.waiting, ownedItems(state.won, state.hasPro, state.milestones));
  return (
    <section className={`${className} flex items-center gap-4`} aria-labelledby="avatar-title">
      <Avatar outfit={state.outfit} pro={state.hasPro} frame={false} size={64} />
      <div className="min-w-0 flex-1">
        <h2 id="avatar-title" className="font-semibold">
          Your avatar
        </h2>
        <p className="text-small text-ink-muted">
          {ready > 0 ? `${ready} ${ready === 1 ? "spin" : "spins"} to use` : saved > 0 ? `${saved} ${saved === 1 ? "spin" : "spins"} saved for new items` : "Dress up your mascot"}
        </p>
      </div>
      <ButtonLink href="/account/rewards" variant="secondary">
        Change
      </ButtonLink>
    </section>
  );
}
