import { getYouTubeVideoId } from "../shared/videoIdentity";

export interface YouTubePageState {
  videoId?: string;
  isWatchPage: boolean;
}

export type YouTubePageListener = (state: YouTubePageState) => void;

export function createYouTubePageObserver(listener: YouTubePageListener) {
  let currentState: YouTubePageState | undefined;

  function check(urlValue = window.location.href): void {
    const videoId = getYouTubeVideoId(urlValue);
    const nextState: YouTubePageState = {
      videoId,
      isWatchPage: Boolean(videoId)
    };

    if (
      currentState &&
      currentState.videoId === nextState.videoId &&
      currentState.isWatchPage === nextState.isWatchPage
    ) {
      return;
    }

    currentState = nextState;
    listener(nextState);
  }

  function start(): () => void {
    const handleNavigation = () => check();
    const intervalId = window.setInterval(handleNavigation, 500);

    window.addEventListener("yt-navigate-finish", handleNavigation);
    window.addEventListener("popstate", handleNavigation);
    check();

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("yt-navigate-finish", handleNavigation);
      window.removeEventListener("popstate", handleNavigation);
    };
  }

  return { check, start };
}
