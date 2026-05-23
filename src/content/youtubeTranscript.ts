import type { TranscriptPayload, TranscriptSegment, VideoMeta } from "../shared/types";
import { findTranscriptSegments } from "./transcriptAutomation";

export type TranscriptExtractionResult =
  | { ok: true; transcript: TranscriptPayload }
  | { ok: false; reason: string };

interface CaptionTrack {
  baseUrl: string;
  languageCode?: string;
}

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

function toPlainText(segments: TranscriptSegment[]): string {
  return segments.map((segment) => (segment.start ? `[${segment.start}] ${segment.text}` : segment.text)).join("\n");
}

function formatTimestamp(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    : `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function extractBalancedJson(value: string, startIndex: number): string | undefined {
  const jsonStart = value.indexOf("{", startIndex);
  if (jsonStart < 0) {
    return undefined;
  }

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = jsonStart; index < value.length; index += 1) {
    const char = value[index];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (char === "\\") {
        isEscaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return value.slice(jsonStart, index + 1);
      }
    }
  }

  return undefined;
}

function findInitialPlayerResponse(doc: Document): unknown {
  for (const script of Array.from(doc.scripts)) {
    const content = script.textContent ?? "";
    const startIndex = content.indexOf("ytInitialPlayerResponse");
    if (startIndex < 0) {
      continue;
    }

    const jsonText = extractBalancedJson(content, startIndex);
    if (!jsonText) {
      continue;
    }

    try {
      return JSON.parse(jsonText);
    } catch {
      continue;
    }
  }

  return undefined;
}

function getCaptionTracks(doc: Document): CaptionTrack[] {
  const playerResponse = findInitialPlayerResponse(doc) as
    | {
        captions?: {
          playerCaptionsTracklistRenderer?: {
            captionTracks?: CaptionTrack[];
          };
        };
      }
    | undefined;

  return playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks?.filter((track) => track.baseUrl) ?? [];
}

function withJson3Format(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set("fmt", "json3");
  return url.toString();
}

function parseJson3Segments(value: unknown): TranscriptSegment[] {
  const response = value as { events?: Array<{ tStartMs?: number; segs?: Array<{ utf8?: string }> }> };

  return (
    response.events
      ?.map<TranscriptSegment | undefined>((event) => {
        const text = event.segs
          ?.map((segment) => segment.utf8 ?? "")
          .join("")
          .replace(/\s+/g, " ")
          .trim();

        if (!text) {
          return undefined;
        }

        return typeof event.tStartMs === "number"
          ? { start: formatTimestamp(event.tStartMs), text }
          : { text };
      })
      .filter((segment): segment is TranscriptSegment => Boolean(segment)) ?? []
  );
}

export function extractTranscriptFromPage(doc: Document, url: URL): TranscriptExtractionResult {
  if (!isYouTubeWatchPage(url)) {
    return { ok: false, reason: "Please open a YouTube video page." };
  }

  const segments = findTranscriptSegments(doc);
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

export async function extractTranscriptFromCaptionTracks(
  doc: Document,
  url: URL,
  fetchCaption: typeof fetch = fetch
): Promise<TranscriptExtractionResult> {
  if (!isYouTubeWatchPage(url)) {
    return { ok: false, reason: "Please open a YouTube video page." };
  }

  const captionTrack = getCaptionTracks(doc)[0];
  if (!captionTrack) {
    return { ok: false, reason: "No caption tracks were detected on this YouTube page." };
  }

  const response = await fetchCaption(withJson3Format(captionTrack.baseUrl));
  if (!response.ok) {
    return { ok: false, reason: "Caption track could not be loaded for this video." };
  }

  let captionJson: unknown;
  try {
    captionJson = await response.json();
  } catch {
    return { ok: false, reason: "Caption track did not contain transcript text." };
  }

  const segments = parseJson3Segments(captionJson);
  if (segments.length === 0) {
    return { ok: false, reason: "Caption track did not contain transcript text." };
  }

  return {
    ok: true,
    transcript: {
      videoMeta: extractVideoMeta(doc, url),
      language: captionTrack.languageCode,
      segments,
      plainText: toPlainText(segments)
    }
  };
}

export async function loadTranscriptFromPage(doc: Document, url: URL): Promise<TranscriptExtractionResult> {
  const visibleTranscript = extractTranscriptFromPage(doc, url);
  if (visibleTranscript.ok) {
    return visibleTranscript;
  }

  const captionTrackTranscript = await extractTranscriptFromCaptionTracks(doc, url);
  if (captionTrackTranscript.ok) {
    return captionTrackTranscript;
  }

  return visibleTranscript;
}
