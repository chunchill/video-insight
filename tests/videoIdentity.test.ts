import { describe, expect, it } from "vitest";
import { getYouTubeVideoId, isSameVideo } from "../src/shared/videoIdentity";

describe("videoIdentity", () => {
  it("extracts a video id from a YouTube watch URL", () => {
    expect(getYouTubeVideoId("https://www.youtube.com/watch?v=abc123")).toBe("abc123");
    expect(getYouTubeVideoId("https://youtube.com/watch?v=xyz789&t=42s")).toBe("xyz789");
  });

  it("rejects non-watch and spoofed URLs", () => {
    expect(getYouTubeVideoId("https://www.youtube.com/")).toBeUndefined();
    expect(getYouTubeVideoId("https://www.youtube.com/shorts/abc123")).toBeUndefined();
    expect(getYouTubeVideoId("https://youtube.com.evil.test/watch?v=abc123")).toBeUndefined();
    expect(getYouTubeVideoId("http://www.youtube.com/watch?v=abc123")).toBeUndefined();
  });

  it("rejects missing and empty video ids", () => {
    expect(getYouTubeVideoId("https://www.youtube.com/watch")).toBeUndefined();
    expect(getYouTubeVideoId("https://www.youtube.com/watch?v=")).toBeUndefined();
  });

  it("compares current and next video ids", () => {
    expect(isSameVideo("abc123", "https://www.youtube.com/watch?v=abc123")).toBe(true);
    expect(isSameVideo("abc123", "https://www.youtube.com/watch?v=def456")).toBe(false);
    expect(isSameVideo(undefined, "https://www.youtube.com/watch?v=def456")).toBe(false);
  });
});
