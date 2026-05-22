# YouTube Inline Insight Panel Design

Date: 2026-05-22

## Goal

Make Video Insight feel native to YouTube by embedding the insight panel directly into the YouTube watch page. The user should be able to open any supported YouTube video, see the Video Insight panel on the page, and click `Generate Insight` to analyze the current video without opening the browser extension side panel.

The current browser extension side panel remains available as a fallback.

## Problem

The current side panel is isolated from YouTube page navigation. When the user switches to another video, the side panel can still show the previous video's analysis. This is confusing because the result is not visibly tied to the current video page.

The current workflow also depends on the user manually opening YouTube's transcript UI before generating insight. Some videos do not expose a transcript at all, and the extension should communicate that clearly.

## Product Behavior

On YouTube watch pages, the extension injects a `Video Insight` panel into the page, preferably near the right-side recommendation column. If the expected YouTube container is unavailable, the panel can fall back to a fixed right-side floating panel.

The embedded panel is the primary experience:

- It appears automatically on YouTube watch pages.
- It hides or unmounts on non-watch YouTube pages.
- It resets when the current `videoId` changes.
- It keeps the user's output language preference across videos.
- It does not reuse the previous video's result after navigation.

The existing browser side panel remains available as a fallback and should also reset when the active tab video changes.

## Architecture

The implementation should reuse the existing generation and rendering logic instead of duplicating it.

Recommended structure:

- `InsightPanel`: shared React component for settings, generate action, loading state, errors, and result rendering.
- `SidePanelApp`: wraps `InsightPanel` for the browser extension side panel.
- `InjectedYouTubeApp`: wraps `InsightPanel` for the in-page YouTube panel.
- `youtubePageObserver`: watches YouTube SPA route changes and DOM changes, mounts the injected app, and moves/remounts it when needed.
- `videoIdentity`: extracts the current `videoId` from the URL and provides stable comparison.
- `transcriptAutomation`: detects transcript availability and attempts to open YouTube's transcript UI.

The in-page panel should call shared provider and storage modules:

- `providerStorage`
- `openAiCompatible`
- `youtubeTranscript`
- shared prompt and parser modules

## Page Integration

The content script should mount a React root into a stable container owned by the extension.

Preferred placement:

1. Near the YouTube right-side recommendation column on watch pages.
2. If that cannot be found, use a fixed right-side panel that avoids covering the video player controls.

The extension-owned DOM should use a stable root id, such as:

```text
video-insight-inline-root
```

The UI should use extension-specific class names or a scoped style root to avoid colliding with YouTube CSS.

## Video State Isolation

State is keyed by `videoId`.

When the current video id changes:

- Clear the previous insight result.
- Clear the previous error.
- Clear transcript support status.
- Abort or ignore any in-flight result for the previous video.
- Keep output language and provider settings.
- Show the current video in a ready-to-generate state.

If a generation request finishes after the user has navigated to another video, the stale result must be ignored.

## Transcript Detection and Auto-Open

The extension should display a transcript support tip in the embedded panel.

Possible states:

- `Checking transcript...`
- `Transcript available`
- `Transcript panel opened automatically`
- `Transcript not available for this video`
- `Open transcript manually if YouTube shows the option`

When the user clicks `Generate Insight`, the extension should attempt transcript access in this order:

1. Check whether transcript segments already exist in the page.
2. If not, expand the video description area:
   - Chinese UI: click `更多`
   - English UI: click `More`
3. Look for YouTube's transcript section:
   - Chinese UI: section text `转写文稿`, button `内容转文字`
   - English UI: section text `Transcript`, button `Show transcript`
4. Click the transcript button when found.
5. Wait briefly for transcript segments to appear.
6. If transcript segments appear, continue insight generation.
7. If no transcript button exists or no segments appear after waiting, show a clear unsupported state.

The extension only interacts with YouTube's explicit transcript UI. It must not download audio, perform speech-to-text transcription, bypass restrictions, or infer transcript text from the video.

## Generate Flow

For the embedded panel:

1. Load provider settings.
2. Detect the current `videoId`.
3. Show transcript support status.
4. On `Generate Insight`:
   - Ensure provider exists.
   - Ensure current URL is a YouTube watch page.
   - Ensure transcript is visible or auto-open transcript if possible.
   - Extract transcript from the current page.
   - Call the selected provider using the selected output language.
   - Render structured or fallback result.
5. If `videoId` changes at any point, do not render stale results.

## Browser Side Panel Fallback

The existing side panel remains available through the extension action.

It should be updated to avoid stale results:

- Track the active tab's `videoId`.
- Reset result and error when the active tab video id changes.
- Use the same transcript auto-open behavior through the content script when possible.

The side panel does not need to become the primary experience, but it should not show obviously stale results.

## Error Handling

The embedded panel should show clear, local errors:

- No provider configured: show `Open settings`.
- Not a YouTube watch page: hide or show a compact unsupported state.
- Transcript unavailable: show that the current video does not expose a transcript and is not supported for text insight.
- Transcript UI exists but did not load: ask the user to try opening transcript manually.
- Provider failure: show the existing sanitized provider error.
- Generation superseded by navigation: silently ignore stale response.

## Testing Strategy

Unit tests:

- `videoIdentity` extracts and compares video ids.
- `youtubePageObserver` detects route/video changes.
- `transcriptAutomation`:
  - finds existing transcript segments.
  - clicks Chinese `更多` and `内容转文字`.
  - clicks English `More` and `Show transcript`.
  - returns unsupported when no transcript section/button exists.
- Stale generation results are ignored when video id changes.

Component tests:

- Embedded panel renders when on a watch page.
- Embedded panel clears result when video id changes.
- `Generate Insight` auto-opens transcript before extraction.
- Unsupported transcript state is shown when no transcript is available.
- Existing side panel fallback resets when active video changes.

Build verification:

- `npm test`
- `npm run build`

Manual validation:

- Load unpacked extension from `dist/`.
- Open a YouTube video with transcript already visible.
- Open a YouTube video where transcript requires expanding `More` / `更多`.
- Open a video without transcript support.
- Navigate between videos without full page reload and confirm stale results do not persist.

## Non-Goals

- No audio download.
- No speech-to-text transcription.
- No cloud backend.
- No public Chrome Web Store release work in this change.
- No attempt to support every possible YouTube layout variant beyond robust fallbacks.

