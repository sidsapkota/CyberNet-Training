/**
 * Suggested usernames: two brand-themed words and a number ("PacketPilot482"), so anyone can skip
 * choosing. Two harmless words can still spell something rude across the join, so a suggestion is
 * checked like any other name and re-rolled until it passes.
 */
import { checkUsername } from "./check";

const ADJECTIVES = [
  "Swift", "Bright", "Steady", "Clever", "Calm", "Bold", "Rapid", "Lucky", "Sharp", "Quiet",
  "Brave", "Keen", "Nimble", "Cosmic", "Silent", "Electric", "Shiny", "Sunny", "Turbo", "Wired",
  "Packet", "Pixel", "Binary", "Quantum", "Solar",
] as const;
const NOUNS = [
  "Router", "Switch", "Node", "Byte", "Signal", "Circuit", "Kernel", "Cache", "Socket", "Beacon",
  "Server", "Module", "Vector", "Relay", "Proxy", "Cipher", "Photon", "Pilot", "Coder", "Rocket",
  "Falcon", "Comet", "Robot", "Ranger", "Voyager",
] as const;

/** A fresh suggestion. `random` returns [0, 1) (Math.random by default). */
export function generateUsername(random: () => number = Math.random): string {
  const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)]!;
  for (;;) {
    const name = `${pick(ADJECTIVES)}${pick(NOUNS)}${10 + Math.floor(random() * 990)}`;
    if (name.length <= 20 && checkUsername(name).ok) return name;
  }
}
