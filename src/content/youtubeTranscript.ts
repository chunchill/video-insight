import type { TranscriptPayload, TranscriptSegment, VideoMeta } from "../shared/types";

export type TranscriptExtractionResult =
  | { ok: true; transcript: TranscriptPayload }
  | { ok: false; reason: string };

export function isYouTubeWatchPage(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();
  const isYouTubeHost = hostname === "youtube.com" || hostname.endsWith(".youtube.com");

  return url.protocol === "https:" && isYouTubeHost && url.pathname === "/watch" && url.searchParams.has("v");
}

function textContent(doc: Document, selector: string): string | undefined {
  const value = doc.querySelector(selector)?.textContent?.trim();
  return value && value.length > 0 ? value : undefined;
}

function extractVideoMeta(doc: Document, url: URL): VideoMeta {
  return {
    url: url.toString(),
    title:
      textContent(doc, "h1 yt-formatted-string") ??
      textContent(doc, "h1") ??
      doc.title.replace(" - YouTube", ""),
    channel: textContent(doc, "ytd-channel-name a"),
    duration: textContent(doc, ".ytp-time-duration")
  };
}

function extractVisibleTranscriptSegments(doc: Document): TranscriptSegment[] {
  return Array.from(doc.querySelectorAll("ytd-transcript-segment-renderer"))
    .map<TranscriptSegment | undefined>((segment) => {
      const start = segment.querySelector(".segment-timestamp")?.textContent?.trim();
      const text = segment.querySelector(".segment-text")?.textContent?.trim();
      return text ? (start ? { start, text } : { text }) : undefined;
    })
    .filter((segment): segment is TranscriptSegment => Boolean(segment));
}

function toPlainText(segments: TranscriptSegment[]): string {
  return segments.map((segment) => (segment.start ? `[${segment.start}] ${segment.text}` : segment.text)).join("\n");
}

export function extractTranscriptFromPage(doc: Document, url: URL): TranscriptExtractionResult {
  if (!isYouTubeWatchPage(url)) {
    return { ok: false, reason: "Please open a YouTube video page." };
  }

  const segments = extractVisibleTranscriptSegments(doc);
  if (segments.length === 0) {
    return { ok: false, reason: "No transcript segments were detected on this YouTube page." };
  }

  return {
    ok: true,
    transcript: {
      videoMeta: extractVideoMeta(doc, url),
      segments,
      plainText: toPlainText(segments)
    }
  };
}
