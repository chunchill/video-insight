import type { ProviderSettings } from "./providerStorage";

const BACKUP_SCHEMA_VERSION = 1;

interface ProviderSettingsBackup {
  schemaVersion: number;
  exportedAt: string;
  settings: ProviderSettings;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isValidProvider(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.baseUrl === "string" &&
    typeof value.apiKey === "string" &&
    typeof value.model === "string" &&
    typeof value.enabled === "boolean"
  );
}

function isValidProviderSettings(value: unknown): value is ProviderSettings {
  if (!isRecord(value) || !Array.isArray(value.providers)) {
    return false;
  }

  const defaultLanguage = value.defaultLanguage;
  const selectedProviderId = value.selectedProviderId;

  return (
    value.providers.every(isValidProvider) &&
    (defaultLanguage === "zh-CN" || defaultLanguage === "en") &&
    (selectedProviderId === undefined || typeof selectedProviderId === "string")
  );
}

export function createProviderSettingsBackup(settings: ProviderSettings): string {
  const backup: ProviderSettingsBackup = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    settings
  };

  return `${JSON.stringify(backup, null, 2)}\n`;
}

export function parseProviderSettingsBackup(rawText: string): ProviderSettings {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error("Invalid provider settings backup.");
  }

  if (!isRecord(parsed) || parsed.schemaVersion !== BACKUP_SCHEMA_VERSION || !isValidProviderSettings(parsed.settings)) {
    throw new Error("Invalid provider settings backup.");
  }

  return parsed.settings;
}
