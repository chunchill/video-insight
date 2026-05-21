import { beforeEach, describe, expect, it } from "vitest";
import { extractTranscriptFromPage, isYouTubeWatchPage } from "../src/content/youtubeTranscript";
import { youtubeWatchHtml } from "../src/test/youtubeFixtures";

describe("youtubeTranscript", () => {
  const watchUrl = new URL("https://www.youtube.com/watch?v=abc123");

  beforeEach(() => {
    document.documentElement.innerHTML = youtubeWatchHtml;
  });

  it("detects YouTube watch pages", () => {
    expect(isYouTubeWatchPage(new URL("https://www.youtube.com/watch?v=abc123"))).toBe(true);
    expect(isYouTubeWatchPage(new URL("https://youtube.com/watch?v=abc123"))).toBe(true);
    expect(isYouTubeWatchPage(new URL("http://www.youtube.com/watch?v=abc123"))).toBe(false);
    expect(isYouTubeWatchPage(new URL("https://youtube.com.evil.test/watch?v=abc123"))).toBe(false);
    expect(isYouTubeWatchPage(new URL("https://notyoutube.com/watch?v=abc123"))).toBe(false);
    expect(isYouTubeWatchPage(new URL("https://www.youtube.com/"))).toBe(false);
  });

  it("extracts metadata and transcript segments", () => {
    const result = extractTranscriptFromPage(document, watchUrl);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.transcript.videoMeta.title).toBe("AI Workflow Talk");
      expect(result.transcript.videoMeta.channel).toBe("Example Channel");
      expect(result.transcript.segments).toHaveLength(2);
      expect(result.transcript.plainText).toContain("[0:03] AI systems change workflows.");
    }
  });

  it("reports missing transcripts", () => {
    document.documentElement.innerHTML = "<html><body><h1>No Transcript</h1></body></html>";
    const result = extractTranscriptFromPage(document, watchUrl);

    expect(result).toEqual({
      ok: false,
      reason: "No transcript segments were detected on this YouTube page."
    });
  });
});
