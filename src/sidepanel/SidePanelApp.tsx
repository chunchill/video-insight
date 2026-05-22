import { useCallback, useEffect, useMemo, useState } from "react";
import { InsightPanel } from "../insight/InsightPanel";
import type { InsightPanelContext } from "../insight/insightPanelTypes";
import type { TranscriptPayload } from "../shared/types";
import { getYouTubeVideoId } from "../shared/videoIdentity";

type TranscriptResponse = { ok: true; transcript: TranscriptPayload } | { ok: false; reason: string };
type ActiveTabState = { id?: number; url?: string };

function isTranscriptResponse(value: unknown): value is TranscriptResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const response = value as Partial<TranscriptResponse>;
  return response.ok === true || response.ok === false;
}

async function queryActiveTab(): Promise<ActiveTabState> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];

  return {
    id: activeTab?.id,
    url: activeTab?.url
  };
}

async function getActiveTranscript(): Promise<TranscriptPayload> {
  const activeTab = await queryActiveTab();

  if (activeTab.id == null) {
    throw new Error("No active browser tab was found.");
  }

  const response = (await chrome.tabs.sendMessage(activeTab.id, {
    type: "VIDEO_INSIGHT_GET_TRANSCRIPT",
    autoOpenTranscript: true
  })) as unknown;

  if (!isTranscriptResponse(response)) {
    throw new Error("The YouTube page did not return a transcript response.");
  }

  if (!response.ok) {
    throw new Error(response.reason);
  }

  return response.transcript;
}

export function SidePanelApp() {
  const [activeTab, setActiveTab] = useState<ActiveTabState>({});

  useEffect(() => {
    let isMounted = true;

    async function refreshActiveTab() {
      const nextActiveTab = await queryActiveTab();
      if (!isMounted) {
        return;
      }

      setActiveTab((currentActiveTab) => {
        if (currentActiveTab.id === nextActiveTab.id && currentActiveTab.url === nextActiveTab.url) {
          return currentActiveTab;
        }

        return nextActiveTab;
      });
    }

    void refreshActiveTab();
    const intervalId = window.setInterval(() => {
      void refreshActiveTab();
    }, 1000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const getTranscript = useCallback(() => getActiveTranscript(), []);
  const videoId = useMemo(() => (activeTab.url ? getYouTubeVideoId(activeTab.url) : undefined), [activeTab.url]);
  const context = useMemo<InsightPanelContext>(
    () => ({
      source: "sidepanel",
      videoId,
      getTranscript
    }),
    [getTranscript, videoId]
  );

  return <InsightPanel context={context} />;
}
