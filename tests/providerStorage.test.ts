import { beforeEach, describe, expect, it } from "vitest";
import { installChromeMock } from "../src/test/chromeMock";
import { getProviderSettings, saveProviderSettings, selectActiveProvider } from "../src/storage/providerStorage";

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

  it("does not mutate persisted settings when the original saved object changes", async () => {
    const settings = {
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
      defaultLanguage: "en" as const
    };

    await saveProviderSettings(settings);
    settings.providers[0].name = "Mutated";

    const persisted = await getProviderSettings();
    expect(persisted.providers[0].name).toBe("OpenAI");
  });

  it("does not mutate persisted settings when a loaded object changes", async () => {
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

    const loaded = await getProviderSettings();
    loaded.providers[0].name = "Mutated";

    const persisted = await getProviderSettings();
    expect(persisted.providers[0].name).toBe("OpenAI");
  });

  it("preserves stored null values when using object defaults", async () => {
    await chrome.storage.local.set({ keyWithNull: null });

    await expect(chrome.storage.local.get({ keyWithNull: "default" })).resolves.toEqual({
      keyWithNull: null
    });
  });

  it("returns selected enabled provider when present", () => {
    const provider = selectActiveProvider({
      providers: [
        {
          id: "provider-1",
          name: "OpenAI",
          baseUrl: "https://api.openai.com/v1",
          apiKey: "sk-test",
          model: "gpt-4.1-mini",
          enabled: true
        },
        {
          id: "provider-2",
          name: "OpenAI Secondary",
          baseUrl: "https://api.openai.com/v1",
          apiKey: "sk-test-2",
          model: "gpt-4.1",
          enabled: true
        }
      ],
      selectedProviderId: "provider-2",
      defaultLanguage: "en"
    });

    expect(provider?.id).toBe("provider-2");
  });

  it("falls back to first enabled provider when selected provider is disabled", () => {
    const provider = selectActiveProvider({
      providers: [
        {
          id: "provider-1",
          name: "OpenAI",
          baseUrl: "https://api.openai.com/v1",
          apiKey: "sk-test",
          model: "gpt-4.1-mini",
          enabled: true
        },
        {
          id: "provider-2",
          name: "OpenAI Secondary",
          baseUrl: "https://api.openai.com/v1",
          apiKey: "sk-test-2",
          model: "gpt-4.1",
          enabled: false
        }
      ],
      selectedProviderId: "provider-2",
      defaultLanguage: "en"
    });

    expect(provider?.id).toBe("provider-1");
  });

  it("falls back to first enabled provider when selected provider is missing", () => {
    const provider = selectActiveProvider({
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
      selectedProviderId: "provider-2",
      defaultLanguage: "en"
    });

    expect(provider?.id).toBe("provider-1");
  });

  it("returns undefined when no providers are enabled", () => {
    const provider = selectActiveProvider({
      providers: [
        {
          id: "provider-1",
          name: "OpenAI",
          baseUrl: "https://api.openai.com/v1",
          apiKey: "sk-test",
          model: "gpt-4.1-mini",
          enabled: false
        }
      ],
      selectedProviderId: "provider-1",
      defaultLanguage: "en"
    });

    expect(provider).toBeUndefined();
  });
});
