// Full-app visual QA on STAGING (refuses production): every page, guest and signed in, at phone,
// tablet and desktop sizes, in light and dark; then every card of every lesson and quiz in light
// mode (the fit audit covers dark at seven sizes). Each view is checked for:
// - broken layout (lib/layout.mjs): controls overlapping, contents spilling out of a control,
//   text cut off, doubled controls, sideways scrolling;
// - broken images, console errors and page errors;
// - links on the pages that answer 404 (or any error);
// and contact sheets (one image per course, phone and desktop, plus the pages) are written to
// docs/plans/visual-qa/ so everything can be skimmed at a glance.
//   npm run e2e:visual-qa                 (dev server running, .env.local = staging)
//   PAGES_ONLY=1 / CARDS_ONLY=1, SIZES=360x560,1440x900, THEMES=dark, SHEETS=0 (no contact sheets),
//   COURSE=<id> (the card pass for one course)
//   npm run e2e:visual-qa:gate            (the merge gate: phone 360x560, tablet 768x1024 and desktop
//                                          1440x900, pages in both themes, every card in light; no sheets)
// Fails (exit 1) on any broken layout, broken image, error or broken link.
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";
import { prepare } from "./lib/access.mjs";
import { readEnvEntries, PRODUCTION_REF } from "./lib/env.mjs";
import { layoutProblems } from "./lib/layout.mjs";
import { closeLeaguesWelcome } from "./lib/welcome.mjs";

const APP = path.resolve(import.meta.dirname, "../..");
const env = Object.fromEntries(readEnvEntries(APP));
if (env.NEXT_PUBLIC_SUPABASE_URL.includes(PRODUCTION_REF)) throw new Error("visual-qa signs in throwaway learners and opens leagues: staging only.");
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const SHOTS = path.join(APP, ".e2e-shots", "visual-qa");
const SHEETS = path.join(APP, "docs", "plans", "visual-qa");
fs.mkdirSync(SHOTS, { recursive: true });
fs.mkdirSync(SHEETS, { recursive: true });

const ALL_SIZES = [
  { name: "360x560", width: 360, height: 560, phone: true },
  { name: "390x844", width: 390, height: 844, phone: true },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1280x800", width: 1280, height: 800 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1920x1080", width: 1920, height: 1080 },
];
const GATE = process.argv.includes("--gate");
const SIZE_NAMES = process.env.SIZES?.split(",") ?? (GATE ? ["360x560", "768x1024", "1440x900"] : null);
const SIZES = SIZE_NAMES ? ALL_SIZES.filter((s) => SIZE_NAMES.includes(s.name)) : ALL_SIZES;
const MAKE_SHEETS = !GATE && process.env.SHEETS !== "0";
const THEMES = (process.env.THEMES ?? "dark,light").split(",");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}
const courses = fs.readdirSync(path.join(APP, "content/courses")).map((dir) => {
  const course = JSON.parse(fs.readFileSync(path.join(APP, "content/courses", dir, "course.json"), "utf8"));
  const lessons = walk(path.join(APP, "content/courses", dir))
    .filter((f) => f.includes(`${path.sep}lessons${path.sep}`) && f.endsWith(".json"))
    .map((f) => ({ module: JSON.parse(fs.readFileSync(path.join(path.dirname(path.dirname(f)), "module.json"), "utf8")), lesson: JSON.parse(fs.readFileSync(f, "utf8")) }))
    .sort((a, b) => a.module.order - b.module.order || a.lesson.order - b.lesson.order)
    .map((x) => x.lesson);
  return { ...course, lessons };
}).sort((a, b) => a.order - b.order);

const GUEST_PAGES = [
  "/", "/courses", ...courses.map((c) => `/course/${c.id}`), ...courses.map((c) => `/lesson/${c.lessons[0].id}`),
  "/pro", "/login", "/privacy", "/terms", "/feedback", "/this-page-does-not-exist",
];
const LEARNER_PAGES = ["/", "/courses", `/course/${courses[0].id}`, `/lesson/${courses[0].lessons[1]?.id ?? courses[0].lessons[0].id}`, "/leagues", "/account", "/account/rewards", "/account/plan", "/pro", "/review", "/feedback"];

const problems = [];
const add = (where, kind, what) => problems.push({ where, kind, what });
const linkSet = new Map(); // href → where it was seen
const sheet = { pages: [], cards: {} }; // screenshots for the contact sheets
const IGNORED_CONSOLE = [/Download the React DevTools/, /\[Fast Refresh\]/, /\[HMR\]/];

async function settle(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.locator("main, [data-card-stage]").first().waitFor({ timeout: 60000 }).catch(() => {});
  // Progress-dependent pages show the loading network mark first; give them a moment.
  await page.waitForTimeout(1500);
  await closeLeaguesWelcome(page, 1500);
}

async function checkView(page, label, errors) {
  const layout = await page.evaluate(layoutProblems, null);
  for (const p of layout) add(label, p.kind, p.what);
  const broken = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.src).map((i) => i.src.slice(0, 120)));
  for (const src of broken) add(label, "broken-image", src);
  for (const e of errors.splice(0)) add(label, "console", e);
  const hrefs = await page.evaluate(() => [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")).filter((h) => h && h.startsWith("/") && !h.startsWith("//")));
  for (const h of hrefs) if (!/^\/(auth|api)\//.test(h) && !linkSet.has(h.split("#")[0])) linkSet.set(h.split("#")[0], label);
  return layout.length > 0 || broken.length > 0;
}

async function newContext(browser, size, theme) {
  const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, colorScheme: theme, reducedMotion: "reduce", isMobile: Boolean(size.phone), hasTouch: Boolean(size.phone) });
  // The site's own theme switch follows the browser unless set; set it too, so both match.
  await ctx.addInitScript((t) => {
    try {
      localStorage.setItem("cybernet.theme", t);
    } catch {}
  }, theme);
  return ctx;
}

function watch(page) {
  const errors = [];
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const text = m.text();
    if (IGNORED_CONSOLE.some((r) => r.test(text))) return;
    errors.push(text.slice(0, 160));
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message.slice(0, 160)}`));
  return errors;
}

// A throwaway learner with a little progress (staging), and leagues open for the sweep.
const email = `visual-qa-${Date.now()}@example.com`;
const { data: created, error: createError } = await admin.auth.admin.createUser({ email, email_confirm: true });
if (createError) throw createError;
const userId = created.user.id;
await admin.from("profiles").update({ username: `Qa_${Array.from({ length: 17 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("")}` /* the longest a username can be (20) */, age_confirmed: true }).eq("id", userId);
await admin.from("card_completions").insert({ user_id: userId, lesson_id: courses[0].lessons[0].id, card_id: courses[0].lessons[0].cards[0].id, xp: 10, completed_at: new Date().toISOString() });
const { data: stateBefore } = await admin.from("league_state").select("opened_at").eq("id", true).maybeSingle();

const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
try {
  if (!process.env.CARDS_ONLY) {
    if (!stateBefore?.opened_at) await admin.from("league_state").update({ opened_at: new Date().toISOString() }).eq("id", true);
    for (const theme of THEMES) {
      for (const size of SIZES) {
        for (const who of ["guest", "learner"]) {
          const ctx = await newContext(browser, size, theme);
          const page = await ctx.newPage();
          await prepare(page);
          await page.route(/\/script\.js$|\/_vercel\/insights\//, (r) => r.abort());
          const errors = watch(page);
          if (who === "learner") {
            const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
            await page.goto(`${BASE}/auth/callback?token_hash=${link.data.properties.hashed_token}&type=magiclink&next=/`);
            await page.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 60000 });
          }
          for (const route of who === "guest" ? GUEST_PAGES : LEARNER_PAGES) {
            await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
            await settle(page);
            const label = `${who} ${route} ${size.name} ${theme}`;
            if (route === "/this-page-does-not-exist") errors.splice(0, errors.length, ...errors.filter((e) => !/status of 404/.test(e)));
            const bad = await checkView(page, label, errors);
            const keep = MAKE_SHEETS && (size.name === "360x560" || size.name === "1440x900") && theme === "dark";
            if (bad || keep) {
              const file = path.join(SHOTS, `${who}${route.replace(/[^a-z0-9]+/gi, "_")}-${size.name}-${theme}.jpg`);
              await page.screenshot({ path: file, type: "jpeg", quality: 70 });
              if (keep) sheet.pages.push({ file, label: `${who} ${route}`, size: size.name });
            }
          }
          await ctx.close();
        }
      }
    }
    // Links seen on any page that don't answer (checked once each, as the learner).
    const ctx = await browser.newContext();
    for (const [href, where] of linkSet) {
      const r = await ctx.request.get(`${BASE}${href}`, { maxRedirects: 5 }).catch(() => null);
      if (!r || r.status() >= 400) add(where, "broken-link", `${href} → ${r?.status() ?? "no answer"}`);
    }
    await ctx.close();
  }

  if (!process.env.PAGES_ONLY) {
    // Every card: light mode at phone and desktop (the gate adds tablet; the fit audit checks dark at
    // seven sizes), and contact-sheet screenshots (dark) at phone and desktop.
    const cardSizes = GATE ? SIZES : ALL_SIZES.filter((s) => s.name === "360x560" || s.name === "1440x900");
    // Each size and theme runs in its own browser context, all at once (about 3x faster).
    const combos = (MAKE_SHEETS ? ["light", "dark"] : ["light"]).flatMap((theme) => cardSizes.map((size) => ({ theme, size })));
    await Promise.all(
      combos.map(async ({ theme, size }) => {
        const ctx = await newContext(browser, size, theme);
        const page = await ctx.newPage();
        await prepare(page);
        await page.route(/\/script\.js$|\/_vercel\/insights\//, (r) => r.abort());
        const errors = watch(page);
        for (const course of courses.filter((c) => !process.env.COURSE || c.id === process.env.COURSE)) {
          for (const lesson of course.lessons) {
            for (let i = 0; i < lesson.cards.length; i++) {
              await page.goto(`${BASE}/dev/fit?lesson=${lesson.id}&card=${i}`, { waitUntil: "domcontentloaded" });
              await page.locator("[data-card-stage]").first().waitFor({ timeout: 60000 });
              await page.getByText("How to play", { exact: true }).waitFor({ state: "hidden", timeout: 3000 }).catch(() => {});
              await page.waitForTimeout(200);
              const label = `card ${lesson.id} #${i + 1} ${size.name} ${theme}`;
              if (theme === "light") {
                const layout = await page.evaluate(layoutProblems, "[data-card-stage]");
                for (const p of layout) add(label, p.kind, p.what);
                for (const e of errors.splice(0)) add(label, "console", e);
                if (layout.length) await page.screenshot({ path: path.join(SHOTS, `card-${lesson.id}-${i + 1}-${size.name}-light.jpg`), type: "jpeg", quality: 70 });
              } else {
                errors.splice(0);
                const file = path.join(SHOTS, "cards", course.id, `${size.phone ? "phone" : "desktop"}-${String(sheet.cards[course.id]?.[size.phone ? "phone" : "desktop"]?.length ?? 0).padStart(3, "0")}.jpg`);
                fs.mkdirSync(path.dirname(file), { recursive: true });
                await page.screenshot({ path: file, type: "jpeg", quality: 60 });
                const slot = (sheet.cards[course.id] ??= { phone: [], desktop: [] });
                slot[size.phone ? "phone" : "desktop"].push({ file, label: `${lesson.id} #${i + 1}` });
              }
            }
          }
        }
        await ctx.close();
      }),
    );
  }

  // Contact sheets: a grid of small screenshots per course (phone, desktop) and for the pages.
  if (MAKE_SHEETS) {
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
    const page = await ctx.newPage();
    const compose = async (title, items, thumbWidth, out) => {
      if (items.length === 0) return;
      const cells = items
        .map((it) => `<figure><img src="data:image/jpeg;base64,${fs.readFileSync(it.file).toString("base64")}"><figcaption>${it.label.replace(/[<&]/g, "")}</figcaption></figure>`)
        .join("");
      await page.setContent(`<!doctype html><html><head><style>
        body{margin:0;padding:24px;background:#0b1730;color:#e6eefc;font:14px system-ui,sans-serif}
        h1{font-size:22px;margin:0 0 16px}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,${thumbWidth}px);gap:14px}
        figure{margin:0}img{width:${thumbWidth}px;display:block;border:1px solid #2a3c63;border-radius:6px}
        figcaption{font-size:11px;color:#9fb0cf;margin-top:4px;word-break:break-all}
      </style></head><body><h1>${title}</h1><div class="grid">${cells}</div></body></html>`);
      await page.waitForTimeout(300);
      await page.screenshot({ path: out, fullPage: true, type: "jpeg", quality: 72 });
    };
    for (const course of courses) {
      const slot = sheet.cards[course.id];
      if (!slot) continue;
      await compose(`${course.title}: every card at 360×560 (dark)`, slot.phone, 150, path.join(SHEETS, `${course.id}-phone.jpg`));
      await compose(`${course.title}: every card at 1440×900 (dark)`, slot.desktop, 300, path.join(SHEETS, `${course.id}-desktop.jpg`));
    }
    await compose("Pages at 360×560 (dark): guest and signed in", sheet.pages.filter((p) => p.size === "360x560"), 150, path.join(SHEETS, "pages-phone.jpg"));
    await compose("Pages at 1440×900 (dark): guest and signed in", sheet.pages.filter((p) => p.size === "1440x900"), 300, path.join(SHEETS, "pages-desktop.jpg"));
    await ctx.close();
  }
} finally {
  await browser.close();
  await admin.from("league_state").update({ opened_at: stateBefore?.opened_at ?? null }).eq("id", true);
  await admin.auth.admin.deleteUser(userId);
  fs.writeFileSync(path.join(SHOTS, "problems.json"), JSON.stringify(problems, null, 2));
}

// Report: grouped by kind and what, with the views it happened in.
const groups = new Map();
for (const p of problems) {
  const key = `${p.kind}: ${p.what}`;
  const g = groups.get(key) ?? [];
  g.push(p.where);
  groups.set(key, g);
}
for (const [key, where] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`✗ ${key}  (${where.length}×, e.g. ${where[0]})`);
}
console.log(problems.length ? `\n✗ ${problems.length} problem(s) in ${groups.size} group(s). Details: .e2e-shots/visual-qa/problems.json` : "\n✓ No broken layouts, images, errors or links.");
process.exit(problems.length ? 1 : 0);
