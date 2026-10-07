// Answering cards in e2e scripts, from the content JSON: multiple choice, true or false, fill the gap
// and sort (tap an item, then its bin). `wrong: true` picks a wrong answer instead.
import fs from "node:fs";
import path from "node:path";

export const ANSWERABLE = new Set(["multiple_choice", "true_false", "fill_gap", "sort_bins"]);

/** Every lesson in the content, with its cards. */
export function allLessons(app) {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  return walk(path.join(app, "content/courses"))
    .filter((f) => f.includes(`${path.sep}lessons${path.sep}`) && f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(f, "utf8")));
}

export async function answerCard(page, card, { wrong = false } = {}) {
  if (card.type === "multiple_choice" || card.type === "fill_gap") {
    const option = card.options.find((o) => (wrong ? o.id !== card.correctOptionId : o.id === card.correctOptionId));
    await page.getByRole("radio", { name: option.text, exact: true }).click({ timeout: 30000 });
  } else if (card.type === "true_false") {
    const value = wrong ? !card.answer : card.answer;
    await page.getByRole("radio", { name: value ? "True" : "False", exact: true }).click({ timeout: 30000 });
  } else if (card.type === "sort_bins") {
    card.items.forEach((item, i) => (item._bin = wrong && i === 0 ? card.bins.find((b) => b.id !== item.bin).id : item.bin));
    for (const item of card.items) {
      const bin = card.bins.find((b) => b.id === item._bin);
      await page.getByRole("button", { name: item.label, exact: true }).click({ timeout: 30000 });
      await page.getByRole("button", { name: `Put ${item.label} in ${bin.label}` }).click();
    }
  } else {
    throw new Error(`answerCard can't answer a ${card.type} card`);
  }
  await page.getByRole("button", { name: "Check", exact: true }).click();
}
