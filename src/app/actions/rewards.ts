"use server";

/**
 * Rewards for signed-in learners. The user id always comes from the verified session; Pro comes
 * from `getEntitlement`. Everything is cosmetic: nothing here touches XP or progress.
 */
import { z } from "zod";
import { requireUser } from "@/lib/auth/server";
import { getEntitlement } from "@/lib/pro/server";
import { claimSpins, getRewards, type RewardsState, setOutfit, spinReward, type SpinResult } from "@/lib/rewards/server";

export async function getRewardsAction(): Promise<RewardsState & { hasPro: boolean }> {
  const user = await requireUser();
  // Record anything just earned first, so the page always shows every waiting spin.
  await claimSpins(user.id);
  const [state, entitlement] = await Promise.all([getRewards(user.id), getEntitlement(user)]);
  return { ...state, hasPro: entitlement.hasPro };
}

/** Records spins earned so far (finished modules and courses, streak milestones); returns how many wait. */
export async function claimSpinsAction(): Promise<number> {
  const user = await requireUser();
  return claimSpins(user.id);
}

export async function spinRewardAction(): Promise<SpinResult> {
  const user = await requireUser();
  return spinReward(user.id, (await getEntitlement(user)).hasPro);
}

const Outfit = z.array(z.string().regex(/^[a-z0-9-]{1,40}$/)).max(5);

export async function setOutfitAction(outfit: string[]): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const parsed = Outfit.safeParse(outfit);
  if (!parsed.success) return { ok: false };
  return setOutfit(user.id, parsed.data, (await getEntitlement(user)).hasPro);
}
