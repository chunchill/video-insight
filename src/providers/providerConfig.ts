import type { ModelProviderConfig } from "../shared/types";

export type ProviderConfigInput = Omit<ModelProviderConfig, "id" | "enabled"> & {
  id?: string;
  enabled?: boolean;
};

export function createProviderConfig(input: ProviderConfigInput): ModelProviderConfig {
  return {
    id: input.id ?? `provider-${crypto.randomUUID()}`,
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
    if (!["http:", "https:"].includes(url.protocol)) {
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
  if (apiKey.length < 8) {
    return "•".repeat(apiKey.length);
  }

  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}
