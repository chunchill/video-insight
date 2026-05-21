import type { ModelProviderConfig } from "../shared/types";

export type ProviderConfigInput = Omit<ModelProviderConfig, "id" | "enabled"> & {
  id?: string;
  enabled?: boolean;
};

function createProviderId(): string {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  const localId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

  return `provider-${randomUuid ?? localId}`;
}

export function createProviderConfig(input: ProviderConfigInput): ModelProviderConfig {
  return {
    id: input.id ?? createProviderId(),
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
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
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
  if (apiKey.length <= 8) {
    return "•".repeat(apiKey.length);
  }

  if (apiKey.length < 12) {
    return `${apiKey.slice(0, 3)}...${apiKey.slice(-3)}`;
  }

  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}
