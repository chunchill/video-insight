import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TranscriptPayload } from "../src/shared/types";

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
  ensureTranscriptVisible: mocks.ensureTranscriptVisible,
  getTranscriptSupportStatus: vi.fn()
}));

const transcript: TranscriptPayload = {
  videoMeta: { url: "https://www.youtube.com/watch?v=abc123", title: "Runtime Transcript" },
  segments: [{ start: "0:05", text: "Runtime transcript loaded after inline UI trigger." }],
  plainText: "[0:05] Runtime transcript loaded after inline UI trigger."
};

beforeEach(() => {
  vi.resetModules();
  mocks.loadTranscriptFromPage.mockReset();
  mocks.extractTranscriptFromPage.mockReset();
  mocks.ensureTranscriptVisible.mockReset();
});

describe("getInlineTranscript", () => {
  it("retries transcript extraction after triggering transcript UI even when segment polling reports manual", async () => {
    mocks.loadTranscriptFromPage
      .mockResolvedValueOnce({ ok: false, reason: "No transcript segments were detected on this YouTube page." })
      .mockResolvedValueOnce({ ok: true, transcript });
    mocks.ensureTranscriptVisible.mockResolvedValue({
      ok: false,
      status: "manual",
      reason: "Transcript controls were found, but transcript text did not load. Try opening transcript manually."
    });

    const { getInlineTranscript } = await import("../src/content/InjectedYouTubeApp");

    await expect(getInlineTranscript()).resolves.toBe(transcript);
    expect(mocks.loadTranscriptFromPage).toHaveBeenCalledTimes(2);
    expect(mocks.extractTranscriptFromPage).not.toHaveBeenCalled();
  });
});
