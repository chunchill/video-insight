import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ensureTranscriptVisible,
  findTranscriptSegments,
  getTranscriptSupportStatus
} from "../src/content/transcriptAutomation";
import {
  englishTranscriptButtonHtml,
  noTranscriptHtml,
  visibleTranscriptHtml,
  chineseTranscriptButtonHtml
} from "../src/test/youtubeFixtures";

describe("transcriptAutomation", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("detects existing transcript segments", async () => {
    document.body.innerHTML = visibleTranscriptHtml;

    expect(findTranscriptSegments(document)).toHaveLength(2);
    await expect(ensureTranscriptVisible(document, { timeoutMs: 10, pollMs: 5 })).resolves.toEqual({
      ok: true,
      status: "available"
    });
  });

  it("detects YouTube modern transcript segment view models", async () => {
    document.body.innerHTML = `
      <transcript-segment-view-model>
        <div aria-hidden="true" class="ytwTranscriptSegmentViewModelTimestamp">0:08</div>
        <div class="ytwTranscriptSegmentViewModelTimestampA11yLabel">8 seconds</div>
        <span class="ytAttributedStringHost" role="text">And go to a demo.</span>
      </transcript-segment-view-model>
      <transcript-segment-view-model>
        <div aria-hidden="true" class="ytwTranscriptSegmentViewModelTimestamp">0:11</div>
        <div class="ytwTranscriptSegmentViewModelTimestampA11yLabel">11 seconds</div>
        <span class="ytAttributedStringHost" role="text">I'm Albert and before joining Cursor I spent time doing kernel development work.</span>
      </transcript-segment-view-model>
    `;

    expect(findTranscriptSegments(document)).toEqual([
      { start: "0:08", text: "And go to a demo." },
      {
        start: "0:11",
        text: "I'm Albert and before joining Cursor I spent time doing kernel development work."
      }
    ]);
    await expect(ensureTranscriptVisible(document, { timeoutMs: 10, pollMs: 5 })).resolves.toEqual({
      ok: true,
      status: "available"
    });
    expect(getTranscriptSupportStatus(document)).toBe("Transcript available");
  });

  it("clicks Chinese More and 内容转文字 when transcript is hidden", async () => {
    document.body.innerHTML = chineseTranscriptButtonHtml;
    const moreButton = document.querySelector<HTMLButtonElement>("[data-testid='more-button']")!;
    const moreClick = vi.spyOn(moreButton, "click").mockImplementation(() => {
      window.setTimeout(() => {
        document.body.insertAdjacentHTML(
          "beforeend",
          `<button data-testid="transcript-button">内容转文字</button>`
        );
      }, 0);
    });

    const promise = ensureTranscriptVisible(document, { timeoutMs: 100, pollMs: 10 });
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    const transcriptButton = document.querySelector<HTMLButtonElement>("[data-testid='transcript-button']")!;
    const transcriptClick = vi.spyOn(transcriptButton, "click").mockImplementation(() => {
      document.body.insertAdjacentHTML(
        "beforeend",
        `<ytd-transcript-segment-renderer><div class="segment-timestamp">0:03</div><yt-formatted-string class="segment-text">自动打开文稿。</yt-formatted-string></ytd-transcript-segment-renderer>`
      );
    });
    await expect(promise).resolves.toEqual({ ok: true, status: "opened" });
    expect(moreClick).toHaveBeenCalled();
    expect(transcriptClick).toHaveBeenCalled();
  });

  it("clicks English More and Show transcript when transcript is hidden", async () => {
    document.body.innerHTML = englishTranscriptButtonHtml;
    const moreButton = document.querySelector<HTMLButtonElement>("[data-testid='more-button']")!;
    const moreClick = vi.spyOn(moreButton, "click").mockImplementation(() => {
      window.setTimeout(() => {
        document.body.insertAdjacentHTML(
          "beforeend",
          `<button data-testid="transcript-button">
            <span>Show transcript</span>
            <span class="visually-hidden"> keyboard shortcut t </span>
          </button>`
        );
      }, 0);
    });

    const promise = ensureTranscriptVisible(document, { timeoutMs: 100, pollMs: 10 });
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    const transcriptButton = document.querySelector<HTMLButtonElement>("[data-testid='transcript-button']")!;
    const transcriptClick = vi.spyOn(transcriptButton, "click").mockImplementation(() => {
      document.body.insertAdjacentHTML(
        "beforeend",
        `<ytd-transcript-segment-renderer><div class="segment-timestamp">0:12</div><yt-formatted-string class="segment-text">Transcript opened.</yt-formatted-string></ytd-transcript-segment-renderer>`
      );
    });
    await expect(promise).resolves.toEqual({ ok: true, status: "opened" });
    expect(moreClick).toHaveBeenCalled();
    expect(transcriptClick).toHaveBeenCalled();
  });

  it("clicks the native button inside YouTube button wrappers", async () => {
    document.body.innerHTML = `
      <button data-testid="unrelated-more">More actions</button>
      <yt-button-shape data-testid="transcript-wrapper">
        <button data-testid="transcript-button" aria-label="Show transcript">Show transcript</button>
      </yt-button-shape>
    `;
    const unrelatedMore = document.querySelector<HTMLButtonElement>("[data-testid='unrelated-more']")!;
    const transcriptButton = document.querySelector<HTMLButtonElement>("[data-testid='transcript-button']")!;
    const moreClick = vi.spyOn(unrelatedMore, "click");
    const transcriptClick = vi.spyOn(transcriptButton, "click").mockImplementation(() => {
      document.body.insertAdjacentHTML(
        "beforeend",
        `<ytd-transcript-segment-renderer><div class="segment-timestamp">0:18</div><yt-formatted-string class="segment-text">Nested transcript button opened.</yt-formatted-string></ytd-transcript-segment-renderer>`
      );
    });

    await expect(ensureTranscriptVisible(document, { timeoutMs: 100, pollMs: 10 })).resolves.toEqual({
      ok: true,
      status: "opened"
    });
    expect(moreClick).not.toHaveBeenCalled();
    expect(transcriptClick).toHaveBeenCalled();
  });

  it("reports unsupported when no transcript controls exist", async () => {
    document.body.innerHTML = noTranscriptHtml;

    await expect(ensureTranscriptVisible(document, { timeoutMs: 20, pollMs: 5 })).resolves.toEqual({
      ok: false,
      status: "unavailable",
      reason: "Current video does not expose a transcript for text insight."
    });
    expect(getTranscriptSupportStatus(document)).toBe("Transcript not available for this video");
  });
});
