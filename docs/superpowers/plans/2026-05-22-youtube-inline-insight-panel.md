# YouTube Inline Insight Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Embed Video Insight directly into YouTube watch pages, reset insight state per video, and automatically open YouTube transcript UI when possible.

**Architecture:** Refactor the current side panel workflow into a shared `InsightPanel` React component. The existing browser side panel and a new content-script-mounted `InjectedYouTubeApp` both use this shared component, while new content utilities handle YouTube video identity, route observation, in-page placement, and transcript auto-open.

**Tech Stack:** TypeScript, React, Vite, Chrome Extension Manifest V3 content scripts, Vitest, React Testing Library, jsdom.

---

## File Structure

- `src/shared/videoIdentity.ts`: Extract and compare YouTube `videoId` values.
- `src/content/transcriptAutomation.ts`: Detect visible transcript segments, expand YouTube description, click `内容转文字` / `Show transcript`, and wait for transcript segments.
- `src/content/youtubePageObserver.ts`: Observe YouTube SPA URL/DOM changes and notify the injected app when the current watch page changes.
- `src/content/inlineMount.tsx`: Create the extension-owned DOM root and mount `InjectedYouTubeApp` into YouTube pages.
- `src/content/InjectedYouTubeApp.tsx`: In-page React wrapper around shared `InsightPanel`.
- `src/content/contentScript.ts`: Initialize inline mount and keep existing message responder for side panel fallback.
- `src/insight/InsightPanel.tsx`: Shared generation UI and workflow.
- `src/insight/insightPanelTypes.ts`: Shared transcript provider and context types for `InsightPanel`.
- `src/sidepanel/SidePanelApp.tsx`: Thin wrapper around `InsightPanel` using active tab messaging.
- `src/styles.css`: Add inline panel scoped styles and keep existing app styles.
- `src/test/youtubeFixtures.ts`: Add fixtures for Chinese and English transcript buttons.
- `tests/videoIdentity.test.ts`: Unit tests for video id extraction.
- `tests/transcriptAutomation.test.ts`: Unit tests for transcript auto-open behavior.
- `tests/youtubePageObserver.test.ts`: Tests for YouTube SPA route/video change detection.
- `tests/InsightPanel.test.tsx`: Shared panel workflow tests.
- `tests/inlineMount.test.tsx`: In-page mount and video reset tests.
- `tests/SidePanelApp.test.tsx`: Update side panel fallback tests.
- `README.md`: Update usage notes for inline panel and transcript support status.

---

### Task 1: Video Identity Utilities

**Files:**
- Create: `src/shared/videoIdentity.ts`
- Create: `tests/videoIdentity.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/videoIdentity.test.ts`:

```ts
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

  it("compares current and next video ids", () => {
    expect(isSameVideo("abc123", "https://www.youtube.com/watch?v=abc123")).toBe(true);
    expect(isSameVideo("abc123", "https://www.youtube.com/watch?v=def456")).toBe(false);
    expect(isSameVideo(undefined, "https://www.youtube.com/watch?v=def456")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/videoIdentity.test.ts`

Expected: FAIL because `src/shared/videoIdentity.ts` does not exist.

- [ ] **Step 3: Implement video identity utilities**

Create `src/shared/videoIdentity.ts`:

```ts
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
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/videoIdentity.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/videoIdentity.ts tests/videoIdentity.test.ts
git commit -m "feat: add YouTube video identity utilities"
```

---

### Task 2: Transcript Automation

**Files:**
- Create: `src/content/transcriptAutomation.ts`
- Modify: `src/content/youtubeTranscript.ts`
- Modify: `src/test/youtubeFixtures.ts`
- Create: `tests/transcriptAutomation.test.ts`
- Modify: `tests/youtubeTranscript.test.ts`

- [ ] **Step 1: Add transcript automation tests**

Create `tests/transcriptAutomation.test.ts`:

```ts
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

  it("clicks Chinese More and 内容转文字 when transcript is hidden", async () => {
    document.body.innerHTML = chineseTranscriptButtonHtml;
    const moreButton = document.querySelector<HTMLButtonElement>("[data-testid='more-button']")!;
    const transcriptButton = document.querySelector<HTMLButtonElement>("[data-testid='transcript-button']")!;
    const moreClick = vi.spyOn(moreButton, "click");
    const transcriptClick = vi.spyOn(transcriptButton, "click");

    const promise = ensureTranscriptVisible(document, { timeoutMs: 100, pollMs: 10 });
    await Promise.resolve();

    document.body.insertAdjacentHTML(
      "beforeend",
      `<ytd-transcript-segment-renderer><div class="segment-timestamp">0:03</div><yt-formatted-string class="segment-text">自动打开文稿。</yt-formatted-string></ytd-transcript-segment-renderer>`
    );
    await expect(promise).resolves.toEqual({ ok: true, status: "opened" });
    expect(moreClick).toHaveBeenCalled();
    expect(transcriptClick).toHaveBeenCalled();
  });

  it("clicks English More and Show transcript when transcript is hidden", async () => {
    document.body.innerHTML = englishTranscriptButtonHtml;
    const transcriptButton = document.querySelector<HTMLButtonElement>("[data-testid='transcript-button']")!;
    const transcriptClick = vi.spyOn(transcriptButton, "click");

    const promise = ensureTranscriptVisible(document, { timeoutMs: 100, pollMs: 10 });
    await Promise.resolve();
    document.body.insertAdjacentHTML(
      "beforeend",
      `<ytd-transcript-segment-renderer><div class="segment-timestamp">0:12</div><yt-formatted-string class="segment-text">Transcript opened.</yt-formatted-string></ytd-transcript-segment-renderer>`
    );
    await expect(promise).resolves.toEqual({ ok: true, status: "opened" });
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
```

- [ ] **Step 2: Add fixtures**

Append to `src/test/youtubeFixtures.ts`:

```ts
export const visibleTranscriptHtml = `
  <ytd-transcript-segment-renderer>
    <div class="segment-timestamp">0:03</div>
    <yt-formatted-string class="segment-text">AI systems change workflows.</yt-formatted-string>
  </ytd-transcript-segment-renderer>
  <ytd-transcript-segment-renderer>
    <div class="segment-timestamp">0:12</div>
    <yt-formatted-string class="segment-text">Human review remains important.</yt-formatted-string>
  </ytd-transcript-segment-renderer>
`;

export const chineseTranscriptButtonHtml = `
  <button data-testid="more-button">更多</button>
  <section>
    <h3>转写文稿</h3>
    <button data-testid="transcript-button">内容转文字</button>
  </section>
`;

export const englishTranscriptButtonHtml = `
  <button data-testid="more-button">More</button>
  <section>
    <h3>Transcript</h3>
    <button data-testid="transcript-button">Show transcript</button>
  </section>
`;

export const noTranscriptHtml = `
  <button data-testid="more-button">More</button>
  <section><h3>Description</h3><p>No transcript here.</p></section>
`;
```

- [ ] **Step 3: Run tests to verify failure**

Run: `npm test -- tests/transcriptAutomation.test.ts`

Expected: FAIL because `src/content/transcriptAutomation.ts` does not exist.

- [ ] **Step 4: Implement transcript automation**

Create `src/content/transcriptAutomation.ts`:

```ts
import type { TranscriptSegment } from "../shared/types";

export type TranscriptEnsureResult =
  | { ok: true; status: "available" | "opened" }
  | { ok: false; status: "unavailable" | "manual"; reason: string };

export interface TranscriptWaitOptions {
  timeoutMs: number;
  pollMs: number;
}

const defaultWaitOptions: TranscriptWaitOptions = {
  timeoutMs: 2500,
  pollMs: 100
};

export function findTranscriptSegments(doc: Document): TranscriptSegment[] {
  return Array.from(doc.querySelectorAll("ytd-transcript-segment-renderer"))
    .map<TranscriptSegment | undefined>((segment) => {
      const start = segment.querySelector(".segment-timestamp")?.textContent?.trim();
      const text = segment.querySelector(".segment-text")?.textContent?.trim();
      return text ? (start ? { start, text } : { text }) : undefined;
    })
    .filter((segment): segment is TranscriptSegment => Boolean(segment));
}

function textMatches(value: string | undefined, labels: string[]): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return labels.some((label) => normalized === label.toLowerCase() || normalized.includes(label.toLowerCase()));
}

function findButtonByText(doc: Document, labels: string[]): HTMLButtonElement | undefined {
  return Array.from(doc.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
    textMatches(button.textContent ?? undefined, labels)
  );
}

function findTranscriptButton(doc: Document): HTMLButtonElement | undefined {
  const buttons = Array.from(doc.querySelectorAll<HTMLButtonElement>("button"));
  return buttons.find((button) => textMatches(button.textContent ?? undefined, ["内容转文字", "Show transcript"]));
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function waitForSegments(doc: Document, options: TranscriptWaitOptions): Promise<boolean> {
  const deadline = Date.now() + options.timeoutMs;
  while (Date.now() <= deadline) {
    if (findTranscriptSegments(doc).length > 0) {
      return true;
    }
    await wait(options.pollMs);
  }
  return false;
}

export function getTranscriptSupportStatus(doc: Document): string {
  if (findTranscriptSegments(doc).length > 0) {
    return "Transcript available";
  }
  if (findTranscriptButton(doc)) {
    return "Open transcript manually if YouTube shows the option";
  }
  return "Transcript not available for this video";
}

export async function ensureTranscriptVisible(
  doc: Document,
  options: Partial<TranscriptWaitOptions> = {}
): Promise<TranscriptEnsureResult> {
  const waitOptions = { ...defaultWaitOptions, ...options };

  if (findTranscriptSegments(doc).length > 0) {
    return { ok: true, status: "available" };
  }

  findButtonByText(doc, ["更多", "More"])?.click();
  const transcriptButton = findTranscriptButton(doc);
  if (!transcriptButton) {
    return {
      ok: false,
      status: "unavailable",
      reason: "Current video does not expose a transcript for text insight."
    };
  }

  transcriptButton.click();
  if (await waitForSegments(doc, waitOptions)) {
    return { ok: true, status: "opened" };
  }

  return {
    ok: false,
    status: "manual",
    reason: "Transcript controls were found, but transcript text did not load. Try opening transcript manually."
  };
}
```

- [ ] **Step 5: Reuse transcript segment finder in `youtubeTranscript`**

Modify `src/content/youtubeTranscript.ts` to import and use `findTranscriptSegments`:

```ts
import { findTranscriptSegments } from "./transcriptAutomation";
```

Remove the local `extractVisibleTranscriptSegments` helper and use:

```ts
const segments = findTranscriptSegments(doc);
```

- [ ] **Step 6: Run tests**

Run:

```bash
npm test -- tests/transcriptAutomation.test.ts tests/youtubeTranscript.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/content/transcriptAutomation.ts src/content/youtubeTranscript.ts src/test/youtubeFixtures.ts tests/transcriptAutomation.test.ts tests/youtubeTranscript.test.ts
git commit -m "feat: automate YouTube transcript opening"
```

---

### Task 3: Shared Insight Panel

**Files:**
- Create: `src/insight/insightPanelTypes.ts`
- Create: `src/insight/InsightPanel.tsx`
- Modify: `src/sidepanel/SidePanelApp.tsx`
- Create: `tests/InsightPanel.test.tsx`
- Modify: `tests/SidePanelApp.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write shared panel tests**

Create `tests/InsightPanel.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InsightPanel } from "../src/insight/InsightPanel";
import type { InsightPanelContext } from "../src/insight/insightPanelTypes";
import { generateInsightWithProvider } from "../src/providers/openAiCompatible";
import { saveProviderSettings } from "../src/storage/providerStorage";
import { installChromeMock } from "../src/test/chromeMock";

vi.mock("../src/providers/openAiCompatible", () => ({
  generateInsightWithProvider: vi.fn()
}));

function context(overrides: Partial<InsightPanelContext> = {}): InsightPanelContext {
  return {
    source: "inline",
    videoId: "abc123",
    getTranscript: vi.fn(async () => ({
      videoMeta: { url: "https://www.youtube.com/watch?v=abc123", title: "AI Talk" },
      segments: [{ start: "0:03", text: "AI changes workflows." }],
      plainText: "[0:03] AI changes workflows."
    })),
    getTranscriptStatus: vi.fn(() => "Transcript available"),
    ...overrides
  };
}

beforeEach(async () => {
  installChromeMock();
  await chrome.storage.local.clear();
  vi.mocked(generateInsightWithProvider).mockReset();
});

describe("InsightPanel", () => {
  it("resets result and error when video id changes", async () => {
    await saveProviderSettings({
      providers: [{ id: "provider-1", name: "OpenAI", baseUrl: "https://api.openai.com/v1", apiKey: "sk-test", model: "gpt-4.1-mini", enabled: true }],
      selectedProviderId: "provider-1",
      defaultLanguage: "zh-CN"
    });
    vi.mocked(generateInsightWithProvider).mockResolvedValue({
      kind: "structured",
      rawText: "{}",
      data: { summary: "Old insight", takeaways: [], viewpoints: [], caveats: [], audience: [] }
    });

    const { rerender } = render(<InsightPanel context={context({ videoId: "abc123" })} />);
    await userEvent.click(await screen.findByRole("button", { name: "Generate insight" }));
    expect(await screen.findByText("Old insight")).toBeInTheDocument();

    rerender(<InsightPanel context={context({ videoId: "def456" })} />);
    expect(screen.queryByText("Old insight")).not.toBeInTheDocument();
  });

  it("renders transcript support status and generated insight", async () => {
    await saveProviderSettings({
      providers: [{ id: "provider-1", name: "OpenAI", baseUrl: "https://api.openai.com/v1", apiKey: "sk-test", model: "gpt-4.1-mini", enabled: true }],
      selectedProviderId: "provider-1",
      defaultLanguage: "zh-CN"
    });
    vi.mocked(generateInsightWithProvider).mockResolvedValue({
      kind: "structured",
      rawText: "{}",
      data: {
        summary: "AI changes workflows.",
        takeaways: ["Context matters"],
        viewpoints: [{ title: "Workflow shift", detail: "Workflows matter.", evidence: [{ timestamp: "0:03", text: "AI changes workflows." }] }],
        caveats: [],
        audience: []
      }
    });

    render(<InsightPanel context={context()} />);
    expect(await screen.findByText("Transcript available")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Generate insight" }));

    expect(await screen.findByText("AI changes workflows.")).toBeInTheDocument();
    expect(screen.getByText("Context matters")).toBeInTheDocument();
  });

  it("ignores stale generation results after video changes", async () => {
    await saveProviderSettings({
      providers: [{ id: "provider-1", name: "OpenAI", baseUrl: "https://api.openai.com/v1", apiKey: "sk-test", model: "gpt-4.1-mini", enabled: true }],
      selectedProviderId: "provider-1",
      defaultLanguage: "zh-CN"
    });
    let resolveInsight: (value: Awaited<ReturnType<typeof generateInsightWithProvider>>) => void = () => {};
    vi.mocked(generateInsightWithProvider).mockReturnValue(
      new Promise((resolve) => {
        resolveInsight = resolve;
      })
    );

    const { rerender } = render(<InsightPanel context={context({ videoId: "abc123" })} />);
    await userEvent.click(await screen.findByRole("button", { name: "Generate insight" }));
    rerender(<InsightPanel context={context({ videoId: "def456" })} />);
    resolveInsight({
      kind: "structured",
      rawText: "{}",
      data: { summary: "Stale insight", takeaways: [], viewpoints: [], caveats: [], audience: [] }
    });

    await Promise.resolve();
    expect(screen.queryByText("Stale insight")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/InsightPanel.test.tsx`

Expected: FAIL because shared panel files do not exist.

- [ ] **Step 3: Implement shared panel types**

Create `src/insight/insightPanelTypes.ts`:

```ts
import type { TranscriptPayload } from "../shared/types";

export type InsightPanelSource = "sidepanel" | "inline";

export interface InsightPanelContext {
  source: InsightPanelSource;
  videoId?: string;
  getTranscript: () => Promise<TranscriptPayload>;
  getTranscriptStatus?: () => string;
}
```

- [ ] **Step 4: Move SidePanel UI into `InsightPanel`**

Create `src/insight/InsightPanel.tsx` by moving the current result rendering and generation workflow from `src/sidepanel/SidePanelApp.tsx`. The file must export:

```ts
export function StructuredResult({ result }: { result: Extract<ParsedInsightResult, { kind: "structured" }> })
export function FallbackResult({ result }: { result: Extract<ParsedInsightResult, { kind: "fallback" }> })
export function InsightPanel({ context }: { context: InsightPanelContext })
```

Use the current `StructuredResult` and `FallbackResult` bodies from `src/sidepanel/SidePanelApp.tsx` without behavior changes, except add `export` to both functions. The new `InsightPanel` body must contain the current settings, language selection, provider warning, generate button, error box, and result rendering from `SidePanelApp`, with these exact workflow changes:

- Load provider settings on mount.
- Keep output language from settings.
- Show transcript support status from `context.getTranscriptStatus?.()`.
- Clear `result` and `error` when `context.videoId` changes.
- Use a request token or ref so stale generation responses are ignored after `videoId` changes.
- Call `context.getTranscript()` instead of hard-coded `chrome.tabs.sendMessage`.
- Call `generateInsightWithProvider({ transcript, outputLanguage: language }, activeProvider)`.
- Keep result rendering compatible with existing tests.

Implement stale-result protection with this pattern inside `InsightPanel`:

```tsx
const requestIdRef = useRef(0);

useEffect(() => {
  requestIdRef.current += 1;
  setError(undefined);
  setResult(undefined);
}, [context.videoId]);

async function handleGenerateInsight() {
  if (!activeProvider) {
    setError("Configure a provider before generating insight.");
    return;
  }

  const requestId = requestIdRef.current + 1;
  requestIdRef.current = requestId;
  setIsGenerating(true);
  setError(undefined);
  setResult(undefined);

  try {
    const transcript = await context.getTranscript();
    const generatedInsight = await generateInsightWithProvider(
      { transcript, outputLanguage: language },
      activeProvider
    );
    if (isMountedRef.current && requestIdRef.current === requestId) {
      setResult(generatedInsight);
    }
  } catch (generateError: unknown) {
    if (isMountedRef.current && requestIdRef.current === requestId) {
      setError(getErrorMessage(generateError));
    }
  } finally {
    if (isMountedRef.current && requestIdRef.current === requestId) {
      setIsGenerating(false);
    }
  }
}
```

Render the transcript tip immediately above the language selector:

```tsx
const transcriptStatus = context.getTranscriptStatus?.();
{transcriptStatus ? <div className="transcript-tip">{transcriptStatus}</div> : null}
```

- [ ] **Step 5: Update `SidePanelApp` to wrap shared panel**

Replace `src/sidepanel/SidePanelApp.tsx` with a thin wrapper:

```tsx
import { useEffect, useState } from "react";
import { InsightPanel } from "../insight/InsightPanel";
import type { InsightPanelContext } from "../insight/insightPanelTypes";
import type { TranscriptPayload } from "../shared/types";
import { getYouTubeVideoId } from "../shared/videoIdentity";

type TranscriptResponse = { ok: true; transcript: TranscriptPayload } | { ok: false; reason: string };

function isTranscriptResponse(value: unknown): value is TranscriptResponse {
  if (!value || typeof value !== "object") {
    return false;
  }
  const response = value as Partial<TranscriptResponse>;
  return response.ok === true || response.ok === false;
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];
  if (activeTab?.id == null) {
    throw new Error("No active browser tab was found.");
  }
  return activeTab;
}

async function getActiveTranscript(): Promise<TranscriptPayload> {
  const activeTab = await getActiveTab();
  const response = (await chrome.tabs.sendMessage(activeTab.id!, {
    type: "VIDEO_INSIGHT_GET_TRANSCRIPT",
    autoOpenTranscript: true
  })) as unknown;
  if (!isTranscriptResponse(response)) {
    throw new Error("The YouTube page did not return a transcript response.");
  }
  if (!response.ok) {
    throw new Error(response.reason);
  }
  return response.transcript;
}

export function SidePanelApp() {
  const [videoId, setVideoId] = useState<string | undefined>();

  useEffect(() => {
    let disposed = false;
    async function loadVideoId() {
      const activeTab = await getActiveTab();
      if (!disposed) {
        setVideoId(activeTab.url ? getYouTubeVideoId(activeTab.url) : undefined);
      }
    }
    void loadVideoId();
    const interval = window.setInterval(() => void loadVideoId(), 1000);
    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, []);

  const context: InsightPanelContext = {
    source: "sidepanel",
    videoId,
    getTranscript: getActiveTranscript
  };

  return <InsightPanel context={context} />;
}
```

- [ ] **Step 6: Update styles**

Keep existing styles and add:

```css
.transcript-tip {
  border: 1px solid #d9e4f5;
  border-radius: 6px;
  background: #f7fbff;
  color: #315176;
  padding: 8px 10px;
  font-size: 13px;
  line-height: 1.4;
}
```

- [ ] **Step 7: Update side panel wrapper test expectations**

In `tests/SidePanelApp.test.tsx`, keep the existing user-facing assertions and update the `chrome.tabs.sendMessage` expectation in the successful generation test to include transcript auto-open:

```ts
expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(10, {
  type: "VIDEO_INSIGHT_GET_TRANSCRIPT",
  autoOpenTranscript: true
});
```

Add a wrapper reset test so the side panel fallback clears stale insight when the active tab URL changes:

```tsx
it("clears rendered insight when the active tab video changes", async () => {
  await saveProviderSettings({
    providers: [
      {
        id: "provider-1",
        name: "OpenAI",
        baseUrl: "https://api.openai.com/v1",
        apiKey: "sk-test",
        model: "gpt-4.1-mini",
        enabled: true
      }
    ],
    selectedProviderId: "provider-1",
    defaultLanguage: "zh-CN"
  });

  let activeUrl = "https://www.youtube.com/watch?v=abc123";
  chrome.tabs = {
    query: vi.fn(async () => [{ id: 10, url: activeUrl }]),
    sendMessage: vi.fn(async () => ({
      ok: true,
      transcript: {
        videoMeta: { url: activeUrl, title: "AI Talk" },
        segments: [{ start: "0:03", text: "AI systems change workflows." }],
        plainText: "[0:03] AI systems change workflows."
      }
    }))
  } as unknown as typeof chrome.tabs;

  vi.mocked(generateInsightWithProvider).mockResolvedValue({
    kind: "structured",
    rawText: "{}",
    data: { summary: "Old insight", takeaways: [], viewpoints: [], caveats: [], audience: [] }
  });

  render(<SidePanelApp />);
  await userEvent.click(await screen.findByRole("button", { name: "Generate insight" }));
  expect(await screen.findByText("Old insight")).toBeInTheDocument();

  activeUrl = "https://www.youtube.com/watch?v=def456";
  await new Promise((resolve) => window.setTimeout(resolve, 1100));

  expect(screen.queryByText("Old insight")).not.toBeInTheDocument();
});
```

- [ ] **Step 8: Run shared panel tests**

Run:

```bash
npm test -- tests/InsightPanel.test.tsx tests/SidePanelApp.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/insight src/sidepanel/SidePanelApp.tsx src/styles.css tests/InsightPanel.test.tsx tests/SidePanelApp.test.tsx
git commit -m "refactor: share insight panel workflow"
```

---

### Task 4: Content Script Inline Mount

**Files:**
- Create: `src/content/InjectedYouTubeApp.tsx`
- Create: `src/content/inlineMount.tsx`
- Create: `src/content/youtubePageObserver.ts`
- Modify: `src/content/contentScript.ts`
- Create: `tests/youtubePageObserver.test.ts`
- Create: `tests/inlineMount.test.tsx`
- Modify: `vite.config.ts`

- [ ] **Step 1: Write observer tests**

Create `tests/youtubePageObserver.test.ts`:

```ts
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
```

- [ ] **Step 2: Write inline mount tests**

Create `tests/inlineMount.test.tsx`:

```tsx
import { beforeEach, describe, expect, it } from "vitest";
import { mountInlinePanel, findInlineMountParent } from "../src/content/inlineMount";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("inlineMount", () => {
  it("creates one extension root near secondary column", () => {
    document.body.innerHTML = `<div id="secondary"></div>`;

    const root = mountInlinePanel(document, "abc123");
    const secondRoot = mountInlinePanel(document, "abc123");

    expect(root).toBe(secondRoot);
    expect(document.querySelectorAll("#video-insight-inline-root")).toHaveLength(1);
    expect(document.querySelector("#secondary #video-insight-inline-root")).toBeTruthy();
  });

  it("falls back to document body when secondary column is missing", () => {
    const parent = findInlineMountParent(document);
    expect(parent).toBe(document.body);
  });
});
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
npm test -- tests/youtubePageObserver.test.ts tests/inlineMount.test.tsx
```

Expected: FAIL because modules do not exist.

- [ ] **Step 4: Implement page observer**

Create `src/content/youtubePageObserver.ts`:

```ts
import { getYouTubeVideoId } from "../shared/videoIdentity";

export interface YouTubePageState {
  videoId?: string;
  isWatchPage: boolean;
}

export type YouTubePageListener = (state: YouTubePageState) => void;

export function createYouTubePageObserver(listener: YouTubePageListener) {
  let previousKey = "";

  function check(urlValue = window.location.href) {
    const videoId = getYouTubeVideoId(urlValue);
    const state: YouTubePageState = {
      videoId,
      isWatchPage: Boolean(videoId)
    };
    const key = `${state.isWatchPage}:${state.videoId ?? ""}`;
    if (key !== previousKey) {
      previousKey = key;
      listener(state);
    }
  }

  function start() {
    const interval = window.setInterval(() => check(), 500);
    window.addEventListener("yt-navigate-finish", () => check());
    window.addEventListener("popstate", () => check());
    check();
    return () => {
      window.clearInterval(interval);
    };
  }

  return { check, start };
}
```

- [ ] **Step 5: Implement inline mount and injected app**

Create `src/content/inlineMount.tsx`:

```tsx
import { createRoot, type Root } from "react-dom/client";
import { InjectedYouTubeApp } from "./InjectedYouTubeApp";

const INLINE_ROOT_ID = "video-insight-inline-root";
let reactRoot: Root | undefined;

export function findInlineMountParent(doc: Document): Element {
  return doc.querySelector("#secondary") ?? doc.querySelector("ytd-watch-flexy #secondary") ?? doc.body;
}

export function mountInlinePanel(doc: Document, videoId: string): HTMLElement {
  let rootElement = doc.getElementById(INLINE_ROOT_ID);
  if (!rootElement) {
    rootElement = doc.createElement("div");
    rootElement.id = INLINE_ROOT_ID;
    findInlineMountParent(doc).prepend(rootElement);
  }

  if (!reactRoot) {
    reactRoot = createRoot(rootElement);
  }
  reactRoot.render(<InjectedYouTubeApp videoId={videoId} />);
  return rootElement;
}

export function unmountInlinePanel(doc: Document): void {
  reactRoot?.unmount();
  reactRoot = undefined;
  doc.getElementById(INLINE_ROOT_ID)?.remove();
}
```

Create `src/content/InjectedYouTubeApp.tsx`:

```tsx
import { InsightPanel } from "../insight/InsightPanel";
import type { InsightPanelContext } from "../insight/insightPanelTypes";
import type { TranscriptPayload } from "../shared/types";
import { ensureTranscriptVisible, getTranscriptSupportStatus } from "./transcriptAutomation";
import { extractTranscriptFromPage } from "./youtubeTranscript";

async function getPageTranscript(): Promise<TranscriptPayload> {
  const ensureResult = await ensureTranscriptVisible(document);
  if (!ensureResult.ok) {
    throw new Error(ensureResult.reason);
  }

  const extraction = extractTranscriptFromPage(document, new URL(window.location.href));
  if (!extraction.ok) {
    throw new Error(extraction.reason);
  }
  return extraction.transcript;
}

export function InjectedYouTubeApp({ videoId }: { videoId: string }) {
  const context: InsightPanelContext = {
    source: "inline",
    videoId,
    getTranscript: getPageTranscript,
    getTranscriptStatus: () => getTranscriptSupportStatus(document)
  };

  return <InsightPanel context={context} />;
}
```

- [ ] **Step 6: Update content script**

Modify `src/content/contentScript.ts`:

```ts
import { mountInlinePanel, unmountInlinePanel } from "./inlineMount";
import { ensureTranscriptVisible } from "./transcriptAutomation";
import { createYouTubePageObserver } from "./youtubePageObserver";
import { extractTranscriptFromPage } from "./youtubeTranscript";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "VIDEO_INSIGHT_GET_TRANSCRIPT") {
    return false;
  }

  void (async () => {
    if (message?.autoOpenTranscript) {
      const ensureResult = await ensureTranscriptVisible(document);
      if (!ensureResult.ok) {
        sendResponse({ ok: false, reason: ensureResult.reason });
        return;
      }
    }
    sendResponse(extractTranscriptFromPage(document, new URL(window.location.href)));
  })();
  return true;
});

createYouTubePageObserver((state) => {
  if (state.isWatchPage && state.videoId) {
    mountInlinePanel(document, state.videoId);
  } else {
    unmountInlinePanel(document);
  }
}).start();
```

- [ ] **Step 7: Ensure Vite content script supports TSX**

Run the build with `contentScript.ts` importing `inlineMount.tsx`. Vite supports this import path, so keep the Rollup entry as `src/content/contentScript.ts` and keep the manifest output at `assets/contentScript.js` unless `npm run build` proves otherwise.

- [ ] **Step 8: Run tests/build**

Run:

```bash
npm test -- tests/youtubePageObserver.test.ts tests/inlineMount.test.tsx
npm run build
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/content tests/youtubePageObserver.test.ts tests/inlineMount.test.tsx vite.config.ts public/manifest.json
git commit -m "feat: inject insight panel into YouTube pages"
```

---

### Task 5: Inline Panel Styling and README

**Files:**
- Modify: `src/styles.css`
- Modify: `README.md`

- [ ] **Step 1: Add inline panel CSS**

Append to `src/styles.css`:

```css
#video-insight-inline-root {
  display: block;
  margin-bottom: 16px;
  color: #172033;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

#video-insight-inline-root .app-shell {
  min-height: auto;
  border: 1px solid #dbe1ec;
  border-radius: 8px;
  background: #f8fafc;
  padding: 14px;
}

@media (max-width: 1000px) {
  #video-insight-inline-root {
    margin: 12px 0;
  }
}
```

- [ ] **Step 2: Update README usage**

Modify `README.md` usage section to say:

- The primary UI now appears inside YouTube watch pages.
- Open transcript manually only if the panel says YouTube did not load it automatically.
- Browser extension side panel remains available as fallback.
- Switching videos clears old insights automatically.

- [ ] **Step 3: Run build**

Run:

```bash
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/styles.css README.md
git commit -m "docs: describe inline YouTube panel usage"
```

---

### Task 6: Final Verification and Release Prep

**Files:**
- Modify: `package.json` if bumping version for release.
- Modify: `public/manifest.json` if bumping extension version for release.
- Modify: `README.md` if release asset names change.

- [ ] **Step 1: Decide version**

Use `0.2.0` for this feature release because it changes the primary UX.

- [ ] **Step 2: Bump versions**

Update:

- `package.json` version to `0.2.0`
- `public/manifest.json` version to `0.2.0`
- `package-lock.json` root package version to `0.2.0`
- README release asset example to `video-insight-extension-v0.2.0.zip`

- [ ] **Step 3: Run full verification**

Run:

```bash
npm test
npm run build
node -e "const fs=require('fs'); const m=JSON.parse(fs.readFileSync('dist/manifest.json','utf8')); console.log(m.name, m.version, m.manifest_version, m.content_scripts[0].matches.join(','));"
```

Expected:

```text
Video Insight 0.2.0 3 https://www.youtube.com/*,https://youtube.com/*
```

- [ ] **Step 4: Commit version bump**

```bash
git add package.json package-lock.json public/manifest.json README.md
git commit -m "chore: release v0.2.0"
```

- [ ] **Step 5: Manual validation**

Load unpacked extension from `dist/` and validate:

1. Open a YouTube video with transcript already visible.
2. Confirm inline panel appears.
3. Click `Generate Insight`.
4. Navigate to another YouTube video without full reload.
5. Confirm old result clears.
6. Open a video where transcript requires `More` / `更多`.
7. Confirm the extension clicks transcript controls or shows a clear unsupported/manual state.
8. Open a video without transcript support.
9. Confirm unsupported text insight state.
10. Open browser side panel fallback and confirm it no longer shows stale result after active video changes.

- [ ] **Step 6: Create release asset after approval**

After manual validation:

```bash
zip -r -X /private/tmp/video-insight-release/video-insight-extension-v0.2.0.zip dist
git tag -a v0.2.0 -m "Release v0.2.0"
git push origin main v0.2.0
gh release create v0.2.0 /private/tmp/video-insight-release/video-insight-extension-v0.2.0.zip --repo chunchill/video-insight --title "Video Insight v0.2.0" --notes "<release notes>"
```
