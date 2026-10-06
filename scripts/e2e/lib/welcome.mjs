// The one-time "Leagues are open!" welcome greets a learner on their first dashboard visit (per
// device) while leagues are open. Tests close it the way a learner would ("Not now"), so it never
// covers what they're checking. Does nothing when it doesn't appear (leagues closed, or seen).
export async function closeLeaguesWelcome(page, timeout = 6000) {
  const notNow = page.locator("dialog[aria-labelledby=leagues-opening-title]").getByRole("button", { name: "Not now" });
  if (await notNow.waitFor({ state: "visible", timeout }).then(() => true, () => false)) {
    await notNow.click();
    await notNow.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  }
}
