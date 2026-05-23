import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TranscriptPayload } from "../src/shared/types";

type MessageListener = (message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => boolean | undefined;

const mocks = vi.hoisted(() => ({
  loadTranscriptFromPage: vi.fn(),
  extractTranscriptFromPage: vi.fn(),
  ensureTranscriptVisible: vi.fn()
}));

vi.mock("../src/content/youtubeTranscript", () => ({
  loadTranscriptFromPage: mocks.loadTranscriptFromPage,
  extractTranscriptFromPage: mocks.extractTranscriptFromPage
}));

vi.mock("../src/content/transcriptAutomation", () => ({
  ensureTranscriptVisible: mocks.ensureTranscriptVisible
}));

vi.mock("../src/content/inlineMount", () => ({
  isInlinePanelMounted: vi.fn(() => true),
  mountInlinePanel: vi.fn(),
  unmountInlinePanel: vi.fn()
}));

vi.mock("../src/content/youtubePageObserver", () => ({
  createYouTubePageObserver: vi.fn(() => ({ start: vi.fn() }))
}));

const transcript: TranscriptPayload = {
  videoMeta: { url: "https://www.youtube.com/watch?v=abc123", title: "Runtime Transcript" },
  segments: [{ start: "0:05", text: "Runtime transcript loaded after UI trigger." }],
  plainText: "[0:05] Runtime transcript loaded after UI trigger."
};

beforeEach(() => {
  vi.resetModules();
  mocks.loadTranscriptFromPage.mockReset();
  mocks.extractTranscriptFromPage.mockReset();
  mocks.ensureTranscriptVisible.mockReset();
});

describe("contentScript transcript loading", () => {
  it("retries transcript extraction after transcript UI is triggered even when segment polling reports manual", async () => {
    let listener: MessageListener | undefined;
    Object.assign(globalThis, {
      chrome: {
        runtime: {
          onMessage: {
            addListener: vi.fn((registeredListener: MessageListener) => {
              listener = registeredListener;
            })
          }
        }
      }
    });
    mocks.loadTranscriptFromPage
      .mockResolvedValueOnce({ ok: false, reason: "No transcript segments were detected on this YouTube page." })
      .mockResolvedValueOnce({ ok: true, transcript });
    mocks.ensureTranscriptVisible.mockResolvedValue({
      ok: false,
      status: "manual",
      reason: "Transcript controls were found, but transcript text did not load. Try opening transcript manually."
    });

    await import("../src/content/contentScript");

    const sendResponse = vi.fn();
    const keepsChannelOpen = listener?.(
      { type: "VIDEO_INSIGHT_GET_TRANSCRIPT", autoOpenTranscript: true },
      {},
      sendResponse
    );
    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith({ ok: true, transcript });
    });

    expect(keepsChannelOpen).toBe(true);
    expect(mocks.loadTranscriptFromPage).toHaveBeenCalledTimes(2);
    expect(mocks.extractTranscriptFromPage).not.toHaveBeenCalled();
  });
});
