import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { photo } from "@/test/fixtures";
import { PhotoCardView } from "./PhotoCardView";

describe("PhotoCardView", () => {
  it("credits the author and links to the licence and the source page, as CC BY and CC BY-SA require", () => {
    const card = photo();
    const html = renderToStaticMarkup(createElement(PhotoCardView, { card }));
    expect(html).toContain(card.credit.author);
    expect(html).toContain(`href="${card.credit.licenceUrl}"`);
    expect(html).toContain(`>${card.credit.licence}</a>`);
    expect(html).toContain(`href="${card.credit.sourceUrl}"`);
    expect(html).toContain("Unmodified");
  });
});
