import { beforeEach, describe, expect, it } from "vitest";
import { getSavedInsight, saveInsightRecord } from "../src/storage/insightHistory";
import { installChromeMock } from "../src/test/chromeMock";
import type { ParsedInsightResult, TranscriptPayload } from "../src/shared/types";

const transcript: TranscriptPayload = {
  videoMeta: { url: "https://www.youtube.com/watch?v=abc123", title: "AI Talk" },
  segments: [{ start: "0:03", text: "AI systems change workflows." }],
  plainText: "[0:03] AI systems change workflows."
};

const result: ParsedInsightResult = {
  kind: "structured",
  rawText: "{}",
  data: {
    summary: "AI changes complete workflows.",
    takeaways: ["Context matters"],
    viewpoints: [],
    caveats: [],
    audience: []
  }
};

beforeEach(async () => {
  installChromeMock();
  await chrome.storage.local.clear();
});

describe("insightHistory", () => {
  it("saves and restores insight records by video id", async () => {
    await saveInsightRecord({
      videoId: "abc123",
      transcript,
      outputLanguage: "zh-CN",
      result
    });

    const saved = await getSavedInsight("abc123");

    expect(saved?.videoId).toBe("abc123");
    expect(saved?.transcript.plainText).toBe("[0:03] AI systems change workflows.");
    expect(saved?.result).toEqual(result);
    expect(saved?.createdAt).toEqual(expect.any(String));
  });

  it("keeps records for different videos separate", async () => {
    await saveInsightRecord({ videoId: "abc123", transcript, outputLanguage: "zh-CN", result });

    await expect(getSavedInsight("xyz789")).resolves.toBeUndefined();
  });
});
