import type { InsightInput } from "./types";

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

const languageNames = {
  "zh-CN": "Simplified Chinese",
  en: "English"
} as const;

function buildTranscriptText(transcript: InsightInput["transcript"]): string {
  if (transcript.segments.length === 0) {
    return transcript.plainText;
  }

  return transcript.segments
    .map((segment) => (segment.start ? `[${segment.start}] ${segment.text}` : segment.text))
    .join("\n");
}

export function buildInsightMessages(input: InsightInput): ChatMessage[] {
  const { transcript, outputLanguage } = input;
  const languageName = languageNames[outputLanguage];
  const transcriptText = buildTranscriptText(transcript);

  return [
    {
      role: "system",
      content:
        `You analyze YouTube transcripts for a personal productivity tool. ` +
        `Answer only in ${languageName}. ` +
        `Use only the provided metadata and transcript. ` +
        `Return strict JSON with keys: summary, takeaways, viewpoints, caveats, audience. ` +
        `viewpoints must be an array of objects with title, detail, evidence. ` +
        `evidence must be an array of objects with timestamp and text.`
    },
    {
      role: "user",
      content: [
        `Video URL: ${transcript.videoMeta.url}`,
        `Title: ${transcript.videoMeta.title ?? "Unknown"}`,
        `Channel: ${transcript.videoMeta.channel ?? "Unknown"}`,
        `Duration: ${transcript.videoMeta.duration ?? "Unknown"}`,
        `Transcript language: ${transcript.language ?? "Unknown"}`,
        "",
        "Transcript:",
        transcriptText
      ].join("\n")
    }
  ];
}
