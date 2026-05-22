import { afterEach, describe, expect, it, vi } from "vitest";
import { createYouTubePageObserver } from "../src/content/youtubePageObserver";

describe("youtubePageObserver", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("notifies when video id changes", () => {
    const listener = vi.fn();
    const observer = createYouTubePageObserver(listener);

    observer.check("https://www.youtube.com/watch?v=abc123");
    observer.check("https://www.youtube.com/watch?v=abc123");
    observer.check("https://www.youtube.com/watch?v=def456");

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenNthCalledWith(1, { videoId: "abc123", isWatchPage: true });
    expect(listener).toHaveBeenNthCalledWith(2, { videoId: "def456", isWatchPage: true });
  });

  it("notifies when leaving a watch page", () => {
    const listener = vi.fn();
    const observer = createYouTubePageObserver(listener);

    observer.check("https://www.youtube.com/watch?v=abc123");
    observer.check("https://www.youtube.com/");

    expect(listener).toHaveBeenLastCalledWith({ videoId: undefined, isWatchPage: false });
  });
});
