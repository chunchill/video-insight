import type { OutputLanguage, ParsedInsightResult, TranscriptPayload, VideoMeta } from "../shared/types";

const STORAGE_KEY = "videoInsight.savedInsights";

export interface SavedInsightRecord {
  videoId: string;
  videoMeta: VideoMeta;
  transcript: TranscriptPayload;
  outputLanguage: OutputLanguage;
  result: ParsedInsightResult;
  createdAt: string;
  updatedAt: string;
}

export interface SaveInsightInput {
  videoId: string;
  transcript: TranscriptPayload;
  outputLanguage: OutputLanguage;
  result: ParsedInsightResult;
}

type SavedInsightMap = Record<string, SavedInsightRecord>;

function cloneValue<T>(value: T): T {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }
  if (value === undefined) {
    return value;
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

async function getSavedInsightMap(): Promise<SavedInsightMap> {
  const result = await chrome.storage.local.get({ [STORAGE_KEY]: {} });
  return cloneValue(result[STORAGE_KEY] as SavedInsightMap);
}

export async function getSavedInsight(videoId: string | undefined): Promise<SavedInsightRecord | undefined> {
  if (!videoId) {
    return undefined;
  }

  const savedInsights = await getSavedInsightMap();
  return cloneValue(savedInsights[videoId]);
}

export async function saveInsightRecord(input: SaveInsightInput): Promise<SavedInsightRecord> {
  const savedInsights = await getSavedInsightMap();
  const existing = savedInsights[input.videoId];
  const now = new Date().toISOString();
  const record: SavedInsightRecord = {
    videoId: input.videoId,
    videoMeta: input.transcript.videoMeta,
    transcript: input.transcript,
    outputLanguage: input.outputLanguage,
    result: input.result,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };

  await chrome.storage.local.set({
    [STORAGE_KEY]: {
      ...savedInsights,
      [input.videoId]: cloneValue(record)
    }
  });

  return cloneValue(record);
}
