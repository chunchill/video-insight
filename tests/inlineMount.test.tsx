import { beforeEach, describe, expect, it } from "vitest";
import { mountInlinePanel, findInlineMountParent } from "../src/content/inlineMount";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("inlineMount", () => {
  it("creates one extension root near secondary column", () => {
    document.body.innerHTML = `<div id="secondary"></div>`;

    const root = mountInlinePanel(document, "abc123");
    const secondRoot = mountInlinePanel(document, "abc123");

    expect(root).toBe(secondRoot);
    expect(document.querySelectorAll("#video-insight-inline-root")).toHaveLength(1);
    expect(document.querySelector("#secondary #video-insight-inline-root")).toBeTruthy();
  });

  it("falls back to document body when secondary column is missing", () => {
    const parent = findInlineMountParent(document);
    expect(parent).toBe(document.body);
  });
});
