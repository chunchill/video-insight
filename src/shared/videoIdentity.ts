function isYouTubeHost(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();
  return hostname === "youtube.com" || hostname.endsWith(".youtube.com");
}

export function getYouTubeVideoId(value: string | URL): string | undefined {
  try {
    const url = typeof value === "string" ? new URL(value) : value;
    if (url.protocol !== "https:" || !isYouTubeHost(url) || url.pathname !== "/watch") {
      return undefined;
    }

    return url.searchParams.get("v") ?? undefined;
  } catch {
    return undefined;
  }
}

export function isSameVideo(currentVideoId: string | undefined, nextUrl: string | URL): boolean {
  const nextVideoId = getYouTubeVideoId(nextUrl);
  return Boolean(currentVideoId && nextVideoId && currentVideoId === nextVideoId);
}
