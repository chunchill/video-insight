import { describe, expect, it } from "vitest";
import { buildInsightMarkdown } from "../src/insight/insightExport";
import type { ParsedInsightResult, TranscriptPayload } from "../src/shared/types";

const transcript: TranscriptPayload = {
  videoMeta: { url: "https://www.youtube.com/watch?v=abc123", title: "AI Talk", channel: "Example" },
  segments: [{ start: "0:03", text: "AI systems change workflows." }],
  plainText: "[0:03] AI systems change workflows."
};

const result: ParsedInsightResult = {
  kind: "structured",
  rawText: "{}",
  data: {
    summary: "AI changes complete workflows.",
    takeaways: ["Context matters"],
    viewpoints: [
      {
        title: "Workflow shift",
        detail: "Complete workflows matter.",
        evidence: [{ timestamp: "0:03", text: "AI systems change workflows." }]
      }
    ],
    caveats: ["Transcript may omit visual context."],
    audience: []
  }
};

describe("insightExport", () => {
  it("builds markdown with metadata, insight, and transcript", () => {
    const markdown = buildInsightMarkdown({ transcript, result, outputLanguage: "en" });

    expect(markdown).toContain("# AI Talk");
    expect(markdown).toContain("Source: https://www.youtube.com/watch?v=abc123");
    expect(markdown).toContain("## Summary");
    expect(markdown).toContain("AI changes complete workflows.");
    expect(markdown).toContain("## Transcript");
    expect(markdown).toContain("[0:03] AI systems change workflows.");
  });
});
