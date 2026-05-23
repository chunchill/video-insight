import type { TranscriptSegment } from "../shared/types";

export interface TranscriptWaitOptions {
  timeoutMs: number;
  pollMs: number;
}

export type TranscriptEnsureResult =
  | { ok: true; status: "available" | "opened" }
  | { ok: false; status: "unavailable" | "manual"; reason: string };

const DEFAULT_WAIT_OPTIONS: TranscriptWaitOptions = {
  timeoutMs: 4000,
  pollMs: 200
};

const UNAVAILABLE_REASON = "Current video does not expose a transcript for text insight.";
const MANUAL_REASON = "Transcript controls were found, but transcript text did not load. Try opening transcript manually.";
const TRANSCRIPT_BUTTON_LABELS = ["内容转文字", "Show transcript"];

function normalizeText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
}

function clickableElements(doc: Document): HTMLElement[] {
  return Array.from(
    doc.querySelectorAll<HTMLElement>("button, [role='button'], yt-button-shape, ytd-button-renderer")
  );
}

function findClickableByText(doc: Document, labels: string[]): HTMLElement | undefined {
  const normalizedLabels = labels.map((label) => normalizeText(label));

  return clickableElements(doc)
    .filter((element) => {
      const searchableText = normalizeText(
        [element.textContent, element.getAttribute("aria-label"), element.getAttribute("title")].filter(Boolean).join(" ")
      );

      return normalizedLabels.some((label) => searchableText === label || searchableText.includes(label));
    })
    .sort((left, right) => clickablePriority(left) - clickablePriority(right))[0];
}

function clickablePriority(element: HTMLElement): number {
  if (element.tagName === "BUTTON") {
    return 0;
  }

  if (element.getAttribute("role") === "button") {
    return 1;
  }

  return 2;
}

function clickYouTubeControl(element: HTMLElement): void {
  const clickTarget = element.matches("button, [role='button']")
    ? element
    : element.querySelector<HTMLElement>("button, [role='button']") ?? element;

  clickTarget.click();
}

function isMoreDisclosure(element: HTMLElement): boolean {
  const searchableText = normalizeText(
    [element.textContent, element.getAttribute("aria-label"), element.getAttribute("title")].filter(Boolean).join(" ")
  );

  return (
    searchableText === "more" ||
    searchableText === "...more" ||
    searchableText === "show more" ||
    searchableText === "更多"
  );
}

function findMoreDisclosure(doc: Document): HTMLElement | undefined {
  return clickableElements(doc)
    .filter(isMoreDisclosure)
    .sort((left, right) => {
      const leftIsDescription = left.closest("ytd-watch-metadata, #description, #description-inline-expander");
      const rightIsDescription = right.closest("ytd-watch-metadata, #description, #description-inline-expander");
      if (leftIsDescription && !rightIsDescription) {
        return -1;
      }
      if (!leftIsDescription && rightIsDescription) {
        return 1;
      }

      return clickablePriority(left) - clickablePriority(right);
    })[0];
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function waitForClickableByText(
  doc: Document,
  labels: string[],
  options: TranscriptWaitOptions
): Promise<HTMLElement | undefined> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < options.timeoutMs) {
    const element = findClickableByText(doc, labels);
    if (element) {
      return element;
    }

    await wait(options.pollMs);
  }

  return findClickableByText(doc, labels);
}

export function findTranscriptSegments(doc: Document): TranscriptSegment[] {
  const legacySegments = Array.from(doc.querySelectorAll("ytd-transcript-segment-renderer")).map<
    TranscriptSegment | undefined
  >((segment) => {
    const start = segment.querySelector(".segment-timestamp")?.textContent?.trim();
    const text = segment.querySelector(".segment-text")?.textContent?.trim();
    return text ? (start ? { start, text } : { text }) : undefined;
  });

  const modernSegments = Array.from(doc.querySelectorAll("transcript-segment-view-model")).map<
    TranscriptSegment | undefined
  >((segment) => {
    const start = segment
      .querySelector(".ytwTranscriptSegmentViewModelTimestamp[aria-hidden='true'], .ytwTranscriptSegmentViewModelTimestamp")
      ?.textContent?.trim();
    const text = segment
      .querySelector("span[role='text'], .ytAttributedStringHost[role='text'], .ytAttributedStringHost")
      ?.textContent?.trim();
    return text ? (start ? { start, text } : { text }) : undefined;
  });

  return [...legacySegments, ...modernSegments]
    .filter((segment): segment is TranscriptSegment => Boolean(segment));
}

export function getTranscriptSupportStatus(doc: Document): string {
  if (findTranscriptSegments(doc).length > 0) {
    return "Transcript available";
  }

  if (findClickableByText(doc, TRANSCRIPT_BUTTON_LABELS)) {
    return "Transcript can be opened";
  }

  return "Transcript not available for this video";
}

export async function ensureTranscriptVisible(
  doc: Document,
  options: Partial<TranscriptWaitOptions> = {}
): Promise<TranscriptEnsureResult> {
  const waitOptions = { ...DEFAULT_WAIT_OPTIONS, ...options };

  if (findTranscriptSegments(doc).length > 0) {
    return { ok: true, status: "available" };
  }

  const visibleTranscriptButton = findClickableByText(doc, TRANSCRIPT_BUTTON_LABELS);
  if (visibleTranscriptButton) {
    clickYouTubeControl(visibleTranscriptButton);
  } else {
    const moreButton = findMoreDisclosure(doc);
    if (moreButton) {
      clickYouTubeControl(moreButton);
    }
  }

  const transcriptButton = await waitForClickableByText(doc, TRANSCRIPT_BUTTON_LABELS, waitOptions);
  if (!transcriptButton) {
    return { ok: false, status: "unavailable", reason: UNAVAILABLE_REASON };
  }

  if (transcriptButton !== visibleTranscriptButton) {
    clickYouTubeControl(transcriptButton);
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < waitOptions.timeoutMs) {
    if (findTranscriptSegments(doc).length > 0) {
      return { ok: true, status: "opened" };
    }

    await wait(waitOptions.pollMs);
  }

  return { ok: false, status: "manual", reason: MANUAL_REASON };
}
