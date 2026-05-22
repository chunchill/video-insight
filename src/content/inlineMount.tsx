import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { InjectedYouTubeApp } from "./InjectedYouTubeApp";

const INLINE_ROOT_ID = "video-insight-inline-root";

let inlineRootElement: HTMLElement | undefined;
let reactRoot: Root | undefined;

export function findInlineMountParent(doc: Document): HTMLElement {
  return (
    doc.querySelector<HTMLElement>("#secondary") ??
    doc.querySelector<HTMLElement>("ytd-watch-flexy #secondary") ??
    doc.body
  );
}

export function mountInlinePanel(doc: Document, videoId: string): HTMLElement {
  const parent = findInlineMountParent(doc);
  inlineRootElement = inlineRootElement ?? doc.getElementById(INLINE_ROOT_ID) ?? doc.createElement("div");
  inlineRootElement.id = INLINE_ROOT_ID;

  if (inlineRootElement.parentElement !== parent) {
    parent.prepend(inlineRootElement);
  }

  reactRoot = reactRoot ?? createRoot(inlineRootElement);
  flushSync(() => {
    reactRoot?.render(<InjectedYouTubeApp videoId={videoId} />);
  });

  return inlineRootElement;
}

export function unmountInlinePanel(doc: Document): void {
  reactRoot?.unmount();
  reactRoot = undefined;

  const rootElement = inlineRootElement ?? doc.getElementById(INLINE_ROOT_ID);
  rootElement?.remove();
  inlineRootElement = undefined;
}
