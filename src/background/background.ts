import { VIDEO_INSIGHT_OPEN_OPTIONS } from "../shared/extensionMessages";

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === VIDEO_INSIGHT_OPEN_OPTIONS) {
    void chrome.runtime.openOptionsPage();
  }

  return false;
});
