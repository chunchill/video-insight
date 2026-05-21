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

  it("retries once without response_format when the provider rejects that parameter", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("unsupported parameter: response_format json_object", { status: 400 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify({ summary: "重试成功", takeaways: [] }) } }]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

    const result = await generateInsightWithProvider(input, provider);

    const firstBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(firstBody.response_format).toEqual({ type: "json_object" });
    expect(secondBody).not.toHaveProperty("response_format");
    expect(result.kind).toBe("structured");
  });

  it("throws readable provider errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("invalid key", { status: 401 }));

    await expect(generateInsightWithProvider(input, provider)).rejects.toThrow(
      "SiliconFlow request failed with HTTP 401: invalid key"
    );
  });

  it("redacts API-key-like strings from provider errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("request included sk-secret-value in a diagnostic", { status: 401 })
    );

    let error: unknown;
    try {
      await generateInsightWithProvider(input, provider);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(
      "SiliconFlow request failed with HTTP 401: request included [REDACTED] in a diagnostic"
    );
    expect((error as Error).message).not.toContain("sk-secret-value");
  });

  it("truncates long provider error bodies", async () => {
    const longBody = "a".repeat(300);

    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(longBody, { status: 500 }));

    await expect(generateInsightWithProvider(input, provider)).rejects.toThrow(
      `SiliconFlow request failed with HTTP 500: ${"a".repeat(240)}...`
    );
  });

  it("wraps malformed successful JSON responses with provider context", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{not-json", { status: 200, headers: { "Content-Type": "application/json" } })
    );

    await expect(generateInsightWithProvider(input, provider)).rejects.toThrow(
      "SiliconFlow returned malformed JSON."
    );
  });

  it("throws a provider-context error for empty model content", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: {} }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

    await expect(generateInsightWithProvider(input, provider)).rejects.toThrow(
      "SiliconFlow returned an empty model response."
    );
  });
});
