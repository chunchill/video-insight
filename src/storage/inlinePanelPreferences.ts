const STORAGE_KEY = "videoInsight.inlinePanelPreferences";

export type InlinePanelFontSize = "small" | "default" | "large" | "xl";

export interface InlinePanelPreferences {
  fontSize: InlinePanelFontSize;
}

const DEFAULT_PREFERENCES: InlinePanelPreferences = {
  fontSize: "large"
};

function cloneValue<T>(value: T): T {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }
  if (value === undefined) {
    return value;
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizePreferences(value: Partial<InlinePanelPreferences> | undefined): InlinePanelPreferences {
  const allowedFontSizes: InlinePanelFontSize[] = ["small", "default", "large", "xl"];

  return {
    fontSize: allowedFontSizes.includes(value?.fontSize as InlinePanelFontSize)
      ? (value?.fontSize as InlinePanelFontSize)
      : DEFAULT_PREFERENCES.fontSize
  };
}

export async function getInlinePanelPreferences(): Promise<InlinePanelPreferences> {
  const result = await chrome.storage.local.get({ [STORAGE_KEY]: DEFAULT_PREFERENCES });
  return normalizePreferences(cloneValue(result[STORAGE_KEY] as Partial<InlinePanelPreferences> | undefined));
}

export async function saveInlinePanelPreferences(preferences: InlinePanelPreferences): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: cloneValue(normalizePreferences(preferences)) });
}
