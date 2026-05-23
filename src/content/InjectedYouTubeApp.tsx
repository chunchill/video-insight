import { useCallback, useMemo } from "react";
import { InsightPanel } from "../insight/InsightPanel";
import type { InsightPanelContext } from "../insight/insightPanelTypes";
import { VIDEO_INSIGHT_OPEN_OPTIONS } from "../shared/extensionMessages";
import type { TranscriptPayload } from "../shared/types";
import { ensureTranscriptVisible, getTranscriptSupportStatus } from "./transcriptAutomation";
import { extractTranscriptFromPage, loadTranscriptFromPage } from "./youtubeTranscript";

async function getInlineTranscript(): Promise<TranscriptPayload> {
  const directResult = await loadTranscriptFromPage(document, new URL(window.location.href));
  if (directResult.ok) {
    return directResult.transcript;
  }

  const ensureResult = await ensureTranscriptVisible(document);
  if (!ensureResult.ok) {
    throw new Error(ensureResult.reason || directResult.reason);
  }

  const extractionResult = extractTranscriptFromPage(document, new URL(window.location.href));
  if (!extractionResult.ok) {
    throw new Error(extractionResult.reason);
  }

  return extractionResult.transcript;
}

function openOptionsPage() {
  void chrome.runtime.sendMessage({ type: VIDEO_INSIGHT_OPEN_OPTIONS });
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
