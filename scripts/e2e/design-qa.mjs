// Design and interaction QA for every card type (the /dev/cards samples), through the real lesson
// player: at 360×740 and 1280×800, light and dark, reduced motion on and off. For each card it
// checks that nothing scrolls sideways, and that every control is at least 44px (inline text links
// and glossary terms are exempt), before and after Check. Screenshots of the 360px dark run go to
// .e2e-shots/qa/. It also drags on a touchscreen (drag to order, sort into bins) and checks the
// item moves.
// Run with the dev server up (`npm run dev`), then `npm run e2e:design-qa`. No accounts are used.
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";
import { prepare } from "./lib/access.mjs";
import { readEnvEntries } from "./lib/env.mjs";

const APP = path.resolve(import.meta.dirname, "../..");
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const SHOTS = path.join(APP, ".e2e-shots", "qa");
fs.mkdirSync(SHOTS, { recursive: true });
const ONLY = process.env.QA_ONLY ? new Set(process.env.QA_ONLY.split(",")) : null;

// Signed-in leagues QA is optional: it runs only against a STAGING project with a secret key in
// .env.local (never production). Without those, the guest page checks below still cover everything.
const PROD_REF = "qyjmowpkdcunkfitbwca";
function stagingAdmin() {
  let env = {};
  try {
    env = Object.fromEntries(
      readEnvEntries(APP),
    );
  } catch {
    return null;
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!env.SUPABASE_SECRET_KEY || !/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url) || url.includes(PROD_REF)) return null;
  return { url, admin: createClient(url, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } }) };
}

const VIEWPORTS = [
  { name: "360", width: 360, height: 640, touch: true },
  { name: "desktop", width: 1280, height: 800, touch: false },
];
const THEMES = ["dark", "light"];
const MOTION = ["reduce", "no-preference"];

/** Controls smaller than 44px, sideways scrolling, and anything clipped off the right edge. */
async function measure(page) {
  return page.evaluate(() => {
    const issues = [];
    const doc = document.documentElement;
    if (doc.scrollWidth > window.innerWidth + 1) issues.push(`page scrolls sideways (${doc.scrollWidth}px wide)`);
    const controls = document.querySelectorAll("main button, main a[href], main input:not([type=hidden]), main select, main [role=radio], main [role=checkbox], main [role=button], footer button, header button, header a[href]");
    for (const el of controls) {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (r.width <= 2 || r.height <= 2 || style.visibility === "hidden" || style.display === "none") continue; // sr-only inputs
      if (style.display === "inline" || el.closest("p, li > span")) continue; // inline text links and glossary terms in sentences
      if (el.closest("[aria-hidden=true]")) continue;
      // A native radio or checkbox inside a big clickable label is fine.
      if ((el.type === "radio" || el.type === "checkbox") && el.closest("label")) {
        const lr = el.closest("label").getBoundingClientRect();
        if (lr.height >= 44) continue;
      }
      if (r.width < 44 || r.height < 44) {
        const name = (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().replace(/\s+/g, " ").slice(0, 40);
        issues.push(`small target ${Math.round(r.width)}×${Math.round(r.height)}: ${el.tagName.toLowerCase()} "${name}"`);
      }
      if (r.right > window.innerWidth + 1 && !el.closest("pre, [data-scrolls]")) issues.push(`off the right edge: "${(el.textContent || "").trim().slice(0, 30)}"`);
    }
    return [...new Set(issues)];
  });
}

/** A light-touch answer so the feedback footer shows: pick an option, then Check if allowed. */
async function tryCheck(page) {
  const radio = page.locator("main [role=radio], main input[type=radio]").first();
  if (await radio.count()) await radio.click({ force: true }).catch(() => {});
  const check = page.getByRole("button", { name: "Check", exact: true });
  if ((await check.count()) && (await check.isEnabled())) {
    await check.click();
    await page.waitForTimeout(500);
    return true;
  }
  return false;
}

const report = new Map(); // sample → Set of "combo: issue"
const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
let samples = [];
try {
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      for (const motion of MOTION) {
        const combo = `${vp.name}/${theme}/${motion === "reduce" ? "reduced" : "motion"}`;
        const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, isMobile: vp.touch, colorScheme: theme, reducedMotion: motion });
        const page = await ctx.newPage();
        await prepare(page);
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(`${BASE}/dev/cards`, { waitUntil: "networkidle" });
        if (!samples.length) samples = await page.locator("main li p.font-mono").allTextContents().then((types) => types.map((t, i) => ({ i, type: t })));
        const ids = await page.locator("main li p.text-caption").allTextContents();
        for (const { i, type } of samples) {
          const id = `${type} (${(ids[i] ?? "").replace(/challenge$/, "").trim()})`;
          if (ONLY && !ONLY.has(type)) continue;
          await page.goto(`${BASE}/dev/cards`, { waitUntil: "networkidle" });
          await page.getByRole("button", { name: "Lesson", exact: true }).nth(i).click();
          const opened = await page.locator("[data-card-stage]").first().waitFor({ timeout: 15000 }).then(() => true, () => false);
          if (!opened) {
            const set = report.get(id) ?? new Set();
            set.add(`${combo}: the card didn't open`);
            report.set(id, set);
            continue;
          }
          await page.waitForTimeout(motion === "reduce" ? 150 : 600);
          const before = await measure(page);
          const shot = vp.name === "360" && theme === "dark" && motion === "no-preference";
          if (shot) await page.screenshot({ path: path.join(SHOTS, `${String(i).padStart(2, "0")}-${type}-a.png`), fullPage: true });
          const checked = await tryCheck(page);
          const after = checked ? await measure(page) : [];
          if (shot && checked) await page.screenshot({ path: path.join(SHOTS, `${String(i).padStart(2, "0")}-${type}-b.png`), fullPage: true });
          const all = [...before.map((x) => `before: ${x}`), ...after.map((x) => `after Check: ${x}`), ...errors.splice(0).map((e) => `page error: ${e}`)];
          if (all.length) {
            const set = report.get(id) ?? new Set();
            for (const x of all) set.add(`${combo}: ${x}`);
            report.set(id, set);
          }
        }
        await ctx.close();
      }
    }
  }

  // Pages: the same checks on the main screens (as a guest), at each size and theme.
  {
    const PAGES = ["/", "/courses", "/course/stay-safe-online", "/course/inside-your-devices", "/course/how-ai-really-works", "/course/how-the-internet-works", "/pro", "/login", "/lesson/strong-passwords"];
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        const combo = `${vp.name}/${theme}`;
        const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, isMobile: vp.touch, colorScheme: theme });
        const page = await ctx.newPage();
        await prepare(page);
        for (const url of PAGES) {
          await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
          await page.waitForTimeout(800);
          const issues = await page.evaluate(() => {
            const out = [];
            if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push(`page scrolls sideways (${document.documentElement.scrollWidth}px)`);
            for (const el of document.querySelectorAll("main button, main a[href], header button, header a[href], nav a[href], main input:not([type=hidden])")) {
              const r = el.getBoundingClientRect();
              const st = getComputedStyle(el);
              if (r.width <= 2 || r.height <= 2 || st.visibility === "hidden" || st.display === "none" || st.display === "inline") continue;
              if (el.closest("p, li > span, footer")) continue;
              if ((el.type === "checkbox" || el.type === "radio") && el.closest("label") && el.closest("label").getBoundingClientRect().height >= 44) continue;
              if (r.width < 44 || r.height < 44) out.push(`small target ${Math.round(r.width)}×${Math.round(r.height)}: ${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40)}"`);
            }
            return [...new Set(out)];
          });
          if (vp.name === "360" && theme === "dark") await page.screenshot({ path: path.join(SHOTS, `page${url.replace(/\//g, "_") || "_home"}.png`), fullPage: true });
          if (issues.length) {
            const id = `page ${url}`;
            const set = report.get(id) ?? new Set();
            for (const x of issues) set.add(`${combo}: ${x}`);
            report.set(id, set);
          }
        }
        await ctx.close();
      }
    }
  }

  // Touch drag: drag to order and sort into bins, on a 360px touchscreen.
  {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true, colorScheme: "dark" });
    const page = await ctx.newPage();
    await prepare(page);
    const cdp = await ctx.newCDPSession(page);
    const touch = async (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
    const drag = async (from, to, hold = 350) => {
      await touch("touchStart", from.x, from.y);
      await page.waitForTimeout(hold);
      for (let s = 1; s <= 12; s++) await touch("touchMove", from.x + ((to.x - from.x) * s) / 12, from.y + ((to.y - from.y) * s) / 12);
      await page.waitForTimeout(100);
      await touch("touchEnd", to.x, to.y);
      await page.waitForTimeout(400);
    };
    const touchResults = [];
    for (const type of ["drag_to_order", "sort_bins"]) {
      const i = samples.find((s) => s.type === type)?.i;
      if (i === undefined) continue;
      await page.goto(`${BASE}/dev/cards`, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Lesson", exact: true }).nth(i).click();
      await page.locator("[data-card-stage]").first().waitFor();
      await page.waitForTimeout(500);
      const gotIt = page.getByRole("button", { name: "Got it" });
      if (await gotIt.count()) await gotIt.click();
      const rows = page.locator("[data-card-stage] [data-drag-item]");
      await rows.first().scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, 120));
      await page.waitForTimeout(300);
      const n = await rows.count();
      if (n < 2) {
        touchResults.push(`${type}: no [data-drag-item] elements found`);
        continue;
      }
      const textBefore = await page.locator("[data-card-stage]").innerText();
      const a = await rows.nth(0).boundingBox();
      const target =
        type === "drag_to_order"
          ? await rows.nth(n - 1).boundingBox()
          : await page.locator("[data-card-stage] [data-drop-bin]").first().boundingBox();
      if (!a || !target) {
        touchResults.push(`${type}: couldn't measure the items`);
        continue;
      }
      await drag({ x: a.x + a.width / 2, y: a.y + a.height / 2 }, { x: target.x + target.width / 2, y: target.y + target.height / 2 + 4 });
      const textAfter = await page.locator("[data-card-stage]").innerText();
      touchResults.push(`${type}: a touch drag ${textAfter !== textBefore ? "moved the item" : "DID NOT move the item"}`);
      // (Whether a quick swipe over an item scrolls the page can't be checked here: simulated
      // touches don't scroll. Drag to order uses press-and-hold on touch, so swipes stay scrolls.)
    }
    console.log("\nTouch drag:\n" + touchResults.map((r) => `  ${r}`).join("\n"));
    await ctx.close();
  }

  // Leagues (signed in): the leaderboard and settings at each size and theme. Staging only, so it
  // skips cleanly on a machine without the staging secret key. Seeds and cleans up its own league.
  if (!ONLY) {
    const staging = stagingAdmin();
    if (!staging) {
      console.log("\nLeagues QA skipped (no staging secret key in .env.local).");
    } else {
      const { admin } = staging;
      const TZ = "Australia/Sydney";
      const nowIso = new Date().toISOString();
      const today = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
      const userIds = [];
      const leagueIds = [];
      let priorOpenedAt = null;
      const found = [];
      try {
        const { data: weekRow } = await admin.rpc("league_week");
        const WEEK = typeof weekRow === "string" ? weekRow : (weekRow?.[0]?.league_week ?? weekRow);
        priorOpenedAt = (await admin.from("league_state").select("opened_at").maybeSingle()).data?.opened_at ?? null;
        await admin.from("league_state").update({ opened_at: nowIso }).eq("id", true);
        const { data: lg } = await admin.from("leagues").insert({ week: WEEK, tier: "packet", band: "regular" }).select("id").single();
        leagueIds.push(lg.id);
        const mk = async (name) => {
          const email = `qa-${name.toLowerCase()}-${Date.now()}@example.com`;
          const { data } = await admin.auth.admin.createUser({ email, email_confirm: true });
          const id = data.user.id;
          userIds.push(id);
          await admin.from("profiles").update({ username: name, age_confirmed: true, time_zone: TZ }).eq("id", id);
          await admin.from("league_players").insert({ user_id: id, tier: "packet", show_on_leaderboards: true });
          await admin.from("league_members").insert({ week: WEEK, user_id: id, league_id: lg.id });
          return { id, email };
        };
        const me = await mk("QaPilot");
        await admin.from("xp_events").insert({ user_id: me.id, at: nowIso, day: today, time_zone: TZ, kind: "card", lesson_id: "seed-lesson", xp: 25 });
        for (let i = 0; i < 4; i++) {
          const other = await mk(`QaLearner${i}`);
          await admin.from("xp_events").insert({ user_id: other.id, at: nowIso, day: today, time_zone: TZ, kind: "card", lesson_id: "seed-lesson", xp: 10 + i * 10 });
        }
        for (const vp of VIEWPORTS) {
          for (const theme of THEMES) {
            const combo = `${vp.name}/${theme}`;
            const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, isMobile: vp.touch, colorScheme: theme });
            const page = await ctx.newPage();
            await prepare(page);
            const link = await admin.auth.admin.generateLink({ type: "magiclink", email: me.email });
            await page.goto(`${BASE}/auth/callback?token_hash=${link.data.properties.hashed_token}&type=magiclink&next=/leagues`);
            await page.waitForURL((u) => u.pathname === "/leagues", { timeout: 60000 }).catch(() => {});
            await page.getByRole("button", { name: /QaPilot/ }).first().waitFor({ timeout: 30000 }).catch(() => {});
            await page.waitForTimeout(600);
            // The leagues page's own content (main): the shared header/footer chrome is QA'd elsewhere.
            const issues = await page.evaluate(() => {
              const out = [];
              if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push(`page scrolls sideways (${document.documentElement.scrollWidth}px)`);
              for (const el of document.querySelectorAll("main button, main a[href], main input:not([type=hidden]), main [role=switch], main [role=radio]")) {
                const r = el.getBoundingClientRect();
                const st = getComputedStyle(el);
                if (r.width <= 2 || r.height <= 2 || st.visibility === "hidden" || st.display === "none" || st.display === "inline") continue;
                if (el.closest("p, li > span") || el.closest("[aria-hidden=true]")) continue;
                if (r.width < 44 || r.height < 44) out.push(`small target ${Math.round(r.width)}×${Math.round(r.height)}: ${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 30)}"`);
              }
              return [...new Set(out)];
            });
            if (vp.name === "360" && theme === "dark") await page.screenshot({ path: path.join(SHOTS, "page_leagues.png"), fullPage: true });
            for (const x of issues) found.push(`${combo}: ${x}`);
            await ctx.close();
          }
        }
      } finally {
        if (leagueIds.length) await admin.from("leagues").delete().in("id", leagueIds);
        for (const id of userIds) await admin.auth.admin.deleteUser(id);
        await admin.from("league_state").update({ opened_at: priorOpenedAt }).eq("id", true);
      }
      if (found.length) {
        const set = report.get("page /leagues") ?? new Set();
        for (const x of found) set.add(x);
        report.set("page /leagues", set);
      }
      console.log(`\nLeagues QA (staging): ${found.length ? `${found.length} issue(s)` : "no layout or tap-target issues"}.`);
    }
  }
} finally {
  await browser.close();
}

console.log(`\nCards checked: ${samples.length} samples × ${VIEWPORTS.length * THEMES.length * MOTION.length} combinations`);
if (report.size === 0) console.log("No layout or tap-target issues found.");
for (const [id, issues] of report) {
  console.log(`\n${id}`);
  // Group identical issues across combinations.
  const byIssue = new Map();
  for (const line of issues) {
    const [combo, ...rest] = line.split(": ");
    const issue = rest.join(": ");
    byIssue.set(issue, [...(byIssue.get(issue) ?? []), combo]);
  }
  for (const [issue, combos] of byIssue) console.log(`  ${issue}  [${combos.join(", ")}]`);
}
