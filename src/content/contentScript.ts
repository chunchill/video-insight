import { extractTranscriptFromPage } from "./youtubeTranscript";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "VIDEO_INSIGHT_GET_TRANSCRIPT") {
    return false;
  }

  sendResponse(extractTranscriptFromPage(document, new URL(window.location.href)));
  return false;
});
