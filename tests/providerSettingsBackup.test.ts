import { describe, expect, it } from "vitest";
import {
  createProviderSettingsBackup,
  parseProviderSettingsBackup
} from "../src/storage/providerSettingsBackup";

const settings = {
  providers: [
    {
      id: "provider-1",
      name: "SiliconFlow",
      baseUrl: "https://api.siliconflow.cn/v1",
      apiKey: "sk-test",
      model: "Qwen/Qwen2.5-72B-Instruct",
      enabled: true
    }
  ],
  selectedProviderId: "provider-1",
  defaultLanguage: "zh-CN" as const
};

describe("providerSettingsBackup", () => {
  it("exports provider settings including API keys", () => {
    const backup = JSON.parse(createProviderSettingsBackup(settings));

    expect(backup.schemaVersion).toBe(1);
    expect(backup.exportedAt).toEqual(expect.any(String));
    expect(backup.settings.providers[0].apiKey).toBe("sk-test");
    expect(backup.settings.defaultLanguage).toBe("zh-CN");
  });

  it("imports a valid backup", () => {
    const imported = parseProviderSettingsBackup(createProviderSettingsBackup(settings));

    expect(imported).toEqual(settings);
  });

  it("rejects invalid backups without provider arrays", () => {
    expect(() => parseProviderSettingsBackup(JSON.stringify({ schemaVersion: 1, settings: {} }))).toThrow(
      "Invalid provider settings backup."
    );
  });
});
