import { useCallback, useMemo } from "react";
import { InsightPanel } from "../insight/InsightPanel";
import type { InsightPanelContext } from "../insight/insightPanelTypes";
import type { TranscriptPayload } from "../shared/types";
import { ensureTranscriptVisible, getTranscriptSupportStatus } from "./transcriptAutomation";
import { extractTranscriptFromPage } from "./youtubeTranscript";

async function getInlineTranscript(): Promise<TranscriptPayload> {
  const ensureResult = await ensureTranscriptVisible(document);
  if (!ensureResult.ok) {
    throw new Error(ensureResult.reason);
  }

  const extractionResult = extractTranscriptFromPage(document, new URL(window.location.href));
  if (!extractionResult.ok) {
    throw new Error(extractionResult.reason);
  }

  return extractionResult.transcript;
}

function openOptionsPage() {
  chrome.runtime.openOptionsPage?.();
}

export function InjectedYouTubeApp({ videoId }: { videoId?: string }) {
  const getTranscript = useCallback(() => getInlineTranscript(), []);
  const getTranscriptStatus = useCallback(() => getTranscriptSupportStatus(document), []);

  const context = useMemo<InsightPanelContext>(
    () => ({
      source: "inline",
      videoId,
      getTranscript,
      getTranscriptStatus,
      openSettings: openOptionsPage
    }),
    [getTranscript, getTranscriptStatus, videoId]
  );

  return <InsightPanel context={context} />;
}
