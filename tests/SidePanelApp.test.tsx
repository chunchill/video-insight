import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SidePanelApp } from "../src/sidepanel/SidePanelApp";
import { saveProviderSettings } from "../src/storage/providerStorage";
import { installChromeMock } from "../src/test/chromeMock";

beforeEach(async () => {
  installChromeMock();
  await chrome.storage.local.clear();
});

describe("SidePanelApp", () => {
  it("guides the user to settings when no provider exists", async () => {
    render(<SidePanelApp />);

    expect(await screen.findByText("No provider configured")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open settings" })).toBeInTheDocument();
  });

  it("switches output language", async () => {
    render(<SidePanelApp />);

    await userEvent.selectOptions(await screen.findByLabelText("Output language"), "en");
    expect(screen.getByLabelText("Output language")).toHaveValue("en");
  });

  it("shows transcript extraction errors", async () => {
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
      defaultLanguage: "zh-CN"
    });

    chrome.tabs = {
      query: vi.fn(async () => [{ id: 10, url: "https://www.youtube.com/watch?v=abc123" }]),
      sendMessage: vi.fn(async () => ({
        ok: false,
        reason: "No transcript segments were detected on this YouTube page."
      }))
    } as unknown as typeof chrome.tabs;

    render(<SidePanelApp />);
    await userEvent.click(await screen.findByRole("button", { name: "Generate insight" }));

    expect(
      await screen.findByText("No transcript segments were detected on this YouTube page.")
    ).toBeInTheDocument();
  });
});
