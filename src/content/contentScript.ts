import { isInlinePanelMounted, mountInlinePanel, unmountInlinePanel } from "./inlineMount";
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

let currentVideoId: string | undefined;

function ensureInlinePanelMounted(): void {
  if (!currentVideoId || isInlinePanelMounted(document)) {
    return;
  }

  mountInlinePanel(document, currentVideoId);
}

createYouTubePageObserver((state) => {
  if (state.isWatchPage && state.videoId) {
    currentVideoId = state.videoId;
    mountInlinePanel(document, state.videoId);
  } else {
    currentVideoId = undefined;
    unmountInlinePanel(document);
  }
}).start();

const inlineHealthObserver = new MutationObserver(() => {
  ensureInlinePanelMounted();
});

inlineHealthObserver.observe(document.documentElement, {
  childList: true,
  subtree: true
});
