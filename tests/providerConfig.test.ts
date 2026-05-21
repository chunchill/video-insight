import { afterEach, describe, expect, it, vi } from "vitest";
import { createProviderConfig, maskApiKey, validateProviderConfig } from "../src/providers/providerConfig";

describe("providerConfig", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it("falls back to a local id when crypto randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", undefined);

    const config = createProviderConfig({
      name: "SiliconFlow",
      baseUrl: "https://api.siliconflow.cn/v1",
      apiKey: "sk-test",
      model: "Qwen/Qwen2.5-72B-Instruct"
    });

    expect(config.id).toMatch(/^provider-[a-z0-9]+-[a-z0-9]+$/);
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

  it.each([
    "ftp://api.example.com/v1",
    "https://user:pass@example.com/v1",
    "https://api.example.com/v1?x=1",
    "https://api.example.com/v1#frag"
  ])("rejects unsafe or malformed base URL %s", (baseUrl) => {
    const errors = validateProviderConfig({
      id: "provider-1",
      name: "Example",
      baseUrl,
      apiKey: "sk-test",
      model: "model",
      enabled: true
    });

    expect(errors).toEqual(["Base URL must be a valid URL."]);
  });

  it("masks api keys without exposing full value", () => {
    expect(maskApiKey("sk-1234567890")).toBe("sk-1...7890");
    expect(maskApiKey("short")).toBe("•••••");
    expect(maskApiKey("abcdefgh")).toBe("••••••••");
    expect(maskApiKey("abcdefghi")).toBe("abc...ghi");
  });
});
