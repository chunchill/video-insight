# YouTube Video Insight Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal-use Manifest V3 browser extension that reads YouTube transcripts and generates structured Chinese or English video insights through configurable OpenAI-compatible providers.

**Architecture:** The extension is split into focused modules: YouTube content extraction, provider configuration storage, OpenAI-compatible generation, insight parsing, and React side panel/options UI. The side panel coordinates transcript extraction and generation, while the provider adapter keeps AI vendors transparent to the UI.

**Tech Stack:** TypeScript, React, Vite, Manifest V3 Chrome extension APIs, Vitest, React Testing Library, jsdom.

---

## File Structure

- `package.json`: scripts and dependencies.
- `tsconfig.json`: TypeScript project settings.
- `vite.config.ts`: multi-entry Vite build for extension pages and scripts.
- `vitest.config.ts`: unit and component test configuration.
- `public/manifest.json`: Manifest V3 extension definition.
- `src/shared/types.ts`: shared domain types for providers, transcripts, and insights.
- `src/shared/insightSchema.ts`: insight parsing and fallback helpers.
- `src/shared/prompt.ts`: prompt construction for selected output language.
- `src/providers/providerConfig.ts`: provider config validation and defaults.
- `src/providers/openAiCompatible.ts`: OpenAI-compatible chat completion adapter.
- `src/storage/providerStorage.ts`: Chrome extension storage wrapper for provider settings.
- `src/content/youtubeTranscript.ts`: YouTube page detection, metadata, and transcript extraction.
- `src/content/contentScript.ts`: content-script message listener.
- `src/background/background.ts`: side panel activation wiring.
- `src/sidepanel/SidePanelApp.tsx`: main insight generation UI.
- `src/sidepanel/main.tsx`: React side panel entry.
- `src/sidepanel/sidepanel.html`: side panel HTML entry.
- `src/options/OptionsApp.tsx`: provider configuration UI.
- `src/options/main.tsx`: React options entry.
- `src/options/options.html`: options HTML entry.
- `src/styles.css`: shared UI styling.
- `src/test/chromeMock.ts`: Chrome API test mock.
- `src/test/youtubeFixtures.ts`: transcript extraction fixtures.
- `tests/*.test.ts` and `tests/*.test.tsx`: focused unit and component tests.

---

### Task 1: Project Scaffold and Extension Build

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `public/manifest.json`
- Create: `src/sidepanel/sidepanel.html`
- Create: `src/options/options.html`
- Create: `src/sidepanel/main.tsx`
- Create: `src/options/main.tsx`
- Create: `src/sidepanel/SidePanelApp.tsx`
- Create: `src/options/OptionsApp.tsx`
- Create: `src/background/background.ts`
- Create: `src/content/contentScript.ts`
- Create: `src/styles.css`

- [ ] **Step 1: Create package and TypeScript config**

Create `package.json`:

```json
{
  "name": "video-insight-extension",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite build --watch",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^5.0.0",
    "vite": "^7.0.0",
    "typescript": "^5.8.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.6.0",
    "@types/chrome": "^0.0.300",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "jsdom": "^26.0.0",
    "vitest": "^3.0.0"
  }
}
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["chrome", "vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "tests", "vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 2: Create Vite and Vitest config**

Create `vite.config.ts`:

```ts
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, "src/sidepanel/sidepanel.html"),
        options: resolve(__dirname, "src/options/options.html"),
        background: resolve(__dirname, "src/background/background.ts"),
        contentScript: resolve(__dirname, "src/content/contentScript.ts")
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]"
      }
    }
  }
});
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"]
  }
});
```

- [ ] **Step 3: Create manifest**

Create `public/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Video Insight",
  "version": "0.1.0",
  "description": "Generate structured insights from YouTube video transcripts.",
  "permissions": ["activeTab", "scripting", "storage", "sidePanel", "tabs"],
  "host_permissions": ["https://www.youtube.com/*", "https://*.youtube.com/*", "<all_urls>"],
  "background": {
    "service_worker": "assets/background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["https://www.youtube.com/watch*", "https://youtube.com/watch*"],
      "js": ["assets/contentScript.js"],
      "run_at": "document_idle"
    }
  ],
  "side_panel": {
    "default_path": "src/sidepanel/sidepanel.html"
  },
  "options_page": "src/options/options.html",
  "action": {
    "default_title": "Video Insight"
  }
}
```

- [ ] **Step 4: Create minimal entries**

Create `src/sidepanel/sidepanel.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Video Insight</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

Create `src/options/options.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Video Insight Settings</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

Create `src/sidepanel/main.tsx`:

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { SidePanelApp } from "./SidePanelApp";
import "../styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <SidePanelApp />
  </React.StrictMode>
);
```

Create `src/options/main.tsx`:

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { OptionsApp } from "./OptionsApp";
import "../styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <OptionsApp />
  </React.StrictMode>
);
```

Create `src/sidepanel/SidePanelApp.tsx`:

```tsx
export function SidePanelApp() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Video Insight</h1>
        <p>Open a YouTube video and generate transcript-based insights.</p>
      </header>
    </main>
  );
}
```

Create `src/options/OptionsApp.tsx`:

```tsx
export function OptionsApp() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Settings</h1>
        <p>Configure OpenAI-compatible model providers for personal use.</p>
      </header>
    </main>
  );
}
```

Create `src/background/background.ts`:

```ts
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
```

Create `src/content/contentScript.ts`:

```ts
chrome.runtime.onMessage.addListener((_message, _sender, sendResponse) => {
  sendResponse({ ok: true });
  return false;
});
```

Create `src/styles.css`:

```css
:root {
  color: #172033;
  background: #f6f7fb;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 360px;
}

button,
input,
select,
textarea {
  font: inherit;
}

.app-shell {
  min-height: 100vh;
  padding: 16px;
}

.app-header h1 {
  margin: 0;
  font-size: 20px;
}

.app-header p {
  margin: 6px 0 0;
  color: #5d6678;
  line-height: 1.45;
}
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`

Expected: `package-lock.json` is created and dependencies install successfully.

- [ ] **Step 6: Build**

Run: `npm run build`

Expected: TypeScript passes and `dist/` contains `manifest.json`, side panel assets, options assets, `assets/background.js`, and `assets/contentScript.js`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts vitest.config.ts public src
git commit -m "chore: scaffold extension project"
```

---

### Task 2: Shared Types and Insight Parsing

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/shared/insightSchema.ts`
- Create: `src/test/setup.ts`
- Create: `tests/insightSchema.test.ts`

- [ ] **Step 1: Add test setup**

Create `src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 2: Write failing parser tests**

Create `tests/insightSchema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseInsightResult } from "../src/shared/insightSchema";

describe("parseInsightResult", () => {
  it("parses valid structured insight JSON", () => {
    const result = parseInsightResult(
      JSON.stringify({
        summary: "AI changes workflows.",
        takeaways: ["Context matters", "Review remains important"],
        viewpoints: [
          {
            title: "Workflow change",
            detail: "The video argues complete workflows matter more than isolated tasks.",
            evidence: [{ timestamp: "03:12", text: "Workflow example" }]
          }
        ],
        caveats: ["Transcript may omit visual context"],
        audience: ["AI product builders"]
      })
    );

    expect(result.kind).toBe("structured");
    if (result.kind === "structured") {
      expect(result.data.summary).toBe("AI changes workflows.");
      expect(result.data.takeaways).toHaveLength(2);
      expect(result.data.viewpoints[0].evidence[0].timestamp).toBe("03:12");
    }
  });

  it("returns readable fallback for non-json model output", () => {
    const result = parseInsightResult("This video says AI changes workflows.");

    expect(result.kind).toBe("fallback");
    if (result.kind === "fallback") {
      expect(result.text).toContain("AI changes workflows");
      expect(result.reason).toBe("Model output was not valid JSON.");
    }
  });

  it("normalizes missing arrays to empty arrays", () => {
    const result = parseInsightResult(JSON.stringify({ summary: "Short result" }));

    expect(result.kind).toBe("structured");
    if (result.kind === "structured") {
      expect(result.data.takeaways).toEqual([]);
      expect(result.data.viewpoints).toEqual([]);
      expect(result.data.caveats).toEqual([]);
      expect(result.data.audience).toEqual([]);
    }
  });
});
```

- [ ] **Step 3: Run test to verify failure**

Run: `npm test -- tests/insightSchema.test.ts`

Expected: FAIL because `src/shared/insightSchema.ts` does not exist.

- [ ] **Step 4: Add shared types**

Create `src/shared/types.ts`:

```ts
export type OutputLanguage = "zh-CN" | "en";

export interface VideoMeta {
  url: string;
  title?: string;
  channel?: string;
  duration?: string;
}

export interface TranscriptSegment {
  start?: string;
  text: string;
}

export interface TranscriptPayload {
  videoMeta: VideoMeta;
  language?: string;
  segments: TranscriptSegment[];
  plainText: string;
}

export interface InsightEvidence {
  timestamp?: string;
  text: string;
}

export interface InsightViewpoint {
  title: string;
  detail: string;
  evidence: InsightEvidence[];
}

export interface StructuredInsight {
  summary: string;
  takeaways: string[];
  viewpoints: InsightViewpoint[];
  caveats: string[];
  audience: string[];
}

export type ParsedInsightResult =
  | { kind: "structured"; data: StructuredInsight; rawText: string }
  | { kind: "fallback"; text: string; reason: string };

export interface ModelProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

export interface InsightInput {
  transcript: TranscriptPayload;
  outputLanguage: OutputLanguage;
}
```

- [ ] **Step 5: Add parser implementation**

Create `src/shared/insightSchema.ts`:

```ts
import type {
  InsightEvidence,
  InsightViewpoint,
  ParsedInsightResult,
  StructuredInsight
} from "./types";

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asEvidenceArray(value: unknown): InsightEvidence[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      timestamp: typeof item.timestamp === "string" ? item.timestamp : undefined,
      text: asString(item.text)
    }))
    .filter((item) => item.text.length > 0);
}

function asViewpoints(value: unknown): InsightViewpoint[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      title: asString(item.title),
      detail: asString(item.detail),
      evidence: asEvidenceArray(item.evidence)
    }))
    .filter((item) => item.title.length > 0 || item.detail.length > 0);
}

export function parseInsightResult(rawText: string): ParsedInsightResult {
  try {
    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    const data: StructuredInsight = {
      summary: asString(parsed.summary),
      takeaways: asStringArray(parsed.takeaways),
      viewpoints: asViewpoints(parsed.viewpoints),
      caveats: asStringArray(parsed.caveats),
      audience: asStringArray(parsed.audience)
    };

    return { kind: "structured", data, rawText };
  } catch {
    return {
      kind: "fallback",
      text: rawText.trim(),
      reason: "Model output was not valid JSON."
    };
  }
}
```

- [ ] **Step 6: Run parser tests**

Run: `npm test -- tests/insightSchema.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/shared src/test tests/insightSchema.test.ts
git commit -m "feat: add insight parsing"
```

---

### Task 3: Provider Configuration and Prompt Construction

**Files:**
- Create: `src/providers/providerConfig.ts`
- Create: `src/shared/prompt.ts`
- Create: `tests/providerConfig.test.ts`
- Create: `tests/prompt.test.ts`

- [ ] **Step 1: Write failing provider config tests**

Create `tests/providerConfig.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createProviderConfig, maskApiKey, validateProviderConfig } from "../src/providers/providerConfig";

describe("providerConfig", () => {
  it("creates an enabled provider config with generated id", () => {
    const config = createProviderConfig({
      name: "SiliconFlow",
      baseUrl: "https://api.siliconflow.cn/v1",
      apiKey: "sk-test",
      model: "Qwen/Qwen2.5-72B-Instruct"
    });

    expect(config.id).toMatch(/^provider-/);
    expect(config.enabled).toBe(true);
    expect(config.baseUrl).toBe("https://api.siliconflow.cn/v1");
  });

  it("reports missing fields", () => {
    const errors = validateProviderConfig({
      id: "provider-1",
      name: "",
      baseUrl: "not-a-url",
      apiKey: "",
      model: "",
      enabled: true
    });

    expect(errors).toEqual([
      "Provider name is required.",
      "Base URL must be a valid URL.",
      "API key is required.",
      "Model is required."
    ]);
  });

  it("masks api keys without exposing full value", () => {
    expect(maskApiKey("sk-1234567890")).toBe("sk-1...7890");
    expect(maskApiKey("short")).toBe("•••••");
  });
});
```

- [ ] **Step 2: Write failing prompt tests**

Create `tests/prompt.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildInsightMessages } from "../src/shared/prompt";
import type { TranscriptPayload } from "../src/shared/types";

const transcript: TranscriptPayload = {
  videoMeta: {
    url: "https://www.youtube.com/watch?v=abc123",
    title: "AI Workflow Talk",
    channel: "Example Channel",
    duration: "12:34"
  },
  language: "en",
  segments: [],
  plainText: "AI systems are most useful when they reshape full workflows."
};

describe("buildInsightMessages", () => {
  it("requests Simplified Chinese output", () => {
    const messages = buildInsightMessages({ transcript, outputLanguage: "zh-CN" });
    expect(messages[0].content).toContain("Simplified Chinese");
    expect(messages[1].content).toContain("AI Workflow Talk");
    expect(messages[1].content).toContain("AI systems are most useful");
  });

  it("requests English output", () => {
    const messages = buildInsightMessages({ transcript, outputLanguage: "en" });
    expect(messages[0].content).toContain("English");
  });
});
```

- [ ] **Step 3: Run tests to verify failure**

Run: `npm test -- tests/providerConfig.test.ts tests/prompt.test.ts`

Expected: FAIL because the modules do not exist.

- [ ] **Step 4: Implement provider config helpers**

Create `src/providers/providerConfig.ts`:

```ts
import type { ModelProviderConfig } from "../shared/types";

export type ProviderConfigInput = Omit<ModelProviderConfig, "id" | "enabled"> & {
  id?: string;
  enabled?: boolean;
};

export function createProviderConfig(input: ProviderConfigInput): ModelProviderConfig {
  return {
    id: input.id ?? `provider-${crypto.randomUUID()}`,
    name: input.name.trim(),
    baseUrl: input.baseUrl.trim().replace(/\/$/, ""),
    apiKey: input.apiKey.trim(),
    model: input.model.trim(),
    enabled: input.enabled ?? true
  };
}

export function validateProviderConfig(config: ModelProviderConfig): string[] {
  const errors: string[] = [];

  if (!config.name.trim()) {
    errors.push("Provider name is required.");
  }

  try {
    const url = new URL(config.baseUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      errors.push("Base URL must be a valid URL.");
    }
  } catch {
    errors.push("Base URL must be a valid URL.");
  }

  if (!config.apiKey.trim()) {
    errors.push("API key is required.");
  }

  if (!config.model.trim()) {
    errors.push("Model is required.");
  }

  return errors;
}

export function maskApiKey(apiKey: string): string {
  if (apiKey.length < 8) {
    return "•".repeat(apiKey.length);
  }

  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}
```

- [ ] **Step 5: Implement prompt construction**

Create `src/shared/prompt.ts`:

```ts
import type { InsightInput } from "./types";

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

const languageNames = {
  "zh-CN": "Simplified Chinese",
  en: "English"
} as const;

export function buildInsightMessages(input: InsightInput): ChatMessage[] {
  const { transcript, outputLanguage } = input;
  const languageName = languageNames[outputLanguage];

  return [
    {
      role: "system",
      content:
        `You analyze YouTube transcripts for a personal productivity tool. ` +
        `Answer only in ${languageName}. ` +
        `Use only the provided metadata and transcript. ` +
        `Return strict JSON with keys: summary, takeaways, viewpoints, caveats, audience. ` +
        `viewpoints must be an array of objects with title, detail, evidence. ` +
        `evidence must be an array of objects with timestamp and text.`
    },
    {
      role: "user",
      content: [
        `Video URL: ${transcript.videoMeta.url}`,
        `Title: ${transcript.videoMeta.title ?? "Unknown"}`,
        `Channel: ${transcript.videoMeta.channel ?? "Unknown"}`,
        `Duration: ${transcript.videoMeta.duration ?? "Unknown"}`,
        `Transcript language: ${transcript.language ?? "Unknown"}`,
        "",
        "Transcript:",
        transcript.plainText
      ].join("\n")
    }
  ];
}
```

- [ ] **Step 6: Run tests**

Run: `npm test -- tests/providerConfig.test.ts tests/prompt.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/providers/providerConfig.ts src/shared/prompt.ts tests/providerConfig.test.ts tests/prompt.test.ts
git commit -m "feat: add provider config and prompts"
```

---

### Task 4: OpenAI-Compatible Provider Adapter

**Files:**
- Create: `src/providers/openAiCompatible.ts`
- Create: `tests/openAiCompatible.test.ts`

- [ ] **Step 1: Write failing adapter tests**

Create `tests/openAiCompatible.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateInsightWithProvider } from "../src/providers/openAiCompatible";
import type { InsightInput, ModelProviderConfig } from "../src/shared/types";

const provider: ModelProviderConfig = {
  id: "provider-1",
  name: "SiliconFlow",
  baseUrl: "https://api.siliconflow.cn/v1",
  apiKey: "sk-test",
  model: "Qwen/Qwen2.5-72B-Instruct",
  enabled: true
};

const input: InsightInput = {
  outputLanguage: "zh-CN",
  transcript: {
    videoMeta: { url: "https://www.youtube.com/watch?v=abc123", title: "AI Talk" },
    segments: [],
    plainText: "AI changes workflows."
  }
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("generateInsightWithProvider", () => {
  it("calls an OpenAI-compatible chat completion endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ summary: "工作流改变", takeaways: [] }) } }]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await generateInsightWithProvider(input, provider);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.siliconflow.cn/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer sk-test",
          "Content-Type": "application/json"
        })
      })
    );
    expect(result.kind).toBe("structured");
  });

  it("throws readable provider errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("invalid key", { status: 401 }));

    await expect(generateInsightWithProvider(input, provider)).rejects.toThrow(
      "SiliconFlow request failed with HTTP 401: invalid key"
    );
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- tests/openAiCompatible.test.ts`

Expected: FAIL because `src/providers/openAiCompatible.ts` does not exist.

- [ ] **Step 3: Implement adapter**

Create `src/providers/openAiCompatible.ts`:

```ts
import { parseInsightResult } from "../shared/insightSchema";
import { buildInsightMessages } from "../shared/prompt";
import type { InsightInput, ModelProviderConfig, ParsedInsightResult } from "../shared/types";

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

function endpointFor(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/chat/completions`;
}

export async function generateInsightWithProvider(
  input: InsightInput,
  config: ModelProviderConfig
): Promise<ParsedInsightResult> {
  const response = await fetch(endpointFor(config.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: buildInsightMessages(input)
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${config.name} request failed with HTTP ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error(`${config.name} returned an empty model response.`);
  }

  return parseInsightResult(content);
}
```

- [ ] **Step 4: Run adapter tests**

Run: `npm test -- tests/openAiCompatible.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/providers/openAiCompatible.ts tests/openAiCompatible.test.ts
git commit -m "feat: add OpenAI-compatible provider adapter"
```

---

### Task 5: Provider Storage

**Files:**
- Create: `src/storage/providerStorage.ts`
- Create: `src/test/chromeMock.ts`
- Create: `tests/providerStorage.test.ts`

- [ ] **Step 1: Write Chrome storage mock**

Create `src/test/chromeMock.ts`:

```ts
type StorageArea = Record<string, unknown>;

const storage: StorageArea = {};

export function installChromeMock() {
  Object.assign(globalThis, {
    chrome: {
      storage: {
        local: {
          get: vi.fn(async (keys?: string | string[] | Record<string, unknown>) => {
            if (typeof keys === "string") {
              return { [keys]: storage[keys] };
            }
            if (Array.isArray(keys)) {
              return Object.fromEntries(keys.map((key) => [key, storage[key]]));
            }
            if (keys && typeof keys === "object") {
              return Object.fromEntries(Object.keys(keys).map((key) => [key, storage[key] ?? keys[key]]));
            }
            return { ...storage };
          }),
          set: vi.fn(async (items: Record<string, unknown>) => {
            Object.assign(storage, items);
          }),
          clear: vi.fn(async () => {
            for (const key of Object.keys(storage)) {
              delete storage[key];
            }
          })
        }
      },
      runtime: {
        openOptionsPage: vi.fn()
      }
    }
  });
}
```

- [ ] **Step 2: Write failing storage tests**

Create `tests/providerStorage.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { installChromeMock } from "../src/test/chromeMock";
import { getProviderSettings, saveProviderSettings } from "../src/storage/providerStorage";

beforeEach(async () => {
  installChromeMock();
  await chrome.storage.local.clear();
});

describe("providerStorage", () => {
  it("returns empty defaults", async () => {
    await expect(getProviderSettings()).resolves.toEqual({
      providers: [],
      selectedProviderId: undefined,
      defaultLanguage: "zh-CN"
    });
  });

  it("saves and loads provider settings", async () => {
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
      defaultLanguage: "en"
    });

    const settings = await getProviderSettings();
    expect(settings.selectedProviderId).toBe("provider-1");
    expect(settings.defaultLanguage).toBe("en");
    expect(settings.providers[0].name).toBe("OpenAI");
  });
});
```

- [ ] **Step 3: Run test to verify failure**

Run: `npm test -- tests/providerStorage.test.ts`

Expected: FAIL because `src/storage/providerStorage.ts` does not exist.

- [ ] **Step 4: Implement storage wrapper**

Create `src/storage/providerStorage.ts`:

```ts
import type { ModelProviderConfig, OutputLanguage } from "../shared/types";

const STORAGE_KEY = "videoInsight.providerSettings";

export interface ProviderSettings {
  providers: ModelProviderConfig[];
  selectedProviderId?: string;
  defaultLanguage: OutputLanguage;
}

const defaultSettings: ProviderSettings = {
  providers: [],
  selectedProviderId: undefined,
  defaultLanguage: "zh-CN"
};

export async function getProviderSettings(): Promise<ProviderSettings> {
  const result = await chrome.storage.local.get({ [STORAGE_KEY]: defaultSettings });
  return result[STORAGE_KEY] as ProviderSettings;
}

export async function saveProviderSettings(settings: ProviderSettings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: settings });
}

export function selectActiveProvider(settings: ProviderSettings): ModelProviderConfig | undefined {
  return (
    settings.providers.find((provider) => provider.id === settings.selectedProviderId && provider.enabled) ??
    settings.providers.find((provider) => provider.enabled)
  );
}
```

- [ ] **Step 5: Run storage tests**

Run: `npm test -- tests/providerStorage.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/storage/providerStorage.ts src/test/chromeMock.ts tests/providerStorage.test.ts
git commit -m "feat: persist provider settings"
```

---

### Task 6: YouTube Transcript Extraction and Content Messaging

**Files:**
- Create: `src/content/youtubeTranscript.ts`
- Modify: `src/content/contentScript.ts`
- Create: `src/test/youtubeFixtures.ts`
- Create: `tests/youtubeTranscript.test.ts`

- [ ] **Step 1: Write fixture and failing extraction tests**

Create `src/test/youtubeFixtures.ts`:

```ts
export const youtubeWatchHtml = `
  <html>
    <head><title>AI Talk - YouTube</title></head>
    <body>
      <h1><yt-formatted-string>AI Workflow Talk</yt-formatted-string></h1>
      <ytd-channel-name><a>Example Channel</a></ytd-channel-name>
      <ytd-transcript-segment-renderer>
        <div class="segment-timestamp">0:03</div>
        <yt-formatted-string class="segment-text">AI systems change workflows.</yt-formatted-string>
      </ytd-transcript-segment-renderer>
      <ytd-transcript-segment-renderer>
        <div class="segment-timestamp">0:12</div>
        <yt-formatted-string class="segment-text">Human review remains important.</yt-formatted-string>
      </ytd-transcript-segment-renderer>
    </body>
  </html>
`;
```

Create `tests/youtubeTranscript.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { extractTranscriptFromPage, isYouTubeWatchPage } from "../src/content/youtubeTranscript";
import { youtubeWatchHtml } from "../src/test/youtubeFixtures";

describe("youtubeTranscript", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = youtubeWatchHtml;
    history.pushState(null, "", "https://www.youtube.com/watch?v=abc123");
  });

  it("detects YouTube watch pages", () => {
    expect(isYouTubeWatchPage(new URL("https://www.youtube.com/watch?v=abc123"))).toBe(true);
    expect(isYouTubeWatchPage(new URL("https://www.youtube.com/"))).toBe(false);
  });

  it("extracts metadata and transcript segments", () => {
    const result = extractTranscriptFromPage(document, new URL(window.location.href));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.transcript.videoMeta.title).toBe("AI Workflow Talk");
      expect(result.transcript.videoMeta.channel).toBe("Example Channel");
      expect(result.transcript.segments).toHaveLength(2);
      expect(result.transcript.plainText).toContain("[0:03] AI systems change workflows.");
    }
  });

  it("reports missing transcripts", () => {
    document.documentElement.innerHTML = "<html><body><h1>No Transcript</h1></body></html>";
    const result = extractTranscriptFromPage(document, new URL(window.location.href));

    expect(result).toEqual({
      ok: false,
      reason: "No transcript segments were detected on this YouTube page."
    });
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- tests/youtubeTranscript.test.ts`

Expected: FAIL because `src/content/youtubeTranscript.ts` does not exist.

- [ ] **Step 3: Implement extraction**

Create `src/content/youtubeTranscript.ts`:

```ts
import type { TranscriptPayload, TranscriptSegment, VideoMeta } from "../shared/types";

export type TranscriptExtractionResult =
  | { ok: true; transcript: TranscriptPayload }
  | { ok: false; reason: string };

export function isYouTubeWatchPage(url: URL): boolean {
  return url.hostname.includes("youtube.com") && url.pathname === "/watch" && url.searchParams.has("v");
}

function textContent(doc: Document, selector: string): string | undefined {
  const value = doc.querySelector(selector)?.textContent?.trim();
  return value && value.length > 0 ? value : undefined;
}

function extractVideoMeta(doc: Document, url: URL): VideoMeta {
  return {
    url: url.toString(),
    title:
      textContent(doc, "h1 yt-formatted-string") ??
      textContent(doc, "h1") ??
      doc.title.replace(" - YouTube", ""),
    channel: textContent(doc, "ytd-channel-name a"),
    duration: textContent(doc, ".ytp-time-duration")
  };
}

function extractVisibleTranscriptSegments(doc: Document): TranscriptSegment[] {
  return Array.from(doc.querySelectorAll("ytd-transcript-segment-renderer"))
    .map((segment) => {
      const start = segment.querySelector(".segment-timestamp")?.textContent?.trim();
      const text = segment.querySelector(".segment-text")?.textContent?.trim();
      return text ? { start, text } : undefined;
    })
    .filter((segment): segment is TranscriptSegment => Boolean(segment));
}

function toPlainText(segments: TranscriptSegment[]): string {
  return segments.map((segment) => (segment.start ? `[${segment.start}] ${segment.text}` : segment.text)).join("\n");
}

export function extractTranscriptFromPage(doc: Document, url: URL): TranscriptExtractionResult {
  if (!isYouTubeWatchPage(url)) {
    return { ok: false, reason: "Please open a YouTube video page." };
  }

  const segments = extractVisibleTranscriptSegments(doc);
  if (segments.length === 0) {
    return { ok: false, reason: "No transcript segments were detected on this YouTube page." };
  }

  return {
    ok: true,
    transcript: {
      videoMeta: extractVideoMeta(doc, url),
      segments,
      plainText: toPlainText(segments)
    }
  };
}
```

- [ ] **Step 4: Wire content script message**

Replace `src/content/contentScript.ts` with:

```ts
import { extractTranscriptFromPage } from "./youtubeTranscript";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "VIDEO_INSIGHT_GET_TRANSCRIPT") {
    return false;
  }

  sendResponse(extractTranscriptFromPage(document, new URL(window.location.href)));
  return false;
});
```

- [ ] **Step 5: Run extraction tests**

Run: `npm test -- tests/youtubeTranscript.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/content src/test/youtubeFixtures.ts tests/youtubeTranscript.test.ts
git commit -m "feat: extract YouTube transcripts"
```

---

### Task 7: Side Panel Insight Workflow

**Files:**
- Modify: `src/sidepanel/SidePanelApp.tsx`
- Create: `tests/SidePanelApp.test.tsx`

- [ ] **Step 1: Write failing side panel tests**

Create `tests/SidePanelApp.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SidePanelApp } from "../src/sidepanel/SidePanelApp";
import { installChromeMock } from "../src/test/chromeMock";
import { saveProviderSettings } from "../src/storage/providerStorage";

beforeEach(async () => {
  installChromeMock();
  await chrome.storage.local.clear();
});

describe("SidePanelApp", () => {
  it("guides the user to settings when no provider exists", async () => {
    render(<SidePanelApp />);

    expect(await screen.findByText("No provider configured")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open settings" })).toBeInTheDocument();
  });

  it("switches output language", async () => {
    render(<SidePanelApp />);

    await userEvent.selectOptions(await screen.findByLabelText("Output language"), "en");
    expect(screen.getByLabelText("Output language")).toHaveValue("en");
  });

  it("shows transcript extraction errors", async () => {
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

    chrome.tabs = {
      query: vi.fn(async () => [{ id: 10, url: "https://www.youtube.com/watch?v=abc123" }]),
      sendMessage: vi.fn(async () => ({
        ok: false,
        reason: "No transcript segments were detected on this YouTube page."
      }))
    } as unknown as typeof chrome.tabs;

    render(<SidePanelApp />);
    await userEvent.click(await screen.findByRole("button", { name: "Generate insight" }));

    expect(await screen.findByText("No transcript segments were detected on this YouTube page.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- tests/SidePanelApp.test.tsx`

Expected: FAIL because side panel does not load settings or render workflow controls.

- [ ] **Step 3: Implement side panel workflow**

Replace `src/sidepanel/SidePanelApp.tsx` with:

```tsx
import { useEffect, useMemo, useState } from "react";
import { generateInsightWithProvider } from "../providers/openAiCompatible";
import type { OutputLanguage, ParsedInsightResult, TranscriptPayload } from "../shared/types";
import { getProviderSettings, selectActiveProvider } from "../storage/providerStorage";

type Status = "loading-settings" | "missing-provider" | "ready" | "generating" | "success" | "error";

type TranscriptResponse =
  | { ok: true; transcript: TranscriptPayload }
  | { ok: false; reason: string };

async function requestTranscript(): Promise<TranscriptResponse> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = tabs[0]?.id;

  if (!tabId) {
    return { ok: false, reason: "No active tab was found." };
  }

  return chrome.tabs.sendMessage(tabId, { type: "VIDEO_INSIGHT_GET_TRANSCRIPT" }) as Promise<TranscriptResponse>;
}

export function SidePanelApp() {
  const [status, setStatus] = useState<Status>("loading-settings");
  const [language, setLanguage] = useState<OutputLanguage>("zh-CN");
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<ParsedInsightResult>();
  const [providerSettings, setProviderSettings] = useState<Awaited<ReturnType<typeof getProviderSettings>>>();

  const activeProvider = useMemo(
    () => (providerSettings ? selectActiveProvider(providerSettings) : undefined),
    [providerSettings]
  );

  useEffect(() => {
    getProviderSettings().then((settings) => {
      setProviderSettings(settings);
      setLanguage(settings.defaultLanguage);
      setStatus(selectActiveProvider(settings) ? "ready" : "missing-provider");
    });
  }, []);

  async function generateInsight() {
    if (!activeProvider) {
      setStatus("missing-provider");
      return;
    }

    setStatus("generating");
    setError(undefined);
    setResult(undefined);

    try {
      const transcriptResponse = await requestTranscript();
      if (!transcriptResponse.ok) {
        setError(transcriptResponse.reason);
        setStatus("error");
        return;
      }

      const insight = await generateInsightWithProvider(
        { transcript: transcriptResponse.transcript, outputLanguage: language },
        activeProvider
      );
      setResult(insight);
      setStatus("success");
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "Insight generation failed.");
      setStatus("error");
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Video Insight</h1>
        <p>Generate transcript-based insights from the current YouTube video.</p>
      </header>

      <section className="panel-section">
        <label htmlFor="output-language">Output language</label>
        <select id="output-language" value={language} onChange={(event) => setLanguage(event.target.value as OutputLanguage)}>
          <option value="zh-CN">中文</option>
          <option value="en">English</option>
        </select>
      </section>

      {status === "missing-provider" ? (
        <section className="notice">
          <h2>No provider configured</h2>
          <p>Add an OpenAI-compatible provider before generating insights.</p>
          <button type="button" onClick={() => chrome.runtime.openOptionsPage()}>
            Open settings
          </button>
        </section>
      ) : (
        <button type="button" className="primary-button" disabled={status === "generating"} onClick={generateInsight}>
          {status === "generating" ? "Generating..." : "Generate insight"}
        </button>
      )}

      {error ? <div className="error-box">{error}</div> : null}

      {result?.kind === "structured" ? (
        <section className="insight-list">
          <article className="insight-card">
            <h2>Summary</h2>
            <p>{result.data.summary}</p>
          </article>
          <article className="insight-card">
            <h2>Key takeaways</h2>
            <ul>
              {result.data.takeaways.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          {result.data.viewpoints.map((viewpoint) => (
            <details className="insight-card" key={`${viewpoint.title}-${viewpoint.detail}`}>
              <summary>{viewpoint.title}</summary>
              <p>{viewpoint.detail}</p>
              {viewpoint.evidence.length > 0 ? (
                <ul>
                  {viewpoint.evidence.map((item) => (
                    <li key={`${item.timestamp}-${item.text}`}>
                      {item.timestamp ? `${item.timestamp} ` : ""}
                      {item.text}
                    </li>
                  ))}
                </ul>
              ) : null}
            </details>
          ))}
        </section>
      ) : null}

      {result?.kind === "fallback" ? (
        <section className="insight-card">
          <h2>Model output</h2>
          <p>{result.reason}</p>
          <pre>{result.text}</pre>
        </section>
      ) : null}
    </main>
  );
}
```

- [ ] **Step 4: Add side panel styles**

Append to `src/styles.css`:

```css
.panel-section {
  display: grid;
  gap: 6px;
  margin: 18px 0;
}

.panel-section label {
  color: #4d5668;
  font-size: 13px;
  font-weight: 600;
}

select,
input,
textarea {
  width: 100%;
  border: 1px solid #ccd3df;
  border-radius: 6px;
  padding: 8px 10px;
  background: #fff;
}

.primary-button,
.notice button {
  width: 100%;
  border: 0;
  border-radius: 6px;
  padding: 10px 12px;
  background: #1f6feb;
  color: #fff;
  cursor: pointer;
  font-weight: 700;
}

.primary-button:disabled {
  cursor: progress;
  opacity: 0.7;
}

.notice,
.error-box,
.insight-card {
  margin-top: 14px;
  border: 1px solid #d9dfeb;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}

.notice h2,
.insight-card h2 {
  margin: 0 0 8px;
  font-size: 15px;
}

.error-box {
  border-color: #f3b7b7;
  background: #fff5f5;
  color: #962020;
}

.insight-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.insight-card p,
.insight-card li {
  color: #354052;
  line-height: 1.5;
}

.insight-card pre {
  white-space: pre-wrap;
  word-break: break-word;
}
```

- [ ] **Step 5: Run side panel tests**

Run: `npm test -- tests/SidePanelApp.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/sidepanel/SidePanelApp.tsx src/styles.css tests/SidePanelApp.test.tsx
git commit -m "feat: add side panel generation workflow"
```

---

### Task 8: Options Page Provider Management

**Files:**
- Modify: `src/options/OptionsApp.tsx`
- Create: `tests/OptionsApp.test.tsx`

- [ ] **Step 1: Write failing options page tests**

Create `tests/OptionsApp.test.tsx`:

```tsx
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OptionsApp } from "../src/options/OptionsApp";
import { installChromeMock } from "../src/test/chromeMock";
import { getProviderSettings } from "../src/storage/providerStorage";

beforeEach(async () => {
  installChromeMock();
  await chrome.storage.local.clear();
});

describe("OptionsApp", () => {
  it("saves provider configuration", async () => {
    render(<OptionsApp />);

    await userEvent.type(await screen.findByLabelText("Provider name"), "SiliconFlow");
    await userEvent.type(screen.getByLabelText("Base URL"), "https://api.siliconflow.cn/v1");
    await userEvent.type(screen.getByLabelText("API key"), "sk-test");
    await userEvent.type(screen.getByLabelText("Model"), "Qwen/Qwen2.5-72B-Instruct");
    await userEvent.selectOptions(screen.getByLabelText("Default output language"), "en");
    await userEvent.click(screen.getByRole("button", { name: "Save provider" }));

    expect(await screen.findByText("Settings saved.")).toBeInTheDocument();
    const settings = await getProviderSettings();
    expect(settings.providers[0].name).toBe("SiliconFlow");
    expect(settings.selectedProviderId).toBe(settings.providers[0].id);
    expect(settings.defaultLanguage).toBe("en");
  });

  it("shows validation errors", async () => {
    render(<OptionsApp />);

    await userEvent.click(await screen.findByRole("button", { name: "Save provider" }));

    expect(await screen.findByText("Provider name is required.")).toBeInTheDocument();
    expect(screen.getByText("Base URL must be a valid URL.")).toBeInTheDocument();
    expect(screen.getByText("API key is required.")).toBeInTheDocument();
    expect(screen.getByText("Model is required.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- tests/OptionsApp.test.tsx`

Expected: FAIL because options page does not render the provider form.

- [ ] **Step 3: Implement options page**

Replace `src/options/OptionsApp.tsx` with:

```tsx
import { FormEvent, useEffect, useState } from "react";
import { createProviderConfig, validateProviderConfig } from "../providers/providerConfig";
import type { OutputLanguage } from "../shared/types";
import { getProviderSettings, saveProviderSettings } from "../storage/providerStorage";

export function OptionsApp() {
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [defaultLanguage, setDefaultLanguage] = useState<OutputLanguage>("zh-CN");
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getProviderSettings().then((settings) => {
      setDefaultLanguage(settings.defaultLanguage);
      const provider = settings.providers[0];
      if (provider) {
        setName(provider.name);
        setBaseUrl(provider.baseUrl);
        setApiKey(provider.apiKey);
        setModel(provider.model);
      }
    });
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);

    const provider = createProviderConfig({ name, baseUrl, apiKey, model });
    const validationErrors = validateProviderConfig(provider);
    setErrors(validationErrors);
    if (validationErrors.length > 0) {
      return;
    }

    await saveProviderSettings({
      providers: [provider],
      selectedProviderId: provider.id,
      defaultLanguage
    });

    setSaved(true);
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Settings</h1>
        <p>
          API keys are stored locally in this browser extension. Video transcripts are sent to the selected provider.
        </p>
      </header>

      <form className="settings-form" onSubmit={onSubmit}>
        <label>
          Provider name
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="SiliconFlow" />
        </label>
        <label>
          Base URL
          <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://api.siliconflow.cn/v1" />
        </label>
        <label>
          API key
          <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} type="password" placeholder="sk-..." />
        </label>
        <label>
          Model
          <input value={model} onChange={(event) => setModel(event.target.value)} placeholder="Qwen/Qwen2.5-72B-Instruct" />
        </label>
        <label>
          Default output language
          <select value={defaultLanguage} onChange={(event) => setDefaultLanguage(event.target.value as OutputLanguage)}>
            <option value="zh-CN">中文</option>
            <option value="en">English</option>
          </select>
        </label>

        {errors.length > 0 ? (
          <div className="error-box">
            {errors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        ) : null}

        {saved ? <p className="success-message">Settings saved.</p> : null}

        <button className="primary-button" type="submit">
          Save provider
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: Add options styles**

Append to `src/styles.css`:

```css
.settings-form {
  display: grid;
  gap: 14px;
  margin-top: 18px;
}

.settings-form label {
  display: grid;
  gap: 6px;
  color: #4d5668;
  font-size: 13px;
  font-weight: 700;
}

.success-message {
  margin: 0;
  color: #166534;
  font-weight: 700;
}
```

- [ ] **Step 5: Run options tests**

Run: `npm test -- tests/OptionsApp.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/options/OptionsApp.tsx src/styles.css tests/OptionsApp.test.tsx
git commit -m "feat: add provider settings page"
```

---

### Task 9: Build Verification and Manual Extension Check

**Files:**
- Modify: `docs/superpowers/plans/2026-05-21-youtube-video-insight-extension.md` only if implementation discoveries require updating this plan.

- [ ] **Step 1: Run all tests**

Run: `npm test`

Expected: all Vitest suites pass.

- [ ] **Step 2: Build production extension**

Run: `npm run build`

Expected: build completes and `dist/manifest.json` exists.

- [ ] **Step 3: Inspect built manifest**

Run: `node -e "const fs=require('fs'); const m=JSON.parse(fs.readFileSync('dist/manifest.json','utf8')); console.log(m.manifest_version, m.side_panel.default_path, m.options_page)"`

Expected output contains:

```text
3 src/sidepanel/sidepanel.html src/options/options.html
```

- [ ] **Step 4: Manual browser validation**

Open Chrome extension management, load unpacked extension from `dist/`, then validate:

1. Options page saves a SiliconFlow or OpenAI-compatible provider.
2. Side panel opens on action click.
3. A YouTube video page with visible transcript can generate an insight.
4. The output language selector can switch between `中文` and `English`.
5. A video/page without transcript shows the no-transcript message.
6. API errors show provider name and HTTP status without exposing the full API key.

- [ ] **Step 5: Commit verification fixes if any**

If verification requires code fixes, commit them with a focused message:

```bash
git add src tests public package.json package-lock.json
git commit -m "fix: stabilize extension verification"
```

If no fixes are needed, do not create an empty commit.
