// Layout checks that run inside the page (page.evaluate(layoutProblems, selector)). They catch what
// broke the Power Problems simulator at desktop width (6 Oct 2026): switches squeezed into a cell
// too narrow for them, drawn on top of their labels.
//
// Returns [{ kind, what }] for the element matching `rootSelector` (the whole page if none):
// - "spill":     a control (button, switch, option, link…) whose contents are wider than it, so
//                they spill over its edge or onto the next control;
// - "overlap":   two different controls drawn on top of each other;
// - "truncated": text cut off (an ellipsis, or clipped by overflow) because its box is too narrow;
// - "duplicate": two visible controls with the same name in the same group (a doubled control);
// - "sideways":  the page scrolls sideways.
// Deliberate cases are skipped: scroll boxes (overflow auto/scroll, like the terminal), parts of a
// drawing (SVG scenes), absolutely positioned badges, things marked data-layout-ok.
export function layoutProblems(rootSelector) {
  const root = (rootSelector && document.querySelector(rootSelector)) || document.body;
  const out = [];
  const name = (el) => (el.getAttribute("aria-label") || el.textContent || el.tagName).replace(/\s+/g, " ").trim().slice(0, 40);
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    // Screen-reader-only text (a 1px clipped box) is meant to be invisible.
    return r.width > 1 && r.height > 1 && s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0.05;
  };
  const skip = (el) => el.closest("svg, [data-layout-ok], [data-glossary-term]") !== null;
  const CONTROL = "button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=switch], [role=radio], [role=checkbox], [role=option], [role=tab]";
  const controls = [...root.querySelectorAll(CONTROL)].filter((el) => visible(el) && !skip(el));

  // Spill: a control's normal content (text, a switch, an icon) reaching past its edge. Decorations
  // placed on purpose with position: absolute (a match line's dot, a node's badge) don't count.
  const placed = (el, stop) => {
    for (let n = el; n && n !== stop; n = n.parentElement) {
      const p = getComputedStyle(n).position;
      if (p === "absolute" || p === "fixed") return true;
    }
    return false;
  };
  for (const el of controls) {
    if (el.matches("input, select, textarea")) continue;
    if (/(auto|scroll)/.test(getComputedStyle(el).overflowX)) continue;
    const box = el.getBoundingClientRect();
    const spills = [...el.querySelectorAll("*")].some((child) => {
      if (!visible(child) || placed(child, el) || child.closest("svg") !== null && child.tagName.toLowerCase() !== "svg") return false;
      const r = child.getBoundingClientRect();
      return r.right > box.right + 2 || r.left < box.left - 2;
    });
    if (spills) out.push({ kind: "spill", what: name(el) });
  }

  // Overlap: two controls whose boxes intersect, neither inside the other.
  const boxes = controls
    .filter((el) => getComputedStyle(el).position !== "absolute" || el.closest("[data-card-stage]") === null)
    // Each line box (an inline link that wraps has one per line; its bounding box would span both).
    .map((el) => ({ el, rects: [...el.getClientRects()].filter((r) => r.width > 1 && r.height > 1) }));
  const hit = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2;
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      if (a.rects.some((ra) => b.rects.some((rb) => hit(ra, rb)))) out.push({ kind: "overlap", what: `${name(a.el)} / ${name(b.el)}` });
    }
  }

  // Truncated: text with an ellipsis or clipped by its box (not a scroll box).
  for (const el of root.querySelectorAll("*")) {
    if (!visible(el) || skip(el)) continue;
    const s = getComputedStyle(el);
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim() !== "");
    if (!hasText || /(auto|scroll)/.test(s.overflowX)) continue;
    const clipped = s.textOverflow === "ellipsis" || s.overflowX === "hidden" || s.overflowX === "clip";
    if (clipped && el.scrollWidth > el.clientWidth + 1) out.push({ kind: "truncated", what: name(el) });
  }

  // Duplicate: the same control name twice among the visible controls of one group.
  const groups = new Map();
  for (const el of controls) {
    const group = el.closest("[role=radiogroup], [role=group], section, form, [data-card-stage]") ?? root;
    const key = name(el);
    if (!key) continue;
    const seen = groups.get(group) ?? new Map();
    seen.set(key, (seen.get(key) ?? 0) + 1);
    groups.set(group, seen);
  }
  for (const seen of groups.values()) for (const [key, n] of seen) if (n > 1) out.push({ kind: "duplicate", what: `${key} ×${n}` });

  if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push({ kind: "sideways", what: `${document.documentElement.scrollWidth}px wide` });
  // One entry per kind and name.
  const keys = new Set();
  return out.filter((p) => !keys.has(`${p.kind}:${p.what}`) && keys.add(`${p.kind}:${p.what}`));
}
