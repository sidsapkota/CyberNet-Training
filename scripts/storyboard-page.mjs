// Builds one review page from a course's storyboards (Lesson Blueprint v1: the owner reads every
// storyboard on a phone and OKs the course before it's built).
//   node scripts/storyboard-page.mjs stay-safe-online [out.html]
// Reads docs/storyboards/<course>/ORDER.json ({ title, intro, decisions[], modules: [{ title, access,
// lessons: [id] }] }) and one <id>.md per lesson or quiz, in the template from docs/storyboards/README.md.
import fs from "node:fs";
import path from "node:path";

const course = process.argv[2];
if (!course) throw new Error("Usage: node scripts/storyboard-page.mjs <course-id> [out.html]");
const DIR = path.join("docs/storyboards", course);
const order = JSON.parse(fs.readFileSync(path.join(DIR, "ORDER.json"), "utf8"));
const out = process.argv[3] ?? path.join(DIR, "review.html");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const inline = (s) =>
  esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
    .replace(/ → /g, ' <span class="arrow">→</span> ');

/** A small Markdown renderer for the storyboard template: headings, bullet lists (with wrapped
 * continuation lines), field labels ("**Situation:**") and paragraphs. */
function render(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let list = null;
  let para = null;
  const flush = () => {
    if (list) blocks.push(`<ul>${list.map((li) => `<li>${field(li)}</li>`).join("")}</ul>`);
    if (para) blocks.push(`<p>${inline(para)}</p>`);
    list = null;
    para = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flush();
      blocks.push({ level: h[1].length, text: h[2] });
      continue;
    }
    const li = line.match(/^\s*[-*]\s+(.*)$/);
    if (li) {
      if (para) flush();
      list ??= [];
      list.push(li[1]);
      continue;
    }
    if (list && /^\s{2,}\S/.test(raw)) {
      list[list.length - 1] += ` ${line.trim()}`;
      continue;
    }
    if (list) flush();
    para = para ? `${para} ${line.trim()}` : line.trim();
  }
  flush();
  return blocks;
}

/** "**Situation:** text" → a labelled row. */
function field(text) {
  const m = text.match(/^\*\*([^*]+?):\*\*\s*(.*)$/);
  if (!m) return inline(text);
  const key = m[1].toLowerCase();
  const tone = key.startsWith("right") || key === "what happens" ? "right" : key === "reveal line" ? "hint" : key.startsWith("1st") ? "hint" : key.startsWith("2nd") ? "answer" : key === "correct" ? "correct" : "";
  return `<span class="label ${tone}">${esc(m[1])}</span><span class="value">${inline(m[2])}</span>`;
}

/** A storyboard's title (its first heading, without the id or notes) and whether it's a new lesson. */
function headingOf(id) {
  const file = path.join(DIR, `${id}.md`);
  const first = fs.existsSync(file) ? (fs.readFileSync(file, "utf8").match(/^#\s+(.*)$/m)?.[1] ?? id) : id;
  return { title: first.replace(/\s*\(`.*$/, "").replace(/\s*·.*$/, "").trim(), isNew: /\bnew\b/i.test(first) };
}

function lessonSection(id, number) {
  const file = path.join(DIR, `${id}.md`);
  if (!fs.existsSync(file)) return `<section class="lesson missing" id="${id}"><h2>${esc(id)}</h2><p>Storyboard missing.</p></section>`;
  const blocks = render(fs.readFileSync(file, "utf8"));
  let title = id;
  let html = "";
  let inCard = false;
  for (const b of blocks) {
    if (typeof b === "string") {
      html += b;
      continue;
    }
    if (b.level === 1) {
      title = headingOf(id).title;
      continue;
    }
    if (inCard) html += "</div>";
    const beat = b.text.match(/^(\d+)\s*·\s*(.*)$/);
    html += beat
      ? `<div class="card"><h3><span class="num">${beat[1]}</span><span class="beat">${inline(beat[2])}</span></h3>`
      : `<div class="card"><h3><span class="beat">${inline(b.text)}</span></h3>`;
    inCard = true;
  }
  if (inCard) html += "</div>";
  // The first list (before any card) is the lesson's summary.
  html = html.replace(/^<ul>/, '<ul class="meta">');
  return `<section class="lesson" id="${id}" aria-labelledby="${id}-title">
  <p class="eyebrow">${esc(number)} · <code>${esc(id)}</code>${headingOf(id).isNew ? ' <span class="new">New lesson</span>' : ""}</p>
  <h2 id="${id}-title">${inline(title)}</h2>
  ${html}
</section>`;
}

let nav = "";
let body = "";
order.modules.forEach((m, mi) => {
  nav += `<li><a href="#module-${mi + 1}">${mi + 1}. ${esc(m.title)}</a><span class="access ${m.access.toLowerCase()}">${esc(m.access)}</span></li>`;
  body += `<h2 class="module" id="module-${mi + 1}"><span>Module ${mi + 1}</span>${esc(m.title)}<span class="access ${m.access.toLowerCase()}">${esc(m.access)}</span></h2>`;
  body += `<ol class="toc">${m.lessons
    .map((id) => {
      const h = headingOf(id);
      return `<li><a href="#${id}">${esc(h.title)}</a>${h.isNew ? ' <span class="new">New</span>' : ""}</li>`;
    })
    .join("")}</ol>`;
  m.lessons.forEach((id, li) => {
    body += lessonSection(id, `${mi + 1}.${li + 1}`);
  });
});

const html = `<title>${esc(order.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans:wght@400;600&display=swap">
<style>
/* Layout: one reading column for a phone, CyberNet's own tokens (navy and cyan, IBM Plex). */
:root {
  --canvas: #f4f7fb; --surface: #ffffff; --raised: #e8eef6; --line: #d3ddea; --line-strong: #aebdd2;
  --ink: #0a1f3f; --muted: #3d5575; --faint: #546a8a; --accent: #006e9e; --accent-soft: #dcf3fc;
  --right: #0b7a4e; --hint: #9a5b00; --answer: #c4323a;
  --sans: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --canvas: #061630; --surface: #0b2142; --raised: #122b52; --line: #1c3a66; --line-strong: #2a4f85;
  --ink: #e6eef9; --muted: #a3b6d2; --faint: #7d93b5; --accent: #00c2ff; --accent-soft: #0a3558;
  --right: #3ddc97; --hint: #ffb547; --answer: #ff7a7a; color-scheme: dark; } }
:root[data-theme="dark"] {
  --canvas: #061630; --surface: #0b2142; --raised: #122b52; --line: #1c3a66; --line-strong: #2a4f85;
  --ink: #e6eef9; --muted: #a3b6d2; --faint: #7d93b5; --accent: #00c2ff; --accent-soft: #0a3558;
  --right: #3ddc97; --hint: #ffb547; --answer: #ff7a7a; color-scheme: dark; }
* { box-sizing: border-box; }
body { background: var(--canvas); color: var(--ink); font: 400 16px/1.55 var(--sans); margin: 0; padding-inline: 16px; padding-block: 24px 64px; }
main { max-width: 44rem; margin: 0 auto; display: grid; gap: 20px; }
h1, h2, h3 { text-wrap: balance; line-height: 1.25; margin: 0; }
h1 { font-size: 1.75rem; letter-spacing: -0.01em; }
code { font-family: var(--mono); font-size: 0.88em; background: var(--raised); border-radius: 4px; padding: 0 4px; overflow-wrap: anywhere; }
a { color: var(--accent); }
.intro { color: var(--muted); margin: 6px 0 0; }
.panel { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 16px; }
.panel h2 { font-size: 1.05rem; margin-bottom: 8px; }
.panel ul, .panel ol { margin: 0; padding-left: 20px; display: grid; gap: 6px; }
.modules { list-style: none; padding: 0 !important; }
.modules li { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
.access { font: 600 0.72rem/1 var(--mono); letter-spacing: 0.06em; text-transform: uppercase; border: 1px solid var(--line-strong); border-radius: 4px; padding: 3px 6px; color: var(--muted); white-space: nowrap; }
.access.pro { color: var(--accent); border-color: var(--accent); }
h2.module { font-size: 1.35rem; margin-top: 20px; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; }
h2.module > span:first-child { flex-basis: 100%; font: 600 0.75rem/1 var(--mono); letter-spacing: 0.1em; text-transform: uppercase; color: var(--faint); }
.toc { margin: -8px 0 0; padding-left: 20px; color: var(--muted); font-size: 0.92rem; }
.lesson { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 18px 16px; display: grid; gap: 12px; min-width: 0; }
.lesson h2 { font-size: 1.3rem; }
.eyebrow { margin: 0; font: 600 0.75rem/1 var(--mono); letter-spacing: 0.08em; color: var(--faint); text-transform: uppercase; }
.eyebrow code { text-transform: none; letter-spacing: 0; background: none; padding: 0; }
.lesson p { margin: 0; color: var(--muted); }
ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
li { min-width: 0; }
.meta { background: var(--raised); border-radius: 8px; padding: 12px; gap: 6px; font-size: 0.95rem; }
.card { border-top: 1px solid var(--line); padding-top: 12px; display: grid; gap: 8px; min-width: 0; }
.card h3 { display: flex; align-items: center; gap: 10px; font-size: 1.02rem; }
.num { display: inline-grid; place-items: center; min-width: 28px; height: 28px; border-radius: 999px; border: 2px solid var(--accent); color: var(--accent); font: 600 0.85rem/1 var(--mono); }
.beat { font-weight: 600; }
.label { display: block; font: 600 0.72rem/1.4 var(--mono); letter-spacing: 0.06em; text-transform: uppercase; color: var(--faint); }
.label.right { color: var(--right); } .label.hint { color: var(--hint); } .label.answer { color: var(--answer); } .label.correct { color: var(--right); }
.value { display: block; }
.arrow { color: var(--accent); font-weight: 600; }
.missing { border-style: dashed; }
.new { font: 600 0.7rem/1 var(--mono); letter-spacing: 0.06em; text-transform: uppercase; color: var(--accent); border: 1px solid var(--accent); border-radius: 4px; padding: 2px 5px; margin-left: 4px; white-space: nowrap; }
@media (min-width: 640px) { body { font-size: 17px; } .lesson { padding: 22px; } }
</style>
<main>
  <header>
    <p class="eyebrow">Lesson Blueprint v1 · storyboards for review</p>
    <h1>${esc(order.title)}</h1>
    <p class="intro">${inline(order.intro)}</p>
  </header>
  <section class="panel" aria-labelledby="decisions"><h2 id="decisions">Decisions for you</h2><ol>${order.decisions.map((d) => `<li>${inline(d)}</li>`).join("")}</ol></section>
  <nav class="panel" aria-labelledby="contents"><h2 id="contents">Modules</h2><ul class="modules">${nav}</ul></nav>
  ${body}
</main>
`;
fs.writeFileSync(out, html);
console.log(`Wrote ${out}`);
