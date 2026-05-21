import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OptionsApp } from "../src/options/OptionsApp";
import { installChromeMock } from "../src/test/chromeMock";
import { getProviderSettings, saveProviderSettings } from "../src/storage/providerStorage";

beforeEach(async () => {
  installChromeMock();
  await chrome.storage.local.clear();
});

describe("OptionsApp", () => {
  it("saves provider configuration", async () => {
    render(<OptionsApp />);

    await userEvent.type(await screen.findByLabelText("Provider name"), "SiliconFlow");
    await userEvent.type(screen.getByLabelText("Base URL"), "https://api.siliconflow.cn/v1");
    await userEvent.type(screen.getByLabelText("API key"), "sk-test");
    await userEvent.type(screen.getByLabelText("Model"), "Qwen/Qwen2.5-72B-Instruct");
    await userEvent.selectOptions(screen.getByLabelText("Default output language"), "en");
    await userEvent.click(screen.getByRole("button", { name: "Save provider" }));

    expect(await screen.findByText("Settings saved.")).toBeInTheDocument();
    const settings = await getProviderSettings();
    expect(settings.providers[0].name).toBe("SiliconFlow");
    expect(settings.selectedProviderId).toBe(settings.providers[0].id);
    expect(settings.defaultLanguage).toBe("en");
  });

  it("shows validation errors", async () => {
    render(<OptionsApp />);

    await userEvent.click(await screen.findByRole("button", { name: "Save provider" }));

    expect(await screen.findByText("Provider name is required.")).toBeInTheDocument();
    expect(screen.getByText("Base URL must be a valid URL.")).toBeInTheDocument();
    expect(screen.getByText("API key is required.")).toBeInTheDocument();
    expect(screen.getByText("Model is required.")).toBeInTheDocument();
  });

  it("loads existing provider settings", async () => {
    await saveProviderSettings({
      providers: [
        {
          id: "provider-existing",
          name: "Existing provider",
          baseUrl: "https://api.example.com/v1",
          apiKey: "sk-existing",
          model: "example-model",
          enabled: true
        }
      ],
      selectedProviderId: "provider-existing",
      defaultLanguage: "en"
    });

    render(<OptionsApp />);

    expect(await screen.findByDisplayValue("Existing provider")).toBeInTheDocument();
    expect(screen.getByLabelText("Base URL")).toHaveValue("https://api.example.com/v1");
    expect(screen.getByLabelText("API key")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("API key")).toHaveValue("sk-existing");
    expect(screen.getByLabelText("Model")).toHaveValue("example-model");
    expect(screen.getByLabelText("Default output language")).toHaveValue("en");
  });
});
