export type OutputLanguage = "zh-CN" | "en";

export interface VideoMeta {
  url: string;
  title?: string;
  channel?: string;
  duration?: string;
}

export interface TranscriptSegment {
  start?: string;
  text: string;
}

export interface TranscriptPayload {
  videoMeta: VideoMeta;
  language?: string;
  segments: TranscriptSegment[];
  plainText: string;
}

export interface InsightEvidence {
  timestamp?: string;
  text: string;
}

export interface InsightViewpoint {
  title: string;
  detail: string;
  evidence: InsightEvidence[];
}

export interface StructuredInsight {
  summary: string;
  takeaways: string[];
  viewpoints: InsightViewpoint[];
  caveats: string[];
  audience: string[];
}

export type ParsedInsightResult =
  | { kind: "structured"; data: StructuredInsight; rawText: string }
  | { kind: "fallback"; text: string; reason: string };

export interface ModelProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

export interface InsightInput {
  transcript: TranscriptPayload;
  outputLanguage: OutputLanguage;
}
