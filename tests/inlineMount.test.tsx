import { beforeEach, describe, expect, it } from "vitest";
import {
  findInlineMountParent,
  isInlinePanelMounted,
  mountInlinePanel,
  unmountInlinePanel
} from "../src/content/inlineMount";

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

  it("updates the rendered video id when remounting the same root", () => {
    const root = mountInlinePanel(document, "abc123");
    const appHost = root.querySelector<HTMLElement>("[data-video-insight-inline-app]");

    expect(appHost?.dataset.videoInsightVideoId).toBe("abc123");

    const sameRoot = mountInlinePanel(document, "def456");

    expect(sameRoot).toBe(root);
    expect(appHost?.dataset.videoInsightVideoId).toBe("def456");
  });

  it("falls back to document body when secondary column is missing", () => {
    const parent = findInlineMountParent(document);
    expect(parent).toBe(document.body);
  });

  it("injects a root-scoped stylesheet inside the extension root", () => {
    const root = mountInlinePanel(document, "abc123");
    const style = root.querySelector<HTMLStyleElement>("style[data-video-insight-inline-style]");

    expect(style).toBeTruthy();
    expect(style?.parentElement).toBe(root);
    expect(style?.textContent).toContain("#video-insight-inline-root .app-shell");
    expect(style?.textContent).not.toMatch(/(^|\s)(:root|body|\*)\s*\{/);
  });

  it("migrates from body fallback to secondary column when it appears later", () => {
    const root = mountInlinePanel(document, "abc123");
    expect(root.parentElement).toBe(document.body);

    document.body.innerHTML = `<div id="secondary"></div>`;
    const migratedRoot = mountInlinePanel(document, "abc123");

    expect(migratedRoot).toBe(root);
    expect(document.querySelector("#secondary #video-insight-inline-root")).toBe(root);
    expect(document.querySelectorAll("#video-insight-inline-root")).toHaveLength(1);
  });

  it("reports whether the inline panel root is still mounted", () => {
    expect(isInlinePanelMounted(document)).toBe(false);

    const root = mountInlinePanel(document, "abc123");
    expect(isInlinePanelMounted(document)).toBe(true);

    root.remove();
    expect(isInlinePanelMounted(document)).toBe(false);
  });

  it("removes the root on unmount and can mount a working root again", () => {
    const root = mountInlinePanel(document, "abc123");
    unmountInlinePanel(document);

    expect(document.getElementById("video-insight-inline-root")).toBeNull();

    const nextRoot = mountInlinePanel(document, "def456");

    expect(nextRoot).not.toBe(root);
    expect(nextRoot.querySelector("[data-video-insight-inline-app] .app-shell")).toBeTruthy();
    expect(nextRoot.querySelector("style[data-video-insight-inline-style]")).toBeTruthy();
  });
});
