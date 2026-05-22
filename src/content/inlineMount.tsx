import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { InjectedYouTubeApp } from "./InjectedYouTubeApp";
import { INLINE_PANEL_CSS } from "./inlineStyles";

const INLINE_ROOT_ID = "video-insight-inline-root";
const INLINE_STYLE_ATTRIBUTE = "data-video-insight-inline-style";
const INLINE_APP_ATTRIBUTE = "data-video-insight-inline-app";

let inlineRootElement: HTMLElement | undefined;
let inlineAppElement: HTMLElement | undefined;
let reactRoot: Root | undefined;

export function findInlineMountParent(doc: Document): HTMLElement {
  return (
    doc.querySelector<HTMLElement>("#secondary") ??
    doc.querySelector<HTMLElement>("ytd-watch-flexy #secondary") ??
    doc.body
  );
}

function ensureInlineRoot(doc: Document): HTMLElement {
  inlineRootElement = inlineRootElement ?? doc.getElementById(INLINE_ROOT_ID) ?? doc.createElement("div");
  inlineRootElement.id = INLINE_ROOT_ID;
  return inlineRootElement;
}

function ensureInlineStyle(doc: Document, rootElement: HTMLElement): void {
  let styleElement = rootElement.querySelector<HTMLStyleElement>(`style[${INLINE_STYLE_ATTRIBUTE}]`);
  if (!styleElement) {
    styleElement = doc.createElement("style");
    styleElement.setAttribute(INLINE_STYLE_ATTRIBUTE, "");
    rootElement.prepend(styleElement);
  }
  styleElement.textContent = INLINE_PANEL_CSS;
}

function ensureInlineAppHost(doc: Document, rootElement: HTMLElement): HTMLElement {
  inlineAppElement =
    inlineAppElement && inlineAppElement.parentElement === rootElement
      ? inlineAppElement
      : rootElement.querySelector<HTMLElement>(`[${INLINE_APP_ATTRIBUTE}]`) ?? doc.createElement("div");
  inlineAppElement.setAttribute(INLINE_APP_ATTRIBUTE, "");
  rootElement.append(inlineAppElement);
  return inlineAppElement;
}

export function isInlinePanelMounted(doc: Document): boolean {
  const rootElement = doc.getElementById(INLINE_ROOT_ID);
  return Boolean(rootElement?.isConnected && rootElement.parentElement === findInlineMountParent(doc));
}

export function mountInlinePanel(doc: Document, videoId: string): HTMLElement {
  const parent = findInlineMountParent(doc);
  const rootElement = ensureInlineRoot(doc);

  if (rootElement.parentElement !== parent) {
    parent.prepend(rootElement);
  }

  ensureInlineStyle(doc, rootElement);
  const appElement = ensureInlineAppHost(doc, rootElement);

  reactRoot = reactRoot ?? createRoot(appElement);
  flushSync(() => {
    reactRoot?.render(<InjectedYouTubeApp videoId={videoId} />);
  });

  return rootElement;
}

export function unmountInlinePanel(doc: Document): void {
  reactRoot?.unmount();
  reactRoot = undefined;
  inlineAppElement = undefined;

  const rootElement = inlineRootElement ?? doc.getElementById(INLINE_ROOT_ID);
  rootElement?.remove();
  inlineRootElement = undefined;
}
