"use client";

import { useEffect, useState, useTransition } from "react";
import { getRewardsAction, setAvatarAction } from "@/app/actions/rewards";
import { NetworkMark } from "@/components/network/NetworkMark";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CheckIcon, ProIcon } from "@/components/ui/icons";
import { useAuth } from "@/lib/auth/AuthProvider";
import { REWARD_ITEMS } from "@/lib/rewards/items";
import { effectiveAvatar, ownedItems } from "@/lib/rewards/rules";
import { Avatar } from "./Avatar";
import { RewardSpin } from "./RewardSpin";

type State = Awaited<ReturnType<typeof getRewardsAction>>;
const HOW = { starter: "Starter", spin: "From a spin", pro: "With Pro" } as const;

function useRewards() {
  const [state, setState] = useState<State | null>(null);
  const reload = () => void getRewardsAction().then(setState).catch(() => {});
  useEffect(reload, []);
  return { state, reload };
}

/** /account/rewards: every item (so it's never a mystery box), what you own, how each is earned. */
export function RewardsView() {
  const { state, reload } = useRewards();
  const { refreshProfile } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [pending, startTransition] = useTransition();
  if (!state) {
    return (
      <div className="grid min-h-[50dvh] place-items-center">
        <NetworkMark mode="loading" className="size-16" />
      </div>
    );
  }
  const owned = ownedItems(state.won, state.hasPro);
  const wearing = effectiveAvatar(state.avatar, state.hasPro);
  if (spinning) {
    return (
      <RewardSpin
        owned={owned}
        onDone={() => {
          setSpinning(false);
          reload();
        }}
      />
    );
  }
  return (
    <div>
      <h1 className="text-headline font-semibold">Rewards</h1>
      <p className="text-ink-muted">Earn spins by learning. Every item is listed here.</p>
      {state.waiting > 0 && (
        <Button className="mt-4 w-full" onClick={() => setSpinning(true)}>
          {state.waiting === 1 ? "1 spin waiting" : `${state.waiting} spins waiting`}
        </Button>
      )}
      <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {REWARD_ITEMS.map((item) => {
          const has = owned.has(item.id);
          const on = wearing === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                disabled={!has || pending}
                aria-pressed={on}
                aria-label={`${item.name}: ${has ? (on ? "wearing" : "tap to wear") : HOW[item.source].toLowerCase()}`}
                onClick={() =>
                  startTransition(async () => {
                    await setAvatarAction(item.id);
                    await refreshProfile();
                    reload();
                  })
                }
                className={`relative flex min-h-11 w-full flex-col items-center gap-1 rounded-card border-2 p-2 text-center ${on ? "border-accent-ink" : "border-line"} bg-surface ${has ? "" : "opacity-45"}`}
              >
                {item.source === "pro" && <ProIcon className="absolute top-1.5 left-1.5 size-4 text-accent-ink" />}
                {has && (
                  <span className="absolute top-1.5 right-1.5 grid size-4 place-items-center rounded-node bg-success text-on-success">
                    <CheckIcon className="size-3" strokeWidth={3} />
                  </span>
                )}
                <Avatar avatar={item.id} pro frame={false} className="size-11" />
                <span className="text-caption leading-tight text-ink">{item.name}</span>
                <span className="text-caption text-ink-faint">{HOW[item.source]}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-small text-ink-muted">Spins: finishing a module, finishing a course, and 7, 30 and 100-day streaks. Never bought.</p>
    </div>
  );
}

/** The avatar picker on /account: what you can wear now, and a way to the full list. */
export function AvatarPanel({ className }: { className: string }) {
  const { state, reload } = useRewards();
  const { refreshProfile } = useAuth();
  const [pending, startTransition] = useTransition();
  if (!state) return null;
  const owned = ownedItems(state.won, state.hasPro);
  const wearing = effectiveAvatar(state.avatar, state.hasPro);
  return (
    <section className={className} aria-labelledby="avatar-title">
      <h2 id="avatar-title" className="font-semibold">
        Your avatar
      </h2>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {REWARD_ITEMS.filter((i) => owned.has(i.id)).map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={wearing === item.id}
            aria-label={`Wear ${item.name}`}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await setAvatarAction(item.id);
                await refreshProfile();
                reload();
              })
            }
            className={`grid min-h-11 place-items-center rounded-control border-2 p-1 ${wearing === item.id ? "border-accent-ink" : "border-transparent"}`}
          >
            <Avatar avatar={item.id} pro frame={false} className="size-10" />
          </button>
        ))}
      </div>
      <ButtonLink href="/account/rewards" variant="ghost" className="mt-2 w-full">
        {state.waiting > 0 ? `See all rewards · ${state.waiting} spin${state.waiting === 1 ? "" : "s"} waiting` : "See all rewards"}
      </ButtonLink>
    </section>
  );
}
