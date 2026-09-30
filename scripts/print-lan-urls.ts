/**
 * Runs before `npm run dev` (predev). Prints the URLs other devices on the local network can use.
 * Next.js prints a single "Network" address, which may belong to a virtual adapter (VirtualBox,
 * Hyper-V, WSL) rather than your Wi-Fi or Ethernet, so this lists every private IPv4 address.
 */
import os from "node:os";

const port = process.env.PORT ?? "3000";
const isPrivate = (ip: string) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);

const urls = Object.entries(os.networkInterfaces()).flatMap(([name, addresses]) =>
  (addresses ?? [])
    .filter((a) => a.family === "IPv4" && !a.internal && isPrivate(a.address))
    .map((a) => ({ name, url: `http://${a.address}:${port}` })),
);

if (urls.length === 0) {
  console.log("No local network address found. Other devices can't reach the dev server.");
} else {
  console.log("Open on other devices on the same network (use your Wi-Fi or Ethernet one):");
  for (const { name, url } of urls) console.log(`  ${url.padEnd(28)} ${name}`);
}
console.log("");
