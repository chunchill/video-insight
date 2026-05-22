# Inline Panel Reading Controls Design

Date: 2026-05-22

## Goal

Improve the embedded YouTube panel reading experience after long insight output is generated. The video should remain in view while the user reads insight content.

## Behavior

- The feature applies only to the embedded YouTube page panel.
- The browser extension side panel fallback keeps its current layout.
- The embedded panel defaults to expanded on every page load and video navigation.
- The embedded panel has a collapse/expand control in its header.
- When collapsed, the panel keeps a compact header visible and hides generation/result content.
- When expanded, long content scrolls inside the panel instead of requiring the YouTube page to scroll.
- The embedded panel has immediate font-size controls with four presets: `small`, `default`, `large`, and `xl`.
- The default preset is `large`.
- Font-size preference is saved in extension local storage and reused later.
- Collapse state is not saved.

## Implementation Notes

- `InsightPanel` should branch on `context.source === "inline"` for the inline-only controls.
- Use root-scoped inline CSS under `#video-insight-inline-root` so YouTube page styles are not affected.
- Add focused component tests for collapse behavior and font-size preference.
- Bump and publish the release as `v0.3.0`.
