# YouTube Video Insight Extension Design

Date: 2026-05-21

## Goal

Build a personal-use browser extension that helps the user quickly understand a YouTube video. When the user opens a YouTube video page, the extension reads the available transcript, sends it to a configured AI model provider, and renders the video's key content and viewpoints as structured insight cards.

The first version is optimized for fast personal use, not SaaS distribution.

## Product Shape

The product is a Manifest V3 browser extension.

The main experience is a side panel shown beside a YouTube video page. The user opens the panel, clicks "Generate Insight", and sees a compact card stream with expandable details.

The extension includes an options page for configuring one or more AI providers. Providers are transparent to the rest of the app: the insight UI asks for analysis, and the provider layer decides how to call the selected model.

## MVP Scope

Included in the first version:

- Detect whether the current tab is a YouTube video page.
- Read the current video URL and available metadata such as title, channel, and duration when accessible.
- Extract YouTube's available captions or transcript text.
- Show a clear unsupported state when no transcript is available.
- Let the user configure multiple OpenAI-compatible providers.
- Store provider settings in browser extension local storage.
- Let the user switch insight output between Simplified Chinese and English.
- Generate insight using the selected provider and model.
- Render structured insight as a card stream with expandable details.
- Show readable errors for missing configuration, transcript extraction failure, API request failure, malformed model output, and oversized transcripts.

Excluded from the first version:

- Audio download or speech-to-text transcription.
- Cloud backend, account system, billing, sharing, or multi-device sync.
- History, persistent video library, or collaborative features.
- Full support for every YouTube layout or language variant.
- Browser store packaging and public release hardening.

## Architecture

The extension has four main parts.

### Content Script

The content script runs on YouTube video pages. It is responsible for:

- Detecting the current video page state.
- Extracting video metadata available in the page.
- Finding and reading available captions or transcript data.
- Reporting extraction status and errors to the extension UI.

The content script does not call AI providers directly.

### Side Panel

The side panel is the primary user interface. It is responsible for:

- Showing whether the current page is supported.
- Showing transcript detection status.
- Letting the user choose the output language for the current insight request.
- Starting insight generation.
- Rendering loading, success, and failure states.
- Rendering the insight cards and expandable detail sections.
- Offering actions such as "Regenerate" and "Retry transcript detection".

### Options Page

The options page manages AI provider configuration. Each provider config includes:

- `id`
- `name`
- `baseUrl`
- `apiKey`
- `model`
- `enabled`

The options page may also store a default output language preference, but the side panel must allow overriding it for the current request.

The options page must clearly state that API keys are stored locally in the browser extension and that this first version is intended for personal use.

### Provider Adapter

The provider adapter hides vendor-specific details behind one interface:

```ts
generateInsight(input: InsightInput, config: ModelProviderConfig): Promise<InsightResult>
```

The first version targets OpenAI-compatible chat completion APIs. This covers providers such as OpenAI and OpenAI-compatible services like SiliconFlow, as long as the provider accepts a compatible `baseUrl`, API key, model name, and chat completion request shape.

The UI must not hard-code provider-specific logic.

## Data Flow

1. The user opens a YouTube video page.
2. The extension side panel checks the current tab.
3. The content script extracts video metadata and transcript text.
4. The side panel asks the provider adapter to generate insight with the selected provider config.
5. The provider adapter builds an OpenAI-compatible request and calls the provider.
6. The model returns structured JSON when possible.
7. The side panel parses and renders the insight cards.
8. If JSON parsing fails, the side panel shows the readable model text and marks the result as structurally degraded.

## Insight Output

The desired structured result includes:

- One-sentence summary.
- Three to five key takeaways.
- Core viewpoints.
- Supporting evidence and timestamps when available.
- Disagreements, caveats, or uncertainty.
- Who should watch the video.

The UI renders this as a card stream. The first view should be quick to scan; supporting details can be expanded.

## Language Switching

The first version supports two output languages:

- Simplified Chinese
- English

The side panel should expose a compact language switch, such as `中文 / English`, near the generate action or result header. The selected language is part of the generation request.

If the user changes language before generating insight, the new request uses that language. If the user changes language after insight has already been generated, the extension should treat this as a new generation request for the selected language instead of only translating visible UI labels. This keeps the summary, viewpoints, evidence, and caveats consistent with the selected language.

The transcript language and output language are independent. For example, an English YouTube transcript can produce Chinese insights, and a Chinese transcript can produce English insights.

## Prompting and Output Contract

The model prompt should ask for concise, evidence-grounded analysis based only on the provided transcript and metadata.
The prompt must also instruct the model to answer in the selected output language.

The first attempt should request JSON matching a stable schema. The parser should tolerate minor formatting issues when practical, but it must have a fallback path for non-JSON output.

If the transcript is too long for the selected model, the first version may truncate the transcript and show a visible warning. A later version can add chunked summarization and aggregation.

## Error Handling

The side panel should show clear user-facing states:

- Not a YouTube video page: "Please open a YouTube video page."
- No transcript detected: "No transcript was detected. The first version does not support audio transcription."
- No provider configured: guide the user to the options page.
- Language not selected: fall back to the stored default language or Simplified Chinese.
- Missing API key: show the selected provider name and the missing field.
- API failure: show provider name, HTTP status when available, and a readable message. Never show the full API key.
- Invalid model output: show the readable text output and a "structured parsing failed" notice.
- Transcript too long: show that the transcript was truncated for the selected model.
- YouTube extraction failure: show the extraction reason and offer "Retry transcript detection".

## Security and Privacy

This first version stores API keys in browser extension local storage. That is acceptable for personal local use, but it is not the ideal security model for a public product.

The options page must communicate:

- API keys are stored locally in the browser extension.
- Video transcripts are sent to the selected AI provider.
- The extension does not use a backend in the first version.
- The user can choose whether insights are generated in Simplified Chinese or English.

The design should keep AI calls behind the provider adapter so a future version can move keys and requests to a local or cloud backend without rewriting the side panel.

## Testing Strategy

Automated tests should cover:

- Provider configuration validation.
- OpenAI-compatible request construction.
- Insight JSON parsing and fallback behavior.
- Prompt construction using mock metadata and transcripts.
- Side panel states for unsupported page, missing provider, missing transcript, loading, success, and failure.

Manual validation should cover:

- Loading the extension unpacked in the browser.
- Opening a real YouTube video with captions.
- Generating insight with at least one configured provider.
- Confirming the side panel renders the card stream and expandable details.
- Opening a video without captions and confirming the unsupported message is clear.

## Future Extensions

Likely follow-up features:

- Chunked summarization for long transcripts.
- Markdown export.
- Local history.
- More provider presets.
- Local backend option for safer key storage.
- Audio transcription fallback for videos without captions.
- Browser store packaging.
