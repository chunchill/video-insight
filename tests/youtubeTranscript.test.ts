import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  extractTranscriptFromCaptionTracks,
  extractTranscriptFromPage,
  isYouTubeWatchPage
} from "../src/content/youtubeTranscript";
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

  it("extracts transcript from YouTube caption tracks without opening transcript UI", async () => {
    document.documentElement.innerHTML = `
      <html>
        <head><title>Caption Track Talk - YouTube</title></head>
        <body>
          <h1>Caption Track Talk</h1>
          <script>
            var ytInitialPlayerResponse = {"captions":{"playerCaptionsTracklistRenderer":{"captionTracks":[{"baseUrl":"https://www.youtube.com/api/timedtext?v=abc123&lang=en","languageCode":"en"}]}}};
          </script>
        </body>
      </html>
    `;
    const fetchCaption = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        events: [
          { tStartMs: 3000, segs: [{ utf8: "Transcript from caption track." }] },
          { tStartMs: 12000, segs: [{ utf8: "Second line." }] }
        ]
      })
    })) as unknown as typeof fetch;

    const result = await extractTranscriptFromCaptionTracks(document, watchUrl, fetchCaption);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.transcript.segments).toEqual([
        { start: "0:03", text: "Transcript from caption track." },
        { start: "0:12", text: "Second line." }
      ]);
      expect(result.transcript.plainText).toContain("[0:03] Transcript from caption track.");
    }
    expect(fetchCaption).toHaveBeenCalledWith(
      "https://www.youtube.com/api/timedtext?v=abc123&lang=en&fmt=json3"
    );
  });

  it("reports unavailable caption tracks when YouTube returns empty JSON", async () => {
    document.documentElement.innerHTML = `
      <html>
        <body>
          <h1>Empty Caption Track</h1>
          <script>
            var ytInitialPlayerResponse = {"captions":{"playerCaptionsTracklistRenderer":{"captionTracks":[{"baseUrl":"https://www.youtube.com/api/timedtext?v=abc123&lang=en","languageCode":"en"}]}}};
          </script>
        </body>
      </html>
    `;
    const fetchCaption = vi.fn(async () => ({
      ok: true,
      json: async () => {
        throw new SyntaxError("Unexpected end of JSON input");
      }
    })) as unknown as typeof fetch;

    const result = await extractTranscriptFromCaptionTracks(document, watchUrl, fetchCaption);

    expect(result).toEqual({
      ok: false,
      reason: "Caption track did not contain transcript text."
    });
  });
});
