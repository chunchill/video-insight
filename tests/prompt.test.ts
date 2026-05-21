import { describe, expect, it } from "vitest";
import { buildInsightMessages } from "../src/shared/prompt";
import type { TranscriptPayload } from "../src/shared/types";

const transcript: TranscriptPayload = {
  videoMeta: {
    url: "https://www.youtube.com/watch?v=abc123",
    title: "AI Workflow Talk",
    channel: "Example Channel",
    duration: "12:34"
  },
  language: "en",
  segments: [],
  plainText: "AI systems are most useful when they reshape full workflows."
};

describe("buildInsightMessages", () => {
  it("requests Simplified Chinese output", () => {
    const messages = buildInsightMessages({ transcript, outputLanguage: "zh-CN" });
    expect(messages[0].content).toContain("Simplified Chinese");
    expect(messages[1].content).toContain("AI Workflow Talk");
    expect(messages[1].content).toContain("AI systems are most useful");
  });

  it("requests English output", () => {
    const messages = buildInsightMessages({ transcript, outputLanguage: "en" });
    expect(messages[0].content).toContain("English");
  });
});
