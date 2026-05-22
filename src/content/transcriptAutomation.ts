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

  return clickableElements(doc).find((element) => {
    const searchableText = normalizeText(
      [element.textContent, element.getAttribute("aria-label"), element.getAttribute("title")].filter(Boolean).join(" ")
    );

    return normalizedLabels.some((label) => searchableText === label || searchableText.includes(label));
  });
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
  return Array.from(doc.querySelectorAll("ytd-transcript-segment-renderer"))
    .map<TranscriptSegment | undefined>((segment) => {
      const start = segment.querySelector(".segment-timestamp")?.textContent?.trim();
      const text = segment.querySelector(".segment-text")?.textContent?.trim();
      return text ? (start ? { start, text } : { text }) : undefined;
    })
    .filter((segment): segment is TranscriptSegment => Boolean(segment));
}

export function getTranscriptSupportStatus(doc: Document): string {
  if (findTranscriptSegments(doc).length > 0) {
    return "Transcript available";
  }

  if (findClickableByText(doc, ["内容转文字", "Show transcript"])) {
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

  findClickableByText(doc, ["更多", "More"])?.click();

  const transcriptButton = await waitForClickableByText(doc, ["内容转文字", "Show transcript"], waitOptions);
  if (!transcriptButton) {
    return { ok: false, status: "unavailable", reason: UNAVAILABLE_REASON };
  }

  transcriptButton.click();

  const startedAt = Date.now();
  while (Date.now() - startedAt < waitOptions.timeoutMs) {
    if (findTranscriptSegments(doc).length > 0) {
      return { ok: true, status: "opened" };
    }

    await wait(waitOptions.pollMs);
  }

  return { ok: false, status: "manual", reason: MANUAL_REASON };
}
