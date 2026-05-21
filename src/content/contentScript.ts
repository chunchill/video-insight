chrome.runtime.onMessage.addListener((_message, _sender, sendResponse) => {
  sendResponse({ ok: true });
  return false;
});
