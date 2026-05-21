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
