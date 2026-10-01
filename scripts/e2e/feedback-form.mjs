// The feedback form posts to /api/feedback with the page the visitor came from, and shows thanks.
// The request is intercepted (nothing is stored or emailed), so it's safe on any deployment.
// Usage: E2E_BASE_URL=… [E2E_SHARE_URL=…] node scripts/e2e/feedback-form.mjs
import { chromium } from "playwright-core";
import { prepare } from "./lib/access.mjs";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) failures++;
};
try {
  await prepare(page);
  let body = null;
  await page.route("**/api/feedback", async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
  });
  await page.goto(`${BASE}/courses`);
  await page.goto(`${BASE}/feedback?lesson=meet-the-os`, { referer: `${BASE}/courses` });
  await page.getByLabel("Your message").fill("[test] e2e feedback form check");
  await page.getByRole("button", { name: /send/i }).click();
  await page.getByText("Thanks! We read every message.").waitFor({ timeout: 10000 });
  check(true, "thanks shown after sending");
  check(body?.message === "[test] e2e feedback form check", "message sent to /api/feedback");
  check(body?.lessonId === "meet-the-os", "lesson from the URL sent");
  check(/^[0-9a-f-]{36}$/.test(body?.sessionId ?? ""), "session id is a UUID");
  check(typeof body?.page === "string" && body.page.includes("/courses"), `page it came from sent (${body?.page})`);
  check(!("email" in (body ?? {})) && !("userId" in (body ?? {})), "no email or user id sent");
} catch (error) {
  console.error(error);
  failures++;
} finally {
  await browser.close();
}
console.log(failures ? `${failures} failed` : "All feedback form checks passed");
process.exit(failures ? 1 : 0);
