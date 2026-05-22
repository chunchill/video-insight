import type { TranscriptPayload } from "../shared/types";

export type InsightPanelSource = "sidepanel" | "inline";

export interface InsightPanelContext {
  source: InsightPanelSource;
  videoId?: string;
  getTranscript: () => Promise<TranscriptPayload>;
  getTranscriptStatus?: () => string;
  openSettings?: () => void;
}
