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
