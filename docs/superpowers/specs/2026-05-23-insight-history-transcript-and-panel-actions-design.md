# Insight History, Transcript, and Panel Actions Design

Date: 2026-05-23

## Goal

Improve Video Insight from a one-shot generator into a reusable personal analysis tool:

- Provider/model/API key settings can be exported and imported after extension upgrades.
- Generated insight is saved per YouTube video and restored after refresh/navigation.
- Insight and transcript can be viewed and exported from the embedded panel.
- Transcript loading is more reliable before generation.
- The embedded panel layout stays visually clean.

## Layout

The YouTube embedded panel uses the approved layout option A:

- Header right side has only two icon buttons:
  - Collapse/expand panel.
  - Other settings dropdown.
- The settings dropdown contains provider configuration actions:
  - Export model configuration.
  - Import model configuration.
- The panel body keeps generation controls, transcript status, transcript viewer, and insight result.
- The lower-right floating action cluster contains text/result actions:
  - Export insight.
  - Smaller text.
  - Larger text.
- Buttons use icon-like labels with `title` and `aria-label` tooltips.

## Provider Settings Import/Export

Provider settings export writes a JSON file containing:

- schema version
- providers
- selected provider id
- default output language

API keys are included because the feature is for personal local backup and restore. Import validates the shape before replacing local provider settings. Invalid JSON or invalid settings show a visible error and do not overwrite existing settings.

## Insight Persistence and Export

Generated insight records are stored in `chrome.storage.local` by video id. Each record includes:

- video id
- video metadata
- transcript
- output language
- generated insight result
- timestamps for creation/update

When the panel opens or the video changes, it loads any saved insight for that video. Generating again replaces that video record.

Insight export downloads a Markdown file with metadata, transcript summary source, structured insight sections, and fallback model output when applicable.

## Transcript Viewer

The panel adds a transcript viewer that can be opened from the body. It shows the currently loaded transcript with timestamps. If no transcript is loaded yet, the viewer action first attempts to load the transcript and then renders it.

## Transcript Loading Workflow

Before generating insight, the panel explicitly loads transcript first and only calls the model after transcript extraction succeeds.

The transcript automation should become more robust by:

- trying existing rendered transcript segments first
- opening the YouTube description expansion controls with broader selectors/text variants
- clicking transcript buttons by visible text, aria-label, and descendant text
- waiting for either transcript segments or known failure states
- re-checking after each click instead of assuming one fixed YouTube DOM shape

If YouTube does not expose transcript data for the video, the panel should show a clear unsupported message. The extension still does not download audio or perform speech-to-text.

## Testing

Tests should cover:

- provider settings export/import serialization and validation
- inline settings dropdown actions
- saved insight restore by video id
- insight export Markdown content
- transcript viewer loading and rendering
- generation ordering: transcript is loaded before provider generation
- transcript automation variants for YouTube controls

## Release

Ship as a new minor version because this adds import/export, history, transcript viewer, and persistence features.
