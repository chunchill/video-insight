import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { generateInsightWithProvider } from "../src/providers/openAiCompatible";
import { SidePanelApp } from "../src/sidepanel/SidePanelApp";
import { saveProviderSettings } from "../src/storage/providerStorage";
import { installChromeMock } from "../src/test/chromeMock";

vi.mock("../src/providers/openAiCompatible", () => ({
  generateInsightWithProvider: vi.fn()
}));

beforeEach(async () => {
  installChromeMock();
  await chrome.storage.local.clear();
  chrome.tabs = {
    query: vi.fn(async () => [{ id: 10, url: "https://www.youtube.com/watch?v=abc123" }]),
    sendMessage: vi.fn()
  } as unknown as typeof chrome.tabs;
  vi.mocked(generateInsightWithProvider).mockReset();
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

  it("generates and renders structured insights from the active tab transcript", async () => {
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
        ok: true,
        transcript: {
          videoMeta: { url: "https://www.youtube.com/watch?v=abc123", title: "AI Talk" },
          segments: [{ start: "0:03", text: "AI systems change workflows." }],
          plainText: "[0:03] AI systems change workflows."
        }
      }))
    } as unknown as typeof chrome.tabs;

    vi.mocked(generateInsightWithProvider).mockResolvedValue({
      kind: "structured",
      rawText: "{}",
      data: {
        summary: "AI changes complete workflows.",
        takeaways: ["Context matters"],
        viewpoints: [
          {
            title: "Workflow shift",
            detail: "The transcript argues complete workflows matter more than isolated tasks.",
            evidence: [{ timestamp: "0:03", text: "AI systems change workflows." }]
          }
        ],
        caveats: ["Transcript may omit visual context."],
        audience: ["AI product builders"]
      }
    });

    render(<SidePanelApp />);
    await userEvent.selectOptions(await screen.findByLabelText("Output language"), "en");
    await userEvent.click(await screen.findByRole("button", { name: "Generate insight" }));

    expect(await screen.findByText("AI changes complete workflows.")).toBeInTheDocument();
    expect(screen.getByText("Context matters")).toBeInTheDocument();
    expect(screen.getByText("Workflow shift")).toBeInTheDocument();
    expect(screen.getByText("Transcript may omit visual context.")).toBeInTheDocument();
    expect(generateInsightWithProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        outputLanguage: "en",
        transcript: expect.objectContaining({
          plainText: "[0:03] AI systems change workflows."
        })
      }),
      expect.objectContaining({
        id: "provider-1",
        model: "gpt-4.1-mini"
      })
    );
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(10, {
      type: "VIDEO_INSIGHT_GET_TRANSCRIPT",
      autoOpenTranscript: true
    });
  });

  it("clears stale insight when the active tab URL changes", async () => {
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

    let activeUrl = "https://www.youtube.com/watch?v=abc123";
    chrome.tabs = {
      query: vi.fn(async () => [{ id: 10, url: activeUrl }]),
      sendMessage: vi.fn(async () => ({
        ok: true,
        transcript: {
          videoMeta: { url: activeUrl, title: "AI Talk" },
          segments: [{ start: "0:03", text: "AI systems change workflows." }],
          plainText: "[0:03] AI systems change workflows."
        }
      }))
    } as unknown as typeof chrome.tabs;

    vi.mocked(generateInsightWithProvider).mockResolvedValue({
      kind: "structured",
      rawText: "{}",
      data: {
        summary: "AI changes complete workflows.",
        takeaways: ["Context matters"],
        viewpoints: [
          {
            title: "Workflow shift",
            detail: "The transcript argues complete workflows matter more than isolated tasks.",
            evidence: [{ timestamp: "0:03", text: "AI systems change workflows." }]
          }
        ],
        caveats: ["Transcript may omit visual context."],
        audience: ["AI product builders"]
      }
    });

    render(<SidePanelApp />);
    await userEvent.click(await screen.findByRole("button", { name: "Generate insight" }));
    expect(await screen.findByText("AI changes complete workflows.")).toBeInTheDocument();

    activeUrl = "https://www.youtube.com/watch?v=xyz789";
    expect(await screen.findByText("AI changes complete workflows.")).toBeInTheDocument();
    await waitFor(
      () => {
        expect(screen.queryByText("AI changes complete workflows.")).not.toBeInTheDocument();
      },
      { timeout: 1800 }
    );
  });
});
