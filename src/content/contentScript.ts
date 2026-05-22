import { mountInlinePanel, unmountInlinePanel } from "./inlineMount";
import { ensureTranscriptVisible } from "./transcriptAutomation";
import { createYouTubePageObserver } from "./youtubePageObserver";
import { extractTranscriptFromPage } from "./youtubeTranscript";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "VIDEO_INSIGHT_GET_TRANSCRIPT") {
    return false;
  }

  void (async () => {
    if (message?.autoOpenTranscript) {
      const ensureResult = await ensureTranscriptVisible(document);
      if (!ensureResult.ok) {
        sendResponse({ ok: false, reason: ensureResult.reason });
        return;
      }
    }

    sendResponse(extractTranscriptFromPage(document, new URL(window.location.href)));
  })();
  return true;
});

createYouTubePageObserver((state) => {
  if (state.isWatchPage && state.videoId) {
    mountInlinePanel(document, state.videoId);
  } else {
    unmountInlinePanel(document);
  }
}).start();
