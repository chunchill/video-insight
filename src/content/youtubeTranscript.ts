import type { TranscriptPayload, TranscriptSegment, VideoMeta } from "../shared/types";
import { findTranscriptSegments } from "./transcriptAutomation";

export type TranscriptExtractionResult =
  | { ok: true; transcript: TranscriptPayload }
  | { ok: false; reason: string };

interface CaptionTrack {
  baseUrl: string;
  languageCode?: string;
}

interface InnertubeConfig {
  apiKey: string;
  clientVersion: string;
  hl?: string;
  gl?: string;
  visitorData?: string;
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

function findInitialJson(doc: Document, marker: string): unknown {
  for (const script of Array.from(doc.scripts)) {
    const content = script.textContent ?? "";
    const startIndex = content.indexOf(marker);
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

function findInitialPlayerResponse(doc: Document): unknown {
  return findInitialJson(doc, "ytInitialPlayerResponse");
}

function findInitialData(doc: Document): unknown {
  return findInitialJson(doc, "ytInitialData");
}

function findYtConfigValue(doc: Document, key: string): string | undefined {
  const pattern = new RegExp(`"${key}"\\s*:\\s*"([^"]+)`);

  for (const script of Array.from(doc.scripts)) {
    const value = pattern.exec(script.textContent ?? "")?.[1];
    if (value) {
      return value;
    }
  }

  return undefined;
}

function getInnertubeConfig(doc: Document): InnertubeConfig | undefined {
  const apiKey = findYtConfigValue(doc, "INNERTUBE_API_KEY");
  const clientVersion = findYtConfigValue(doc, "INNERTUBE_CLIENT_VERSION");

  if (!apiKey || !clientVersion) {
    return undefined;
  }

  return {
    apiKey,
    clientVersion,
    hl: findYtConfigValue(doc, "HL"),
    gl: findYtConfigValue(doc, "GL"),
    visitorData: findYtConfigValue(doc, "VISITOR_DATA")
  };
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

function findTranscriptEndpointParams(doc: Document): string | undefined {
  const initialData = findInitialData(doc);
  return findTranscriptEndpointParamsInValue(initialData) ?? findTranscriptEndpointParamsInRuntimeData(doc);
}

function findTranscriptEndpointParamsInValue(value: unknown): string | undefined {
  const visited = new WeakSet<object>();
  const stack: Array<{ value: unknown; depth: number }> = [{ value, depth: 0 }];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || !current.value || typeof current.value !== "object" || current.depth > 20) {
      continue;
    }

    if (visited.has(current.value)) {
      continue;
    }
    visited.add(current.value);

    const node = current.value as Record<string, unknown>;
    const endpoint = node.getTranscriptEndpoint as { params?: unknown } | undefined;
    if (typeof endpoint?.params === "string") {
      return endpoint.params;
    }

    for (const child of Object.values(node)) {
      stack.push({ value: child, depth: current.depth + 1 });
    }
  }

  return undefined;
}

function findTranscriptEndpointParamsInRuntimeData(doc: Document): string | undefined {
  const runtimeRoots = Array.from(
    doc.querySelectorAll<HTMLElement>(
      "ytd-watch-flexy, ytd-app, ytd-page-manager, ytd-watch-metadata, ytd-engagement-panel-section-list-renderer"
    )
  );
  const propertyNames = ["data", "__data", "response", "playerResponse"];

  for (const root of runtimeRoots) {
    const runtimeRoot = root as HTMLElement & Record<string, unknown>;

    for (const propertyName of propertyNames) {
      const params = findTranscriptEndpointParamsInValue(runtimeRoot[propertyName]);
      if (params) {
        return params;
      }
    }
  }

  return undefined;
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

function textFromRuns(value: unknown): string {
  const textContainer = value as { simpleText?: unknown; runs?: Array<{ text?: unknown }> } | undefined;
  if (typeof textContainer?.simpleText === "string") {
    return textContainer.simpleText.replace(/\s+/g, " ").trim();
  }

  return (
    textContainer?.runs
      ?.map((run) => (typeof run.text === "string" ? run.text : ""))
      .join("")
      .replace(/\s+/g, " ")
      .trim() ?? ""
  );
}

function parseInnertubeSegments(value: unknown): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];

  function visit(node: unknown) {
    if (!node || typeof node !== "object") {
      return;
    }

    const record = node as Record<string, unknown>;
    const cueGroup = record.transcriptCueGroupRenderer as
      | {
          formattedStartOffset?: unknown;
          cues?: Array<{ transcriptCueRenderer?: { cue?: unknown } }>;
        }
      | undefined;

    if (cueGroup) {
      const text = cueGroup.cues
        ?.map((cue) => textFromRuns(cue.transcriptCueRenderer?.cue))
        .filter(Boolean)
        .join(" ")
        .trim();
      const start = textFromRuns(cueGroup.formattedStartOffset);

      if (text) {
        segments.push(start ? { start, text } : { text });
      }
      return;
    }

    const segment = record.transcriptSegmentRenderer as
      | {
          startTimeText?: unknown;
          snippet?: unknown;
        }
      | undefined;

    if (segment) {
      const text = textFromRuns(segment.snippet);
      const start = textFromRuns(segment.startTimeText);

      if (text) {
        segments.push(start ? { start, text } : { text });
      }
      return;
    }

    for (const child of Object.values(record)) {
      if (Array.isArray(child)) {
        child.forEach(visit);
      } else {
        visit(child);
      }
    }
  }

  visit(value);
  return segments;
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

export async function extractTranscriptFromInnertube(
  doc: Document,
  url: URL,
  fetchTranscript: typeof fetch = fetch
): Promise<TranscriptExtractionResult> {
  if (!isYouTubeWatchPage(url)) {
    return { ok: false, reason: "Please open a YouTube video page." };
  }

  const config = getInnertubeConfig(doc);
  const params = findTranscriptEndpointParams(doc);
  if (!config || !params) {
    return { ok: false, reason: "No YouTube transcript endpoint was detected on this page." };
  }

  const endpoint = new URL("/youtubei/v1/get_transcript", url.origin);
  endpoint.searchParams.set("key", config.apiKey);

  const response = await fetchTranscript(endpoint.toString(), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": config.apiKey,
      "X-Youtube-Client-Name": "1",
      "X-Youtube-Client-Version": config.clientVersion,
      ...(config.visitorData ? { "X-Goog-Visitor-Id": config.visitorData } : {})
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: "WEB",
          clientVersion: config.clientVersion,
          hl: config.hl,
          gl: config.gl,
          visitorData: config.visitorData
        }
      },
      params
    })
  });

  if (!response.ok) {
    return { ok: false, reason: "YouTube transcript endpoint could not be loaded for this video." };
  }

  let transcriptJson: unknown;
  try {
    transcriptJson = await response.json();
  } catch {
    return { ok: false, reason: "YouTube transcript endpoint did not contain transcript text." };
  }

  const segments = parseInnertubeSegments(transcriptJson);
  if (segments.length === 0) {
    return { ok: false, reason: "YouTube transcript endpoint did not contain transcript text." };
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

export async function loadTranscriptFromPage(
  doc: Document,
  url: URL,
  fetchTranscript: typeof fetch = fetch
): Promise<TranscriptExtractionResult> {
  const visibleTranscript = extractTranscriptFromPage(doc, url);
  if (visibleTranscript.ok) {
    return visibleTranscript;
  }

  const captionTrackTranscript = await extractTranscriptFromCaptionTracks(doc, url, fetchTranscript);
  if (captionTrackTranscript.ok) {
    return captionTrackTranscript;
  }

  const innertubeTranscript = await extractTranscriptFromInnertube(doc, url, fetchTranscript);
  if (innertubeTranscript.ok) {
    return innertubeTranscript;
  }

  return visibleTranscript;
}
