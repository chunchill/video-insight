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
