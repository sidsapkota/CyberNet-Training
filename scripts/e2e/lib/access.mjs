// Shared by the e2e scripts: open a protected Vercel preview (E2E_SHARE_URL, from Vercel's
// "access to URL" share link, sets an access cookie), and hide the Next.js dev badge, which sits
// over the footer's Back button in development (never in production).
export async function prepare(page) {
  if (process.env.E2E_SHARE_URL) await page.goto(process.env.E2E_SHARE_URL);
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = "nextjs-portal { display: none !important; }";
      document.head.append(style);
    });
  });
}
