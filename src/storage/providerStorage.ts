import type { ModelProviderConfig, OutputLanguage } from "../shared/types";

const STORAGE_KEY = "videoInsight.providerSettings";

export interface ProviderSettings {
  providers: ModelProviderConfig[];
  selectedProviderId?: string;
  defaultLanguage: OutputLanguage;
}

function cloneValue<T>(value: T): T {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }
  if (value === undefined) {
    return value;
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function createDefaultSettings(): ProviderSettings {
  return {
    providers: [],
    selectedProviderId: undefined,
    defaultLanguage: "zh-CN"
  };
}

export async function getProviderSettings(): Promise<ProviderSettings> {
  const result = await chrome.storage.local.get({ [STORAGE_KEY]: createDefaultSettings() });
  return cloneValue(result[STORAGE_KEY] as ProviderSettings);
}

export async function saveProviderSettings(settings: ProviderSettings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: cloneValue(settings) });
}

export function selectActiveProvider(settings: ProviderSettings): ModelProviderConfig | undefined {
  return (
    settings.providers.find((provider) => provider.id === settings.selectedProviderId && provider.enabled) ??
    settings.providers.find((provider) => provider.enabled)
  );
}
