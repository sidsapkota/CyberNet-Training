// Hero prototypes on /dev/hero: download size of each hero's own code, time until it can be
// touched, frame rate while it animates, and tap-to-paint delay, on a mid-range phone and in the
// Instagram in-app browser (both emulated: CPU slowed, network throttled). Also checks the
// reduced-motion fallback. Run against a preview build (dev mode isn't representative):
//   E2E_BASE_URL=https://…vercel.app E2E_SHARE_URL=https://…?_vercel_share=… npm run e2e:hero-perf
import { chromium } from "playwright-core";
import { prepare } from "./lib/access.mjs";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const PROFILES = {
  "mid-range phone": { viewport: { width: 360, height: 740 }, cpu: 4, net: { latency: 70, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (3 * 1024 * 1024) / 8 } },
  "Instagram browser": {
    viewport: { width: 360, height: 560 },
    cpu: 6,
    net: { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 },
    userAgent: "Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36 Instagram 330.0.0.0 Android",
  },
};
const HEROES = {
  phone: async (page) => {
    const box = await page.locator("canvas").first().boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, { steps: 12 });
      await page.mouse.up();
    }
    await page.getByRole("button", { name: "Pull apart" }).click();
  },
  race: async (page) => page.getByRole("button", { name: "Send" }).click(),
  fruit: async (page) => page.getByRole("button", { name: /Golden apple/ }).click(),
};
const primary = { phone: "Pull apart", race: "Send", fruit: /Golden apple/ };

async function scriptBytes(page) {
  let total = 0;
  page.on("response", async (r) => {
    if (r.request().resourceType() !== "script") return;
    try {
      total += (await r.request().sizes()).responseBodySize;
    } catch {}
  });
  return () => total;
}

async function run(browser, profileName, hero, opts = {}) {
  const p = PROFILES[profileName];
  const ctx = await browser.newContext({ viewport: p.viewport, isMobile: true, hasTouch: true, ...(p.userAgent ? { userAgent: p.userAgent } : {}), ...(opts.reducedMotion ? { reducedMotion: "reduce" } : {}) });
  const page = await ctx.newPage();
  await page.route(/\/script\.js$|\/_vercel\/insights\//, (r) => r.abort());
  await prepare(page);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", { offline: false, ...p.net });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: p.cpu });
  const bytes = await scriptBytes(page);
  await page.goto(`${BASE}/dev/hero?hero=${hero}`, { waitUntil: "domcontentloaded" });
  if (hero === "none") {
    // The page without any hero: the baseline its own code is measured against.
    await page.waitForLoadState("networkidle").catch(() => {});
    const kb = Math.round(bytes() / 1024);
    await ctx.close();
    return { kb };
  }
  await page.waitForFunction(() => window.__hero?.ready, null, { timeout: 120000 });
  const ready = await page.evaluate(() => window.__hero);
  await page.waitForLoadState("networkidle").catch(() => {});
  const loaded = bytes();
  if (opts.reducedMotion) {
    await ctx.close();
    return { fallback: ready.fallback ?? "none" };
  }
  // Tap-to-paint: Event Timing for the primary action's pointer/click events.
  await page.evaluate(() => {
    window.__events = [];
    new PerformanceObserver((list) => window.__events.push(...list.getEntries().map((e) => ({ name: e.name, duration: e.duration })))).observe({ type: "event", durationThreshold: 16, buffered: false });
  });
  // Frame rate while it animates (3 s after the action).
  await page.evaluate(() => {
    window.__frames = [];
    let last = performance.now();
    const until = last + 3500;
    const tick = (now) => {
      window.__frames.push(now - last);
      last = now;
      if (now < until) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await HEROES[hero](page);
  await page.waitForTimeout(3800);
  const { frames, events } = await page.evaluate(() => ({ frames: window.__frames.slice(2), events: window.__events }));
  const sorted = [...frames].sort((a, b) => b - a);
  const avgFps = frames.length ? Math.round(1000 / (frames.reduce((s, f) => s + f, 0) / frames.length)) : 0;
  const worst5 = sorted.length ? Math.round(sorted[Math.floor(sorted.length * 0.05)]) : 0;
  const tap = events.filter((e) => /pointer|click|key/.test(e.name)).reduce((m, e) => Math.max(m, e.duration), 0);
  await ctx.close();
  return { kb: Math.round(loaded / 1024), interactiveMs: Math.round(ready.ready), avgFps, worstFrameMs: worst5, tapMs: tap ? Math.round(tap) : "<16", fallback: ready.fallback ?? "none" };
}

const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true, args: ["--enable-unsafe-swiftshader"] });
try {
  const baseline = {};
  for (const profileName of Object.keys(PROFILES)) {
    const base = await run(browser, profileName, "none").catch(() => null);
    baseline[profileName] = base?.kb ?? 0;
  }
  for (const profileName of Object.keys(PROFILES)) {
    console.log(`\n## ${profileName}`);
    console.log("hero | own code (KB, compressed) | until touchable (ms) | avg fps | worst 5% frame (ms) | tap to paint (ms) | mode");
    for (const hero of Object.keys(HEROES)) {
      const r = await run(browser, profileName, hero);
      console.log(`${hero} | ${Math.max(0, r.kb - baseline[profileName])} | ${r.interactiveMs} | ${r.avgFps} | ${r.worstFrameMs} | ${r.tapMs} | ${r.fallback === "none" ? "full" : r.fallback}`);
    }
  }
  console.log("\n## Reduced motion");
  for (const hero of Object.keys(HEROES)) console.log(hero, (await run(browser, "mid-range phone", hero, { reducedMotion: true })).fallback);
} finally {
  await browser.close();
}
